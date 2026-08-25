import { describe, expect, it } from "vitest";
import { formatDate } from "./dom.ts";

describe("formatDate", () => {
  it("handles missing values", () => {
    expect(formatDate(null)).toBe("Not available yet");
  });

  it("handles invalid dates", () => {
    expect(formatDate("not-a-date")).toBe("Not available yet");
  });
});
