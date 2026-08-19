import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, createElement, useCallback, useContext, useEffect, useState, type PropsWithChildren } from "react";

import { mergeExcelImports, type ExcelAutoCategoryRule, type ExcelAutoCategoryRuleInput, type ExcelImportMode, type ImportDraft } from "@/lib/excel-import";
import { currentDateInput, type Transaction, type TransactionType } from "@/lib/finance";
import { pendingRecurringTransactionsFor, transactionFromPendingRecurring, type PendingRecurringTransaction, type RecurringTransactionRule, type RecurringTransactionRuleInput } from "@/lib/recurring-transactions";

const STORAGE_KEY = "bookkeeping.transactions.v1";
const RECURRING_RULES_STORAGE_KEY = "bookkeeping.recurring-rules.v1";
const DISMISSED_RECURRING_STORAGE_KEY = "bookkeeping.dismissed-recurring.v1";
const EXCEL_AUTO_RULES_STORAGE_KEY = "bookkeeping.excel-auto-rules.v1";

type NewTransaction = {
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
};

function useFinanceStore() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringTransactionRule[]>([]);
  const [dismissedRecurringIds, setDismissedRecurringIds] = useState<string[]>([]);
  const [excelAutoRules, setExcelAutoRules] = useState<ExcelAutoCategoryRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [savedTransactions, savedRules, savedDismissed, savedExcelAutoRules] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(RECURRING_RULES_STORAGE_KEY),
        AsyncStorage.getItem(DISMISSED_RECURRING_STORAGE_KEY),
        AsyncStorage.getItem(EXCEL_AUTO_RULES_STORAGE_KEY),
      ]);
      const parsedTransactions = savedTransactions ? (JSON.parse(savedTransactions) as unknown) : [];
      const parsedRules = savedRules ? (JSON.parse(savedRules) as unknown) : [];
      const parsedDismissed = savedDismissed ? (JSON.parse(savedDismissed) as unknown) : [];
      const parsedExcelAutoRules = savedExcelAutoRules ? (JSON.parse(savedExcelAutoRules) as unknown) : [];
      if (!Array.isArray(parsedTransactions) || !Array.isArray(parsedRules) || !Array.isArray(parsedDismissed) || !Array.isArray(parsedExcelAutoRules)) throw new Error("交易資料格式不正確");
      setTransactions(parsedTransactions as Transaction[]);
      setRecurringRules(parsedRules as RecurringTransactionRule[]);
      setDismissedRecurringIds(parsedDismissed.filter((item): item is string => typeof item === "string"));
      setExcelAutoRules(parsedExcelAutoRules as ExcelAutoCategoryRule[]);
      setStorageError(null);
    } catch {
      setStorageError("無法讀取本機交易資料，請稍後重試。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(async (nextTransactions: Transaction[]) => {
    setTransactions(nextTransactions);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextTransactions));
  }, []);

  const persistRecurringRules = useCallback(async (nextRules: RecurringTransactionRule[]) => {
    setRecurringRules(nextRules);
    await AsyncStorage.setItem(RECURRING_RULES_STORAGE_KEY, JSON.stringify(nextRules));
  }, []);

  const persistDismissedRecurringIds = useCallback(async (nextIds: string[]) => {
    setDismissedRecurringIds(nextIds);
    await AsyncStorage.setItem(DISMISSED_RECURRING_STORAGE_KEY, JSON.stringify(nextIds));
  }, []);

  const persistExcelAutoRules = useCallback(async (nextRules: ExcelAutoCategoryRule[]) => {
    setExcelAutoRules(nextRules);
    await AsyncStorage.setItem(EXCEL_AUTO_RULES_STORAGE_KEY, JSON.stringify(nextRules));
  }, []);

  const addTransaction = useCallback(
    async (input: NewTransaction) => {
      const record: Transaction = {
        ...input,
        date: input.date || currentDateInput(),
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      };
      await persist([record, ...transactions]);
      return record;
    },
    [persist, transactions],
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      await persist(transactions.filter((item) => item.id !== id));
    },
    [persist, transactions],
  );

  const importTransactions = useCallback(
    async (drafts: ImportDraft[], mode: ExcelImportMode = "skip") => {
      let sequence = 0;
      const merged = mergeExcelImports(transactions, drafts, mode, () => {
        sequence += 1;
        return `import-${Date.now()}-${sequence}-${Math.random().toString(16).slice(2)}`;
      });
      if (merged.added + merged.updated > 0) await persist(merged.transactions);
      return { added: merged.added, updated: merged.updated, skipped: merged.skipped };
    },
    [persist, transactions],
  );

  const clearTransactions = useCallback(async () => {
    await persist([]);
  }, [persist]);

  const addExcelAutoRule = useCallback(async (input: ExcelAutoCategoryRuleInput) => {
    const rule: ExcelAutoCategoryRule = {
      ...input,
      id: `excel-rule-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      enabled: true,
    };
    await persistExcelAutoRules([rule, ...excelAutoRules]);
    return rule;
  }, [excelAutoRules, persistExcelAutoRules]);

  const addExcelAutoRules = useCallback(async (inputs: ExcelAutoCategoryRuleInput[]) => {
    const rules = inputs.map((input, index): ExcelAutoCategoryRule => ({
      ...input,
      id: `excel-rule-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
      enabled: true,
    }));
    if (rules.length > 0) await persistExcelAutoRules([...rules, ...excelAutoRules]);
    return rules;
  }, [excelAutoRules, persistExcelAutoRules]);

  const updateExcelAutoRule = useCallback(async (id: string, input: ExcelAutoCategoryRuleInput) => {
    await persistExcelAutoRules(excelAutoRules.map((rule) => rule.id === id ? { ...rule, ...input } : rule));
  }, [excelAutoRules, persistExcelAutoRules]);

  const setExcelAutoRuleEnabled = useCallback(async (id: string, enabled: boolean) => {
    await persistExcelAutoRules(excelAutoRules.map((rule) => rule.id === id ? { ...rule, enabled } : rule));
  }, [excelAutoRules, persistExcelAutoRules]);

  const removeExcelAutoRule = useCallback(async (id: string) => {
    await persistExcelAutoRules(excelAutoRules.filter((rule) => rule.id !== id));
  }, [excelAutoRules, persistExcelAutoRules]);

  const addRecurringRule = useCallback(async (input: RecurringTransactionRuleInput) => {
    const rule: RecurringTransactionRule = {
      ...input,
      id: `recurring-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      active: true,
    };
    await persistRecurringRules([rule, ...recurringRules]);
    return rule;
  }, [persistRecurringRules, recurringRules]);

  const removeRecurringRule = useCallback(async (id: string) => {
    await persistRecurringRules(recurringRules.filter((rule) => rule.id !== id));
  }, [persistRecurringRules, recurringRules]);

  const pendingRecurringTransactions = useCallback(() => pendingRecurringTransactionsFor({
    rules: recurringRules,
    transactions,
    dismissedIds: dismissedRecurringIds,
    referenceDate: new Date(),
  }), [dismissedRecurringIds, recurringRules, transactions]);

  const confirmRecurringTransaction = useCallback(async (pending: PendingRecurringTransaction) => {
    const record = transactionFromPendingRecurring(pending, `recurring-confirmed-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await persist([record, ...transactions]);
    return record;
  }, [persist, transactions]);

  const dismissRecurringTransaction = useCallback(async (pendingId: string) => {
    if (dismissedRecurringIds.includes(pendingId)) return;
    await persistDismissedRecurringIds([...dismissedRecurringIds, pendingId]);
  }, [dismissedRecurringIds, persistDismissedRecurringIds]);

  return {
    transactions,
    recurringRules,
    excelAutoRules,
    isLoading,
    storageError,
    addTransaction,
    removeTransaction,
    importTransactions,
    clearTransactions,
    addExcelAutoRule,
    addExcelAutoRules,
    updateExcelAutoRule,
    setExcelAutoRuleEnabled,
    removeExcelAutoRule,
    addRecurringRule,
    removeRecurringRule,
    pendingRecurringTransactions,
    confirmRecurringTransaction,
    dismissRecurringTransaction,
  };
}

type FinanceStore = ReturnType<typeof useFinanceStore>;

const FinanceContext = createContext<FinanceStore | null>(null);

export function FinanceProvider({ children }: PropsWithChildren) {
  const finance = useFinanceStore();
  return createElement(FinanceContext.Provider, { value: finance }, children);
}

export function useFinance() {
  const finance = useContext(FinanceContext);
  if (finance === null) throw new Error("useFinance 必須在 FinanceProvider 內使用。");
  return finance;
}
