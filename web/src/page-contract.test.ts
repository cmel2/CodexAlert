import { describe, expect, it } from "vitest";
import homeHtml from "../index.html?raw";
import howItWorksHtml from "../how-it-works/index.html?raw";
import channelsHtml from "../channels/index.html?raw";
import discordHtml from "../channels/discord/index.html?raw";
import faqHtml from "../faq/index.html?raw";
import privacyHtml from "../privacy/index.html?raw";
import termsHtml from "../terms/index.html?raw";
import unsubscribeHtml from "../unsubscribe/index.html?raw";
import discordSource from "./discord.ts?raw";
import unsubscribeSource from "./unsubscribe.ts?raw";

const pages = [homeHtml, howItWorksHtml, channelsHtml, discordHtml, faqHtml, privacyHtml, termsHtml, unsubscribeHtml];

describe("multi-page site contract", () => {
  it("keeps the source register and GitHub link in every footer", () => {
    for (const html of pages) {
      expect(html).toContain("hascodexratelimitreset.today");
      expect(html).toContain("data: ");
      expect(html).toContain("https://x.com/jskoiz");
      expect(html).toContain("https://github.com/cmel2/CodexAlert");
      expect(html).not.toContain("MIT LICENSE");
    }
  });

  it("keeps the primary navigation on every page", () => {
    for (const html of pages) {
      expect(html).toContain("How it works");
      expect(html).toContain("Channels");
      expect(html).toContain("FAQ");
      expect(html).toContain('class="header-action"');
    }
  });

  it("keeps the homepage notification control compact and complete", () => {
    expect(homeHtml).toContain('id="channel-trigger"');
    expect(homeHtml).toContain('id="channel-cta"');
    expect(homeHtml.match(/role="option"/gu)).toHaveLength(3);
    for (const label of ["Discord", "Telegram", "Slack"]) {
      expect(homeHtml).toContain(`data-label="${label}"`);
    }
  });

  it("contains every required element selected by page scripts", () => {
    const contracts = [
      { html: discordHtml, source: discordSource },
      { html: unsubscribeHtml, source: unsubscribeSource },
    ];
    for (const { html, source } of contracts) {
      const selectors = [...source.matchAll(/getElement<[^>]+>\("(#[^"]+)"\)/gu)]
        .map((match) => match[1]!.slice(1));
      for (const selector of selectors) {
        expect(html, `missing #${selector}`).toContain(`id="${selector}"`);
      }
    }
  });
});
