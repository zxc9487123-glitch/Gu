import { describe, expect, it } from "vitest";

import { annualExpenseInsightsFor, annualSummariesFor, availableYears, categoryRankTrendsFor, categoryTotalsFor, filteredTransactionsFor, monthlyExpenseRankingsFor, monthPointsFor, sortTransactionsFor, summaryFor, transactionsForPeriod, trendPointsFor, yearExpenseInsightFor, type Transaction } from "../lib/finance";
import { livingAmountFor, livingExpenseAlertFor, livingExpenseComparisonFor, livingExpenseSharePercentFor, livingExpenseUsageFor } from "../lib/living-amount";
import { monthlyLivingComparison } from "../lib/monthly-living";
import { savingsGoalProgressFor } from "../lib/savings-goal";
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

  it("filters data by a selected month within an individual year", () => {
    const selected = transactionsForPeriod(records, { year: 2026, month: 2 });

    expect(selected.map((item) => item.id)).toEqual(["3"]);
    expect(summaryFor(selected)).toEqual({ income: 0, expense: 2000, net: -2000 });
  });

  it("filters a selected category by date and inclusive amount range", () => {
    const selected = filteredTransactionsFor(records, {
      category: "餐飲／食品",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      minimumAmount: 1200,
      maximumAmount: 1200,
    });

    expect(selected.map((item) => item.id)).toEqual(["2"]);
  });

  it("keeps every transaction when no detail filters are selected", () => {
    expect(filteredTransactionsFor(records, {})).toEqual(records);
  });

  it("sorts filtered transactions by date or amount in both directions", () => {
    const selected = filteredTransactionsFor(records, { category: "餐飲／食品" });

    expect(sortTransactionsFor(selected, { field: "date", direction: "ascending" }).map((item) => item.id)).toEqual(["4", "2"]);
    expect(sortTransactionsFor(records, { field: "amount", direction: "descending" }).map((item) => item.id)).toEqual(["1", "3", "2", "4"]);
    expect(sortTransactionsFor(records, { field: "amount", direction: "ascending" }).map((item) => item.id)).toEqual(["4", "2", "3", "1"]);
  });

  it("lists every transaction year in descending order for the year selector", () => {
    const years = availableYears(records);
    expect(years).toEqual(expect.arrayContaining([2026, 2025]));
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it("orders expense categories by their calculated amount", () => {
    const totals = categoryTotalsFor(records);
    expect(totals[0]).toMatchObject({ name: "購物", amount: 2000, color: "#C64B42" });
    expect(totals[0]?.ratio).toBeCloseTo(2000 / 3800);
    expect(totals[1]).toMatchObject({ name: "餐飲／食品", amount: 1800, color: "#DF7A31" });
  });

  it("uses red, orange, yellow, and gray for expense category ranks", () => {
    const totals = categoryTotalsFor([
      { id: "r1", type: "expense", amount: 400, category: "餐飲／食品", note: "", date: "2026-01-01" },
      { id: "r2", type: "expense", amount: 300, category: "購物", note: "", date: "2026-01-02" },
      { id: "r3", type: "expense", amount: 200, category: "娛樂／訂閱", note: "", date: "2026-01-03" },
      { id: "r4", type: "expense", amount: 100, category: "網購", note: "", date: "2026-01-04" },
    ]);

    expect(totals.map((item) => item.color)).toEqual(["#C64B42", "#DF7A31", "#B88A16", "#A3AAA5"]);
  });

  it("compares the latest month's category ranks with the previous month", () => {
    const transactions: Transaction[] = [
      { id: "m1", type: "expense", amount: 100, category: "餐飲／食品", note: "", date: "2026-01-03" },
      { id: "m2", type: "expense", amount: 300, category: "購物", note: "", date: "2026-01-04" },
      { id: "m3", type: "expense", amount: 200, category: "娛樂／訂閱", note: "", date: "2026-01-05" },
      { id: "m4", type: "expense", amount: 400, category: "餐飲／食品", note: "", date: "2026-02-03" },
      { id: "m5", type: "expense", amount: 300, category: "購物", note: "", date: "2026-02-04" },
      { id: "m6", type: "expense", amount: 200, category: "娛樂／訂閱", note: "", date: "2026-02-05" },
    ];
    const trends = categoryRankTrendsFor(transactions, transactions);

    expect(trends["餐飲／食品"]).toMatchObject({ currentRank: 1, previousRank: 3, direction: "up", change: 2 });
    expect(trends["購物"]).toMatchObject({ currentRank: 2, previousRank: 1, direction: "down", change: 1 });
    expect(trends["娛樂／訂閱"]).toMatchObject({ currentRank: 3, previousRank: 2, direction: "down", change: 1 });
  });

  it("creates up to six months of top-three expense rankings for the trend chart", () => {
    const rankings = monthlyExpenseRankingsFor([
      { id: "t1", type: "expense", amount: 100, category: "餐飲／食品", note: "", date: "2026-01-03" },
      { id: "t2", type: "expense", amount: 300, category: "購物", note: "", date: "2026-01-04" },
      { id: "t3", type: "expense", amount: 200, category: "娛樂／訂閱", note: "", date: "2026-02-03" },
      { id: "t4", type: "expense", amount: 500, category: "網購", note: "", date: "2026-02-04" },
    ]);

    expect(rankings).toHaveLength(2);
    expect(rankings[0]).toMatchObject({ key: "2026-01", label: "1月" });
    expect(rankings[0]?.rankings.map((item) => item.name)).toEqual(["購物", "餐飲／食品"]);
    expect(rankings[1]?.rankings.map((item) => item.name)).toEqual(["網購", "娛樂／訂閱"]);
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

  it("calculates the living amount as one-third of income", () => {
    expect(livingAmountFor(991428, 331828)).toBe(330476);
    expect(livingAmountFor(6000, 3500)).toBe(2000);
  });

  it("calculates the life amount from the selected year's income and expenses", () => {
    const selectedYearSummary = summaryFor(transactionsForPeriod(records, 2026));
    expect(livingAmountFor(selectedYearSummary.income, selectedYearSummary.expense)).toBeCloseTo(16666.666666666668);
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

  it("assigns green, yellow, orange, and red states for living expense usage", () => {
    expect(livingExpenseUsageFor(1000, 500)).toEqual({ percent: 50, progress: 0.5, status: "green" });
    expect(livingExpenseUsageFor(1000, 600)).toEqual({ percent: 60, progress: 0.6, status: "yellow" });
    expect(livingExpenseUsageFor(1000, 700)).toEqual({ percent: 70, progress: 0.7, status: "orange" });
    expect(livingExpenseUsageFor(1000, 800)).toEqual({ percent: 80, progress: 0.8, status: "red" });
    expect(livingExpenseUsageFor(0, 0)).toEqual({ percent: null, progress: 0, status: "green" });
  });

  it("flags spending that exceeds the living amount", () => {
    expect(livingExpenseAlertFor(2000, 1200)).toEqual({ status: "normal", overage: 0, usagePercent: 60 });
    expect(livingExpenseAlertFor(2000, 1600)).toEqual({ status: "warning", overage: 0, usagePercent: 80 });
    expect(livingExpenseAlertFor(2000, 3500)).toEqual({ status: "over", overage: 1500, usagePercent: 175 });
  });

  it("applies the same living amount and alert rules to annual totals", () => {
    const annual = summaryFor(records);
    const annualLivingAmount = livingAmountFor(annual.income, annual.expense);
    expect(annualLivingAmount).toBeCloseTo(16666.666666666668);
    expect(livingExpenseAlertFor(annualLivingAmount, annual.expense)).toMatchObject({ status: "normal" });
  });

  it("calculates savings goal progress for unset, in-progress, and achieved goals", () => {
    expect(savingsGoalProgressFor(40000, null)).toMatchObject({ status: "not-set", progressPercent: null, progressFraction: 0 });
    expect(savingsGoalProgressFor(40000, 100000)).toMatchObject({ status: "in-progress", progressPercent: 40, progressFraction: 0.4, remaining: 60000 });
    expect(savingsGoalProgressFor(125000, 100000)).toMatchObject({ status: "achieved", progressPercent: 125, progressFraction: 1, remaining: 0 });
  });

  it("compares this month’s living amount with the previous month", () => {
    const comparison = monthlyLivingComparison(records, new Date(2026, 1, 15));
    expect(comparison.current).toMatchObject({ year: 2026, month: 1, income: 0, expense: 2000, livingAmount: 0 });
    expect(comparison.previous).toMatchObject({ year: 2026, month: 0, income: 50000, expense: 1200, livingAmount: 16666.666666666668 });
    expect(comparison.difference).toBeCloseTo(-16666.666666666668);
  });

});
