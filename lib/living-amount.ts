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

export function livingExpenseAlertFor(livingAmount: number, expense: number) {
  const overage = expense - livingAmount;
  return overage > 0 ? { status: "over" as const, overage } : { status: "normal" as const, overage: 0 };
}
