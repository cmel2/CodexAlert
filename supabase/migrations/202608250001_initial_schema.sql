create extension if not exists pgcrypto with schema extensions;

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  webhook_ciphertext text,
  webhook_iv text,
  webhook_fingerprint text,
  webhook_id text,
  unsubscribe_token_hash text,
  active boolean not null default true,
  failure_count integer not null default 0 check (failure_count >= 0),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  disabled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  constraint active_subscription_has_secret check (
    not active or (
      webhook_ciphertext is not null
      and webhook_iv is not null
      and webhook_fingerprint is not null
      and unsubscribe_token_hash is not null
    )
  )
);

create unique index subscriptions_active_webhook_fingerprint_key
  on public.subscriptions (webhook_fingerprint)
  where active;

create unique index subscriptions_active_unsubscribe_token_hash_key
  on public.subscriptions (unsubscribe_token_hash)
  where active;

create table public.reset_state (
  singleton boolean primary key default true check (singleton),
  latest_observed_status text not null default 'unknown'
    check (latest_observed_status in ('yes', 'no', 'unknown')),
  latest_observed_reset_identifier text,
  latest_observed_reset_at timestamptz,
  last_checked_at timestamptz,
  last_successful_api_fetch_at timestamptz,
  last_notified_reset_identifier text,
  last_notification_batch_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.reset_state (singleton) values (true)
on conflict (singleton) do nothing;

create table public.reset_events (
  reset_identifier text primary key,
  reset_at timestamptz,
  detected_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'completed_with_failures')),
  delivery_count integer not null default 0 check (delivery_count >= 0),
  success_count integer not null default 0 check (success_count >= 0),
  failure_count integer not null default 0 check (failure_count >= 0)
);

create table public.reset_checks (
  id bigint generated always as identity primary key,
  checked_at timestamptz not null default now(),
  http_status integer,
  parsed_state text check (parsed_state in ('yes', 'no', 'unknown')),
  reset_identifier text,
  processing_result text not null check (processing_result in (
    'not_reset',
    'new_reset',
    'duplicate_reset',
    'missing_reset_identifier',
    'fetch_error',
    'invalid_response',
    'auth_rejected'
  )),
  error_message text check (char_length(error_message) <= 500)
);

create index reset_checks_checked_at_idx on public.reset_checks (checked_at desc);

create table public.notification_deliveries (
  id bigint generated always as identity primary key,
  reset_identifier text not null references public.reset_events (reset_identifier) on delete restrict,
  subscription_id uuid not null references public.subscriptions (id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'succeeded', 'failed')),
  claim_owner uuid,
  claimed_at timestamptz,
  attempted_at timestamptz,
  completed_at timestamptz,
  http_status integer,
  success boolean,
  error_category text,
  created_at timestamptz not null default now(),
  unique (subscription_id, reset_identifier)
);

create index notification_deliveries_reset_status_idx
  on public.notification_deliveries (reset_identifier, status);

create table public.request_rate_limits (
  requester_fingerprint text not null,
  action text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (requester_fingerprint, action, window_started_at)
);

alter table public.subscriptions enable row level security;
alter table public.reset_state enable row level security;
alter table public.reset_events enable row level security;
alter table public.reset_checks enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.request_rate_limits enable row level security;

revoke all on table public.subscriptions from anon, authenticated;
revoke all on table public.reset_state from anon, authenticated;
revoke all on table public.reset_events from anon, authenticated;
revoke all on table public.reset_checks from anon, authenticated;
revoke all on table public.notification_deliveries from anon, authenticated;
revoke all on table public.request_rate_limits from anon, authenticated;

grant all on table public.subscriptions to service_role;
grant all on table public.reset_state to service_role;
grant all on table public.reset_events to service_role;
grant all on table public.reset_checks to service_role;
grant all on table public.notification_deliveries to service_role;
grant all on table public.request_rate_limits to service_role;
grant usage, select on all sequences in schema public to service_role;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

revoke all on function public.set_updated_at() from public, anon, authenticated;
