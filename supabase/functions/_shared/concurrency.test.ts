import { assertEquals } from "jsr:@std/assert@1.0.19";
import { mapWithConcurrency } from "./concurrency.ts";

Deno.test("bounded mapper preserves result order and respects its limit", async () => {
  let active = 0;
  let peak = 0;
  const results = await mapWithConcurrency(
    [1, 2, 3, 4, 5],
    2,
    async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return value * 2;
    },
  );
  assertEquals(results, [2, 4, 6, 8, 10]);
  assertEquals(peak, 2);
});
