import "./styles.css";

const navToggle = document.querySelector<HTMLButtonElement>("#nav-toggle");
const header = document.querySelector<HTMLElement>(".site-header");

navToggle?.addEventListener("click", () => {
  const open = document.body.classList.toggle("nav-open");
  navToggle.setAttribute("aria-expanded", String(open));
});

document.addEventListener("click", (event) => {
  if (!document.body.classList.contains("nav-open")) return;
  if (header?.contains(event.target as Node)) return;
  document.body.classList.remove("nav-open");
  navToggle?.setAttribute("aria-expanded", "false");
});

const pageName = document.body.dataset.page;
if (pageName) {
  document.querySelectorAll<HTMLAnchorElement>("[data-page-link]").forEach((link) => {
    if (link.dataset.pageLink === pageName) link.setAttribute("aria-current", "page");
  });
}

const channelOptions = document.querySelectorAll<HTMLButtonElement>(".channel-option");
const channelMessage = document.querySelector<HTMLElement>("#channel-message");
const channelCta = document.querySelector<HTMLAnchorElement>("#channel-cta");
const channelCtaLabel = document.querySelector<HTMLElement>("#channel-cta-label");

function chooseChannel(option: HTMLButtonElement): void {
  const isAvailable = option.dataset.available === "true";
  channelOptions.forEach((item) => item.setAttribute("aria-pressed", String(item === option)));

  if (channelMessage) {
    channelMessage.dataset.tone = isAvailable ? "available" : "soon";
    channelMessage.textContent = isAvailable
      ? "Discord is ready."
      : `${option.dataset.label ?? "This channel"} is coming soon.`;
  }

  if (channelCta) {
    if (isAvailable) {
      channelCta.href = option.dataset.href ?? "./channels/discord/";
      channelCta.classList.add("discord-button");
      channelCta.classList.remove("button-primary");
      if (channelCtaLabel) channelCtaLabel.textContent = "Add Discord Webhook";
      channelCta.removeAttribute("aria-disabled");
    } else {
      channelCta.href = "#channel-message";
      channelCta.classList.remove("discord-button");
      channelCta.classList.add("button-primary");
      if (channelCtaLabel) channelCtaLabel.textContent = "See available channels";
      channelCta.setAttribute("aria-disabled", "true");
    }
  }
}

channelOptions.forEach((option) => {
  option.addEventListener("click", () => chooseChannel(option));
});
