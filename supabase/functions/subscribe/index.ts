import { isOriginAllowed, optionsResponse } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/db.ts";
import {
  createRandomToken,
  encryptSecret,
  hmacSha256Hex,
  sha256Hex,
} from "../_shared/crypto.ts";
import {
  confirmationMessage,
  sendDiscordWebhook,
  validateDiscordWebhookUrl,
  verifyDiscordWebhook,
} from "../_shared/discord.ts";
import { getRequiredEnv } from "../_shared/env.ts";
import { logError, logEvent, safeErrorMessage } from "../_shared/logging.ts";
import { consumeRequestLimit } from "../_shared/rate-limit.ts";
import {
  jsonResponse,
  publicError,
  readJsonObject,
} from "../_shared/responses.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (!isOriginAllowed(request)) {
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
    const client = createAdminClient();
    const allowed = await consumeRequestLimit(
      client,
      request,
      "subscribe",
      5,
      3_600,
    );
    if (!allowed) {
      return publicError(
        request,
        429,
        "rate_limited",
        "Too many attempts. Try again later.",
      );
    }

    const body = await readJsonObject(request);
    if (typeof body.webhookUrl !== "string") {
      return publicError(
        request,
        400,
        "invalid_webhook",
        "Enter a valid Discord webhook URL.",
      );
    }

    let webhook;
    try {
      webhook = validateDiscordWebhookUrl(body.webhookUrl);
    } catch {
      return publicError(
        request,
        400,
        "invalid_webhook",
        "Enter a valid Discord webhook URL.",
      );
    }

    const verification = await verifyDiscordWebhook(webhook);
    if (!verification.ok) {
      const status = verification.category === "rate_limited" ? 503 : 400;
      return publicError(
        request,
        status,
        "webhook_unavailable",
        "Discord could not verify this webhook. Check it and try again.",
      );
    }

    const confirmation = await sendDiscordWebhook(
      webhook.normalizedUrl,
      confirmationMessage(),
    );
    if (!confirmation.ok) {
      return publicError(
        request,
        502,
        "test_delivery_failed",
        "The webhook was found, but Discord did not accept the test message.",
      );
    }

    const encryptionKey = getRequiredEnv("WEBHOOK_ENCRYPTION_KEY");
    const hmacKey = getRequiredEnv("HMAC_KEY");
    const unsubscribeToken = createRandomToken();
    const [{ ciphertext, iv }, webhookFingerprint, unsubscribeTokenHash] =
      await Promise.all([
        encryptSecret(webhook.normalizedUrl, encryptionKey),
        hmacSha256Hex(`webhook:${webhook.normalizedUrl}`, hmacKey),
        sha256Hex(unsubscribeToken),
      ]);

    const { data, error } = await client.rpc("upsert_subscription", {
      p_webhook_ciphertext: ciphertext,
      p_webhook_iv: iv,
      p_webhook_fingerprint: webhookFingerprint,
      p_webhook_id: webhook.webhookId,
      p_unsubscribe_token_hash: unsubscribeTokenHash,
    });
    if (error) throw error;

    const result = Array.isArray(data)
      ? data[0] as { subscription_id?: string; created?: boolean }
      : null;
    if (!result?.subscription_id) {
      throw new Error("Subscription RPC returned no identifier");
    }

    logEvent("subscription_saved", {
      subscriptionId: result.subscription_id,
      webhookId: webhook.webhookId,
      created: result.created === true,
    });
    return jsonResponse(request, {
      success: true,
      unsubscribeToken,
      message: result.created === true
        ? "Subscription created."
        : "Subscription refreshed.",
    }, result.created === true ? 201 : 200);
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
    logError("subscription_failed", { error: safeErrorMessage(error) });
    return publicError(
      request,
      500,
      "internal_error",
      "Subscription could not be completed. Try again later.",
    );
  }
});
