import { isOriginAllowed, optionsResponse } from "../_shared/cors.ts";
import { sha256Hex } from "../_shared/crypto.ts";
import { createAdminClient } from "../_shared/db.ts";
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
      "unsubscribe",
      20,
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
    if (
      typeof body.token !== "string" ||
      !/^[A-Za-z0-9_-]{40,100}$/u.test(body.token)
    ) {
      return publicError(
        request,
        400,
        "invalid_token",
        "This unsubscribe link is invalid.",
      );
    }

    const { data, error } = await client.rpc("deactivate_subscription", {
      p_unsubscribe_token_hash: await sha256Hex(body.token),
    });
    if (error) throw error;

    logEvent("unsubscribe_processed", { removed: data === true });
    // A generic response prevents token-validity probing and makes reuse harmless.
    return jsonResponse(request, {
      success: true,
      message: "If this link was active, the subscription has been removed.",
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
    logError("unsubscribe_failed", { error: safeErrorMessage(error) });
    return publicError(
      request,
      500,
      "internal_error",
      "Unsubscription could not be completed. Try again later.",
    );
  }
});
