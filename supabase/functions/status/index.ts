import { isOriginAllowed, optionsResponse } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/db.ts";
import { logError, safeErrorMessage } from "../_shared/logging.ts";
import { jsonResponse, publicError } from "../_shared/responses.ts";

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
  if (request.method !== "GET") {
    return publicError(
      request,
      405,
      "method_not_allowed",
      "Use GET for this endpoint.",
    );
  }

  try {
    const { data, error } = await createAdminClient()
      .from("reset_state")
      .select(
        "latest_observed_status, latest_observed_reset_at, last_checked_at",
      )
      .eq("singleton", true)
      .single();
    if (error) throw error;

    return jsonResponse(
      request,
      {
        state: data.latest_observed_status,
        lastCheckedAt: data.last_checked_at,
        lastResetAt: data.latest_observed_reset_at,
      },
      200,
      { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
    );
  } catch (error) {
    logError("public_status_failed", { error: safeErrorMessage(error) });
    return publicError(
      request,
      503,
      "status_unavailable",
      "Status is temporarily unavailable.",
    );
  }
});
