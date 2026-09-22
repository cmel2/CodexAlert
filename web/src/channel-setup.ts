import { ApiError, subscribe } from "./api.ts";
import { unsubscribeUrl } from "./config.ts";
import { getElement, setMessage } from "./dom.ts";
import "./site.ts";
import "./channel-setup.css";

const form = getElement<HTMLFormElement>("#subscribe-form");
const button = getElement<HTMLButtonElement>("#subscribe-button");
const message = getElement<HTMLElement>("#form-message");
const panel = getElement<HTMLElement>("#success-panel");
const link = getElement<HTMLInputElement>("#unsubscribe-link");
const copy = getElement<HTMLButtonElement>("#copy-link");
const label = button.textContent;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (button.disabled || !form.reportValidity()) return;
  const values = new FormData(form);
  const input = form.dataset.channel === "slack"
    ? { channel: "slack" as const, webhookUrl: String(values.get("webhookUrl") ?? "").trim() }
    : { channel: "telegram" as const, botToken: String(values.get("botToken") ?? "").trim(), chatId: String(values.get("chatId") ?? "").trim() };
  button.disabled = true;
  button.textContent = "Sending test…";
  message.hidden = true;
  panel.hidden = true;
  try {
    const result = await subscribe(input);
    form.reset();
    link.value = unsubscribeUrl(result.unsubscribeToken);
    panel.hidden = false;
  } catch (error) {
    setMessage(message, error instanceof ApiError ? error.message : "Could not connect. Try again.", "error");
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
});

copy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(link.value);
    copy.textContent = "Copied";
    window.setTimeout(() => { copy.textContent = "Copy link"; }, 1800);
  } catch {
    link.select();
    setMessage(message, "Select and copy the link manually.", "neutral");
  }
});
