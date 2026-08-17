import type { Transaction } from "./finance";
import { livingAmountFor } from "./living-amount";

export type MonthlyLivingSummary = {
  year: number;
  month: number;
  income: number;
  expense: number;
  livingAmount: number;
};

function summaryForMonth(transactions: Transaction[], year: number, month: number): MonthlyLivingSummary {
  const matching = transactions.filter((transaction) => {
    const date = new Date(`${transaction.date}T12:00:00`);
    return date.getFullYear() === year && date.getMonth() === month;
  });
  const income = matching.filter((item) => item.type === "income").reduce((total, item) => total + item.amount, 0);
  const expense = matching.filter((item) => item.type === "expense").reduce((total, item) => total + item.amount, 0);
  return { year, month, income, expense, livingAmount: livingAmountFor(income, expense) };
}

export function monthlyLivingComparison(transactions: Transaction[], reference = new Date()) {
  const current = summaryForMonth(transactions, reference.getFullYear(), reference.getMonth());
  const previousReference = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
  const previous = summaryForMonth(transactions, previousReference.getFullYear(), previousReference.getMonth());
  return { current, previous, difference: current.livingAmount - previous.livingAmount };
}
