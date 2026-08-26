import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";

import {
  COMPARISON_CARD_PREFERENCE_KEY,
  comparisonCardVisibilityFromStorage,
  comparisonCardVisibilityStorageValue,
  DEFAULT_COMPARISON_CARD_VISIBILITY,
  type ComparisonCardKey,
} from "@/lib/comparison-card-preference";

export function useComparisonCardPreference() {
  const [visibleComparisonCards, setVisibleComparisonCards] = useState(DEFAULT_COMPARISON_CARD_VISIBILITY);

  const loadPreference = useCallback(async () => {
    const stored = await AsyncStorage.getItem(COMPARISON_CARD_PREFERENCE_KEY);
    setVisibleComparisonCards(comparisonCardVisibilityFromStorage(stored));
  }, []);

  useEffect(() => {
    void loadPreference();
  }, [loadPreference]);

  useFocusEffect(
    useCallback(() => {
      void loadPreference();
    }, [loadPreference]),
  );

  const setComparisonCardVisible = useCallback(async (key: ComparisonCardKey, isVisible: boolean) => {
    const next = { ...visibleComparisonCards, [key]: isVisible };
    setVisibleComparisonCards(next);
    await AsyncStorage.setItem(COMPARISON_CARD_PREFERENCE_KEY, comparisonCardVisibilityStorageValue(next));
  }, [visibleComparisonCards]);

  return { visibleComparisonCards, setComparisonCardVisible };
}
