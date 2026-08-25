type LogFields = Record<string, string | number | boolean | null | undefined>;

export function logEvent(event: string, fields: LogFields = {}): void {
  console.log(
    JSON.stringify({ event, at: new Date().toISOString(), ...fields }),
  );
}

export function logError(event: string, fields: LogFields = {}): void {
  console.error(
    JSON.stringify({ event, at: new Date().toISOString(), ...fields }),
  );
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.name;
  return "UnknownError";
}
