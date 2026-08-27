import { describe, expect, it } from "vitest";
import html from "../index.html?raw";
import mainSource from "./main.ts?raw";

describe("home page DOM contract", () => {
  it("contains every element selected by main.ts", () => {
    const selectors = [...mainSource.matchAll(/getElement<[^>]+>\("(#[^"]+)"\)/gu)]
      .map((match) => match[1]!.slice(1));

    for (const selector of selectors) {
      expect(html, `missing #${selector}`).toContain(`id="${selector}"`);
    }
  });
});
