# Deployment checklist

## Supabase

- [ ] Project region selected and project reference recorded
- [ ] `supabase link --project-ref ...` completed
- [ ] `supabase db push` completed without errors
- [ ] RLS and grants inspected using `docs/security.md`
- [ ] Independent cron, encryption, and HMAC secrets generated
- [ ] Server-only Edge secrets uploaded
- [ ] Encryption key backed up outside the repository/database
- [ ] `codex_alert_project_url` created in Vault
- [ ] Matching `codex_alert_cron_secret` created in Vault
- [ ] `subscribe`, `unsubscribe`, `status`, and `check-reset` deployed
- [ ] Cron schedule is `* * * * *`
- [ ] Manual `public.invoke_codex_alert_check()` produces a successful network request
- [ ] `pg_net` namespace warning reviewed and moved out of `public` during a planned maintenance window

## Product verification

- [ ] Production status endpoint returns only three documented fields
- [ ] Valid Discord webhook receives the test message
- [ ] Database stores ciphertext, never plaintext webhook URL
- [ ] Duplicate subscribe refreshes one row and rotates management token
- [ ] Non-Discord, userinfo, port, query, fragment, and SSRF URLs fail before fetch
- [ ] Bad cron secret returns 401 and causes no tracker request
- [ ] Same reset ID twice creates one delivery per subscription
- [ ] Concurrent checker invocations create one reset event
- [ ] 404 webhook failures do not block healthy subscribers
- [ ] Second permanent failure disables and clears the broken credential
- [ ] Unsubscribe removes credential material and stops future deliveries
- [ ] No full webhook or secret appears in Edge logs

## GitHub Pages

- [ ] Repository variable `VITE_SUPABASE_URL` set
- [ ] Edge `ALLOWED_ORIGINS` contains the exact Pages origin
- [ ] Pages source set to GitHub Actions
- [ ] Workflow tests/build succeeds
- [ ] Home, `/how-it-works/`, `/channels/`, `/channels/discord/`, `/faq/`, `/privacy/`, `/terms/`, and `/unsubscribe/` load under `/CodexAlert/`
- [ ] Channel chooser, Discord subscribe/copy-link, status, and unsubscribe flows work in production
- [ ] Mobile, tablet, keyboard, and reduced-motion behavior checked
- [ ] Footer and notification disclaimer are visible and accurate

## Launch

- [ ] Disposable test webhook deleted
- [ ] Cron run history checked after at least one scheduled interval
- [ ] Free-tier quotas and Edge Function limits reviewed for expected subscriber count
- [ ] Security contact/issue process chosen for the public repository
