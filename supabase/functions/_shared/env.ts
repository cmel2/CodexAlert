export function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getPositiveIntegerEnv(name: string, fallback: number): number {
  const rawValue = Deno.env.get(name);
  if (!rawValue) return fallback;

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`Environment variable ${name} must be a positive integer`);
  }
  return value;
}
