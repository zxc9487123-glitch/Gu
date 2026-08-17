import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ExcelImportCard } from "@/components/excel-import-card";
import { ScreenContainer } from "@/components/screen-container";
import { useFinance } from "@/hooks/use-finance";

export default function SettingsScreen() {
  const { transactions, clearTransactions, importTransactions } = useFinance();
  const confirmClear = () => {
    Alert.alert("清除所有本機記錄？", "這會刪除目前裝置上的所有交易資料，且無法復原。", [
      { text: "取消", style: "cancel" },
      { text: "清除資料", style: "destructive", onPress: () => void clearTransactions() },
    ]);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>設定</Text>
          <Text style={styles.subtitle}>此版本將資料儲存在目前裝置，未啟用雲端同步。</Text>
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>本機資料</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>已記錄交易</Text>
            <Text style={styles.infoValue}>{transactions.length} 筆</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.infoText}>每筆收支會用於計算首頁摘要、分類結構、年度趨勢與支出排行。</Text>
        </View>
        <ExcelImportCard onConfirm={(preview, mode) => importTransactions(preview.valid, mode)} />
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>資料管理</Text>
          <Text style={styles.infoText}>清除只會影響目前裝置上的記帳紀錄。</Text>
          <Pressable onPress={confirmClear} style={({ pressed }) => [styles.dangerButton, pressed && styles.dangerPressed]}>
            <Text style={styles.dangerText}>清除所有記錄</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 34, gap: 15 },
  header: { marginTop: 4, marginBottom: 2 },
  title: { color: "#1F2421", fontSize: 29, fontWeight: "900" },
  subtitle: { color: "#7A837D", marginTop: 5, fontSize: 13, lineHeight: 20 },
  panel: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 17, borderWidth: 1, borderColor: "#ECE7DE" },
  panelTitle: { color: "#1F2421", fontSize: 17, fontWeight: "900", marginBottom: 12 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { color: "#657069", fontSize: 14 },
  infoValue: { color: "#0E6B56", fontSize: 14, fontWeight: "900" },
  divider: { height: 1, backgroundColor: "#ECE7DE", marginVertical: 13 },
  infoText: { color: "#7A837D", fontSize: 13, lineHeight: 20 },
  dangerButton: { marginTop: 16, paddingVertical: 12, borderRadius: 13, borderWidth: 1, borderColor: "#E9B9AB", backgroundColor: "#FFF8F6", alignItems: "center" },
  dangerPressed: { opacity: 0.7 },
  dangerText: { color: "#B5472C", fontSize: 13, fontWeight: "900" },
});
