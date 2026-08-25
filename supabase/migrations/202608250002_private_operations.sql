create or replace function public.consume_rate_limit(
  p_requester_fingerprint text,
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate-limit configuration';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.request_rate_limits (
    requester_fingerprint,
    action,
    window_started_at,
    request_count
  ) values (
    p_requester_fingerprint,
    p_action,
    v_window_start,
    1
  )
  on conflict (requester_fingerprint, action, window_started_at)
  do update set request_count = public.request_rate_limits.request_count + 1
  where public.request_rate_limits.request_count < p_limit
  returning request_count into v_count;

  return v_count is not null and v_count <= p_limit;
end;
$$;

create or replace function public.upsert_subscription(
  p_webhook_ciphertext text,
  p_webhook_iv text,
  p_webhook_fingerprint text,
  p_webhook_id text,
  p_unsubscribe_token_hash text
)
returns table (subscription_id uuid, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subscription_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_webhook_fingerprint, 0));

  select s.id
    into v_subscription_id
    from public.subscriptions as s
   where s.active
     and s.webhook_fingerprint = p_webhook_fingerprint
   for update;

  if v_subscription_id is not null then
    update public.subscriptions
       set webhook_ciphertext = p_webhook_ciphertext,
           webhook_iv = p_webhook_iv,
           webhook_id = p_webhook_id,
           unsubscribe_token_hash = p_unsubscribe_token_hash,
           failure_count = 0,
           last_failure_at = null,
           disabled_reason = null,
           unsubscribed_at = null
     where id = v_subscription_id;

    return query select v_subscription_id, false;
    return;
  end if;

  insert into public.subscriptions (
    webhook_ciphertext,
    webhook_iv,
    webhook_fingerprint,
    webhook_id,
    unsubscribe_token_hash
  ) values (
    p_webhook_ciphertext,
    p_webhook_iv,
    p_webhook_fingerprint,
    p_webhook_id,
    p_unsubscribe_token_hash
  )
  returning id into v_subscription_id;

  return query select v_subscription_id, true;
end;
$$;

create or replace function public.deactivate_subscription(
  p_unsubscribe_token_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.subscriptions
     set active = false,
         webhook_ciphertext = null,
         webhook_iv = null,
         webhook_fingerprint = null,
         webhook_id = null,
         unsubscribe_token_hash = null,
         disabled_reason = 'user_unsubscribed',
         unsubscribed_at = now()
   where active
     and unsubscribe_token_hash = p_unsubscribe_token_hash;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.record_status_observation(
  p_checked_at timestamptz,
  p_http_status integer,
  p_parsed_state text,
  p_reset_identifier text,
  p_reset_at timestamptz,
  p_processing_result text,
  p_error_message text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.reset_checks (
    checked_at,
    http_status,
    parsed_state,
    reset_identifier,
    processing_result,
    error_message
  ) values (
    p_checked_at,
    p_http_status,
    p_parsed_state,
    p_reset_identifier,
    p_processing_result,
    left(p_error_message, 500)
  );

  update public.reset_state
     set latest_observed_status = p_parsed_state,
         latest_observed_reset_identifier = p_reset_identifier,
         latest_observed_reset_at = p_reset_at,
         last_checked_at = p_checked_at,
         last_successful_api_fetch_at = case
           when p_http_status between 200 and 299 then p_checked_at
           else last_successful_api_fetch_at
         end,
         updated_at = now()
   where singleton
     and (last_checked_at is null or p_checked_at >= last_checked_at);
end;
$$;

create or replace function public.claim_reset_deliveries(
  p_reset_identifier text,
  p_reset_at timestamptz,
  p_claim_owner uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer;
  v_deliveries jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('codex-alert:' || p_reset_identifier, 0));

  insert into public.reset_events (reset_identifier, reset_at)
  values (p_reset_identifier, p_reset_at)
  on conflict (reset_identifier) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return jsonb_build_object(
      'isNewReset', false,
      'deliveries', '[]'::jsonb
    );
  end if;

  insert into public.notification_deliveries (reset_identifier, subscription_id)
  select p_reset_identifier, s.id
    from public.subscriptions as s
   where s.active
  on conflict (subscription_id, reset_identifier) do nothing;

  update public.reset_events
     set delivery_count = (
       select count(*)::integer
         from public.notification_deliveries as d
        where d.reset_identifier = p_reset_identifier
     )
   where reset_identifier = p_reset_identifier;

  with claimed as (
    update public.notification_deliveries as d
       set status = 'processing',
           claim_owner = p_claim_owner,
           claimed_at = now()
      from public.subscriptions as s
     where d.subscription_id = s.id
       and d.reset_identifier = p_reset_identifier
       and d.status = 'pending'
       and s.active
    returning d.id as delivery_id,
              s.id as subscription_id,
              s.webhook_ciphertext,
              s.webhook_iv,
              s.failure_count
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'deliveryId', delivery_id,
        'subscriptionId', subscription_id,
        'webhookCiphertext', webhook_ciphertext,
        'webhookIv', webhook_iv,
        'failureCount', failure_count
      )
    ),
    '[]'::jsonb
  ) into v_deliveries
  from claimed;

  return jsonb_build_object(
    'isNewReset', true,
    'deliveries', v_deliveries
  );
end;
$$;

create or replace function public.record_delivery_result(
  p_delivery_id bigint,
  p_subscription_id uuid,
  p_success boolean,
  p_http_status integer,
  p_error_category text,
  p_permanent_failure boolean,
  p_disable_threshold integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.notification_deliveries
     set status = case when p_success then 'succeeded' else 'failed' end,
         attempted_at = now(),
         completed_at = now(),
         http_status = p_http_status,
         success = p_success,
         error_category = case when p_success then null else left(p_error_category, 100) end
   where id = p_delivery_id
     and subscription_id = p_subscription_id
     and status = 'processing';

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Delivery is not claimable';
  end if;

  if p_success then
    update public.subscriptions
       set failure_count = 0,
           last_success_at = now(),
           disabled_reason = null
     where id = p_subscription_id;
  else
    update public.subscriptions
       set failure_count = failure_count + 1,
           last_failure_at = now(),
           active = case
             when p_permanent_failure and failure_count + 1 >= p_disable_threshold then false
             else active
           end,
           webhook_ciphertext = case
             when p_permanent_failure and failure_count + 1 >= p_disable_threshold then null
             else webhook_ciphertext
           end,
           webhook_iv = case
             when p_permanent_failure and failure_count + 1 >= p_disable_threshold then null
             else webhook_iv
           end,
           webhook_fingerprint = case
             when p_permanent_failure and failure_count + 1 >= p_disable_threshold then null
             else webhook_fingerprint
           end,
           webhook_id = case
             when p_permanent_failure and failure_count + 1 >= p_disable_threshold then null
             else webhook_id
           end,
           unsubscribe_token_hash = case
             when p_permanent_failure and failure_count + 1 >= p_disable_threshold then null
             else unsubscribe_token_hash
           end,
           disabled_reason = case
             when p_permanent_failure and failure_count + 1 >= p_disable_threshold
               then 'discord_' || left(coalesce(p_error_category, 'invalid'), 80)
             else disabled_reason
           end
     where id = p_subscription_id;
  end if;
end;
$$;

create or replace function public.complete_reset_batch(
  p_reset_identifier text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delivery_count integer;
  v_success_count integer;
  v_failure_count integer;
begin
  select count(*)::integer,
         count(*) filter (where status = 'succeeded')::integer,
         count(*) filter (where status = 'failed')::integer
    into v_delivery_count, v_success_count, v_failure_count
    from public.notification_deliveries
   where reset_identifier = p_reset_identifier;

  update public.reset_events
     set delivery_count = v_delivery_count,
         success_count = v_success_count,
         failure_count = greatest(v_failure_count, v_delivery_count - v_success_count),
         completed_at = now(),
         status = case
           when v_failure_count > 0 or v_delivery_count > v_success_count
             then 'completed_with_failures'
           else 'completed'
         end
   where reset_identifier = p_reset_identifier;

  update public.reset_state
     set last_notified_reset_identifier = case
           when v_success_count > 0 or v_delivery_count = 0
             then p_reset_identifier
           else last_notified_reset_identifier
         end,
         last_notification_batch_at = now(),
         updated_at = now()
   where singleton;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.upsert_subscription(text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.deactivate_subscription(text)
  from public, anon, authenticated;
revoke all on function public.record_status_observation(timestamptz, integer, text, text, timestamptz, text, text)
  from public, anon, authenticated;
revoke all on function public.claim_reset_deliveries(text, timestamptz, uuid)
  from public, anon, authenticated;
revoke all on function public.record_delivery_result(bigint, uuid, boolean, integer, text, boolean, integer)
  from public, anon, authenticated;
revoke all on function public.complete_reset_batch(text)
  from public, anon, authenticated;

grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.upsert_subscription(text, text, text, text, text) to service_role;
grant execute on function public.deactivate_subscription(text) to service_role;
grant execute on function public.record_status_observation(timestamptz, integer, text, text, timestamptz, text, text) to service_role;
grant execute on function public.claim_reset_deliveries(text, timestamptz, uuid) to service_role;
grant execute on function public.record_delivery_result(bigint, uuid, boolean, integer, text, boolean, integer) to service_role;
grant execute on function public.complete_reset_batch(text) to service_role;
