export function livingAmountFor(income: number, expense: number) {
  return income / 3;
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
  const usagePercent = livingAmount > 0 ? Math.round((expense / livingAmount) * 100) : 0;
  if (overage > 0) return { status: "over" as const, overage, usagePercent };
  if (livingAmount > 0 && usagePercent >= 80) return { status: "warning" as const, overage: 0, usagePercent };
  return { status: "normal" as const, overage: 0, usagePercent };
}
