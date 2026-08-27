import { ApiError, subscribe } from "./api.ts";
import { unsubscribeUrl } from "./config.ts";
import { getElement, setMessage } from "./dom.ts";
import "./site.ts";

const form = getElement<HTMLFormElement>("#subscribe-form");
const webhookInput = getElement<HTMLInputElement>("#webhook-url");
const submitButton = getElement<HTMLButtonElement>("#subscribe-button");
const formMessage = getElement<HTMLElement>("#form-message");
const successPanel = getElement<HTMLElement>("#success-panel");
const unsubscribeLink = getElement<HTMLInputElement>("#unsubscribe-link");
const copyButton = getElement<HTMLButtonElement>("#copy-link");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const webhookUrl = webhookInput.value.trim();
  if (!webhookUrl) {
    setMessage(formMessage, "Paste a Discord webhook URL first.", "error");
    webhookInput.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Testing webhook…";
  formMessage.hidden = true;
  successPanel.hidden = true;
  try {
    const result = await subscribe(webhookUrl);
    unsubscribeLink.value = unsubscribeUrl(result.unsubscribeToken);
    webhookInput.value = "";
    successPanel.hidden = false;
    successPanel.scrollIntoView({
      behavior: reducedMotion.matches ? "auto" : "smooth",
      block: "nearest",
    });
  } catch (error) {
    const message = error instanceof ApiError ? error.message : "Subscription failed. Try again.";
    setMessage(formMessage, message, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Add Discord Webhook";
  }
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(unsubscribeLink.value);
    copyButton.textContent = "Copied";
    window.setTimeout(() => (copyButton.textContent = "Copy link"), 1_800);
  } catch {
    unsubscribeLink.select();
    setMessage(formMessage, "Select and copy the link manually.", "neutral");
  }
});
