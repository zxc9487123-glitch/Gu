import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useFinance } from "@/hooks/use-finance";
import { dateLabel, money, sortedTransactions, type Transaction } from "@/lib/finance";

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
  const { transactions, removeTransaction } = useFinance();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const selectedCategory = Array.isArray(category) ? category[0] : category;
  const records = sortedTransactions(selectedCategory ? transactions.filter((item) => item.category === selectedCategory) : transactions);
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
            <Text style={styles.title}>{selectedCategory ? `${selectedCategory}明細` : "交易明細"}</Text>
            <Text style={styles.subtitle}>{selectedCategory ? `目前僅顯示「${selectedCategory}」的交易。` : "長按任一筆紀錄即可刪除。"}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{selectedCategory ? "此分類尚無交易紀錄" : "尚未有交易紀錄"}</Text>
            <Text style={styles.emptyText}>{selectedCategory ? "可返回分析頁選擇其他分類，或新增一筆交易。" : "請由中間的「新增」分頁開始記下你的第一筆收支。"}</Text>
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
  title: { color: "#1F2421", fontSize: 29, fontWeight: "900" },
  subtitle: { color: "#7A837D", marginTop: 5, fontSize: 13 },
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
