import { assertEquals, assertThrows } from "jsr:@std/assert@1.0.19";
import { parseStatusPayload } from "./status-source.ts";

Deno.test("status parser handles a no state", () => {
  assertEquals(
    parseStatusPayload({ state: "no", resetAt: null, updatedAt: 123 }),
    {
      state: "no",
      resetIdentifier: null,
      resetAt: null,
    },
  );
});

Deno.test("status parser exposes a stable historical reset time while state is no", () => {
  assertEquals(
    parseStatusPayload({
      state: "no",
      resetAt: null,
      automationSummary: { lastReset: { checkedAt: 1_787_532_649_941 } },
    }),
    {
      state: "no",
      resetIdentifier: null,
      resetAt: "2026-08-24T00:50:49.941Z",
    },
  );
});

Deno.test("status parser prefers resetAt", () => {
  assertEquals(
    parseStatusPayload({ state: "yes", resetAt: 1_787_532_649_941 }),
    {
      state: "yes",
      resetIdentifier: "reset-at:2026-08-24T00:50:49.941Z",
      resetAt: "2026-08-24T00:50:49.941Z",
    },
  );
});

Deno.test("status parser falls back to a stable source event", () => {
  const parsed = parseStatusPayload({
    state: "yes",
    resetAt: null,
    updatedAt: 1_800_000_000_000,
    automationSummary: {
      lastReset: {
        tweetId: "2091688655828246890",
        checkedAt: 1_787_532_649_941,
      },
    },
  });
  assertEquals(parsed.resetIdentifier, "source-event:2091688655828246890");
  assertEquals(parsed.resetAt, "2026-08-24T00:50:49.941Z");
});

Deno.test("status parser never uses changing updatedAt as a reset identity", () => {
  const first = parseStatusPayload({
    state: "yes",
    resetAt: null,
    updatedAt: 100,
  });
  const second = parseStatusPayload({
    state: "yes",
    resetAt: null,
    updatedAt: 200,
  });
  assertEquals(first.resetIdentifier, null);
  assertEquals(second.resetIdentifier, null);
});

Deno.test("status parser rejects malformed responses", () => {
  assertThrows(() => parseStatusPayload({ state: "maybe" }));
  assertThrows(() => parseStatusPayload("yes"));
});
