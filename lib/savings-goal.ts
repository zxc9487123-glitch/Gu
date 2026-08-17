export const SAVINGS_GOAL_KEY = "bookkeeping:savings-goal";

export type SavingsGoalProgress = {
  goal: number | null;
  saved: number;
  progressPercent: number | null;
  progressFraction: number;
  remaining: number | null;
  status: "not-set" | "in-progress" | "achieved";
};

export function savingsGoalFromStorage(value: string | null) {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function savingsGoalProgressFor(saved: number, goal: number | null): SavingsGoalProgress {
  if (goal === null || goal <= 0) {
    return {
      goal: null,
      saved,
      progressPercent: null,
      progressFraction: 0,
      remaining: null,
      status: "not-set",
    };
  }

  const rawPercent = Math.round((saved / goal) * 100);
  const achieved = saved >= goal;
  return {
    goal,
    saved,
    progressPercent: rawPercent,
    progressFraction: Math.max(0, Math.min(saved / goal, 1)),
    remaining: Math.max(goal - saved, 0),
    status: achieved ? "achieved" : "in-progress",
  };
}
