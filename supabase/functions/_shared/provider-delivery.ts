import type { Destination } from "./channels.ts";
import type { DiscordDeliveryResult } from "./types.ts";

export async function sendProviderMessage(
  destination: Exclude<Destination, { channel: "discord" }>,
  text: string,
  fetcher: typeof fetch = fetch,
): Promise<DiscordDeliveryResult> {
  const telegram = destination.channel === "telegram";
  const url = telegram
    ? `https://api.telegram.org/bot${destination.botToken}/sendMessage`
    : destination.webhookUrl;
  const payload = telegram
    ? {
      chat_id: destination.chatId,
      text,
      link_preview_options: { is_disabled: true },
    }
    : { text, mrkdwn: false, unfurl_links: false, unfurl_media: false };
  try {
    const response = await fetcher(url, {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    // Do not retry ambiguous responses: the provider may already have delivered the alert.
    let accepted = false;
    if (response.ok) {
      accepted = telegram
        ? (await response.json()).ok === true
        : (await response.text()).trim() === "ok";
    } else {
      await response.body?.cancel();
    }
    return {
      ok: accepted,
      status: response.status,
      category: accepted ? null : "provider_rejected",
      permanent: [400, 401, 403, 404, 410].includes(response.status),
    };
  } catch {
    // Never log a fetch exception containing a bot token or webhook URL.
    return {
      ok: false,
      status: null,
      category: "delivery_unknown",
      permanent: false,
    };
  }
}
