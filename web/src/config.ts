function readSupabaseUrl(): string {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (!rawUrl) throw new Error("VITE_SUPABASE_URL is not configured");

  const url = new URL(rawUrl);
  const isLocal = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) {
    throw new Error("VITE_SUPABASE_URL must use HTTPS outside local development");
  }
  url.pathname = url.pathname.replace(/\/$/u, "");
  return url.toString().replace(/\/$/u, "");
}
export function functionUrl(name: "subscribe" | "unsubscribe" | "status"): string {
  return `${readSupabaseUrl()}/functions/v1/${name}`;
}

export function unsubscribeUrl(token: string): string {
  const url = new URL(`${import.meta.env.BASE_URL}unsubscribe/`, window.location.origin);
  url.searchParams.set("token", token);
  return url.toString();
}
