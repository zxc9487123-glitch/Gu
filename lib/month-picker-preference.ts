export const MONTH_PICKER_PREFERENCE_KEY = "bookkeeping.month-picker-expanded.v1";

export const monthPickerExpandedFromStorage = (value: string | null) => value === "expanded";

export const monthPickerStorageValue = (isExpanded: boolean) => isExpanded ? "expanded" : "collapsed";
