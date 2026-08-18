import { Alert, Animated, Easing, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";

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

export function TransactionsContent({ initialCategory, onClearCategory }: { initialCategory?: string; onClearCategory?: () => void }) {
  const router = useRouter();
  const { transactions, removeTransaction } = useFinance();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const routeCategory = Array.isArray(category) ? category[0] : category;
  const selectedCategory = initialCategory ?? routeCategory;
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minimumAmount, setMinimumAmount] = useState("");
  const [maximumAmount, setMaximumAmount] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortDirection, setSortDirection] = useState<"ascending" | "descending">("descending");
  const [isFilterDrawerVisible, setIsFilterDrawerVisible] = useState(false);
  const drawerProgress = useRef(new Animated.Value(1)).current;
  const validDates = isDateInput(dateFrom) && isDateInput(dateTo);
  const minimum = parseAmount(minimumAmount);
  const maximum = parseAmount(maximumAmount);
  const validAmounts = (minimumAmount === "" || minimum !== undefined) && (maximumAmount === "" || maximum !== undefined);
  const hasInvalidRange = validDates && validAmounts && ((dateFrom !== "" && dateTo !== "" && dateFrom > dateTo) || (minimum !== undefined && maximum !== undefined && minimum > maximum));
  const hasFilters = Boolean(dateFrom || dateTo || minimumAmount || maximumAmount);
  const activeFilterCount = Number(Boolean(dateFrom || dateTo)) + Number(Boolean(minimumAmount || maximumAmount)) + Number(sortField !== "date" || sortDirection !== "descending");
  const hasActiveFilterSettings = activeFilterCount > 0;
  const dateSummary = dateFrom || dateTo ? `日期：${dateFrom || "不限"} 至 ${dateTo || "不限"}` : "日期：全部";
  const amountSummary = minimumAmount || maximumAmount ? `金額：${minimumAmount || "不限"} 至 ${maximumAmount || "不限"}` : "金額：全部";
  const sortSummary = `${sortField === "date" ? "日期" : "金額"}${sortDirection === "ascending" ? "↑" : "↓"}`;
  const drawerTranslateY = drawerProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 560] });
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
    setSortField("date");
    setSortDirection("descending");
  };
  const openFilterDrawer = () => {
    drawerProgress.setValue(1);
    setIsFilterDrawerVisible(true);
    requestAnimationFrame(() => {
      Animated.timing(drawerProgress, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };
  const closeFilterDrawer = () => {
    Animated.timing(drawerProgress, {
      toValue: 1,
      duration: 170,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setIsFilterDrawerVisible(false);
    });
  };
  const confirmRemove = (item: Transaction) => {
    Alert.alert("刪除這筆記錄？", `${item.category}・${money(item.amount)}`, [
      { text: "取消", style: "cancel" },
      { text: "刪除", style: "destructive", onPress: () => void removeTransaction(item.id) },
    ]);
  };

  return (
    <>
    <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionRow item={item} onRemove={() => confirmRemove(item)} />}
        contentContainerStyle={[styles.listContent, records.length === 0 && styles.emptyList]}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerTitleCopy}>
                <View style={styles.titleLine}><Text style={styles.title}>{selectedCategory ? `${selectedCategory}明細` : "交易明細"}</Text>{selectedCategory && onClearCategory ? <Pressable accessibilityRole="button" onPress={onClearCategory} style={styles.categoryClearButton}><Text style={styles.categoryClearText}>全部</Text></Pressable> : null}</View>
                <Text style={styles.subtitle}>{selectedCategory ? `目前僅顯示「${selectedCategory}」的交易；長按可刪除。` : "長按任一筆紀錄即可刪除。"}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="新增交易" onPress={() => router.push("/add")} style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}>
                <Text style={styles.addButtonText}>＋ 新增</Text>
              </Pressable>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="開啟篩選與排序" accessibilityHint="設定日期、金額範圍與排序方式" onPress={openFilterDrawer} style={({ pressed }) => [styles.filterSummary, pressed && styles.filterSummaryPressed]}>
              <View style={styles.filterSummaryLeading}>
                <View style={styles.filterSummaryTitleRow}>
                  <Text style={styles.filterSummaryTitle}>篩選與排序</Text>
                  {hasActiveFilterSettings ? <View style={styles.activeFilterBadge}><Text style={styles.activeFilterBadgeText}>{activeFilterCount}</Text></View> : null}
                </View>
                <Text numberOfLines={1} style={styles.filterSummaryText}>{dateSummary}　·　{amountSummary}　·　{sortSummary}</Text>
              </View>
              <View style={styles.filterSummaryTrailing}>
                <Text style={styles.filterRecordCount}>{records.length} 筆</Text>
                <Text style={styles.filterSummaryChevron}>⌄</Text>
              </View>
            </Pressable>
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
      <Modal transparent visible={isFilterDrawerVisible} animationType="none" onRequestClose={closeFilterDrawer}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.drawerModal}>
          <Pressable accessibilityRole="button" accessibilityLabel="關閉篩選面板" onPress={closeFilterDrawer} style={styles.drawerBackdrop} />
          <Animated.View style={[styles.drawerSheet, { transform: [{ translateY: drawerTranslateY }] }]}>
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHeader}>
              <View><Text style={styles.drawerTitle}>篩選與排序</Text><Text style={styles.drawerHint}>日期格式 YYYY-MM-DD；金額使用正數</Text></View>
              <Pressable accessibilityRole="button" onPress={closeFilterDrawer} style={({ pressed }) => [styles.drawerCloseButton, pressed && styles.drawerCloseButtonPressed]}><Text style={styles.drawerCloseText}>完成</Text></Pressable>
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
              <Pressable onPress={() => setSortDirection("ascending")} style={({ pressed }) => [styles.sortButton, sortDirection === "ascending" && styles.sortButtonPressed]}><Text style={[styles.sortButtonText, sortDirection === "ascending" && styles.sortButtonTextActive]}>↑ 遞增</Text></Pressable>
              <Pressable onPress={() => setSortDirection("descending")} style={({ pressed }) => [styles.sortButton, sortDirection === "descending" && styles.sortButtonPressed]}><Text style={[styles.sortButtonText, sortDirection === "descending" && styles.sortButtonTextActive]}>↓ 遞減</Text></Pressable>
            </View>
            <View style={styles.drawerFooter}>
              <Text style={!validDates || !validAmounts || hasInvalidRange ? styles.filterError : styles.filterResult}>{!validDates ? "日期格式請使用 YYYY-MM-DD。" : !validAmounts ? "金額請輸入零或正數。" : hasInvalidRange ? "起始值不可大於結束值。" : `符合條件：${records.length} 筆`}</Text>
              <Pressable disabled={!hasActiveFilterSettings} onPress={clearFilters} style={({ pressed }) => [styles.clearButton, !hasActiveFilterSettings && styles.clearButtonDisabled, pressed && hasActiveFilterSettings && styles.clearButtonPressed]}><Text style={[styles.clearButtonText, !hasActiveFilterSettings && styles.clearButtonTextDisabled]}>清除</Text></Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

export default function TransactionsScreen() {
  return <ScreenContainer containerClassName="bg-background"><TransactionsContent /></ScreenContainer>;
}

const styles = StyleSheet.create({
  listContent: { padding: 20, paddingBottom: 34 },
  emptyList: { flexGrow: 1 },
  header: { marginBottom: 18 },
  headerTitleRow: { alignItems: "flex-start", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  headerTitleCopy: { flex: 1, minWidth: 0 },
  titleLine: { alignItems: "center", flexDirection: "row", gap: 7 },
  title: { color: "#1F2421", fontSize: 29, fontWeight: "900" },
  categoryClearButton: { backgroundColor: "#E7F2ED", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  categoryClearText: { color: "#0E6B56", fontSize: 10, fontWeight: "900" },
  subtitle: { color: "#7A837D", marginTop: 5, fontSize: 13 },
  addButton: { alignItems: "center", backgroundColor: "#0E6B56", borderRadius: 10, justifyContent: "center", minHeight: 36, paddingHorizontal: 10 },
  addButtonPressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
  addButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  filterSummary: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#EDE8DF", borderRadius: 14, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 16, minHeight: 62, paddingHorizontal: 13, paddingVertical: 10 },
  filterSummaryPressed: { opacity: 0.76 },
  filterSummaryLeading: { flex: 1, minWidth: 0, paddingRight: 12 },
  filterSummaryTitleRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  filterSummaryTitle: { color: "#1F2421", fontSize: 14, fontWeight: "900" },
  activeFilterBadge: { alignItems: "center", backgroundColor: "#0E6B56", borderRadius: 9, height: 18, justifyContent: "center", minWidth: 18, paddingHorizontal: 4 },
  activeFilterBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  filterSummaryText: { color: "#7A837D", fontSize: 11, marginTop: 4 },
  filterSummaryTrailing: { alignItems: "flex-end", flexShrink: 0 },
  filterRecordCount: { color: "#0E6B56", fontSize: 13, fontWeight: "900" },
  filterSummaryChevron: { color: "#7A837D", fontSize: 16, lineHeight: 17, marginTop: 1 },
  drawerModal: { flex: 1, justifyContent: "flex-end" },
  drawerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(22, 30, 26, 0.42)" },
  drawerSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 26, paddingHorizontal: 20, paddingTop: 9 },
  drawerHandle: { alignSelf: "center", backgroundColor: "#D8DDD8", borderRadius: 2, height: 4, marginBottom: 14, width: 38 },
  drawerHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  drawerTitle: { color: "#1F2421", fontSize: 19, fontWeight: "900" },
  drawerHint: { color: "#7A837D", fontSize: 11, marginTop: 4 },
  drawerCloseButton: { alignItems: "center", backgroundColor: "#E7F2ED", borderRadius: 9, justifyContent: "center", minHeight: 32, paddingHorizontal: 10 },
  drawerCloseButtonPressed: { opacity: 0.72 },
  drawerCloseText: { color: "#0E6B56", fontSize: 12, fontWeight: "900" },
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
  drawerFooter: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 14, minHeight: 30 },
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
