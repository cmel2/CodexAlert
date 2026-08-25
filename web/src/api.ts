import { functionUrl } from "./config.ts";

export interface PublicStatus {
  state: "yes" | "no" | "unknown";
  lastCheckedAt: string | null;
  lastResetAt: string | null;
}
export interface SubscribeResult {
  success: true;
  unsubscribeToken: string;
  message: string;
}

interface ErrorBody {
  message?: unknown;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number | null) {
    super(message);
    this.name = "ApiError";
  }
}

async function requestJson<T>(url: string, init: RequestInit, timeoutMs = 12_000): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiError("The service returned an unreadable response.", response.status);
    }

    if (!response.ok) {
      const errorBody = body as ErrorBody;
      const message = typeof errorBody.message === "string"
        ? errorBody.message
        : "The request could not be completed.";
      throw new ApiError(message, response.status);
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("The service took too long to respond. Try again.", null);
    }
    throw new ApiError("The service is unreachable right now. Try again.", null);
  } finally {
    window.clearTimeout(timeout);
  }
}

export function getStatus(): Promise<PublicStatus> {
  return requestJson(functionUrl("status"), { method: "GET", headers: { Accept: "application/json" } });
}

export function subscribe(webhookUrl: string): Promise<SubscribeResult> {
  return requestJson(functionUrl("subscribe"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ webhookUrl }),
  });
}

export function unsubscribe(token: string): Promise<{ success: true; message: string }> {
  return requestJson(functionUrl("unsubscribe"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ token }),
  });
}
