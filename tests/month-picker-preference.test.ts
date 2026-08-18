import { describe, expect, it } from "vitest";

import { monthPickerExpandedFromStorage, monthPickerStorageValue } from "../lib/month-picker-preference";

describe("month picker preference", () => {
  it("serializes and restores the expanded preference", () => {
    expect(monthPickerStorageValue(true)).toBe("expanded");
    expect(monthPickerExpandedFromStorage("expanded")).toBe(true);
  });

  it("defaults invalid, absent, and collapsed preferences to the collapsed state", () => {
    expect(monthPickerStorageValue(false)).toBe("collapsed");
    expect(monthPickerExpandedFromStorage("collapsed")).toBe(false);
    expect(monthPickerExpandedFromStorage(null)).toBe(false);
    expect(monthPickerExpandedFromStorage("unknown")).toBe(false);
  });
});
