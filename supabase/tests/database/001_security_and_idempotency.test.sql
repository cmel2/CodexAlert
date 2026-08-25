begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(10);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.subscriptions'::regclass),
  'subscriptions has RLS enabled'
);
select ok(
  not has_table_privilege('anon', 'public.subscriptions', 'SELECT'),
  'anon cannot select subscriptions'
);
select ok(
  not has_table_privilege('authenticated', 'public.subscriptions', 'SELECT'),
  'authenticated users cannot select subscriptions'
);
select ok(
  not has_function_privilege('anon', 'public.upsert_subscription(text,text,text,text,text)', 'EXECUTE'),
  'anon cannot call the subscription RPC'
);
select ok(
  not has_function_privilege('anon', 'public.claim_reset_deliveries(text,timestamp with time zone,uuid)', 'EXECUTE'),
  'anon cannot claim deliveries'
);

insert into public.subscriptions (
  webhook_ciphertext,
  webhook_iv,
  webhook_fingerprint,
  webhook_id,
  unsubscribe_token_hash
) values
  ('encrypted-a', 'iv-a', 'fingerprint-a', '111111111111111111', 'token-a'),
  ('encrypted-b', 'iv-b', 'fingerprint-b', '222222222222222222', 'token-b');

create temporary table claim_results (attempt integer primary key, result jsonb);
insert into claim_results values (
  1,
  public.claim_reset_deliveries('reset:test-a', now(), gen_random_uuid())
);
insert into claim_results values (
  2,
  public.claim_reset_deliveries('reset:test-a', now(), gen_random_uuid())
);

select is(
  (select (result ->> 'isNewReset')::boolean from claim_results where attempt = 1),
  true,
  'the first checker claims a new reset'
);
select is(
  (select jsonb_array_length(result -> 'deliveries') from claim_results where attempt = 1),
  2,
  'the first checker claims one delivery per active subscription'
);
select is(
  (select (result ->> 'isNewReset')::boolean from claim_results where attempt = 2),
  false,
  'an overlapping or repeated checker cannot reclaim the reset'
);
select is(
  (select jsonb_array_length(result -> 'deliveries') from claim_results where attempt = 2),
  0,
  'a repeated checker receives no deliveries'
);
select is(
  (select count(*)::integer from public.notification_deliveries where reset_identifier = 'reset:test-a'),
  2,
  'the unique delivery invariant leaves exactly two rows'
);

select * from finish();
rollback;
