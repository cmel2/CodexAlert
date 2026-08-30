import "./site.ts";

const picker = document.querySelector<HTMLElement>(".channel-picker");
const trigger = document.querySelector<HTMLButtonElement>("#channel-trigger");
const menu = document.querySelector<HTMLElement>("#channel-menu");
const selectedIcon = document.querySelector<HTMLElement>("#selected-channel-icon");
const selectedLabel = document.querySelector<HTMLElement>("#selected-channel-label");
const channelMessage = document.querySelector<HTMLElement>("#channel-message");
const channelCta = document.querySelector<HTMLAnchorElement>("#channel-cta");
const channelCtaLabel = document.querySelector<HTMLElement>("#channel-cta-label");
const options = [...document.querySelectorAll<HTMLButtonElement>(".channel-option")];

if (trigger && menu && selectedIcon && selectedLabel && channelMessage && channelCta && channelCtaLabel) {
  const closeMenu = (): void => {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  };

  const openMenu = (): void => {
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  };

  const chooseChannel = (option: HTMLButtonElement): void => {
    const channel = option.dataset.channel ?? "discord";
    const label = option.dataset.label ?? "Discord";
    const isAvailable = option.dataset.available === "true";
    const icon = option.querySelector("svg");

    options.forEach((item) => item.setAttribute("aria-selected", String(item === option)));
    trigger.dataset.channel = channel;
    selectedLabel.textContent = label;
    selectedIcon.className = `selected-channel-icon app-icon app-icon-${channel}`;
    if (icon) selectedIcon.replaceChildren(icon.cloneNode(true));
    closeMenu();

    if (isAvailable) {
      channelMessage.hidden = true;
      channelCta.href = option.dataset.href ?? "./channels/discord/";
      channelCtaLabel.textContent = "Add Webhook";
      channelCta.removeAttribute("aria-disabled");
    } else {
      channelMessage.hidden = false;
      channelMessage.textContent = `${label} delivery is coming soon.`;
      channelCta.href = "./channels/";
      channelCtaLabel.textContent = "Coming soon";
      channelCta.setAttribute("aria-disabled", "true");
    }
  };

  trigger.addEventListener("click", () => {
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  options.forEach((option) => option.addEventListener("click", () => chooseChannel(option)));
  channelCta.addEventListener("click", (event) => {
    if (channelCta.getAttribute("aria-disabled") === "true") event.preventDefault();
  });

  document.addEventListener("click", (event) => {
    if (!picker?.contains(event.target as Node)) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      trigger.focus();
    }
  });
}
