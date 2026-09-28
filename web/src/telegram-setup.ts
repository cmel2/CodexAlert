import { ApiError, setupTelegramBot } from "./api.ts";
import { getElement, setMessage } from "./dom.ts";
import "./site.ts";
import "./channel-setup.css";

const button = getElement<HTMLButtonElement>("#telegram-setup-button");
const message = getElement<HTMLElement>("#telegram-setup-message");
const botLink = getElement<HTMLAnchorElement>("#telegram-bot-link");
const originalLabel = button.textContent;

button.addEventListener("click", async () => {
  if (button.disabled) return;
  button.disabled = true;
  button.textContent = "Preparing…";
  message.hidden = true;
  botLink.hidden = true;

  try {
    const result = await setupTelegramBot();
    botLink.href = result.botUrl;
    botLink.textContent = `Open @${result.username} in Telegram ↗`;
    botLink.hidden = false;
    setMessage(message, "Ready. Open Telegram and press Start to subscribe.", "success");
  } catch (error) {
    setMessage(
      message,
      error instanceof ApiError
        ? error.message
        : "Could not prepare the Telegram link. Try again later.",
      "error",
    );
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
});
