import { corsHeaders } from "./cors.ts";

export function jsonResponse(
  request: Request,
  body: unknown,
  status = 200,
  extraHeaders: HeadersInit = {},
): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...corsHeaders(request),
    ...extraHeaders,
  });
  return new Response(JSON.stringify(body), { status, headers });
}

export function publicError(
  request: Request,
  status: number,
  code: string,
  message: string,
): Response {
  return jsonResponse(request, { success: false, code, message }, status);
}

export async function readJsonObject(
  request: Request,
  maxBytes = 2_048,
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]
    .trim();
  if (contentType !== "application/json") {
    throw new TypeError("Content-Type must be application/json");
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RangeError("Request body is too large");
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new RangeError("Request body is too large");
  }

  const value: unknown = JSON.parse(text);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Request body must be a JSON object");
  }
  return value as Record<string, unknown>;
}
