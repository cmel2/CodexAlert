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

Omitting `channel` preserves the original Discord request. Slack accepts
`{ "channel": "slack", "webhookUrl": "https://hooks.slack.com/services/…" }`.
Telegram accepts `{ "channel": "telegram", "botToken": "<dedicated bot token>", "chatId": "<numeric ID or @channel>" }`.
The bot must already have access to the destination. A provider test message must succeed before either route is stored.

The existing encrypted credential columns contain a validated JSON destination for Telegram and legacy Slack webhooks; Discord credentials remain plain URLs inside the encryption envelope. Fingerprints are scoped by provider. Never log or return the decrypted destination. New Slack setup uses the public `GET /feed` RSS endpoint instead of creating a webhook subscription.

Deploy `check-reset` before `subscribe` so the scheduled checker understands new credentials before subscriptions can be created. Then publish the web frontend. Unsubscribe and automatic disabling erase direct-delivery credentials; the Slack RSS route creates no CodexAlert subscription row.

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

## `GET /feed`

Returns a public RSS 2.0 feed containing the latest reset event (or an empty
channel before the first event). Slack users subscribe with Slack's RSS app:

```text
/feed subscribe https://YOUR_PROJECT_REF.supabase.co/functions/v1/feed
```

The stable event identifier is the RSS GUID. The feed is cached for at most 30
seconds and contains no subscriber or credential data.

## `POST /check-reset`

Internal scheduler contract:

```http
X-Cron-Secret: server-only-value
Content-Type: application/json
```

The body is ignored. The response reports only high-level result and counts. Never expose or invoke this endpoint from the frontend.
