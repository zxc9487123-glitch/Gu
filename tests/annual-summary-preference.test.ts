import { describe, expect, it } from "vitest";

import { annualSummaryExpandedFromStorage, annualSummaryStorageValue } from "../lib/annual-summary-preference";

describe("annual summary preference", () => {
  it("serializes and restores the expanded preference", () => {
    expect(annualSummaryStorageValue(true)).toBe("expanded");
    expect(annualSummaryExpandedFromStorage("expanded")).toBe(true);
  });

  it("defaults invalid, absent, and collapsed preferences to the collapsed state", () => {
    expect(annualSummaryStorageValue(false)).toBe("collapsed");
    expect(annualSummaryExpandedFromStorage("collapsed")).toBe(false);
    expect(annualSummaryExpandedFromStorage(null)).toBe(false);
    expect(annualSummaryExpandedFromStorage("unknown")).toBe(false);
  });
});
