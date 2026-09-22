import {
  confirmationMessage,
  resetNotificationMessage,
  sendDiscordWebhook,
  validateDiscordWebhookUrl,
  verifyDiscordWebhook,
} from "./discord.ts";
import type { DiscordDeliveryResult } from "./types.ts";
import { sendProviderMessage } from "./provider-delivery.ts";

export type Destination = { channel: "discord"; webhookUrl: string } | {
  channel: "slack";
  webhookUrl: string;
} | { channel: "telegram"; botToken: string; chatId: string };

export function validateDestination(
  body: Record<string, unknown>,
): Destination {
  const channel = body.channel ?? "discord";
  if (channel === "discord" && typeof body.webhookUrl === "string") {
    return {
      channel,
      webhookUrl: validateDiscordWebhookUrl(body.webhookUrl).normalizedUrl,
    };
  }
  if (channel === "slack" && typeof body.webhookUrl === "string") {
    // Match the raw URL: no redirects, ports, credentials, query strings, or normalization tricks.
    if (
      !/^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9]{8,32}\/[A-Za-z0-9]{8,32}\/[A-Za-z0-9]{16,128}$/u
        .test(body.webhookUrl)
    ) {
      throw new TypeError("Invalid Slack webhook");
    }
    return { channel, webhookUrl: body.webhookUrl };
  }
  if (
    channel === "telegram" && typeof body.botToken === "string" &&
    typeof body.chatId === "string"
  ) {
    if (
      !/^\d{5,20}:[A-Za-z0-9_-]{30,100}$/u.test(body.botToken) ||
      !/^(?:-?[1-9]\d{0,15}|@[A-Za-z][A-Za-z0-9_]{4,31})$/u.test(body.chatId)
    ) {
      throw new TypeError("Invalid Telegram destination");
    }
    return { channel, botToken: body.botToken, chatId: body.chatId };
  }
  throw new TypeError("Invalid notification channel");
}

export function encodeDestination(destination: Destination): string {
  // Preserve existing Discord ciphertext format and duplicate identity.
  return destination.channel === "discord"
    ? destination.webhookUrl
    : JSON.stringify(destination);
}

export function decodeDestination(secret: string): Destination {
  return validateDestination(
    secret.startsWith("{") ? JSON.parse(secret) : { webhookUrl: secret },
  );
}

export function destinationIdentity(destination: Destination): string {
  if (destination.channel === "discord") {
    return `webhook:${destination.webhookUrl}`;
  }
  if (destination.channel === "slack") return `slack:${destination.webhookUrl}`;
  return `telegram:${
    destination.botToken.split(":")[0]
  }:${destination.chatId.toLowerCase()}`;
}

export async function deliver(
  destination: Destination,
  detectedAt?: string,
  resetAt: string | null = null,
  fetcher: typeof fetch = fetch,
): Promise<DiscordDeliveryResult> {
  if (destination.channel === "discord") {
    if (!detectedAt) {
      const verified = await verifyDiscordWebhook(
        validateDiscordWebhookUrl(destination.webhookUrl),
        fetcher,
      );
      if (!verified.ok) return verified;
    }
    return sendDiscordWebhook(
      destination.webhookUrl,
      detectedAt
        ? resetNotificationMessage(detectedAt, resetAt)
        : confirmationMessage(),
      fetcher,
    );
  }
  const text = detectedAt
    ? `Codex limits appear to have reset.\nDetected: ${detectedAt}${
      resetAt ? `\nReported reset: ${resetAt}` : ""
    }\nSource: https://hascodexratelimitreset.today/ by @jskoiz.\nUnofficial community signal; it may be delayed or inaccurate.`
    : "CodexAlert test: this destination can receive reset alerts. Save your private unsubscribe link after setup.";
  return sendProviderMessage(destination, text, fetcher);
}
