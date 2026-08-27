import type { DiscordDeliveryResult } from "./types.ts";

const APPROVED_HOSTS = new Set([
  "discord.com",
  "discordapp.com",
  "canary.discord.com",
  "ptb.discord.com",
]);
const WEBHOOK_PATH =
  /^\/api(?:\/v\d{1,2})?\/webhooks\/(\d{17,20})\/([A-Za-z0-9._-]{50,200})$/u;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RETRY_DELAY_MS = 10_000;

export interface ValidatedWebhookUrl {
  normalizedUrl: string;
  webhookId: string;
}

type Fetcher = typeof fetch;

export function validateDiscordWebhookUrl(
  rawValue: string,
): ValidatedWebhookUrl {
  if (rawValue.length > 500) throw new TypeError("Webhook URL is too long");
  if (/\s/u.test(rawValue)) {
    throw new TypeError("Webhook URL contains whitespace");
  }

  const authority = /^https:\/\/([^/?#]+)/iu.exec(rawValue)?.[1];
  if (!authority || authority.includes(":") || authority.includes("@")) {
    throw new TypeError("Webhook URL authority is not allowed");
  }

  let url: URL;
  try {
    url = new URL(rawValue);
  } catch {
    throw new TypeError("Webhook URL is malformed");
  }

  if (
    url.protocol !== "https:" || !APPROVED_HOSTS.has(url.hostname.toLowerCase())
  ) {
    throw new TypeError("Webhook URL must use an approved Discord host");
  }
  if (url.username || url.password || url.port || url.search || url.hash) {
    throw new TypeError("Webhook URL contains unsupported components");
  }

  const match = WEBHOOK_PATH.exec(url.pathname);
  if (!match) throw new TypeError("Webhook URL path is invalid");

  const [, webhookId, token] = match;
  return {
    webhookId,
    normalizedUrl: `https://discord.com/api/webhooks/${webhookId}/${token}`,
  };
}

async function fetchWithTimeout(
  fetcher: Fetcher,
  input: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(input, {
      ...init,
      signal: controller.signal,
      redirect: "manual",
    });
  } finally {
    clearTimeout(timeout);
  }
}

function statusFailure(status: number): DiscordDeliveryResult {
  if ([401, 403, 404].includes(status)) {
    return { ok: false, status, category: "invalid_webhook", permanent: true };
  }
  if (status === 429) {
    return { ok: false, status, category: "rate_limited", permanent: false };
  }
  if (status >= 500) {
    return {
      ok: false,
      status,
      category: "discord_server_error",
      permanent: false,
    };
  }
  return { ok: false, status, category: "discord_rejected", permanent: false };
}

async function responseText(
  response: Response,
  maxLength = 4_096,
): Promise<string> {
  const text = await response.text();
  return text.slice(0, maxLength);
}

function retryDelayMs(response: Response, body: string): number | null {
  let seconds = Number(response.headers.get("retry-after"));
  try {
    const parsed = JSON.parse(body) as { retry_after?: unknown };
    if (typeof parsed.retry_after === "number") seconds = parsed.retry_after;
  } catch {
    // Discord can return an empty or non-JSON response. The header remains authoritative.
  }
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.ceil(seconds * 1_000);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function verifyDiscordWebhook(
  webhook: ValidatedWebhookUrl,
  fetcher: Fetcher = fetch,
): Promise<DiscordDeliveryResult> {
  try {
    const response = await fetchWithTimeout(fetcher, webhook.normalizedUrl, {
      method: "GET",
      headers: { "User-Agent": "CodexAlert/1.0" },
    });
    if (!response.ok) return statusFailure(response.status);

    const body = JSON.parse(await responseText(response)) as {
      id?: unknown;
      type?: unknown;
    };
    if (body.id !== webhook.webhookId || body.type !== 1) {
      return {
        ok: false,
        status: response.status,
        category: "invalid_webhook",
        permanent: true,
      };
    }
    return {
      ok: true,
      status: response.status,
      category: null,
      permanent: false,
    };
  } catch (error) {
    const category =
      error instanceof DOMException && error.name === "AbortError"
        ? "timeout_unknown"
        : "network_error";
    return { ok: false, status: null, category, permanent: false };
  }
}

export function confirmationMessage(): Record<string, unknown> {
  return {
    embeds: [{
      title: "Codex Reset Alerts webhook confirmed",
      description:
        "✅ The webhook test passed. Subscription setup is being completed.",
      color: 0x7c5cff,
      footer: { text: "Unofficial community notification service." },
    }],
    allowed_mentions: { parse: [] },
  };
}

export function resetNotificationMessage(
  detectedAt: string,
  resetAt: string | null,
): Record<string, unknown> {
  const fields = [{
    name: "Detected",
    value: `<t:${Math.floor(Date.parse(detectedAt) / 1_000)}:R>`,
    inline: true,
  }];
  if (resetAt) {
    fields.push({
      name: "Reported reset",
      value: `<t:${Math.floor(Date.parse(resetAt) / 1_000)}:F>`,
      inline: true,
    });
  }
  fields.push({
    name: "Source",
    value: "hascodexratelimitreset.today · created by @jskoiz",
    inline: false,
  });
  return {
    embeds: [{
      title: "Codex limits appear to have reset",
      description:
        "The Codex reset tracker is currently reporting that limits have reset.",
      url: "https://hascodexratelimitreset.today/",
      color: 0x27c499,
      fields,
      footer: {
        text:
          "Unofficial community service. Third-party status may be delayed or inaccurate.",
      },
      timestamp: detectedAt,
    }],
    allowed_mentions: { parse: [] },
  };
}

export async function sendDiscordWebhook(
  normalizedUrl: string,
  payload: Record<string, unknown>,
  fetcher: Fetcher = fetch,
): Promise<DiscordDeliveryResult> {
  const destination = `${normalizedUrl}?wait=true`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    try {
      response = await fetchWithTimeout(fetcher, destination, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "CodexAlert/1.0",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      const category =
        error instanceof DOMException && error.name === "AbortError"
          ? "timeout_unknown"
          : "network_unknown";
      // The remote outcome is unknowable after a transport failure, so retrying could duplicate a message.
      return { ok: false, status: null, category, permanent: false };
    }

    if (response.ok) {
      await response.body?.cancel();
      return {
        ok: true,
        status: response.status,
        category: null,
        permanent: false,
      };
    }

    const body = await responseText(response);
    if (response.status === 429 && attempt === 0) {
      const waitMs = retryDelayMs(response, body);
      if (waitMs !== null && waitMs <= MAX_RETRY_DELAY_MS) {
        await delay(waitMs);
        continue;
      }
    }
    // A 5xx response may follow a server-side side effect. Do not retry an alert
    // when the outcome is not guaranteed to be side-effect-free.
    return statusFailure(response.status);
  }

  return {
    ok: false,
    status: null,
    category: "retry_exhausted",
    permanent: false,
  };
}
