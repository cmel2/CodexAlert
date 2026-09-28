create or replace function public.deactivate_telegram_subscription(
  p_webhook_fingerprint text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if p_webhook_fingerprint !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  update public.subscriptions
     set active = false,
         webhook_ciphertext = null,
         webhook_iv = null,
         webhook_fingerprint = null,
         webhook_id = null,
         unsubscribe_token_hash = null,
         disabled_reason = 'telegram_user_stopped',
         unsubscribed_at = now()
   where active
     and webhook_id = 'telegram'
     and webhook_fingerprint = p_webhook_fingerprint;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.deactivate_telegram_subscription(text)
  from public, anon, authenticated;
grant execute on function public.deactivate_telegram_subscription(text)
  to service_role;
