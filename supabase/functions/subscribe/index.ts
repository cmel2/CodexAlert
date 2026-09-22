import { isOriginAllowed, optionsResponse } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/db.ts";
import {
  createRandomToken,
  encryptSecret,
  hmacSha256Hex,
  sha256Hex,
} from "../_shared/crypto.ts";
import {
  deliver,
  destinationIdentity,
  encodeDestination,
  validateDestination,
} from "../_shared/channels.ts";
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
    let destination;
    try {
      destination = validateDestination(body);
    } catch {
      return publicError(
        request,
        400,
        "invalid_destination",
        "Enter a valid webhook, or Telegram bot token and chat ID.",
      );
    }
    const confirmation = await deliver(destination);
    if (!confirmation.ok) {
      return publicError(
        request,
        502,
        "test_delivery_failed",
        "The channel did not accept the test message. Check the credentials and bot or webhook permissions.",
      );
    }

    const encryptionKey = getRequiredEnv("WEBHOOK_ENCRYPTION_KEY");
    const hmacKey = getRequiredEnv("HMAC_KEY");
    const unsubscribeToken = createRandomToken();
    const [{ ciphertext, iv }, webhookFingerprint, unsubscribeTokenHash] =
      await Promise.all([
        encryptSecret(encodeDestination(destination), encryptionKey),
        hmacSha256Hex(destinationIdentity(destination), hmacKey),
        sha256Hex(unsubscribeToken),
      ]);

    const { data, error } = await client.rpc("upsert_subscription", {
      p_webhook_ciphertext: ciphertext,
      p_webhook_iv: iv,
      p_webhook_fingerprint: webhookFingerprint,
      p_webhook_id: destination.channel,
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
      channel: destination.channel,
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
