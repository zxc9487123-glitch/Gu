import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";

import { currentDateInput, type Transaction, type TransactionType } from "@/lib/finance";

const STORAGE_KEY = "bookkeeping.transactions.v1";

type NewTransaction = {
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
};

export function useFinance() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      setTransactions(saved ? (JSON.parse(saved) as Transaction[]) : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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

  const clearTransactions = useCallback(async () => {
    await persist([]);
  }, [persist]);

  return { transactions, isLoading, addTransaction, removeTransaction, clearTransactions };
}
