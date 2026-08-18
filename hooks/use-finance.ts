import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, createElement, useCallback, useContext, useEffect, useState, type PropsWithChildren } from "react";

import { mergeExcelImports, type ExcelImportMode, type ImportDraft } from "@/lib/excel-import";
import { currentDateInput, type Transaction, type TransactionType } from "@/lib/finance";

const STORAGE_KEY = "bookkeeping.transactions.v1";

type NewTransaction = {
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
};

function useFinanceStore() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = saved ? (JSON.parse(saved) as unknown) : [];
      if (!Array.isArray(parsed)) throw new Error("交易資料格式不正確");
      setTransactions(parsed as Transaction[]);
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

  return { transactions, isLoading, storageError, addTransaction, removeTransaction, importTransactions, clearTransactions };
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
