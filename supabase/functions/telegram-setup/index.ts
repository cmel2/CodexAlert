import { isOriginAllowed, optionsResponse } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/db.ts";
import { getRequiredEnv } from "../_shared/env.ts";
import { logError } from "../_shared/logging.ts";
import { consumeRequestLimit } from "../_shared/rate-limit.ts";
import {
  jsonResponse,
  publicError,
  readJsonObject,
} from "../_shared/responses.ts";

class WebhookConflictError extends Error {}

async function telegramMethod<T>(
  token: string,
  method: string,
  payload?: unknown,
): Promise<T> {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: payload === undefined ? "GET" : "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
      headers: payload === undefined
        ? undefined
        : { "Content-Type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("Telegram API rejected the request");
  }
  const result: unknown = await response.json();
  if (
    result === null || typeof result !== "object" ||
    (result as { ok?: unknown }).ok !== true
  ) {
    throw new Error("Telegram API returned an invalid response");
  }
  return (result as { result: T }).result;
}

function requiredBotConfig(): { token: string; webhookSecret: string } {
  const token = getRequiredEnv("TELEGRAM_BOT_TOKEN");
  const webhookSecret = getRequiredEnv("TELEGRAM_WEBHOOK_SECRET");
  if (!/^\d{5,20}:[A-Za-z0-9_-]{30,100}$/u.test(token)) {
    throw new Error("Telegram bot token is invalid");
  }
  if (!/^[A-Za-z0-9_-]{32,128}$/u.test(webhookSecret)) {
    throw new Error(
      "Telegram webhook secret must be 32-128 URL-safe characters",
    );
  }
  return { token, webhookSecret };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (!isOriginAllowed(request) || !request.headers.get("origin")) {
    return publicError(
      request,
      403,
      "origin_not_allowed",
      "This website origin is not allowed.",
    );
  }
  if (request.method !== "POST") {
    return publicError(
      request,
      405,
      "method_not_allowed",
      "Use POST for this endpoint.",
    );
  }

  try {
    const body = await readJsonObject(request);
    if (Object.keys(body).length !== 0) {
      return publicError(
        request,
        400,
        "invalid_request",
        "No setup options are accepted.",
      );
    }

    const client = createAdminClient();
    const allowed = await consumeRequestLimit(
      client,
      request,
      "telegram_setup",
      60,
      3_600,
    );
    if (!allowed) {
      return publicError(
        request,
        429,
        "rate_limited",
        "Too many setup attempts. Try again later.",
      );
    }

    const { token, webhookSecret } = requiredBotConfig();
    const supabaseUrl = new URL(getRequiredEnv("SUPABASE_URL"));
    if (supabaseUrl.protocol !== "https:") {
      throw new Error("Supabase URL must use HTTPS");
    }
    const webhookUrl = `${supabaseUrl.origin}/functions/v1/telegram-updates`;

    const bot = await telegramMethod<{ username?: string }>(token, "getMe");
    if (!bot.username || !/^[A-Za-z0-9_]{5,32}$/u.test(bot.username)) {
      throw new Error("Telegram did not return a valid bot username");
    }
    const current = await telegramMethod<{ url?: string }>(
      token,
      "getWebhookInfo",
    );
    if (current.url && current.url !== webhookUrl) {
      throw new WebhookConflictError("Bot already has a different webhook");
    }
    await telegramMethod<boolean>(token, "setWebhook", {
      url: webhookUrl,
      secret_token: webhookSecret,
      allowed_updates: ["message", "my_chat_member"],
      drop_pending_updates: false,
      max_connections: 1,
    });

    return jsonResponse(request, {
      success: true,
      username: bot.username,
      botUrl: `https://t.me/${bot.username}?start=subscribe`,
    });
  } catch (error) {
    if (
      error instanceof SyntaxError || error instanceof TypeError ||
      error instanceof RangeError
    ) {
      return publicError(
        request,
        400,
        "invalid_request",
        "The request could not be read.",
      );
    }
    if (error instanceof WebhookConflictError) {
      return publicError(
        request,
        409,
        "webhook_in_use",
        "This bot already has a different webhook configured.",
      );
    }
    logError("telegram_setup_failed");
    return publicError(
      request,
      503,
      "telegram_unavailable",
      "Telegram setup is unavailable. Check that the bot secrets are configured, then try again.",
    );
  }
});
