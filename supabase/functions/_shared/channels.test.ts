import { assertEquals, assertThrows } from "jsr:@std/assert@1.0.19";
import {
  decodeDestination,
  deliver,
  destinationIdentity,
  encodeDestination,
  validateDestination,
} from "./channels.ts";

const slack =
  "https://hooks.slack.com/services/T12345678/B12345678/abcdefghijklmnopqrstuvwxyz";
const token = "123456789:abcdefghijklmnopqrstuvwxyzABCDEFGH";
const telegram = validateDestination({
  channel: "telegram",
  botToken: token,
  chatId: "-1001234567890",
});

Deno.test("Slack rejects SSRF and URL parser normalization tricks", () => {
  for (
    const url of [
      slack + "?x=1",
      slack + "#x",
      slack.replace("hooks.slack.com", "hooks.slack.com.evil.test"),
      slack.replace("hooks.slack.com", "user@hooks.slack.com"),
      slack.replace("https:", "http:"),
      slack.replace("hooks.slack.com", "hooks.slack.com:443"),
      "https://127.0.0.1/services/a/b/c",
    ]
  ) {
    assertThrows(() =>
      validateDestination({ channel: "slack", webhookUrl: url })
    );
  }
  assertEquals(
    validateDestination({ channel: "slack", webhookUrl: slack }).channel,
    "slack",
  );
});

Deno.test("Telegram validates tokens and bounded destinations", () => {
  for (
    const chatId of [
      "",
      "0",
      "1/../../",
      "@abc",
      "1?x",
      "90071992547409999999999",
    ]
  ) {
    assertThrows(() =>
      validateDestination({ channel: "telegram", botToken: token, chatId })
    );
  }
  assertThrows(() =>
    validateDestination({
      channel: "telegram",
      botToken: token + "/deleteWebhook",
      chatId: "1234",
    })
  );
  assertThrows(() => validateDestination({ channel: "unknown" }));
});

Deno.test("Encrypted envelopes round trip and legacy Discord remains compatible", () => {
  assertEquals(decodeDestination(encodeDestination(telegram)), telegram);
  const discord = "https://discord.com/api/webhooks/123456789012345678/" +
    "a".repeat(60);
  const legacy = decodeDestination(discord);
  assertEquals(encodeDestination(legacy), discord);
  assertEquals(destinationIdentity(legacy), "webhook:" + discord);
  assertEquals(
    destinationIdentity(telegram),
    "telegram:123456789:-1001234567890",
  );
});

Deno.test("Telegram posts plain text only to fixed API host", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async (url, init) => {
    calls++;
    assertEquals(
      String(url),
      "https://api.telegram.org/bot" + token + "/sendMessage",
    );
    assertEquals(init?.redirect, "manual");
    const body = JSON.parse(String(init?.body));
    assertEquals(body.chat_id, "-1001234567890");
    assertEquals(body.parse_mode, undefined);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  assertEquals((await deliver(telegram, undefined, null, fetcher)).ok, true);
  assertEquals(calls, 1);
});

Deno.test("Slack delivery verifies acknowledgement and never retries redirects or transport errors", async () => {
  const destination = validateDestination({
    channel: "slack",
    webhookUrl: slack,
  });
  for (const status of [302, 400, 403, 404, 429, 500]) {
    let calls = 0;
    const result = await deliver(
      destination,
      "2026-09-22T00:00:00Z",
      null,
      async (_url, init) => {
        calls++;
        assertEquals(init?.redirect, "manual");
        assertEquals(JSON.parse(String(init?.body)).mrkdwn, false);
        return new Response("", { status });
      },
    );
    assertEquals(result.ok, false);
    assertEquals(calls, 1);
    assertEquals(result.permanent, [400, 403, 404].includes(status));
  }
  assertEquals(
    (await deliver(
      destination,
      undefined,
      null,
      async () => new Response("ok"),
    )).ok,
    true,
  );
  assertEquals(
    (await deliver(
      destination,
      undefined,
      null,
      async () => new Response("no"),
    )).ok,
    false,
  );
  assertEquals(
    (await deliver(
      telegram,
      undefined,
      null,
      async () => new Response('{"ok":false}'),
    )).ok,
    false,
  );
  assertEquals(
    (await deliver(telegram, undefined, null, async () => {
      throw new Error(token);
    })).category,
    "delivery_unknown",
  );
});
