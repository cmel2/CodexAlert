create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault;

create or replace function public.invoke_codex_alert_check()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_url text;
  v_cron_secret text;
  v_request_id bigint;
begin
  select decrypted_secret
    into v_project_url
    from vault.decrypted_secrets
   where name = 'codex_alert_project_url';

  select decrypted_secret
    into v_cron_secret
    from vault.decrypted_secrets
   where name = 'codex_alert_cron_secret';

  if v_project_url is null or v_cron_secret is null then
    raise exception 'Codex Alert Vault secrets are not configured';
  end if;

  select net.http_post(
    url := rtrim(v_project_url, '/') || '/functions/v1/check-reset',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', v_cron_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.invoke_codex_alert_check() from public, anon, authenticated;

create or replace function public.run_codex_alert_retention()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.reset_checks
   where checked_at < now() - interval '30 days';

  delete from public.notification_deliveries
   where created_at < now() - interval '30 days';

  delete from public.request_rate_limits
   where window_started_at < now() - interval '2 days';
end;
$$;

revoke all on function public.run_codex_alert_retention() from public, anon, authenticated;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'codex-alert-check-reset';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'codex-alert-check-reset',
    '*/30 * * * *',
    'select public.invoke_codex_alert_check();'
  );

  select jobid into v_job_id from cron.job where jobname = 'codex-alert-retention';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'codex-alert-retention',
    '23 3 * * *',
    'select public.run_codex_alert_retention();'
  );
end;
$$;
