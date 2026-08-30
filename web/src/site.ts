import "./styles.css";

const navToggle = document.querySelector<HTMLButtonElement>("#nav-toggle");
const header = document.querySelector<HTMLElement>(".site-header");

navToggle?.addEventListener("click", () => {
  const open = document.body.classList.toggle("nav-open");
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
});

document.addEventListener("click", (event) => {
  if (!document.body.classList.contains("nav-open")) return;
  if (header?.contains(event.target as Node)) return;
  document.body.classList.remove("nav-open");
  navToggle?.setAttribute("aria-expanded", "false");
  navToggle?.setAttribute("aria-label", "Open navigation");
});

const pageName = document.body.dataset.page;
if (pageName) {
  document.querySelectorAll<HTMLAnchorElement>("[data-page-link]").forEach((link) => {
    if (link.dataset.pageLink === pageName) link.setAttribute("aria-current", "page");
  });
}
