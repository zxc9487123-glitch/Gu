export function livingAmountFor(income: number, expense: number) {
  return income / 3 - expense;
}

export function livingExpenseComparisonFor(livingAmount: number, expense: number) {
  return { difference: livingAmount - expense };
}

export function livingExpenseSharePercentFor(livingAmount: number, expense: number) {
  if (expense <= 0) return null;
  return Math.round((livingAmount / expense) * 100);
}
