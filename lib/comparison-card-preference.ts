export type ComparisonCardKey = "expense" | "balance";

export type ComparisonCardVisibility = Record<ComparisonCardKey, boolean>;

export const COMPARISON_CARD_PREFERENCE_KEY = "bookkeeping.comparison-card-visibility.v1";

export const DEFAULT_COMPARISON_CARD_VISIBILITY: ComparisonCardVisibility = {
  expense: true,
  balance: true,
};

export function comparisonCardVisibilityFromStorage(value: string | null): ComparisonCardVisibility {
  if (!value) return DEFAULT_COMPARISON_CARD_VISIBILITY;

  try {
    const parsed = JSON.parse(value) as Partial<Record<ComparisonCardKey, unknown>>;
    return {
      expense: typeof parsed.expense === "boolean" ? parsed.expense : DEFAULT_COMPARISON_CARD_VISIBILITY.expense,
      balance: typeof parsed.balance === "boolean" ? parsed.balance : DEFAULT_COMPARISON_CARD_VISIBILITY.balance,
    };
  } catch {
    return DEFAULT_COMPARISON_CARD_VISIBILITY;
  }
}

export const comparisonCardVisibilityStorageValue = (visibility: ComparisonCardVisibility) => JSON.stringify(visibility);
