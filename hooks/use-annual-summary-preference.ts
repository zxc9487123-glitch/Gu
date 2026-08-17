import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";

import { ANNUAL_SUMMARY_PREFERENCE_KEY, annualSummaryExpandedFromStorage, annualSummaryStorageValue } from "@/lib/annual-summary-preference";

export function useAnnualSummaryPreference() {
  const [isAnnualSummaryExpanded, setAnnualSummaryExpandedState] = useState(false);

  const loadPreference = useCallback(async () => {
    const stored = await AsyncStorage.getItem(ANNUAL_SUMMARY_PREFERENCE_KEY);
    setAnnualSummaryExpandedState(annualSummaryExpandedFromStorage(stored));
  }, []);

  useEffect(() => {
    void loadPreference();
  }, [loadPreference]);

  useFocusEffect(
    useCallback(() => {
      void loadPreference();
    }, [loadPreference]),
  );

  const setAnnualSummaryExpanded = useCallback(async (isExpanded: boolean) => {
    setAnnualSummaryExpandedState(isExpanded);
    await AsyncStorage.setItem(ANNUAL_SUMMARY_PREFERENCE_KEY, annualSummaryStorageValue(isExpanded));
  }, []);

  return { isAnnualSummaryExpanded, setAnnualSummaryExpanded };
}
