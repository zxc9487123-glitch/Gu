import { summaryFor, type Transaction } from "./finance";

export type MonthlySavingsSummary = {
  year: number;
  month: number;
  net: number;
};

function savingsForMonth(transactions: Transaction[], year: number, month: number): MonthlySavingsSummary {
  const matching = transactions.filter((transaction) => {
    const date = new Date(`${transaction.date}T12:00:00`);
    return date.getFullYear() === year && date.getMonth() === month;
  });

  return { year, month, net: summaryFor(matching).net };
}

export function monthlySavingsComparison(transactions: Transaction[], reference = new Date()) {
  const current = savingsForMonth(transactions, reference.getFullYear(), reference.getMonth());
  const previousReference = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
  const previous = savingsForMonth(transactions, previousReference.getFullYear(), previousReference.getMonth());
  return { current, previous, difference: current.net - previous.net };
}

export function latestMonthlySavingsComparison(transactions: Transaction[], focusTransactions: Transaction[] = transactions) {
  const latest = focusTransactions.reduce<Date | null>((latestDate, transaction) => {
    const date = new Date(`${transaction.date}T12:00:00`);
    return latestDate === null || date > latestDate ? date : latestDate;
  }, null);

  return latest === null ? null : monthlySavingsComparison(transactions, latest);
}
