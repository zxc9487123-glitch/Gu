export const ANNUAL_SUMMARY_PREFERENCE_KEY = "bookkeeping.annual-summary-expanded.v1";

export const annualSummaryExpandedFromStorage = (value: string | null) => value === "expanded";

export const annualSummaryStorageValue = (isExpanded: boolean) => isExpanded ? "expanded" : "collapsed";
