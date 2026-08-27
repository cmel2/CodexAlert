# Architecture

## Components

The browser is an untrusted static client. It knows only the Supabase project URL and calls three public Edge Functions. Those functions use the hosted server-side key to reach RLS-protected tables and service-role-only RPCs. The scheduled function is not a public product API: Postgres invokes it using a dedicated secret stored in Vault.

One cron execution performs one third-party status request regardless of subscriber count.

## Subscription sequence

1. The Edge Function checks exact CORS origin and an HMAC-addressed database rate limit.
2. It bounds and parses JSON.
3. It validates the raw URL authority and exact Discord host/path.
4. It normalizes the destination to `https://discord.com/api/webhooks/{id}/{token}`.
5. It fetches webhook metadata with redirects disabled and requires a matching incoming webhook (`type = 1`).
6. It sends a confirmation/test message with mentions disabled.
7. It encrypts the canonical URL, creates a keyed HMAC fingerprint, and creates a random unsubscribe token/hash.
8. A transaction serializes on the fingerprint and inserts or refreshes exactly one active subscription. Refreshing rotates the unsubscribe token, invalidating the older management link.

## Reset sequence

1. Cron invokes `check-reset` every minute through `pg_net`.
2. The function rejects a bad `X-Cron-Secret` before doing any work.
3. It fetches the source once with an 8-second timeout, no redirects, a 64 KiB response limit, a required 2xx status, and defensive JSON parsing.
4. `state = no` updates the singleton status and appends a check record for observability; detailed history should be reviewed or pruned according to the operator's retention policy.
5. `state = yes` requires a stable identity: normalized `resetAt`, source event ID, or source-event checked time. Top-level `updatedAt` is never an identity.
6. `claim_reset_deliveries` takes an advisory transaction lock and inserts the unique reset event. If it already exists, it returns no work.
7. For a new event, one unique delivery row is created for every active subscription and changed from `pending` to `processing` inside the same transaction.
8. The function decrypts and revalidates each URL, then posts with configurable bounded concurrency.
9. Each outcome transactionally updates the delivery and subscription health. Two permanent failures disable the subscription and erase its credential by default.
10. The batch summary updates the reset ledger and singleton public status.

## Idempotency and failure semantics

`reset_events.reset_identifier` is the global deduplication key. `notification_deliveries (subscription_id, reset_identifier)` is unique. The claim transition precedes all outbound requests and there is no automatic lease reclaim.

This produces at-most-once behavior:

- overlapping functions: one inserts the reset; the other sees a duplicate;
- repeated one-minute observation: existing reset returns no deliveries;
- crash before Discord: claimed delivery can be missed, never automatically duplicated;
- timeout after POST: outcome is unknown, so it is recorded failed and never retried;
- explicit 429: Discord states it did not accept the request, so one bounded retry is allowed;
- 5xx: not retried because a side effect cannot be ruled out.

No practical webhook client can guarantee both zero duplicates and zero missed messages without receiver-side idempotency. The product requirement prioritizes zero duplicate successful alerts.

## Growth path

The current function can handle a modest fan-out with concurrency 10 and no unbounded `Promise.all`. For thousands of subscriptions, keep the same reset/delivery tables but enqueue delivery IDs into a durable Supabase Queue and let bounded workers claim one message at a time. That change preserves the channel abstraction and database invariants.
