import { ApiError, getStatus, subscribe } from "./api.ts";
import { unsubscribeUrl } from "./config.ts";
import { formatDate, getElement, setMessage } from "./dom.ts";
import "./styles.css";

const form = getElement<HTMLFormElement>("#subscribe-form");
const webhookInput = getElement<HTMLInputElement>("#webhook-url");
const submitButton = getElement<HTMLButtonElement>("#subscribe-button");
const formMessage = getElement<HTMLElement>("#form-message");
const successPanel = getElement<HTMLElement>("#success-panel");
const unsubscribeLink = getElement<HTMLInputElement>("#unsubscribe-link");
const copyButton = getElement<HTMLButtonElement>("#copy-link");
const statusCard = getElement<HTMLElement>("#status-card");
const statusLabel = getElement<HTMLElement>("#status-label");
const statusDot = getElement<HTMLElement>("#status-dot");
const lastChecked = getElement<HTMLElement>("#last-checked");
const lastReset = getElement<HTMLElement>("#last-reset");

async function refreshStatus(): Promise<void> {
  try {
    const status = await getStatus();
    const labels = {
      yes: "Reset reported",
      no: "No reset reported",
      unknown: "Waiting for first check",
    } as const;
    statusLabel.textContent = labels[status.state];
    statusDot.dataset.state = status.state;
    statusCard.dataset.state = status.state;
    lastChecked.textContent = formatDate(status.lastCheckedAt);
    lastReset.textContent = formatDate(status.lastResetAt);
  } catch {
    statusLabel.textContent = "Status unavailable";
    statusDot.dataset.state = "unknown";
    statusCard.dataset.state = "unknown";
    lastChecked.textContent = "Try again shortly";
  }
}

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
    successPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    const message = error instanceof ApiError ? error.message : "Subscription failed. Try again.";
    setMessage(formMessage, message, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Test & subscribe";
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

void refreshStatus();
