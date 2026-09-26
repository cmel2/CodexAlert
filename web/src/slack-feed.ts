import { functionUrl } from "./config.ts";
import { getElement, setMessage } from "./dom.ts";
import "./site.ts";

const command = getElement<HTMLElement>("#slack-feed-command");
const copyButton = getElement<HTMLButtonElement>("#copy-slack-feed");
const message = getElement<HTMLElement>("#slack-feed-message");

command.textContent = `/feed subscribe ${functionUrl("feed")}`;

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(command.textContent ?? "");
    copyButton.textContent = "Copied";
    window.setTimeout(() => { copyButton.textContent = "Copy command"; }, 1800);
  } catch {
    setMessage(message, "Select and copy the command manually.", "neutral");
  }
});
