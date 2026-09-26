# Codex Reset Alerts

[![Deploy GitHub Pages](https://github.com/cmel2/CodexAlert/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/cmel2/CodexAlert/actions/workflows/deploy-pages.yml)
[![Live site](https://img.shields.io/website?url=https%3A%2F%2Fcmel2.github.io%2FCodexAlert%2F&label=site)](https://cmel2.github.io/CodexAlert/)
[![License: MIT](https://img.shields.io/badge/license-MIT-111111.svg)](LICENSE)

Get a notification when Codex limits appear to have reset. No account required.

**[Open the live site](https://cmel2.github.io/CodexAlert/)**

Reset data comes from [hascodexratelimitreset.today](https://hascodexratelimitreset.today/), created by [@jskoiz](https://x.com/jskoiz). This project is unofficial and is not affiliated with OpenAI, Discord, Telegram, or Slack.

Connect Discord with an incoming webhook or Telegram with a dedicated bot token and chat ID. Slack users subscribe to the public RSS feed with Slack’s `/feed subscribe` command.

## How it works

1. A visitor connects a Discord webhook or Telegram bot and chat ID, or subscribes a Slack channel to the public RSS feed.
2. Supabase validates and tests direct delivery destinations, then stores their credentials encrypted. Slack RSS requires no CodexAlert account or stored destination.
3. Supabase Cron checks the reset source once per minute.
4. A new stable reset identifier creates one delivery per active Discord or Telegram subscription; the RSS endpoint exposes the latest reset for Slack.

```text
GitHub Pages → Supabase Edge Functions → Postgres
                                      ↘ Discord / Telegram
Slack RSS app ← /feed ← Postgres reset events
Supabase Cron → check-reset → reset source
```

## Security

- Discord webhook URLs and Telegram bot credentials are encrypted with AES-256-GCM using a server-only key.
- Duplicate detection uses a keyed HMAC; unsubscribe tokens are stored as hashes.
- Requests are restricted to approved Discord and Telegram hosts; redirects are blocked. Slack receives the public RSS feed through its RSS app.
- Application tables have RLS enabled and grant no access to `anon` or `authenticated`.
- Privileged database functions are executable only by `service_role`.
- The scheduled checker requires a separate secret stored in Supabase Vault.
- No service-role key or other server secret is shipped to GitHub Pages.

See [SECURITY.md](SECURITY.md) to report a vulnerability. Architecture and deployment notes remain in [docs/](docs/).

## Stack

- GitHub Pages + Vite + TypeScript
- Supabase Postgres, Edge Functions, Vault, `pg_cron`, and `pg_net`
- Discord incoming webhooks, Telegram bots, and a public RSS feed for Slack

## Local development

```bash
supabase start
supabase db reset
supabase functions serve --no-verify-jwt

cd web
npm install
npm run dev
```

Copy the example environment files before starting:

- `web/.env.example`
- `supabase/functions/.env.example`

## Test

```bash
cd web && npm test && npm run build
cd ..
deno test supabase/functions/_shared
supabase test db
```

## License

[MIT](LICENSE)
