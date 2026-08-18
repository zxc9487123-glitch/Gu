import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { ScreenContainer } from "@/components/screen-container";
import { useFinance } from "@/hooks/use-finance";
import { dateLabel, filteredTransactionsFor, money, sortTransactionsFor, type Transaction } from "@/lib/finance";

const parseAmount = (value: string) => {
  const normalized = value.replace(/[\s,]/g, "");
  if (!normalized) return undefined;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
};

const isDateInput = (value: string) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value);

function TransactionRow({ item, onRemove }: { item: Transaction; onRemove: () => void }) {
  const isIncome = item.type === "income";
  return (
    <Pressable
      onLongPress={onRemove}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.typeBadge, isIncome ? styles.incomeBadge : styles.expenseBadge]}>
        <Text style={[styles.typeBadgeText, isIncome ? styles.incomeText : styles.expenseText]}>{isIncome ? "入" : "出"}</Text>
      </View>
      <View style={styles.rowMain}>
        <Text style={styles.category}>{item.category}</Text>
        <Text numberOfLines={1} style={styles.rowMeta}>{item.note || dateLabel(item.date)}</Text>
      </View>
      <View style={styles.rowValue}>
        <Text style={[styles.amount, isIncome ? styles.incomeText : styles.expenseText]}>{isIncome ? "+" : "−"}{money(item.amount).replace("NT$ ", "")}</Text>
        <Text style={styles.rowDate}>{dateLabel(item.date)}</Text>
      </View>
    </Pressable>
  );
}

export default function TransactionsScreen() {
  const router = useRouter();
  const { transactions, removeTransaction } = useFinance();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const selectedCategory = Array.isArray(category) ? category[0] : category;
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minimumAmount, setMinimumAmount] = useState("");
  const [maximumAmount, setMaximumAmount] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortDirection, setSortDirection] = useState<"ascending" | "descending">("descending");
  const validDates = isDateInput(dateFrom) && isDateInput(dateTo);
  const minimum = parseAmount(minimumAmount);
  const maximum = parseAmount(maximumAmount);
  const validAmounts = (minimumAmount === "" || minimum !== undefined) && (maximumAmount === "" || maximum !== undefined);
  const hasInvalidRange = validDates && validAmounts && ((dateFrom !== "" && dateTo !== "" && dateFrom > dateTo) || (minimum !== undefined && maximum !== undefined && minimum > maximum));
  const hasFilters = Boolean(dateFrom || dateTo || minimumAmount || maximumAmount);
  const records = useMemo(() => sortTransactionsFor(filteredTransactionsFor(transactions, {
    category: selectedCategory,
    dateFrom: validDates ? dateFrom || undefined : undefined,
    dateTo: validDates ? dateTo || undefined : undefined,
    minimumAmount: validAmounts ? minimum : undefined,
    maximumAmount: validAmounts ? maximum : undefined,
  }), { field: sortField, direction: sortDirection }), [transactions, selectedCategory, dateFrom, dateTo, minimum, maximum, validDates, validAmounts, sortField, sortDirection]);
  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setMinimumAmount("");
    setMaximumAmount("");
  };
  const confirmRemove = (item: Transaction) => {
    Alert.alert("刪除這筆記錄？", `${item.category}・${money(item.amount)}`, [
      { text: "取消", style: "cancel" },
      { text: "刪除", style: "destructive", onPress: () => void removeTransaction(item.id) },
    ]);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionRow item={item} onRemove={() => confirmRemove(item)} />}
        contentContainerStyle={[styles.listContent, records.length === 0 && styles.emptyList]}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerTitleCopy}>
                <Text style={styles.title}>{selectedCategory ? `${selectedCategory}明細` : "交易明細"}</Text>
                <Text style={styles.subtitle}>{selectedCategory ? `目前僅顯示「${selectedCategory}」的交易；長按可刪除。` : "長按任一筆紀錄即可刪除。"}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="新增交易" onPress={() => router.push("/add")} style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}>
                <Text style={styles.addButtonText}>＋ 新增</Text>
              </Pressable>
            </View>
            <View style={styles.filterCard}>
              <View style={styles.filterHeader}>
                <View style={styles.filterHeaderCopy}><Text style={styles.filterTitle}>篩選交易</Text><Text numberOfLines={1} style={styles.filterHint}>日期 YYYY-MM-DD；金額上下限</Text></View>
                <Pressable disabled={!hasFilters} onPress={clearFilters} style={({ pressed }) => [styles.clearButton, !hasFilters && styles.clearButtonDisabled, pressed && hasFilters && styles.clearButtonPressed]}><Text style={[styles.clearButtonText, !hasFilters && styles.clearButtonTextDisabled]}>清除</Text></Pressable>
              </View>
              <Text style={styles.filterLabel}>日期</Text>
              <View style={styles.inputRow}>
                <TextInput value={dateFrom} onChangeText={setDateFrom} placeholder="開始" placeholderTextColor="#9CA59F" autoCapitalize="none" autoCorrect={false} maxLength={10} style={styles.filterInput} />
                <Text style={styles.rangeDivider}>–</Text>
                <TextInput value={dateTo} onChangeText={setDateTo} placeholder="結束" placeholderTextColor="#9CA59F" autoCapitalize="none" autoCorrect={false} maxLength={10} style={styles.filterInput} />
              </View>
              <Text style={styles.filterLabel}>金額</Text>
              <View style={styles.inputRow}>
                <TextInput value={minimumAmount} onChangeText={setMinimumAmount} placeholder="最低" placeholderTextColor="#9CA59F" inputMode="decimal" keyboardType="decimal-pad" style={styles.filterInput} />
                <Text style={styles.rangeDivider}>–</Text>
                <TextInput value={maximumAmount} onChangeText={setMaximumAmount} placeholder="最高" placeholderTextColor="#9CA59F" inputMode="decimal" keyboardType="decimal-pad" style={styles.filterInput} />
              </View>
              <Text style={styles.filterLabel}>排序</Text>
              <View style={styles.sortRow}>
                <Pressable onPress={() => setSortField("date")} style={({ pressed }) => [styles.sortButton, sortField === "date" && styles.sortButtonActive, pressed && styles.sortButtonPressed]}><Text style={[styles.sortButtonText, sortField === "date" && styles.sortButtonTextActive]}>日期</Text></Pressable>
                <Pressable onPress={() => setSortField("amount")} style={({ pressed }) => [styles.sortButton, sortField === "amount" && styles.sortButtonActive, pressed && styles.sortButtonPressed]}><Text style={[styles.sortButtonText, sortField === "amount" && styles.sortButtonTextActive]}>金額</Text></Pressable>
                <Pressable onPress={() => setSortDirection("ascending")} style={({ pressed }) => [styles.sortButton, sortDirection === "ascending" && styles.sortButtonActive, pressed && styles.sortButtonPressed]}><Text style={[styles.sortButtonText, sortDirection === "ascending" && styles.sortButtonTextActive]}>↑ 遞增</Text></Pressable>
                <Pressable onPress={() => setSortDirection("descending")} style={({ pressed }) => [styles.sortButton, sortDirection === "descending" && styles.sortButtonActive, pressed && styles.sortButtonPressed]}><Text style={[styles.sortButtonText, sortDirection === "descending" && styles.sortButtonTextActive]}>↓ 遞減</Text></Pressable>
              </View>
              {!validDates ? <Text style={styles.filterError}>日期格式請使用 YYYY-MM-DD。</Text> : !validAmounts ? <Text style={styles.filterError}>金額請輸入零或正數。</Text> : hasInvalidRange ? <Text style={styles.filterError}>起始值不可大於結束值。</Text> : <Text style={styles.filterResult}>符合條件：{records.length} 筆</Text>}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{hasFilters ? "沒有符合篩選條件的交易" : selectedCategory ? "此分類尚無交易紀錄" : "尚未有交易紀錄"}</Text>
            <Text style={styles.emptyText}>{hasFilters ? "請調整日期或金額範圍，或按「清除」查看所有交易。" : selectedCategory ? "可返回分析頁選擇其他分類，或新增一筆交易。" : "請按右上角「新增」記下你的第一筆收支。"}</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 20, paddingBottom: 34 },
  emptyList: { flexGrow: 1 },
  header: { marginBottom: 18 },
  headerTitleRow: { alignItems: "flex-start", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  headerTitleCopy: { flex: 1, minWidth: 0 },
  title: { color: "#1F2421", fontSize: 29, fontWeight: "900" },
  subtitle: { color: "#7A837D", marginTop: 5, fontSize: 13 },
  addButton: { alignItems: "center", backgroundColor: "#0E6B56", borderRadius: 10, justifyContent: "center", minHeight: 36, paddingHorizontal: 10 },
  addButtonPressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
  addButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  filterCard: { backgroundColor: "#FFFFFF", borderColor: "#EDE8DF", borderRadius: 16, borderWidth: 1, marginTop: 16, padding: 12 },
  filterHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  filterHeaderCopy: { flex: 1, minWidth: 0, paddingRight: 8 },
  filterTitle: { color: "#1F2421", fontSize: 15, fontWeight: "900" },
  filterHint: { color: "#7A837D", fontSize: 11, marginTop: 3 },
  clearButton: { alignItems: "center", backgroundColor: "#E7F2ED", borderRadius: 9, justifyContent: "center", minHeight: 30, minWidth: 42, paddingHorizontal: 8 },
  clearButtonDisabled: { backgroundColor: "#F3F1EC" },
  clearButtonPressed: { opacity: 0.7 },
  clearButtonText: { color: "#0E6B56", fontSize: 12, fontWeight: "900" },
  clearButtonTextDisabled: { color: "#A6ACA7" },
  filterLabel: { color: "#526058", fontSize: 12, fontWeight: "800", marginTop: 11, marginBottom: 5 },
  inputRow: { alignItems: "center", flexDirection: "row", width: "100%" },
  filterInput: { backgroundColor: "#F8F6F1", borderColor: "#E8E3DA", borderRadius: 10, borderWidth: 1, color: "#1F2421", flexBasis: 0, flexGrow: 1, flexShrink: 1, fontSize: 12, minHeight: 40, minWidth: 0, paddingHorizontal: 8 },
  rangeDivider: { color: "#7A837D", flexShrink: 0, fontSize: 12, fontWeight: "700", marginHorizontal: 6 },
  sortRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, width: "100%" },
  sortButton: { alignItems: "center", backgroundColor: "#F8F6F1", borderColor: "#E8E3DA", borderRadius: 9, borderWidth: 1, flexBasis: "48%", flexGrow: 1, flexShrink: 1, justifyContent: "center", minHeight: 34, minWidth: 0, paddingHorizontal: 6 },
  sortButtonActive: { backgroundColor: "#E7F2ED", borderColor: "#0E6B56" },
  sortButtonPressed: { opacity: 0.7 },
  sortButtonText: { color: "#647068", fontSize: 12, fontWeight: "800" },
  sortButtonTextActive: { color: "#0E6B56" },
  filterError: { color: "#B54C3A", fontSize: 11, fontWeight: "700", marginTop: 10 },
  filterResult: { color: "#0E6B56", fontSize: 11, fontWeight: "800", marginTop: 10 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", paddingHorizontal: 14, paddingVertical: 14 },
  rowPressed: { opacity: 0.72 },
  typeBadge: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  incomeBadge: { backgroundColor: "#E7F2ED" },
  expenseBadge: { backgroundColor: "#F9E9E5" },
  typeBadgeText: { fontSize: 14, fontWeight: "900" },
  incomeText: { color: "#0E6B56" },
  expenseText: { color: "#C85F3A" },
  rowMain: { flex: 1, marginLeft: 11, minWidth: 0 },
  category: { color: "#1F2421", fontSize: 15, fontWeight: "800" },
  rowMeta: { color: "#7A837D", fontSize: 12, marginTop: 3 },
  rowValue: { alignItems: "flex-end", marginLeft: 8 },
  amount: { fontSize: 14, fontWeight: "900" },
  rowDate: { color: "#8B948E", fontSize: 11, marginTop: 3 },
  separator: { height: 8 },
  emptyCard: { marginTop: 60, padding: 24, alignItems: "center", borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EDE8DF" },
  emptyTitle: { color: "#1F2421", fontSize: 17, fontWeight: "900" },
  emptyText: { color: "#7A837D", textAlign: "center", fontSize: 13, lineHeight: 20, marginTop: 8 },
});
