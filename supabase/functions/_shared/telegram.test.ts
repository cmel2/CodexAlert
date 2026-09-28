import { assertEquals } from "jsr:@std/assert@1.0.19";
import { parseTelegramUpdate } from "./telegram.ts";

Deno.test("Telegram commands are recognized in private chats only", () => {
  assertEquals(
    parseTelegramUpdate({
      message: {
        chat: { id: 123456, type: "private" },
        text: "/start subscribe",
      },
    }),
    { type: "command", command: "start", chatId: "123456" },
  );
  assertEquals(
    parseTelegramUpdate({
      message: {
        chat: { id: 123456, type: "private" },
        text: "/stop@CodexAlertBot",
      },
    }),
    { type: "command", command: "stop", chatId: "123456" },
  );
  assertEquals(
    parseTelegramUpdate({
      message: { chat: { id: -123456, type: "group" }, text: "/start" },
    }),
    null,
  );
  assertEquals(
    parseTelegramUpdate({
      message: { chat: { id: 123456, type: "private" }, text: "/startle" },
    }),
    null,
  );
  assertEquals(
    parseTelegramUpdate({
      message: {
        chat: { id: 123456, type: "private" },
        from: { is_bot: true },
        text: "/start",
      },
    }),
    null,
  );
});

Deno.test("Blocking the bot in a private chat becomes an unsubscribe action", () => {
  assertEquals(
    parseTelegramUpdate({
      my_chat_member: {
        chat: { id: 123456, type: "private" },
        new_chat_member: { status: "kicked" },
      },
    }),
    { type: "blocked", chatId: "123456" },
  );
});
