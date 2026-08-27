import { getStatus } from "./api.ts";
import { formatDate } from "./dom.ts";

const strip = document.querySelector<HTMLElement>("#status-strip");
const label = document.querySelector<HTMLElement>("#status-label");
const meta = document.querySelector<HTMLElement>("#status-meta");

let refreshInFlight = false;

async function refreshStatus(): Promise<void> {
  if (!strip || !label || !meta || refreshInFlight) return;
  refreshInFlight = true;
  try {
    const status = await getStatus();
    const labels = {
      yes: "Reset reported",
      no: "No reset reported",
      unknown: "Waiting for first check",
    } as const;
    strip.dataset.state = status.state;
    label.textContent = labels[status.state];
    meta.textContent = status.lastCheckedAt
      ? `Last checked ${formatDate(status.lastCheckedAt)}`
      : "Waiting for first check";
  } catch {
    strip.dataset.state = "unknown";
    label.textContent = "Status unavailable";
    meta.textContent = "Try again shortly";
  } finally {
    refreshInFlight = false;
  }
}

void refreshStatus();
window.setInterval(() => void refreshStatus(), 60_000);
