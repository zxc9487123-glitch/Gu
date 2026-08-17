import { describe, expect, it } from "vitest";

import { categoryTotalsFor, monthPointsFor, summaryFor, transactionsForPeriod, type Transaction } from "../lib/finance";
import { trendCopyFor } from "../lib/trend-copy";

const records: Transaction[] = [
  { id: "1", type: "income", amount: 50000, category: "薪資", note: "", date: "2026-01-05" },
  { id: "2", type: "expense", amount: 1200, category: "餐飲／食品", note: "", date: "2026-01-06" },
  { id: "3", type: "expense", amount: 2000, category: "購物", note: "", date: "2026-02-04" },
  { id: "4", type: "expense", amount: 600, category: "餐飲／食品", note: "", date: "2025-12-25" },
];

describe("finance calculations", () => {
  it("calculates the summary from transaction records", () => {
    expect(summaryFor(records)).toEqual({ income: 50000, expense: 3800, net: 46200 });
  });

  it("filters data by an individual year", () => {
    const selected = transactionsForPeriod(records, 2026);
    expect(selected).toHaveLength(3);
    expect(summaryFor(selected)).toEqual({ income: 50000, expense: 3200, net: 46800 });
  });

  it("orders expense categories by their calculated amount", () => {
    const totals = categoryTotalsFor(records);
    expect(totals[0]).toMatchObject({ name: "購物", amount: 2000 });
    expect(totals[0]?.ratio).toBeCloseTo(2000 / 3800);
    expect(totals[1]).toMatchObject({ name: "餐飲／食品", amount: 1800 });
  });

  it("creates twelve monthly balance points for the selected year", () => {
    const points = monthPointsFor(records, 2026);
    expect(points).toHaveLength(12);
    expect(points[0]?.balance).toBe(48800);
    expect(points[1]?.balance).toBe(46800);
  });

  it("labels a selected year as a monthly trend and all years as an annual trend", () => {
    expect(trendCopyFor(2026)).toEqual({ title: "月趨勢", subtitle: "2026 年逐月淨現金流" });
    expect(trendCopyFor("all")).toEqual({ title: "年度趨勢", subtitle: "全年度收支變化" });
  });
});
