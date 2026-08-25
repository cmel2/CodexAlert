export function getElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}
export function formatDate(value: string | null): string {
  if (!value) return "Not available yet";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Not available yet";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function setMessage(
  element: HTMLElement,
  message: string,
  tone: "neutral" | "success" | "error",
): void {
  element.textContent = message;
  element.dataset.tone = tone;
  element.hidden = false;
}
