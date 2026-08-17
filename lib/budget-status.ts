export type BudgetStatus = "normal" | "warning" | "over";

export type BudgetAlert = {
  status: BudgetStatus;
  usageRate: number;
  usagePercent: number;
  message: string;
};

export function budgetAlertFor(expense: number, budget: number): BudgetAlert {
  const usageRate = budget > 0 ? expense / budget : 0;
  const usagePercent = Math.round(usageRate * 100);
  if (usageRate >= 1) {
    return { status: "over", usageRate, usagePercent, message: `已超出每月預算 ${usagePercent - 100}%` };
  }
  if (usageRate >= 0.8) {
    return { status: "warning", usageRate, usagePercent, message: `已使用 ${usagePercent}%：接近每月預算上限` };
  }
  return { status: "normal", usageRate, usagePercent, message: `已使用 ${usagePercent}%：仍在每月預算內` };
}

export function budgetProgressPercentFor(usageRate: number) {
  return Math.round(Math.max(0, Math.min(usageRate, 1)) * 100);
}
