# Security model

## Open-source readiness review (2026-08-27)

The application source is safe to publish: repository and history scans found no Supabase secret keys, Discord webhook tokens, JWTs, or unsubscribe credentials. Live Supabase checks confirmed RLS is enabled on every application table, `anon` and `authenticated` have no table access, and all privileged functions are non-public. The public status API exposes only sanitized status fields.

The project has a `pg_net` in `public` advisor warning. The scheduled checker calls `net.http_post` from `public.invoke_codex_alert_check()`. An extension's registered schema can differ from the schema containing its API objects, so inspect both before considering a move. `ALTER EXTENSION ... SET SCHEMA` only works when that installed extension is relocatable. A drop/reinstall is not an automatic fallback: it can remove request/response diagnostics and disrupt the scheduled caller. Do not run the old drop/recreate recipe without separately planning and verifying the maintenance.

Run this read-only inspection as a database owner:

```sql
select e.extversion, e.extrelocatable, n.nspname as registered_schema
from pg_extension as e
join pg_namespace as n on n.oid = e.extnamespace
where e.extname = 'pg_net';

select n.nspname as api_schema,
       p.oid::regprocedure as function_name,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc as p
join pg_namespace as n on n.oid = p.pronamespace
where n.nspname = 'net'
order by function_name;
```

If `extrelocatable` is true, first verify the installed version's supported move, schema usage and function grants for the scheduled function owner, then move it and test `public.invoke_codex_alert_check()` and the one-minute cron job. If it is false, leave the warning documented and keep reviewing the `net` schema's client grants; do not drop and reinstall merely to clear the advisor.

The six `rls_enabled_no_policy` INFO findings cover backend-only application tables. RLS is enabled and `anon`/`authenticated` table grants are revoked by the initial migration. Edge Functions use the server-only `service_role`. No client policies are intended; do not add broad policies just to silence an informational finding.

## Protected assets

- Discord webhook tokens
- Edge server-side database key
- Cron authentication secret
- Webhook encryption and HMAC keys
- Unsubscribe bearer tokens
- Delivery integrity and reset deduplication state

## Trust boundaries

The browser, request headers, submitted URL, third-party status payload, Discord responses, and public network are untrusted. Edge Function environment secrets and service-role operations are trusted. Postgres tables remain inaccessible to anon/authenticated API roles even if a browser learns the public project URL.

## Webhook encryption choice

AES-256-GCM uses a fresh 96-bit IV for each encryption and authenticates ciphertext. `WEBHOOK_ENCRYPTION_KEY` is a base64-encoded 32-byte Edge secret outside Postgres. The database contains ciphertext and IV only.

Vault is used where Postgres itself must read two secrets to invoke cron. It is not used as a per-subscriber secret collection because fan-out would require a large number of per-row Vault lookups and lifecycle calls. Encrypted columns make subscription deletion, selection, and batching straightforward while maintaining key/database separation.

Do not reuse `WEBHOOK_ENCRYPTION_KEY`, `HMAC_KEY`, or `CRON_SECRET`. Back up the encryption key in a secure secret manager before accepting real subscriptions.

## SSRF checklist

- Maximum 500 characters
- No leading/trailing whitespace
- Literal `https://` authority parsed before URL canonicalization
- No `@` or `:` in authority
- Exact host in a small allowlist, never suffix/substring matching
- Strict numeric webhook ID and token-character/length path
- No query, fragment, username, password, or non-default/explicit port
- Canonical outbound host is always `discord.com`
- Redirect mode is `manual`
- Stored decrypted URLs are validated again before delivery
- All requests have timeouts

## Public endpoint abuse

The address fingerprint is HMAC-protected and retained for at most two days; raw IPs are not written. `X-Forwarded-For` is only a best-effort signal and can vary by gateway behavior. Rate limiting reduces accidental and low-effort abuse but is not a DDoS control.

The unsubscribe response is generic for validly formatted tokens whether or not a row existed. That makes reused and random high-entropy tokens harmless and avoids an existence oracle.

## Logging rules

Structured logs may include event name, subscription UUID, delivery ID, webhook snowflake ID, reset identifier, HTTP status, and a controlled error category. Never log:

- request JSON from subscribe/unsubscribe;
- full URL, token, ciphertext, IV, HMAC, or client address;
- Edge environment values;
- raw database exceptions returned to the browser;
- third-party response bodies.

## Operational review commands

Confirm no public policies:

```sql
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public';
```

Confirm app-table grants:

```sql
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'subscriptions', 'reset_state', 'reset_events',
    'reset_checks', 'notification_deliveries', 'request_rate_limits'
  )
order by table_name, grantee;
```

Search tracked files before release:

```bash
git grep -nE 'service_role|sb_secret_|discord(app)?\.com/api/webhooks/[0-9]'
git grep -nE 'CRON_SECRET=.+|HMAC_KEY=.+|WEBHOOK_ENCRYPTION_KEY=.+'
```

Only documentation/example placeholders and server-side environment variable names should match.

## Rotation

- **Cron:** update the Vault secret and Edge `CRON_SECRET` together, then manually invoke once.
- **HMAC:** changing it invalidates deterministic webhook/address matches. A controlled database migration is required.
- **Encryption:** retain the old key, deploy key-version-aware decryption, re-encrypt every active record, verify, then retire it.
- **Supabase server key:** rotate in the dashboard. Hosted Edge environment defaults update; validate all four functions.
