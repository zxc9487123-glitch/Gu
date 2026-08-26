import { describe, expect, it } from "vitest";

import { calendarMonthDays, datePartsFromInput, formatCalendarDate, shiftCalendarMonth } from "../lib/date-picker";

describe("日期選擇器月份工具", () => {
  it("會依月份正確產生日期格，並處理閏年二月", () => {
    const days = calendarMonthDays({ year: 2024, monthIndex: 1 });
    expect(days).toHaveLength(35);
    expect(days.filter(Boolean)).toHaveLength(29);
    expect(days.filter(Boolean).at(-1)).toEqual({ day: 29, date: "2024-02-29" });
  });

  it("可在跨年時切換月份", () => {
    expect(shiftCalendarMonth({ year: 2026, monthIndex: 0 }, -1)).toEqual({ year: 2025, monthIndex: 11 });
    expect(shiftCalendarMonth({ year: 2026, monthIndex: 11 }, 1)).toEqual({ year: 2027, monthIndex: 0 });
    expect(formatCalendarDate(2026, 7, 6)).toBe("2026-08-06");
  });

  it("會從有效輸入取得月份，並在無效日期時使用備援日期", () => {
    expect(datePartsFromInput("2026-08-26")).toEqual({ year: 2026, monthIndex: 7 });
    expect(datePartsFromInput("2026-02-30", new Date(2025, 4, 3))).toEqual({ year: 2025, monthIndex: 4 });
  });
});
