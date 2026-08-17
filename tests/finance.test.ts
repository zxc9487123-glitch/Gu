import { describe, expect, it } from "vitest";

import { annualExpenseInsightsFor, annualSummariesFor, availableYears, categoryTotalsFor, monthPointsFor, summaryFor, transactionsForPeriod, trendPointsFor, yearExpenseInsightFor, type Transaction } from "../lib/finance";
import { livingAmountFor, livingExpenseAlertFor, livingExpenseComparisonFor, livingExpenseSharePercentFor } from "../lib/living-amount";
import { monthlyLivingComparison } from "../lib/monthly-living";
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

  it("lists every transaction year in descending order for the year selector", () => {
    const years = availableYears(records);
    expect(years).toEqual(expect.arrayContaining([2026, 2025]));
    expect(years).toEqual([...years].sort((a, b) => b - a));
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

  it("calculates average monthly expense and the highest spending month for a selected year", () => {
    expect(yearExpenseInsightFor(transactionsForPeriod(records, 2026))).toEqual({
      averageMonthlyExpense: 3200 / 12,
      highestExpenseMonth: { label: "2月", amount: 2000 },
    });
  });

  it("maps each annual summary to its highest spending month", () => {
    expect(annualExpenseInsightsFor(records)).toEqual({
      "2025年": { averageMonthlyExpense: 50, highestExpenseMonth: { label: "12月", amount: 600 } },
      "2026年": { averageMonthlyExpense: 3200 / 12, highestExpenseMonth: { label: "2月", amount: 2000 } },
    });
  });

  it("creates annual trend points from every imported transaction year in all-years mode", () => {
    expect(trendPointsFor(records, "all")).toEqual([
      { label: "2025年", income: 0, expense: 600, balance: -600 },
      { label: "2026年", income: 50000, expense: 3200, balance: 46200 },
    ]);
  });

  it("calculates income, expense, and net changes against the prior year for annual summaries", () => {
    const summaries = annualSummariesFor([
      { label: "2024年", income: 100, expense: 50, balance: 50 },
      { label: "2025年", income: 120, expense: 40, balance: 130 },
    ]);

    expect(summaries[0]).toMatchObject({ net: 50, incomeChangePercent: null, expenseChangePercent: null, netChangePercent: null });
    expect(summaries[1]).toMatchObject({ net: 80, incomeChangePercent: 20, expenseChangePercent: -20, netChangePercent: 60 });
  });

  it("keeps the annual trend wording for the all-years overview", () => {
    expect(trendCopyFor("all")).toEqual({ title: "年度趨勢", subtitle: "全年度收支變化" });
  });

  it("calculates the living amount as one-third of income minus expenses", () => {
    expect(livingAmountFor(991428, 331828)).toBe(-1352);
    expect(livingAmountFor(6000, 3500)).toBe(-1500);
  });

  it("compares the living amount against the expense amount", () => {
    expect(livingExpenseComparisonFor(2000, 1200)).toEqual({ difference: 800 });
    expect(livingExpenseComparisonFor(-1500, 3500)).toEqual({ difference: -5000 });
  });

  it("calculates the living amount as a percentage of monthly living expense", () => {
    expect(livingExpenseSharePercentFor(2000, 8000)).toBe(25);
    expect(livingExpenseSharePercentFor(-1500, 3500)).toBe(-43);
    expect(livingExpenseSharePercentFor(2000, 0)).toBeNull();
  });

  it("flags spending that exceeds the living amount", () => {
    expect(livingExpenseAlertFor(2000, 1200)).toEqual({ status: "normal", overage: 0, usagePercent: 60 });
    expect(livingExpenseAlertFor(2000, 1600)).toEqual({ status: "warning", overage: 0, usagePercent: 80 });
    expect(livingExpenseAlertFor(2000, 3500)).toEqual({ status: "over", overage: 1500, usagePercent: 175 });
  });

  it("compares this month’s living amount with the previous month", () => {
    const comparison = monthlyLivingComparison(records, new Date(2026, 1, 15));
    expect(comparison.current).toMatchObject({ year: 2026, month: 1, income: 0, expense: 2000, livingAmount: -2000 });
    expect(comparison.previous).toMatchObject({ year: 2026, month: 0, income: 50000, expense: 1200, livingAmount: 15466.666666666668 });
    expect(comparison.difference).toBeCloseTo(-17466.666666666668);
  });

});
