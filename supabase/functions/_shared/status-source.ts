import type { ParsedStatus } from "./types.ts";

export const STATUS_API_URL = "https://hascodexratelimitreset.today/api/status";
const MAX_RESPONSE_BYTES = 65_536;
const FETCH_TIMEOUT_MS = 8_000;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function timestampToIso(value: unknown): string | null {
  let milliseconds: number;
  if (typeof value === "number" && Number.isFinite(value)) {
    milliseconds = value < 10_000_000_000 ? value * 1_000 : value;
  } else if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    milliseconds = Number.isFinite(numeric)
      ? (numeric < 10_000_000_000 ? numeric * 1_000 : numeric)
      : Date.parse(value);
  } else {
    return null;
  }

  if (!Number.isFinite(milliseconds)) return null;
  const date = new Date(milliseconds);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

export function parseStatusPayload(value: unknown): ParsedStatus {
  if (!isRecord(value) || (value.state !== "yes" && value.state !== "no")) {
    throw new TypeError("Status response has an unsupported state");
  }

  const resetAt = timestampToIso(value.resetAt);
  const automationSummary = isRecord(value.automationSummary)
    ? value.automationSummary
    : null;
  const lastReset = automationSummary && isRecord(automationSummary.lastReset)
    ? automationSummary.lastReset
    : null;
  const lastReportedResetAt = resetAt ?? timestampToIso(lastReset?.checkedAt);

  if (value.state === "no") {
    return { state: "no", resetIdentifier: null, resetAt: lastReportedResetAt };
  }

  if (resetAt) {
    return { state: "yes", resetIdentifier: `reset-at:${resetAt}`, resetAt };
  }

  const tweetId = lastReset?.tweetId;
  if (typeof tweetId === "string" && /^\d{5,30}$/u.test(tweetId)) {
    return {
      state: "yes",
      resetIdentifier: `source-event:${tweetId}`,
      resetAt: timestampToIso(lastReset?.checkedAt),
    };
  }

  const sourceCheckedAt = timestampToIso(lastReset?.checkedAt);
  if (sourceCheckedAt) {
    return {
      state: "yes",
      resetIdentifier: `source-check:${sourceCheckedAt}`,
      resetAt: sourceCheckedAt,
    };
  }

  // updatedAt is intentionally not a fallback: it can change without a new reset.
  return { state: "yes", resetIdentifier: null, resetAt: null };
}

export interface StatusFetchResult {
  ok: boolean;
  httpStatus: number | null;
  parsed: ParsedStatus | null;
  errorCategory: "fetch_error" | "invalid_response" | null;
}

export async function fetchResetStatus(
  fetcher: typeof fetch = fetch,
): Promise<StatusFetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetcher(STATUS_API_URL, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": "CodexAlert/1.0" },
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      return {
        ok: false,
        httpStatus: response.status,
        parsed: null,
        errorCategory: "fetch_error",
      };
    }

    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
      await response.body?.cancel();
      return {
        ok: false,
        httpStatus: response.status,
        parsed: null,
        errorCategory: "invalid_response",
      };
    }

    const body = await response.text();
    if (new TextEncoder().encode(body).byteLength > MAX_RESPONSE_BYTES) {
      return {
        ok: false,
        httpStatus: response.status,
        parsed: null,
        errorCategory: "invalid_response",
      };
    }

    try {
      return {
        ok: true,
        httpStatus: response.status,
        parsed: parseStatusPayload(JSON.parse(body)),
        errorCategory: null,
      };
    } catch {
      return {
        ok: false,
        httpStatus: response.status,
        parsed: null,
        errorCategory: "invalid_response",
      };
    }
  } catch {
    return {
      ok: false,
      httpStatus: null,
      parsed: null,
      errorCategory: "fetch_error",
    };
  } finally {
    clearTimeout(timeout);
  }
}
