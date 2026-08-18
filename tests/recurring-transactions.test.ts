import { describe, expect, it } from "vitest";

import { pendingRecurringTransactionsFor, recurringDateFor, transactionFromPendingRecurring, type RecurringTransactionRule } from "../lib/recurring-transactions";
import type { Transaction } from "../lib/finance";

const salaryRule: RecurringTransactionRule = {
  id: "salary",
  name: "薪資",
  type: "income",
  amount: 50000,
  category: "薪資",
  note: "固定薪資",
  dayOfMonth: 5,
  active: true,
};

describe("recurring transaction rules", () => {
  it("uses the final day of a shorter month when the configured day is unavailable", () => {
    expect(recurringDateFor({ dayOfMonth: 31 }, new Date(2026, 1, 12))).toBe("2026-02-28");
    expect(recurringDateFor({ dayOfMonth: 31 }, new Date(2024, 1, 12))).toBe("2024-02-29");
  });

  it("creates only due rules for the current month as pending transactions", () => {
    const pending = pendingRecurringTransactionsFor({
      rules: [salaryRule, { ...salaryRule, id: "rent", name: "房租", type: "expense", amount: 18000, category: "繳費／帳單", dayOfMonth: 25 }],
      transactions: [],
      dismissedIds: [],
      referenceDate: new Date(2026, 3, 10),
    });

    expect(pending).toEqual([expect.objectContaining({ id: "salary:2026-04", date: "2026-04-05", name: "薪資" })]);
  });

  it("does not recreate confirmed or dismissed monthly transactions", () => {
    const pending = pendingRecurringTransactionsFor({
      rules: [salaryRule],
      transactions: [{ id: "confirmed", type: "income", amount: 50000, category: "薪資", note: "", date: "2026-04-05", recurringRuleId: "salary", recurringPeriod: "2026-04" } satisfies Transaction],
      dismissedIds: ["salary:2026-03"],
      referenceDate: new Date(2026, 3, 10),
    });

    expect(pending).toHaveLength(0);
  });

  it("does not recreate a pending transaction dismissed for the current month", () => {
    const pending = pendingRecurringTransactionsFor({
      rules: [salaryRule],
      transactions: [],
      dismissedIds: ["salary:2026-04"],
      referenceDate: new Date(2026, 3, 10),
    });

    expect(pending).toHaveLength(0);
  });

  it("turns a confirmed pending item into a marked formal transaction", () => {
    const [pending] = pendingRecurringTransactionsFor({ rules: [salaryRule], transactions: [], dismissedIds: [], referenceDate: new Date(2026, 3, 10) });
    expect(transactionFromPendingRecurring(pending!, "record-1")).toMatchObject({
      id: "record-1",
      date: "2026-04-05",
      recurringRuleId: "salary",
      recurringPeriod: "2026-04",
    });
  });
});
