import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useState } from "react";

import { ExcelImportCard } from "@/components/excel-import-card";
import { ScreenContainer } from "@/components/screen-container";
import { useFinance } from "@/hooks/use-finance";
import { useSavingsGoal } from "@/hooks/use-savings-goal";

export default function SettingsScreen() {
  const { clearTransactions, importTransactions } = useFinance();
  const { savingsGoal, setSavingsGoal } = useSavingsGoal();
  const [savingsGoalInput, setSavingsGoalInput] = useState("");

  useEffect(() => {
    setSavingsGoalInput(savingsGoal === null ? "" : String(savingsGoal));
  }, [savingsGoal]);

  const saveSavingsGoal = () => {
    const amount = Number(savingsGoalInput.replace(/[,\s]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("請輸入有效金額", "存款目標需為大於 0 的金額。");
      return;
    }
    void setSavingsGoal(amount);
    Alert.alert("已儲存", "全年度首頁會依此金額顯示存款目標進度。");
  };

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
          <Text style={styles.panelTitle}>存款目標</Text>
          <Text style={styles.infoText}>設定全年度的目標存款金額。</Text>
          <View style={styles.goalInputWrap}>
            <Text style={styles.goalCurrency}>NT$</Text>
            <TextInput value={savingsGoalInput} onChangeText={setSavingsGoalInput} keyboardType="numeric" placeholder="例如 300000" placeholderTextColor="#A3AAA5" style={styles.goalInput} returnKeyType="done" onSubmitEditing={saveSavingsGoal} />
          </View>
          <Pressable onPress={saveSavingsGoal} style={({ pressed }) => [styles.goalSaveButton, pressed && styles.goalSavePressed]}>
            <Text style={styles.goalSaveText}>儲存存款目標</Text>
          </Pressable>
          {savingsGoal !== null ? <Pressable onPress={() => { void setSavingsGoal(null); }} style={({ pressed }) => [styles.goalClearButton, pressed && styles.goalClearPressed]}><Text style={styles.goalClearText}>清除存款目標</Text></Pressable> : null}
        </View>
        <ExcelImportCard onConfirm={(preview, mode) => importTransactions(preview.valid, mode)} />
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>資料管理</Text>
          <Text style={styles.infoText}>清除目前裝置上的所有記帳紀錄。</Text>
          <Pressable onPress={confirmClear} style={({ pressed }) => [styles.dangerButton, pressed && styles.dangerPressed]}>
            <Text style={styles.dangerText}>清除所有記錄</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 34, gap: 12 },
  header: { marginTop: 4, marginBottom: 2 },
  title: { color: "#1F2421", fontSize: 29, fontWeight: "900" },
  subtitle: { color: "#7A837D", marginTop: 5, fontSize: 13, lineHeight: 20 },
  panel: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#ECE7DE" },
  panelTitle: { color: "#1F2421", fontSize: 16, fontWeight: "900", marginBottom: 7 },
  infoText: { color: "#7A837D", fontSize: 13, lineHeight: 20 },
  goalInputWrap: { flexDirection: "row", alignItems: "center", marginTop: 10, borderWidth: 1, borderColor: "#D6E4DE", backgroundColor: "#F6FAF8", borderRadius: 12, paddingHorizontal: 12 },
  goalCurrency: { color: "#0E6B56", fontSize: 15, fontWeight: "900", marginRight: 8 },
  goalInput: { flex: 1, color: "#1F2421", fontSize: 17, fontWeight: "900", paddingVertical: 10 },
  goalSaveButton: { marginTop: 8, paddingVertical: 10, borderRadius: 12, backgroundColor: "#0E6B56", alignItems: "center" },
  goalSavePressed: { opacity: 0.78 },
  goalSaveText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  goalClearButton: { alignSelf: "center", paddingVertical: 7, paddingHorizontal: 12, marginTop: 1 },
  goalClearPressed: { opacity: 0.65 },
  goalClearText: { color: "#7A837D", fontSize: 12, fontWeight: "800" },
  dangerButton: { marginTop: 10, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#E9B9AB", backgroundColor: "#FFF8F6", alignItems: "center" },
  dangerPressed: { opacity: 0.7 },
  dangerText: { color: "#B5472C", fontSize: 13, fontWeight: "900" },
});
