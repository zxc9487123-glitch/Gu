import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "bookkeeping.monthly-living-budget.v1";

export function useLivingBudget() {
  const [monthlyBudget, setMonthlyBudgetState] = useState<number | null>(null);
  const [isLoadingBudget, setIsLoadingBudget] = useState(true);

  const loadBudget = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = stored === null ? null : Number(stored);
      setMonthlyBudgetState(Number.isFinite(parsed) && (parsed ?? 0) > 0 ? parsed : null);
    } finally {
      setIsLoadingBudget(false);
    }
  }, []);

  useEffect(() => {
    void loadBudget();
  }, [loadBudget]);

  useFocusEffect(
    useCallback(() => {
      void loadBudget();
    }, [loadBudget]),
  );

  const setMonthlyBudget = useCallback(async (value: number | null) => {
    const next = value && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
    setMonthlyBudgetState(next);
    if (next === null) await AsyncStorage.removeItem(STORAGE_KEY);
    else await AsyncStorage.setItem(STORAGE_KEY, String(next));
  }, []);

  return { monthlyBudget, isLoadingBudget, setMonthlyBudget };
}
