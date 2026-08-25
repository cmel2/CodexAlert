import type { SupabaseClient } from "npm:@supabase/supabase-js@2.112.4";
import { hmacSha256Hex } from "./crypto.ts";
import { getRequiredEnv } from "./env.ts";

function clientAddress(request: Request): string {
  const value = request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",").at(-1) ??
    "unknown";
  return value.trim().slice(0, 100);
}

export async function consumeRequestLimit(
  client: SupabaseClient,
  request: Request,
  action: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const requesterFingerprint = await hmacSha256Hex(
    `client:${clientAddress(request)}`,
    getRequiredEnv("HMAC_KEY"),
  );
  const { data, error } = await client.rpc("consume_rate_limit", {
    p_requester_fingerprint: requesterFingerprint,
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw error;
  return data === true;
}
