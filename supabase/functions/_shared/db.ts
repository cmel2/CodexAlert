import {
  createClient,
  type SupabaseClient,
} from "npm:@supabase/supabase-js@2.112.4";
import { getRequiredEnv } from "./env.ts";

function serviceRoleKey(): string {
  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (legacyKey) return legacyKey;

  const configuredKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (configuredKeys) {
    const keys = JSON.parse(configuredKeys) as Record<string, string>;
    const key = keys.default ?? Object.values(keys)[0];
    if (key) return key;
  }

  const localKey = Deno.env.get("SUPABASE_SECRET_KEY")?.trim();
  if (localKey) return localKey;
  throw new Error("No Supabase server-side secret key is available");
}

export function createAdminClient(): SupabaseClient {
  return createClient(getRequiredEnv("SUPABASE_URL"), serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "codex-alert-edge/1.0" } },
  });
}
