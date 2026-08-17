import { router } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useFinance } from "@/hooks/use-finance";
import { categoriesFor, currentDateInput, type TransactionType } from "@/lib/finance";

export default function AddTransactionScreen() {
  const { addTransaction } = useFinance();
  const [type, setType] = useState<TransactionType>("expense");
  const categoryOptions = useMemo(() => categoriesFor(type), [type]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categoryOptions[0]?.name ?? "");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(currentDateInput());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const switchType = (nextType: TransactionType) => {
    setType(nextType);
    setCategory(categoriesFor(nextType)[0]?.name ?? "");
    setError("");
  };

  const save = async () => {
    const parsedAmount = Number(amount.replace(/,/g, ""));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("請輸入大於 0 的金額。");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("日期格式請使用 YYYY-MM-DD，例如 2026-08-17。");
      return;
    }

    setSaving(true);
    try {
      await addTransaction({ type, amount: parsedAmount, category, note: note.trim(), date });
      router.replace("/(tabs)");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>新增記帳</Text>
            <Text style={styles.subtitle}>記下一筆收支，總覽與圖表會立即更新。</Text>
          </View>

          <View style={styles.typeSwitch}>
            <Pressable onPress={() => switchType("expense")} style={[styles.typeOption, type === "expense" && styles.typeOptionExpense]}>
              <Text style={[styles.typeText, type === "expense" && styles.typeTextSelected]}>支出</Text>
            </Pressable>
            <Pressable onPress={() => switchType("income")} style={[styles.typeOption, type === "income" && styles.typeOptionIncome]}>
              <Text style={[styles.typeText, type === "income" && styles.typeTextIncome]}>收入</Text>
            </Pressable>
          </View>

          <View style={styles.amountBox}>
            <Text style={styles.fieldLabel}>金額</Text>
            <View style={styles.amountLine}>
              <Text style={styles.currency}>NT$</Text>
              <TextInput
                value={amount}
                onChangeText={(value) => { setAmount(value); setError(""); }}
                placeholder="0"
                placeholderTextColor="#B0B7B2"
                keyboardType="decimal-pad"
                returnKeyType="done"
                style={styles.amountInput}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>分類</Text>
            <View style={styles.categoryGrid}>
              {categoryOptions.map((item) => (
                <Pressable
                  key={item.name}
                  onPress={() => setCategory(item.name)}
                  style={[styles.categoryChip, category === item.name && { borderColor: item.color, backgroundColor: `${item.color}18` }]}
                >
                  <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.categoryText, category === item.name && styles.categoryTextActive]}>{item.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>日期</Text>
            <TextInput value={date} onChangeText={(value) => { setDate(value); setError(""); }} placeholder="YYYY-MM-DD" style={styles.input} returnKeyType="next" />
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>備註</Text>
            <TextInput value={note} onChangeText={setNote} placeholder="例如：午餐、房租或薪資" placeholderTextColor="#A4ADA6" multiline style={[styles.input, styles.noteInput]} textAlignVertical="top" />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable onPress={() => void save()} disabled={saving} style={({ pressed }) => [styles.saveButton, pressed && styles.savePressed, saving && styles.saveDisabled]}>
            <Text style={styles.saveText}>{saving ? "儲存中…" : "儲存記帳"}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 36, gap: 20 },
  header: { marginTop: 4 },
  title: { color: "#1F2421", fontSize: 29, fontWeight: "900" },
  subtitle: { color: "#7A837D", marginTop: 5, fontSize: 13 },
  typeSwitch: { flexDirection: "row", borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#E6E2DA", backgroundColor: "#FFFFFF" },
  typeOption: { flex: 1, paddingVertical: 13, alignItems: "center" },
  typeOptionExpense: { backgroundColor: "#F9E9E5" },
  typeOptionIncome: { backgroundColor: "#E8F2ED" },
  typeText: { color: "#7A837D", fontWeight: "800" },
  typeTextSelected: { color: "#C85F3A" },
  typeTextIncome: { color: "#0E6B56" },
  amountBox: { backgroundColor: "#FFFFFF", padding: 18, borderRadius: 18, borderWidth: 1, borderColor: "#EDE8DF" },
  fieldLabel: { color: "#56625B", fontSize: 13, fontWeight: "800", marginBottom: 9 },
  amountLine: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  currency: { color: "#0E6B56", fontSize: 20, fontWeight: "900" },
  amountInput: { color: "#1F2421", fontSize: 34, fontWeight: "900", flex: 1, paddingVertical: 0 },
  section: { gap: 2 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#E6E2DA", backgroundColor: "#FFFFFF", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 9 },
  categoryDot: { width: 8, height: 8, borderRadius: 5 },
  categoryText: { color: "#5F6A63", fontSize: 12, fontWeight: "700" },
  categoryTextActive: { color: "#1F2421" },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E6E2DA", borderRadius: 14, color: "#1F2421", paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  noteInput: { minHeight: 92 },
  errorText: { color: "#B5472C", fontSize: 13, fontWeight: "700", marginTop: -8 },
  saveButton: { alignItems: "center", borderRadius: 15, backgroundColor: "#0E6B56", paddingVertical: 15, marginTop: 2 },
  savePressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  saveDisabled: { opacity: 0.55 },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
});
