import {
  sendDiscordWebhook,
  validateDiscordWebhookUrl,
  verifyDiscordWebhook,
} from "./discord.ts";
import { assertEquals, assertThrows } from "jsr:@std/assert@1.0.19";

const WEBHOOK_ID = "123456789012345678";
const WEBHOOK_TOKEN =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_abcd";
const WEBHOOK_URL =
  `https://discord.com/api/webhooks/${WEBHOOK_ID}/${WEBHOOK_TOKEN}`;

Deno.test("Discord URL validation accepts and normalizes an incoming webhook", () => {
  assertEquals(validateDiscordWebhookUrl(WEBHOOK_URL), {
    normalizedUrl: WEBHOOK_URL,
    webhookId: WEBHOOK_ID,
  });
});

Deno.test("Discord URL validation normalizes an approved API variant", () => {
  const input =
    `https://canary.discord.com/api/v10/webhooks/${WEBHOOK_ID}/${WEBHOOK_TOKEN}`;
  assertEquals(validateDiscordWebhookUrl(input).normalizedUrl, WEBHOOK_URL);
});

Deno.test("Discord URL validation rejects SSRF and hostname tricks", () => {
  const rejected = [
    "http://127.0.0.1:5432/",
    `https://discord.com.attacker.example/api/webhooks/${WEBHOOK_ID}/${WEBHOOK_TOKEN}`,
    `https://discord.com@attacker.example/api/webhooks/${WEBHOOK_ID}/${WEBHOOK_TOKEN}`,
    `https://discord.com:444/api/webhooks/${WEBHOOK_ID}/${WEBHOOK_TOKEN}`,
    `${WEBHOOK_URL}?target=http://127.0.0.1`,
    `${WEBHOOK_URL}#fragment`,
    `https://dis\ncord.com/api/webhooks/${WEBHOOK_ID}/${WEBHOOK_TOKEN}`,
  ];
  for (const value of rejected) {
    assertThrows(() => validateDiscordWebhookUrl(value));
  }
});

Deno.test("Discord URL validation rejects excessively long input", () => {
  assertThrows(() =>
    validateDiscordWebhookUrl(`https://discord.com/${"a".repeat(600)}`)
  );
});

Deno.test("webhook verification requires matching incoming webhook metadata", async () => {
  const webhook = validateDiscordWebhookUrl(WEBHOOK_URL);
  const valid = await verifyDiscordWebhook(
    webhook,
    () => Promise.resolve(Response.json({ id: WEBHOOK_ID, type: 1 })),
  );
  assertEquals(valid.ok, true);

  const wrongType = await verifyDiscordWebhook(
    webhook,
    () => Promise.resolve(Response.json({ id: WEBHOOK_ID, type: 3 })),
  );
  assertEquals(wrongType, {
    ok: false,
    status: 200,
    category: "invalid_webhook",
    permanent: true,
  });
});

Deno.test("webhook verification classifies deleted webhooks", async () => {
  const result = await verifyDiscordWebhook(
    validateDiscordWebhookUrl(WEBHOOK_URL),
    () => Promise.resolve(new Response(null, { status: 404 })),
  );
  assertEquals(result, {
    ok: false,
    status: 404,
    category: "invalid_webhook",
    permanent: true,
  });
});

Deno.test("delivery succeeds on Discord 2xx", async () => {
  const result = await sendDiscordWebhook(
    WEBHOOK_URL,
    { content: "test" },
    () => Promise.resolve(new Response(null, { status: 204 })),
  );
  assertEquals(result.ok, true);
});

Deno.test("delivery honors a short Discord 429 retry", async () => {
  let calls = 0;
  const result = await sendDiscordWebhook(
    WEBHOOK_URL,
    { content: "test" },
    () => {
      calls += 1;
      return Promise.resolve(
        calls === 1
          ? Response.json({ retry_after: 0 }, { status: 429 })
          : new Response(null, { status: 204 }),
      );
    },
  );
  assertEquals(calls, 2);
  assertEquals(result.ok, true);
});

Deno.test("delivery records Discord 500 without risking a duplicate retry", async () => {
  let calls = 0;
  const result = await sendDiscordWebhook(
    WEBHOOK_URL,
    { content: "test" },
    () => {
      calls += 1;
      return Promise.resolve(new Response(null, { status: 500 }));
    },
  );
  assertEquals(calls, 1);
  assertEquals(result.category, "discord_server_error");
});

Deno.test("delivery does not retry an unknown network outcome", async () => {
  let calls = 0;
  const result = await sendDiscordWebhook(
    WEBHOOK_URL,
    { content: "test" },
    () => {
      calls += 1;
      return Promise.reject(new DOMException("timed out", "AbortError"));
    },
  );
  assertEquals(calls, 1);
  assertEquals(result.category, "timeout_unknown");
});
