import { createAdminClient } from "../_shared/db.ts";
import { getRequiredEnv } from "../_shared/env.ts";
import { logError, safeErrorMessage } from "../_shared/logging.ts";

const SOURCE_URL = "https://hascodexratelimitreset.today/";
const FEED_URL = `${getRequiredEnv("SUPABASE_URL").replace(/\/$/u, "")}/functions/v1/feed`;

function xml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function feedResponse(xmlBody: string, status = 200): Response {
  return new Response(xmlBody, {
    status,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

Deno.serve(async (request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET", "Cache-Control": "no-store" },
    });
  }

  try {
    const { data, error } = await createAdminClient()
      .from("reset_events")
      .select("reset_identifier, reset_at, detected_at")
      .order("detected_at", { ascending: false })
      .limit(20);
    if (error) throw error;

    const items = (data ?? []).map((event) =>
      `<item><title>Codex limits appear to have reset</title><link>${SOURCE_URL}</link><guid isPermaLink="false">${xml(event.reset_identifier)}</guid><pubDate>${new Date(event.detected_at).toUTCString()}</pubDate><description>${xml(`The community tracker reported a Codex rate-limit reset.${event.reset_at ? ` Reported reset: ${event.reset_at}.` : ""} Source: hascodexratelimitreset.today, created by @jskoiz. Unofficial signal; it may be delayed or inaccurate.`)}</description></item>`
    ).join("");
    const lastBuildDate = data?.[0]?.detected_at
      ? new Date(data[0].detected_at).toUTCString()
      : new Date().toUTCString();

    return feedResponse(
      `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>CodexAlert reset updates</title><link>${SOURCE_URL}</link><description>New Codex rate-limit resets reported by the community tracker.</description><language>en</language><lastBuildDate>${lastBuildDate}</lastBuildDate><atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${FEED_URL}" rel="self" type="application/rss+xml"/>${items}</channel></rss>`,
    );
  } catch (error) {
    logError("public_feed_failed", { error: safeErrorMessage(error) });
    return feedResponse("<?xml version=\"1.0\"?><error>Status feed is temporarily unavailable.</error>", 503);
  }
});
