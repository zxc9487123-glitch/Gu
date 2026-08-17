export function livingAmountFor(income: number, expense: number) {
  return income / 3 - expense;
}

export function livingExpenseComparisonFor(livingAmount: number, expense: number) {
  return { difference: livingAmount - expense };
}
