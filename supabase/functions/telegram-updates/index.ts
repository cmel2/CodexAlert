import { createAdminClient } from "../_shared/db.ts";
import {
  constantTimeEqual,
  createRandomToken,
  encryptSecret,
  hmacSha256Hex,
  sha256Hex,
} from "../_shared/crypto.ts";
import { sendProviderMessage } from "../_shared/provider-delivery.ts";
import { getRequiredEnv } from "../_shared/env.ts";
import { logError, logEvent } from "../_shared/logging.ts";
import { parseTelegramUpdate } from "../_shared/telegram.ts";

const encoder = new TextEncoder();

function ok(): Response {
  return new Response("ok", {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function stopSubscription(chatId: string): Promise<boolean> {
  const client = createAdminClient();
  const fingerprint = await hmacSha256Hex(
    `telegram:shared:${chatId}`,
    getRequiredEnv("HMAC_KEY"),
  );
  const { data, error } = await client.rpc("deactivate_telegram_subscription", {
    p_webhook_fingerprint: fingerprint,
  });
  if (error) throw error;
  return data === true;
}

async function startSubscription(chatId: string): Promise<boolean> {
  const client = createAdminClient();
  const fingerprint = await hmacSha256Hex(
    `telegram:shared:${chatId}`,
    getRequiredEnv("HMAC_KEY"),
  );
  const [{ ciphertext, iv }, unsubscribeTokenHash] = await Promise.all([
    encryptSecret(
      JSON.stringify({ channel: "telegram", chatId }),
      getRequiredEnv("WEBHOOK_ENCRYPTION_KEY"),
    ),
    sha256Hex(createRandomToken()),
  ]);
  const { data, error } = await client.rpc("upsert_subscription", {
    p_webhook_ciphertext: ciphertext,
    p_webhook_iv: iv,
    p_webhook_fingerprint: fingerprint,
    p_webhook_id: "telegram",
    p_unsubscribe_token_hash: unsubscribeTokenHash,
  });
  if (error) throw error;
  return Array.isArray(data) && Boolean(data[0]?.subscription_id);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });

  let expectedSecret: string;
  try {
    expectedSecret = getRequiredEnv("TELEGRAM_WEBHOOK_SECRET");
  } catch {
    logError("telegram_webhook_not_configured");
    return new Response(null, { status: 503 });
  }
  if (
    !constantTimeEqual(
      request.headers.get("x-telegram-bot-api-secret-token") ?? "",
      expectedSecret,
    )
  ) {
    return new Response(null, { status: 401 });
  }

  let update: unknown;
  try {
    const body = await request.text();
    if (encoder.encode(body).byteLength > 16_384) return ok();
    update = JSON.parse(body);
  } catch {
    return ok();
  }

  const action = parseTelegramUpdate(update);
  if (!action) return ok();

  try {
    if (action.type === "blocked") {
      await stopSubscription(action.chatId);
      logEvent("telegram_bot_blocked");
      return ok();
    }

    if (action.command === "start" || action.command === "subscribe") {
      const subscribed = await startSubscription(action.chatId);
      if (!subscribed) throw new Error("Subscription was not saved");
      await sendProviderMessage(
        { channel: "telegram", chatId: action.chatId },
        "You’re subscribed to CodexAlert. I’ll message you when the community tracker reports a Codex limit reset. Send /stop any time to unsubscribe.",
      );
      logEvent("telegram_subscribed");
      return ok();
    }

    if (action.command === "stop" || action.command === "unsubscribe") {
      const removed = await stopSubscription(action.chatId);
      await sendProviderMessage(
        { channel: "telegram", chatId: action.chatId },
        removed
          ? "You’re unsubscribed from CodexAlert. Send /start any time to subscribe again."
          : "There wasn’t an active CodexAlert subscription for this chat.",
      );
      logEvent("telegram_unsubscribed", { removed });
      return ok();
    }

    await sendProviderMessage(
      { channel: "telegram", chatId: action.chatId },
      "Use /start to subscribe to CodexAlert or /stop to unsubscribe.",
    );
    return ok();
  } catch {
    logError("telegram_update_processing_failed");
    return new Response(null, { status: 500 });
  }
});
