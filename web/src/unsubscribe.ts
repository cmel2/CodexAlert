import { ApiError, unsubscribe } from "./api.ts";
import { getElement, setMessage } from "./dom.ts";
import "./site.ts";

const button = getElement<HTMLButtonElement>("#unsubscribe-button");
const message = getElement<HTMLElement>("#unsubscribe-message");
const token = new URLSearchParams(window.location.search).get("token") ?? "";

if (!/^[A-Za-z0-9_-]{40,100}$/u.test(token)) {
  button.disabled = true;
  setMessage(message, "This unsubscribe link is incomplete or invalid.", "error");
}

button.addEventListener("click", async () => {
  button.disabled = true;
  button.textContent = "Removing…";
  message.hidden = true;
  try {
    const result = await unsubscribe(token);
    setMessage(message, result.message, "success");
    button.hidden = true;
    window.history.replaceState({}, "", window.location.pathname);
  } catch (error) {
    const text = error instanceof ApiError ? error.message : "Unsubscription failed. Try again.";
    setMessage(message, text, "error");
    button.disabled = false;
    button.textContent = "Remove subscription";
  }
});
