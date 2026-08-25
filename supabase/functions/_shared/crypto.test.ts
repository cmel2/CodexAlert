import { assertEquals, assertNotEquals } from "jsr:@std/assert@1.0.19";
import {
  constantTimeEqual,
  createRandomToken,
  decryptSecret,
  encryptSecret,
  hmacSha256Hex,
  sha256Hex,
} from "./crypto.ts";

const KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));

Deno.test("AES-GCM secret encryption round-trips with a random IV", async () => {
  const first = await encryptSecret("https://discord.com/secret", KEY);
  const second = await encryptSecret("https://discord.com/secret", KEY);
  assertNotEquals(first.ciphertext, second.ciphertext);
  assertEquals(
    await decryptSecret(first.ciphertext, first.iv, KEY),
    "https://discord.com/secret",
  );
});

Deno.test("hashing, HMAC, and constant-time comparison are deterministic", async () => {
  assertEquals(await sha256Hex("token"), await sha256Hex("token"));
  assertEquals(
    await hmacSha256Hex("webhook", KEY),
    await hmacSha256Hex("webhook", KEY),
  );
  assertEquals(constantTimeEqual("same", "same"), true);
  assertEquals(constantTimeEqual("same", "different"), false);
});

Deno.test("unsubscribe tokens contain strong base64url entropy", () => {
  const token = createRandomToken();
  assertEquals(token.length, 43);
  assertEquals(/^[A-Za-z0-9_-]+$/u.test(token), true);
  assertNotEquals(token, createRandomToken());
});
