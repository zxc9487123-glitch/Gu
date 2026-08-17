import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";

import { SAVINGS_GOAL_KEY, savingsGoalFromStorage } from "@/lib/savings-goal";

export function useSavingsGoal() {
  const [savingsGoal, setSavingsGoalState] = useState<number | null>(null);

  const loadSavingsGoal = useCallback(async () => {
    const stored = await AsyncStorage.getItem(SAVINGS_GOAL_KEY);
    setSavingsGoalState(savingsGoalFromStorage(stored));
  }, []);

  useEffect(() => {
    void loadSavingsGoal();
  }, [loadSavingsGoal]);

  useFocusEffect(
    useCallback(() => {
      void loadSavingsGoal();
    }, [loadSavingsGoal]),
  );

  const setSavingsGoal = useCallback(async (goal: number | null) => {
    setSavingsGoalState(goal);
    if (goal === null || goal <= 0) {
      await AsyncStorage.removeItem(SAVINGS_GOAL_KEY);
      return;
    }
    await AsyncStorage.setItem(SAVINGS_GOAL_KEY, String(goal));
  }, []);

  return { savingsGoal, setSavingsGoal };
}
