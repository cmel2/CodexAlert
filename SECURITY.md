# Security

Please do not report leaked credentials or exploitable vulnerabilities in a public issue.

Use GitHub's **Security → Advisories → Report a vulnerability** flow for this repository. Include the affected endpoint, reproduction steps, and impact. Do not include real Discord webhook URLs or unsubscribe links.

The public frontend contains only the Supabase project URL. Discord webhook credentials, encryption keys, HMAC keys, cron secrets, and Supabase secret keys must remain in Supabase-managed server environments or Vault.

The current live-project audit has one non-blocking Supabase advisor warning: `pg_net` is installed in `public`. See [docs/security.md](docs/security.md) for the remediation tradeoff before production hardening.
