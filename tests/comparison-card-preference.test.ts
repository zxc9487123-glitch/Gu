import { describe, expect, it } from "vitest";

import { comparisonCardVisibilityFromStorage, comparisonCardVisibilityStorageValue } from "../lib/comparison-card-preference";

describe("comparison card preference", () => {
  it("serializes and restores the selected comparison cards", () => {
    const preference = { expense: false, balance: true };

    expect(comparisonCardVisibilityFromStorage(comparisonCardVisibilityStorageValue(preference))).toEqual(preference);
  });

  it("defaults missing, malformed, or incomplete preferences to visible cards", () => {
    expect(comparisonCardVisibilityFromStorage(null)).toEqual({ expense: true, balance: true });
    expect(comparisonCardVisibilityFromStorage("not-json")).toEqual({ expense: true, balance: true });
    expect(comparisonCardVisibilityFromStorage(JSON.stringify({ expense: false }))).toEqual({ expense: false, balance: true });
  });
});
