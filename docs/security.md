# Security model

## Open-source readiness review (2026-08-27)

The application source is safe to publish: repository and history scans found no Supabase secret keys, Discord webhook tokens, JWTs, or unsubscribe credentials. Live Supabase checks confirmed RLS is enabled on every application table, `anon` and `authenticated` have no table access, and all privileged functions are non-public. The public status API exposes only sanitized status fields.

One live-project hardening item remains intentionally explicit: Supabase's advisor reports `pg_net` installed in the `public` schema. The app does not grant client roles access to its tables or internal functions, so this is not a credential leak, but moving the extension to `extensions` is recommended. Supabase's supported move drops and recreates `pg_net`, which clears the current three diagnostic HTTP response rows; the request queue is empty. Apply that maintenance change only during a planned window.

After confirming the queue is empty and accepting the diagnostic-log loss, run this once as a database owner:

```sql
drop extension if exists pg_net;
create extension pg_net with schema extensions;
revoke all on schema net from public, anon, authenticated;
revoke all on all tables in schema net from public, anon, authenticated;
revoke all on all functions in schema net from public, anon, authenticated;
```

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
