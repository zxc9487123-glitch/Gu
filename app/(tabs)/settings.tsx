import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useState } from "react";

import { ExcelImportCard } from "@/components/excel-import-card";
import { ScreenContainer } from "@/components/screen-container";
import { useFinance } from "@/hooks/use-finance";
import { useSavingsGoal } from "@/hooks/use-savings-goal";
import { categoriesFor, type TransactionType } from "@/lib/finance";

export default function SettingsScreen() {
  const { transactions, excelAutoRules, pendingImportTransactions, addExcelAutoRule, addExcelAutoRules, updateExcelAutoRule, setExcelAutoRuleEnabled, removeExcelAutoRule, savePendingImportTransactions, confirmPendingImportTransaction, removePendingImportTransaction, clearTransactions, importTransactions } = useFinance();
  const { savingsGoal, setSavingsGoal } = useSavingsGoal();
  const [savingsGoalInput, setSavingsGoalInput] = useState("");
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingKeyword, setEditingKeyword] = useState("");
  const [editingType, setEditingType] = useState<TransactionType>("expense");
  const [editingCategory, setEditingCategory] = useState(categoriesFor("expense")[0]?.name ?? "其他支出");
  const [ruleError, setRuleError] = useState("");

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

  const beginRuleEdit = (rule: (typeof excelAutoRules)[number]) => {
    setEditingRuleId(rule.id);
    setEditingKeyword(rule.keyword);
    setEditingType(rule.type);
    setEditingCategory(rule.category);
    setRuleError("");
  };

  const chooseEditingType = (type: TransactionType) => {
    setEditingType(type);
    setEditingCategory(categoriesFor(type)[0]?.name ?? "未分類");
  };

  const saveRuleEdit = async () => {
    if (!editingRuleId) return;
    if (!editingKeyword.trim()) {
      setRuleError("請輸入備註關鍵字。");
      return;
    }
    await updateExcelAutoRule(editingRuleId, { keyword: editingKeyword.trim(), type: editingType, category: editingCategory });
    setEditingRuleId(null);
    setRuleError("");
  };

  const confirmRuleRemoval = (id: string, keyword: string) => {
    Alert.alert("刪除自動分類規則？", `「${keyword}」將不再自動套用分類。`, [
      { text: "取消", style: "cancel" },
      { text: "刪除規則", style: "destructive", onPress: () => void removeExcelAutoRule(id) },
    ]);
  };

  const confirmPendingRemoval = (id: string, note: string) => {
    Alert.alert("移除待處理交易？", `「${note || "未填備註"}」將從待處理清單中永久刪除。`, [
      { text: "取消", style: "cancel" },
      { text: "移除", style: "destructive", onPress: () => void removePendingImportTransaction(id) },
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
          <View style={styles.goalControlRow}>
            <View style={styles.goalInputWrap}>
              <Text style={styles.goalCurrency}>NT$</Text>
              <TextInput value={savingsGoalInput} onChangeText={setSavingsGoalInput} keyboardType="numeric" placeholder="目標金額" placeholderTextColor="#A3AAA5" style={styles.goalInput} returnKeyType="done" onSubmitEditing={saveSavingsGoal} />
            </View>
            <Pressable accessibilityRole="button" onPress={saveSavingsGoal} style={({ pressed }) => [styles.goalSaveButton, pressed && styles.goalSavePressed]}>
              <Text style={styles.goalSaveText}>儲存</Text>
            </Pressable>
          </View>
          {savingsGoal !== null ? <Pressable onPress={() => { void setSavingsGoal(null); }} style={({ pressed }) => [styles.goalClearButton, pressed && styles.goalClearPressed]}><Text style={styles.goalClearText}>清除存款目標</Text></Pressable> : null}
        </View>
        <ExcelImportCard
          existingTransactions={transactions}
          autoRules={excelAutoRules}
          onAddAutoRule={addExcelAutoRule}
          onAddAutoRules={addExcelAutoRules}
          onSavePendingTransactions={savePendingImportTransactions}
          onConfirm={(preview, mode) => importTransactions(preview.valid, mode)}
        />
        <View style={styles.panel}>
          <View style={styles.rulePanelHeader}>
            <View style={styles.rulePanelCopy}><Text style={styles.panelTitle}>自動分類規則</Text><Text style={styles.infoText}>匯入時依備註關鍵字自動帶入收支類型與分類。</Text></View>
            <View style={styles.ruleCountBadge}><Text style={styles.ruleCountText}>{excelAutoRules.length} 條</Text></View>
          </View>
          {excelAutoRules.length === 0 ? <Text style={styles.ruleEmpty}>尚未建立規則。可在 Excel 匯入預覽中輸入關鍵字後建立。</Text> : excelAutoRules.map((rule) => (
            <View key={rule.id} style={[styles.ruleRow, !rule.enabled && styles.ruleRowDisabled]}>
              <View style={styles.ruleRowTop}>
                <View style={styles.ruleRowCopy}><Text style={styles.ruleKeyword}>「{rule.keyword}」</Text><Text style={styles.ruleTarget}>{rule.type === "expense" ? "支出" : "收入"} ・ {rule.category}</Text></View>
                <Pressable onPress={() => void setExcelAutoRuleEnabled(rule.id, !rule.enabled)} style={({ pressed }) => [styles.ruleToggle, rule.enabled && styles.ruleToggleActive, pressed && styles.pressed]}><Text style={[styles.ruleToggleText, rule.enabled && styles.ruleToggleTextActive]}>{rule.enabled ? "已啟用" : "已停用"}</Text></Pressable>
              </View>
              <View style={styles.ruleActions}>
                <Pressable onPress={() => beginRuleEdit(rule)} style={({ pressed }) => [styles.ruleActionButton, pressed && styles.pressed]}><Text style={styles.ruleActionText}>編輯</Text></Pressable>
                <Pressable onPress={() => confirmRuleRemoval(rule.id, rule.keyword)} style={({ pressed }) => [styles.ruleActionButton, styles.ruleDeleteButton, pressed && styles.pressed]}><Text style={styles.ruleDeleteText}>刪除</Text></Pressable>
              </View>
              {editingRuleId === rule.id ? (
                <View style={styles.ruleEditor}>
                  <Text style={styles.ruleEditorTitle}>編輯規則</Text>
                  <TextInput value={editingKeyword} onChangeText={(value) => { setEditingKeyword(value); setRuleError(""); }} placeholder="備註關鍵字" placeholderTextColor="#929A94" style={styles.ruleEditorInput} returnKeyType="next" />
                  <View style={styles.ruleTypeRow}>
                    <Pressable onPress={() => chooseEditingType("expense")} style={({ pressed }) => [styles.ruleTypeButton, editingType === "expense" && styles.ruleTypeExpenseActive, pressed && styles.pressed]}><Text style={[styles.ruleTypeText, editingType === "expense" && styles.ruleTypeExpenseText]}>支出</Text></Pressable>
                    <Pressable onPress={() => chooseEditingType("income")} style={({ pressed }) => [styles.ruleTypeButton, editingType === "income" && styles.ruleTypeIncomeActive, pressed && styles.pressed]}><Text style={[styles.ruleTypeText, editingType === "income" && styles.ruleTypeIncomeText]}>收入</Text></Pressable>
                  </View>
                  <View style={styles.categoryChips}>{categoriesFor(editingType).map((category) => <Pressable key={category.name} onPress={() => setEditingCategory(category.name)} style={({ pressed }) => [styles.categoryChip, editingCategory === category.name && styles.categoryChipActive, pressed && styles.pressed]}><Text style={[styles.categoryChipText, editingCategory === category.name && styles.categoryChipTextActive]}>{category.name}</Text></Pressable>)}</View>
                  {ruleError ? <Text style={styles.ruleError}>{ruleError}</Text> : null}
                  <View style={styles.ruleEditorActions}><Pressable onPress={() => { setEditingRuleId(null); setRuleError(""); }} style={({ pressed }) => [styles.ruleCancelButton, pressed && styles.pressed]}><Text style={styles.ruleCancelText}>取消</Text></Pressable><Pressable onPress={() => void saveRuleEdit()} style={({ pressed }) => [styles.ruleSaveButton, pressed && styles.pressed]}><Text style={styles.ruleSaveText}>儲存變更</Text></Pressable></View>
                </View>
              ) : null}
            </View>
          ))}
        </View>
        <View style={styles.panel}>
          <View style={styles.rulePanelHeader}>
            <View style={styles.rulePanelCopy}><Text style={styles.panelTitle}>待處理交易</Text><Text style={styles.infoText}>從匯入預覽另存的交易會保留在此，可稍後確認加入記帳。</Text></View>
            <View style={styles.pendingCountBadge}><Text style={styles.pendingCountText}>{pendingImportTransactions.length} 筆</Text></View>
          </View>
          {pendingImportTransactions.length === 0 ? <Text style={styles.ruleEmpty}>目前沒有待處理交易。</Text> : pendingImportTransactions.map((item) => (
            <View key={item.id} style={styles.pendingRow}>
              <View style={styles.pendingCopy}><Text style={styles.pendingCategory}>{item.category}</Text><Text style={styles.pendingMeta}>{item.date} ・ {item.type === "expense" ? "支出" : "收入"} ・ NT$ {item.amount.toLocaleString("zh-TW")}</Text>{item.note ? <Text style={styles.pendingNote}>{item.note}</Text> : null}</View>
              <View style={styles.pendingActions}><Pressable onPress={() => void confirmPendingImportTransaction(item.id)} style={({ pressed }) => [styles.pendingConfirmButton, pressed && styles.pressed]}><Text style={styles.pendingConfirmText}>加入記帳</Text></Pressable><Pressable onPress={() => confirmPendingRemoval(item.id, item.note)} style={({ pressed }) => [styles.pendingRemoveButton, pressed && styles.pressed]}><Text style={styles.pendingRemoveText}>移除</Text></Pressable></View>
            </View>
          ))}
        </View>
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
  goalControlRow: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 10 },
  goalInputWrap: { alignItems: "center", backgroundColor: "#F6FAF8", borderColor: "#D6E4DE", borderRadius: 12, borderWidth: 1, flex: 1, flexDirection: "row", minWidth: 0, paddingHorizontal: 11 },
  goalCurrency: { color: "#0E6B56", fontSize: 14, fontWeight: "900", marginRight: 6 },
  goalInput: { color: "#1F2421", flex: 1, fontSize: 16, fontWeight: "900", minWidth: 0, paddingVertical: 10 },
  goalSaveButton: { alignItems: "center", backgroundColor: "#0E6B56", borderRadius: 12, justifyContent: "center", minHeight: 42, paddingHorizontal: 13 },
  goalSavePressed: { opacity: 0.78 },
  goalSaveText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  goalClearButton: { alignSelf: "center", paddingVertical: 7, paddingHorizontal: 12, marginTop: 1 },
  goalClearPressed: { opacity: 0.65 },
  goalClearText: { color: "#7A837D", fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.72 },
  rulePanelHeader: { alignItems: "flex-start", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  rulePanelCopy: { flex: 1, minWidth: 0 },
  ruleCountBadge: { backgroundColor: "#E8F2ED", borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
  ruleCountText: { color: "#0E6B56", fontSize: 11, fontWeight: "900" },
  pendingCountBadge: { backgroundColor: "#EDF3FF", borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
  pendingCountText: { color: "#365C96", fontSize: 11, fontWeight: "900" },
  ruleEmpty: { color: "#7A837D", fontSize: 12, lineHeight: 18, marginTop: 11 },
  pendingRow: { borderTopColor: "#ECE7DE", borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  pendingCopy: { minWidth: 0 },
  pendingCategory: { color: "#334039", fontSize: 13, fontWeight: "900" },
  pendingMeta: { color: "#68736D", fontSize: 11, marginTop: 3 },
  pendingNote: { color: "#7A837D", fontSize: 11, marginTop: 3 },
  pendingActions: { flexDirection: "row", gap: 7, marginTop: 9 },
  pendingConfirmButton: { alignItems: "center", backgroundColor: "#E8F2ED", borderRadius: 8, flex: 1, paddingVertical: 7 },
  pendingConfirmText: { color: "#0E6B56", fontSize: 11, fontWeight: "900" },
  pendingRemoveButton: { alignItems: "center", backgroundColor: "#FFF4F1", borderRadius: 8, flex: 1, paddingVertical: 7 },
  pendingRemoveText: { color: "#B5472C", fontSize: 11, fontWeight: "900" },
  ruleRow: { borderTopColor: "#ECE7DE", borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  ruleRowDisabled: { opacity: 0.58 },
  ruleRowTop: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  ruleRowCopy: { flex: 1, minWidth: 0 },
  ruleKeyword: { color: "#334039", fontSize: 13, fontWeight: "900" },
  ruleTarget: { color: "#68736D", fontSize: 11, marginTop: 3 },
  ruleToggle: { backgroundColor: "#F3F5F2", borderColor: "#D8DED9", borderRadius: 9, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5 },
  ruleToggleActive: { backgroundColor: "#E8F2ED", borderColor: "#B9D6CA" },
  ruleToggleText: { color: "#6D7770", fontSize: 10, fontWeight: "900" },
  ruleToggleTextActive: { color: "#0E6B56" },
  ruleActions: { flexDirection: "row", gap: 7, marginTop: 9 },
  ruleActionButton: { alignItems: "center", backgroundColor: "#F2F6F3", borderRadius: 8, flex: 1, paddingVertical: 7 },
  ruleActionText: { color: "#0E6B56", fontSize: 11, fontWeight: "900" },
  ruleDeleteButton: { backgroundColor: "#FFF4F1" },
  ruleDeleteText: { color: "#B5472C", fontSize: 11, fontWeight: "900" },
  ruleEditor: { backgroundColor: "#F7FAF8", borderColor: "#D7E6DD", borderRadius: 11, borderWidth: 1, marginTop: 10, padding: 10 },
  ruleEditorTitle: { color: "#334039", fontSize: 12, fontWeight: "900" },
  ruleEditorInput: { backgroundColor: "#FFFFFF", borderColor: "#CFDAD2", borderRadius: 9, borderWidth: 1, color: "#334039", fontSize: 12, marginTop: 8, minHeight: 38, paddingHorizontal: 10 },
  ruleTypeRow: { flexDirection: "row", gap: 7, marginTop: 8 },
  ruleTypeButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#CFDAD2", borderRadius: 8, borderWidth: 1, flex: 1, minHeight: 33, justifyContent: "center" },
  ruleTypeExpenseActive: { backgroundColor: "#FFF1ED", borderColor: "#EDC1B5" },
  ruleTypeIncomeActive: { backgroundColor: "#EBF5EF", borderColor: "#B9D6CA" },
  ruleTypeText: { color: "#69756E", fontSize: 11, fontWeight: "900" },
  ruleTypeExpenseText: { color: "#C85F3A" },
  ruleTypeIncomeText: { color: "#0E6B56" },
  categoryChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  categoryChip: { backgroundColor: "#FFFFFF", borderColor: "#CFDAD2", borderRadius: 8, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 5 },
  categoryChipActive: { backgroundColor: "#E8F2ED", borderColor: "#0E6B56" },
  categoryChipText: { color: "#66736B", fontSize: 10, fontWeight: "800" },
  categoryChipTextActive: { color: "#0E6B56" },
  ruleError: { color: "#B5472C", fontSize: 10, fontWeight: "800", marginTop: 7 },
  ruleEditorActions: { flexDirection: "row", gap: 7, marginTop: 10 },
  ruleCancelButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#D8DED9", borderRadius: 9, borderWidth: 1, flex: 1, minHeight: 35, justifyContent: "center" },
  ruleCancelText: { color: "#6D7770", fontSize: 11, fontWeight: "900" },
  ruleSaveButton: { alignItems: "center", backgroundColor: "#0E6B56", borderRadius: 9, flex: 1, justifyContent: "center", minHeight: 35 },
  ruleSaveText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  dangerButton: { marginTop: 10, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#E9B9AB", backgroundColor: "#FFF8F6", alignItems: "center" },
  dangerPressed: { opacity: 0.7 },
  dangerText: { color: "#B5472C", fontSize: 13, fontWeight: "900" },
});
