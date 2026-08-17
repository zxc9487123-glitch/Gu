export type AnnualLivingBudget = {
  annualBudget: number | null;
  annualExpense: number;
  remaining: number | null;
};

export function annualLivingBudgetFor(monthlyBudget: number | null, annualExpense: number): AnnualLivingBudget {
  const annualBudget = monthlyBudget === null ? null : monthlyBudget * 12;
  return {
    annualBudget,
    annualExpense,
    remaining: annualBudget === null ? null : annualBudget - annualExpense,
  };
}
