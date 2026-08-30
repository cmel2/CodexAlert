import "./site.ts";

const search = document.querySelector<HTMLInputElement>("#faq-search");
const filters = [...document.querySelectorAll<HTMLButtonElement>(".topic-filter")];
const groups = [...document.querySelectorAll<HTMLElement>(".faq-group")];
const items = [...document.querySelectorAll<HTMLElement>(".faq-item")];
const emptyState = document.querySelector<HTMLElement>("#faq-empty");
let activeTopic = "general";

function setExpanded(button: HTMLButtonElement, expanded: boolean): void {
  const answerId = button.getAttribute("aria-controls");
  const answer = answerId ? document.getElementById(answerId) : null;
  button.setAttribute("aria-expanded", String(expanded));
  button.querySelector<HTMLElement>(".faq-toggle")!.textContent = expanded ? "−" : "+";
  if (answer) answer.hidden = !expanded;
  button.closest(".faq-item")?.classList.toggle("is-open", expanded);
}

function applySearch(): void {
  const query = search?.value.trim().toLowerCase() ?? "";
  let visibleCount = 0;

  items.forEach((item) => {
    const matchesQuery = !query || item.textContent?.toLowerCase().includes(query) === true;
    const visible = matchesQuery;
    item.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  groups.forEach((group) => {
    group.hidden = ![...group.querySelectorAll<HTMLElement>(".faq-item")].some((item) => !item.hidden);
  });
  if (emptyState) emptyState.hidden = visibleCount > 0;
}

filters.forEach((filter) => {
  filter.addEventListener("click", () => {
    activeTopic = filter.dataset.topic ?? "general";
    filters.forEach((item) => item.setAttribute("aria-pressed", String(item === filter)));
    document.querySelector<HTMLElement>(`[data-topic-group="${activeTopic}"]`)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  });
});

document.querySelectorAll<HTMLButtonElement>(".faq-question").forEach((button) => {
  button.addEventListener("click", () => {
    setExpanded(button, button.getAttribute("aria-expanded") !== "true");
  });
});

search?.addEventListener("input", applySearch);
applySearch();
