import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";

import { MONTH_PICKER_PREFERENCE_KEY, monthPickerExpandedFromStorage, monthPickerStorageValue } from "@/lib/month-picker-preference";

export function useMonthPickerPreference() {
  const [isMonthPickerExpanded, setMonthPickerExpandedState] = useState(false);

  const loadPreference = useCallback(async () => {
    const stored = await AsyncStorage.getItem(MONTH_PICKER_PREFERENCE_KEY);
    setMonthPickerExpandedState(monthPickerExpandedFromStorage(stored));
  }, []);

  useEffect(() => {
    void loadPreference();
  }, [loadPreference]);

  useFocusEffect(
    useCallback(() => {
      void loadPreference();
    }, [loadPreference]),
  );

  const setMonthPickerExpanded = useCallback(async (isExpanded: boolean) => {
    setMonthPickerExpandedState(isExpanded);
    await AsyncStorage.setItem(MONTH_PICKER_PREFERENCE_KEY, monthPickerStorageValue(isExpanded));
  }, []);

  return { isMonthPickerExpanded, setMonthPickerExpanded };
}
