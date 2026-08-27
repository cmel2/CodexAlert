# Public API

Base URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1`

Browser requests are accepted only from `ALLOWED_ORIGINS`. Responses never include webhook details, subscription IDs, fingerprints, internal errors, delivery state, or database metadata.

## `POST /subscribe`

```json
{
  "webhookUrl": "https://discord.com/api/webhooks/{webhook-id}/{webhook-token}"
}
```

Created (`201`) or refreshed (`200`):

```json
{
  "success": true,
  "unsubscribeToken": "43-character-base64url-token",
  "message": "Subscription created."
}
```

The token is returned once and a duplicate subscription rotates it. Expected errors are `400`, `403`, `429`, `500`, and `502` with a stable `code` plus a safe user message.

## `POST /unsubscribe`

```json
{
  "token": "43-character-base64url-token"
}
```

For any well-formed token, including reused/nonexistent tokens:

```json
{
  "success": true,
  "message": "If this link was active, the subscription has been removed."
}
```

## `GET /status`

```json
{
  "state": "yes",
  "lastCheckedAt": "2026-08-25T16:30:00.000Z",
  "lastResetAt": "2026-08-25T15:54:00.000Z"
}
```

`state` is `yes`, `no`, or `unknown`. Dates are ISO 8601 UTC strings or `null`.

## `POST /check-reset`

Internal scheduler contract:

```http
X-Cron-Secret: server-only-value
Content-Type: application/json
```

The body is ignored. The response reports only high-level result and counts. Never expose or invoke this endpoint from the frontend.
