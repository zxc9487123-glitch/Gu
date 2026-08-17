import { describe, expect, it } from "vitest";

import { categoryTotalsFor, monthPointsFor, summaryFor, transactionsForPeriod, type Transaction } from "../lib/finance";
import { budgetAlertFor, budgetProgressPercentFor } from "../lib/budget-status";
import { annualLivingBudgetFor } from "../lib/annual-living";
import { livingAmountFor } from "../lib/living-amount";
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

  it("calculates the living amount as one-third of income minus expenses", () => {
    expect(livingAmountFor(991428, 331828)).toBe(-1352);
    expect(livingAmountFor(6000, 3500)).toBe(-1500);
  });

  it("compares this month’s living amount with the previous month", () => {
    const comparison = monthlyLivingComparison(records, new Date(2026, 1, 15));
    expect(comparison.current).toMatchObject({ year: 2026, month: 1, income: 0, expense: 2000, livingAmount: -2000 });
    expect(comparison.previous).toMatchObject({ year: 2026, month: 0, income: 50000, expense: 1200, livingAmount: 15466.666666666668 });
    expect(comparison.difference).toBeCloseTo(-17466.666666666668);
  });

  it("shows warning at 80% of budget and over-budget status at 100%", () => {
    expect(budgetAlertFor(790, 1000)).toMatchObject({ status: "normal", usagePercent: 79 });
    expect(budgetAlertFor(800, 1000)).toMatchObject({ status: "warning", usagePercent: 80 });
    expect(budgetAlertFor(1200, 1000)).toMatchObject({ status: "over", usagePercent: 120 });
  });

  it("caps visual budget progress at 100% while keeping the actual usage percentage", () => {
    expect(budgetProgressPercentFor(0.425)).toBe(43);
    expect(budgetProgressPercentFor(1.2)).toBe(100);
  });

  it("derives the annual living budget from the monthly limit", () => {
    expect(annualLivingBudgetFor(10000, 80000)).toEqual({ annualBudget: 120000, annualExpense: 80000, remaining: 40000 });
    expect(annualLivingBudgetFor(null, 80000)).toEqual({ annualBudget: null, annualExpense: 80000, remaining: null });
  });
});
