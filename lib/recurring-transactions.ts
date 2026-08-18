import type { Transaction, TransactionType } from "@/lib/finance";

export type RecurringTransactionRule = {
  id: string;
  name: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  dayOfMonth: number;
  active: boolean;
};

export type RecurringTransactionRuleInput = Omit<RecurringTransactionRule, "id" | "active">;

export type PendingRecurringTransaction = {
  id: string;
  ruleId: string;
  period: string;
  name: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
};

const numberText = (value: number) => String(value).padStart(2, "0");

export const recurringPeriodFor = (referenceDate: Date) => `${referenceDate.getFullYear()}-${numberText(referenceDate.getMonth() + 1)}`;

export const recurringDateFor = (rule: Pick<RecurringTransactionRule, "dayOfMonth">, referenceDate: Date) => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(Math.max(Math.trunc(rule.dayOfMonth), 1), lastDay);
  return `${year}-${numberText(month)}-${numberText(day)}`;
};

export const pendingRecurringTransactionsFor = ({
  rules,
  transactions,
  dismissedIds,
  referenceDate,
}: {
  rules: RecurringTransactionRule[];
  transactions: Transaction[];
  dismissedIds: string[];
  referenceDate: Date;
}): PendingRecurringTransaction[] => {
  const period = recurringPeriodFor(referenceDate);
  const today = `${period}-${numberText(referenceDate.getDate())}`;
  const dismissed = new Set(dismissedIds);
  const confirmed = new Set(
    transactions
      .filter((item) => item.recurringRuleId && item.recurringPeriod)
      .map((item) => `${item.recurringRuleId}:${item.recurringPeriod}`),
  );

  return rules
    .filter((rule) => rule.active)
    .map((rule) => {
      const id = `${rule.id}:${period}`;
      return {
        id,
        ruleId: rule.id,
        period,
        name: rule.name,
        type: rule.type,
        amount: rule.amount,
        category: rule.category,
        note: rule.note,
        date: recurringDateFor(rule, referenceDate),
      } satisfies PendingRecurringTransaction;
    })
    .filter((pending) => pending.date <= today && !dismissed.has(pending.id) && !confirmed.has(pending.id))
    .sort((left, right) => left.date.localeCompare(right.date) || left.name.localeCompare(right.name));
};

export const transactionFromPendingRecurring = (pending: PendingRecurringTransaction, id: string): Transaction => ({
  id,
  type: pending.type,
  amount: pending.amount,
  category: pending.category,
  note: pending.note,
  date: pending.date,
  recurringRuleId: pending.ruleId,
  recurringPeriod: pending.period,
});
