# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Codex users who want a low-friction signal when the community reset tracker reports that limits appear to have reset.

## Product Purpose

Codex Reset Alerts lets someone choose a notification route without creating an account. Discord is live; Telegram and Slack are visible as planned routes. The service checks one shared reset source, deduplicates reset events, and sends at most one notification per subscription and reset identifier.

## Positioning

A small, open-source bridge from a community-maintained Codex reset signal to notification channels, with no user account or OAuth flow.

## Operating Context

Visitors arrive on a public GitHub Pages site, choose a channel, paste a Discord incoming webhook when that route is available, receive a test message, and keep a private unsubscribe link. Supabase Edge Functions handle all credential operations and Supabase Cron schedules the shared status check.

## Capabilities and Constraints

- Current notification channel: Discord is available now; Telegram and Slack are announced as coming soon without backend support yet.
- Reset source: `https://hascodexratelimitreset.today/`, created by [@jskoiz](https://x.com/jskoiz).
- The source is third-party and may be delayed or inaccurate; product copy must say limits “appear” to have reset.
- No names, emails, Discord accounts, or OAuth are collected.
- Discord webhook URLs are credentials and must never be exposed in public source, browser responses, or logs.
- GitHub Pages hosts the static frontend; Supabase hosts persistence, Edge Functions, Vault, and the scheduler.
- The status check runs globally, never once per subscriber.
- Telegram and Slack are future delivery work and must remain clearly marked as unavailable until implemented.

## Brand Commitments

- Name: Codex Reset Alerts.
- Voice: direct, calm, technical, and transparent; no hype or unsupported security claims.
- The interface should feel authored and specific to the reset-notification job, not like a generic AI-generated SaaS landing page.
- Unofficial community project; not affiliated with or endorsed by OpenAI or Discord.

## Evidence on Hand

- Live third-party status endpoint and website.
- Working Supabase status, subscribe, unsubscribe, and checker functions.
- No customer logos, testimonials, adoption metrics, or official endorsements; future work must not fabricate them.

## Product Principles

1. Show the current signal and its provenance plainly.
2. Make subscription possible in one focused action.
3. Treat webhook and unsubscribe URLs as credentials.
4. Prefer at-most-once delivery over duplicate alerts.
5. Keep the service understandable enough to audit in public.

## Accessibility & Inclusion

Use semantic HTML, visible focus states, readable contrast, clear status language, keyboard-operable controls, responsive layouts, and reduced-motion support.
