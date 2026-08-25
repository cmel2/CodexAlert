import { mapWithConcurrency } from "../_shared/concurrency.ts";
import { constantTimeEqual, decryptSecret } from "../_shared/crypto.ts";
import { createAdminClient } from "../_shared/db.ts";
import {
  resetNotificationMessage,
  sendDiscordWebhook,
  validateDiscordWebhookUrl,
} from "../_shared/discord.ts";
import { getPositiveIntegerEnv, getRequiredEnv } from "../_shared/env.ts";
import { logError, logEvent, safeErrorMessage } from "../_shared/logging.ts";
import { jsonResponse, publicError } from "../_shared/responses.ts";
import { fetchResetStatus } from "../_shared/status-source.ts";
import type {
  ClaimedDelivery,
  ClaimResetResult,
  DiscordDeliveryResult,
} from "../_shared/types.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.112.4";

async function recordObservation(
  client: SupabaseClient,
  values: {
    checkedAt: string;
    httpStatus: number | null;
    state: "yes" | "no" | "unknown";
    resetIdentifier: string | null;
    resetAt: string | null;
    result: string;
    errorMessage?: string | null;
  },
): Promise<void> {
  const { error } = await client.rpc("record_status_observation", {
    p_checked_at: values.checkedAt,
    p_http_status: values.httpStatus,
    p_parsed_state: values.state,
    p_reset_identifier: values.resetIdentifier,
    p_reset_at: values.resetAt,
    p_processing_result: values.result,
    p_error_message: values.errorMessage ?? null,
  });
  if (error) throw error;
}

async function recordDelivery(
  client: SupabaseClient,
  delivery: ClaimedDelivery,
  result: DiscordDeliveryResult,
  disableThreshold: number,
): Promise<void> {
  const { error } = await client.rpc("record_delivery_result", {
    p_delivery_id: delivery.deliveryId,
    p_subscription_id: delivery.subscriptionId,
    p_success: result.ok,
    p_http_status: result.status,
    p_error_category: result.category,
    p_permanent_failure: result.permanent,
    p_disable_threshold: disableThreshold,
  });
  if (error) throw error;
}

function isClaimResult(value: unknown): value is ClaimResetResult {
  if (value === null || typeof value !== "object") return false;
  const result = value as Partial<ClaimResetResult>;
  return typeof result.isNewReset === "boolean" &&
    Array.isArray(result.deliveries);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return publicError(
      request,
      405,
      "method_not_allowed",
      "Use POST for this endpoint.",
    );
  }

  let expectedSecret: string;
  try {
    expectedSecret = getRequiredEnv("CRON_SECRET");
  } catch (error) {
    logError("cron_configuration_error", { error: safeErrorMessage(error) });
    return publicError(
      request,
      500,
      "internal_error",
      "Checker authentication is not configured.",
    );
  }
  const suppliedSecret = request.headers.get("x-cron-secret") ?? "";
  if (!constantTimeEqual(suppliedSecret, expectedSecret)) {
    logEvent("cron_auth_rejected");
    return publicError(request, 401, "unauthorized", "Authentication failed.");
  }

  const checkedAt = new Date().toISOString();
  const claimOwner = crypto.randomUUID();
  logEvent("status_check_started", { claimOwner });

  try {
    const client = createAdminClient();
    const fetched = await fetchResetStatus();
    if (!fetched.ok || !fetched.parsed) {
      await recordObservation(client, {
        checkedAt,
        httpStatus: fetched.httpStatus,
        state: "unknown",
        resetIdentifier: null,
        resetAt: null,
        result: fetched.errorCategory ?? "fetch_error",
        errorMessage: fetched.errorCategory,
      });
      logError("status_check_failed", {
        category: fetched.errorCategory,
        httpStatus: fetched.httpStatus,
      });
      return jsonResponse(request, {
        success: false,
        result: fetched.errorCategory,
      }, 502);
    }

    const parsed = fetched.parsed;
    if (parsed.state !== "yes") {
      await recordObservation(client, {
        checkedAt,
        httpStatus: fetched.httpStatus,
        state: parsed.state,
        resetIdentifier: parsed.resetIdentifier,
        resetAt: parsed.resetAt,
        result: "not_reset",
      });
      logEvent("status_check_completed", {
        state: parsed.state,
        notifications: 0,
      });
      return jsonResponse(request, {
        success: true,
        result: "not_reset",
        notifications: 0,
      });
    }

    if (!parsed.resetIdentifier) {
      await recordObservation(client, {
        checkedAt,
        httpStatus: fetched.httpStatus,
        state: parsed.state,
        resetIdentifier: null,
        resetAt: parsed.resetAt,
        result: "missing_reset_identifier",
      });
      logError("status_check_failed", { category: "missing_reset_identifier" });
      return jsonResponse(request, {
        success: false,
        result: "missing_reset_identifier",
      }, 422);
    }

    const { data: claimData, error: claimError } = await client.rpc(
      "claim_reset_deliveries",
      {
        p_reset_identifier: parsed.resetIdentifier,
        p_reset_at: parsed.resetAt,
        p_claim_owner: claimOwner,
      },
    );
    if (claimError) throw claimError;
    if (!isClaimResult(claimData)) {
      throw new Error("Claim RPC returned an invalid result");
    }

    const observationResult = claimData.isNewReset
      ? "new_reset"
      : "duplicate_reset";
    await recordObservation(client, {
      checkedAt,
      httpStatus: fetched.httpStatus,
      state: parsed.state,
      resetIdentifier: parsed.resetIdentifier,
      resetAt: parsed.resetAt,
      result: observationResult,
    });

    if (!claimData.isNewReset) {
      logEvent("status_check_completed", {
        state: parsed.state,
        result: "duplicate_reset",
        notifications: 0,
      });
      return jsonResponse(request, {
        success: true,
        result: "duplicate_reset",
        notifications: 0,
      });
    }

    logEvent("new_reset_detected", {
      resetIdentifier: parsed.resetIdentifier,
      deliveries: claimData.deliveries.length,
    });

    const encryptionKey = getRequiredEnv("WEBHOOK_ENCRYPTION_KEY");
    const concurrency = Math.min(
      getPositiveIntegerEnv("DELIVERY_CONCURRENCY", 10),
      20,
    );
    const disableThreshold = getPositiveIntegerEnv(
      "PERMANENT_FAILURE_DISABLE_THRESHOLD",
      2,
    );
    const message = resetNotificationMessage(checkedAt, parsed.resetAt);

    const results = await mapWithConcurrency(
      claimData.deliveries,
      concurrency,
      async (delivery): Promise<boolean> => {
        let result: DiscordDeliveryResult;
        try {
          const decryptedUrl = await decryptSecret(
            delivery.webhookCiphertext,
            delivery.webhookIv,
            encryptionKey,
          );
          const webhook = validateDiscordWebhookUrl(decryptedUrl);
          result = await sendDiscordWebhook(webhook.normalizedUrl, message);
          await recordDelivery(client, delivery, result, disableThreshold);
        } catch (error) {
          result = {
            ok: false,
            status: null,
            category: "credential_error",
            permanent: false,
          };
          try {
            await recordDelivery(client, delivery, result, disableThreshold);
          } catch (recordError) {
            logError("delivery_record_failed", {
              deliveryId: delivery.deliveryId,
              subscriptionId: delivery.subscriptionId,
              error: safeErrorMessage(recordError),
            });
          }
          logError("notification_failed", {
            deliveryId: delivery.deliveryId,
            subscriptionId: delivery.subscriptionId,
            category: result.category,
            error: safeErrorMessage(error),
          });
          return false;
        }

        logEvent(result.ok ? "notification_sent" : "notification_failed", {
          deliveryId: delivery.deliveryId,
          subscriptionId: delivery.subscriptionId,
          httpStatus: result.status,
          category: result.category,
        });
        return result.ok;
      },
    );

    const { error: completeError } = await client.rpc("complete_reset_batch", {
      p_reset_identifier: parsed.resetIdentifier,
    });
    if (completeError) throw completeError;

    const successCount = results.filter(Boolean).length;
    logEvent("notification_batch_completed", {
      resetIdentifier: parsed.resetIdentifier,
      attempted: results.length,
      succeeded: successCount,
      failed: results.length - successCount,
    });
    return jsonResponse(request, {
      success: true,
      result: "new_reset",
      notifications: { attempted: results.length, succeeded: successCount },
    });
  } catch (error) {
    logError("status_check_failed", {
      error: safeErrorMessage(error),
      claimOwner,
    });
    return publicError(
      request,
      500,
      "internal_error",
      "The scheduled check failed.",
    );
  }
});
