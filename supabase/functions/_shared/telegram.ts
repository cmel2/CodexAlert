export type TelegramCommand =
  | "start"
  | "subscribe"
  | "stop"
  | "unsubscribe"
  | "help";

export type TelegramWebhookAction =
  | { type: "command"; command: TelegramCommand; chatId: string }
  | { type: "blocked"; chatId: string }
  | null;

function privateChatId(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    return null;
  }
  const id = String(value);
  return /^[1-9]\d{0,15}$/u.test(id) ? id : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readPrivateChat(
  value: unknown,
): { chatId: string; chat: Record<string, unknown> } | null {
  const chat = record(value);
  if (!chat || chat.type !== "private") return null;
  const chatId = privateChatId(chat.id);
  return chatId ? { chatId, chat } : null;
}

export function parseTelegramUpdate(update: unknown): TelegramWebhookAction {
  const body = record(update);
  if (!body) return null;

  const message = record(body.message);
  if (message) {
    const privateChat = readPrivateChat(message.chat);
    if (!privateChat || typeof message.text !== "string") return null;
    const sender = record(message.from);
    if (sender?.is_bot === true) return null;
    const match =
      /^\/(start|subscribe|stop|unsubscribe|help)(?:@[A-Za-z0-9_]+)?(?:\s|$)/iu
        .exec(message.text.trim());
    if (!match) return null;
    return {
      type: "command",
      command: match[1]!.toLowerCase() as TelegramCommand,
      chatId: privateChat.chatId,
    };
  }

  const membership = record(body.my_chat_member);
  if (membership) {
    const privateChat = readPrivateChat(membership.chat);
    const newMember = record(membership.new_chat_member);
    if (
      privateChat && newMember &&
      (newMember.status === "kicked" || newMember.status === "left")
    ) {
      return { type: "blocked", chatId: privateChat.chatId };
    }
  }

  return null;
}
