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

function applyFilters(): void {
  const query = search?.value.trim().toLowerCase() ?? "";
  let visibleCount = 0;

  items.forEach((item) => {
    const matchesTopic = item.dataset.topic === activeTopic;
    const matchesQuery = !query || item.textContent?.toLowerCase().includes(query) === true;
    const visible = matchesTopic && matchesQuery;
    item.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  groups.forEach((group) => {
    const visible = group.dataset.topicGroup === activeTopic && visibleCount > 0;
    group.hidden = !visible;
  });
  if (emptyState) emptyState.hidden = visibleCount > 0;
}

filters.forEach((filter) => {
  filter.addEventListener("click", () => {
    activeTopic = filter.dataset.topic ?? "general";
    filters.forEach((item) => item.setAttribute("aria-pressed", String(item === filter)));
    applyFilters();
  });
});

document.querySelectorAll<HTMLButtonElement>(".faq-question").forEach((button) => {
  button.addEventListener("click", () => {
    setExpanded(button, button.getAttribute("aria-expanded") !== "true");
  });
});

search?.addEventListener("input", applyFilters);
applyFilters();
