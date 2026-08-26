import { router } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useFinance } from "@/hooks/use-finance";
import { calendarMonthDays, datePartsFromInput, shiftCalendarMonth } from "@/lib/date-picker";
import { categoriesFor, currentDateInput, type TransactionType } from "@/lib/finance";

const CALENDAR_WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export default function AddTransactionScreen() {
  const { addTransaction, isLoading } = useFinance();
  const [type, setType] = useState<TransactionType>("expense");
  const categoryOptions = useMemo(() => categoriesFor(type), [type]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categoryOptions[0]?.name ?? "");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(currentDateInput());
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [calendarCursor, setCalendarCursor] = useState(() => datePartsFromInput(currentDateInput()));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const switchType = (nextType: TransactionType) => {
    setType(nextType);
    setCategory(categoriesFor(nextType)[0]?.name ?? "");
    setError("");
  };

  const save = async () => {
    if (isLoading) {
      setError("本機交易資料載入中，請稍後再儲存，避免覆蓋既有紀錄。");
      return;
    }
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
      router.replace("/accounting?mode=details");
    } finally {
      setSaving(false);
    }
  };

  const calendarDays = useMemo(() => calendarMonthDays(calendarCursor), [calendarCursor]);
  const today = currentDateInput();

  const openDatePicker = () => {
    setCalendarCursor(datePartsFromInput(date));
    setIsDatePickerVisible(true);
  };

  const selectCalendarDate = (nextDate: string) => {
    setDate(nextDate);
    setError("");
    setIsDatePickerVisible(false);
  };

  const selectToday = () => {
    setCalendarCursor(datePartsFromInput(today));
    selectCalendarDate(today);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>新增記帳</Text>
              <Text style={styles.subtitle}>記下一筆收支，總覽與圖表會立即更新。</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="取消新增交易" onPress={() => router.back()} style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelPressed]}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
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
                placeholderTextColor="#B39EAF"
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
                  style={[styles.categoryChip, category === item.name && styles.categoryChipActive]}
                >
                  <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.categoryText, category === item.name && styles.categoryTextActive]}>{item.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>日期</Text>
            <View style={styles.dateFieldRow}>
              <TextInput value={date} onChangeText={(value) => { setDate(value); setError(""); }} placeholder="YYYY-MM-DD" style={[styles.input, styles.dateInput]} returnKeyType="next" />
              <Pressable accessibilityRole="button" accessibilityLabel="開啟日期選擇器" onPress={openDatePicker} style={({ pressed }) => [styles.datePickerButton, pressed && styles.datePickerButtonPressed]}>
                <Text style={styles.datePickerButtonText}>選擇日期</Text>
                <Text style={styles.datePickerButtonIcon}>⌄</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>備註</Text>
            <TextInput value={note} onChangeText={setNote} placeholder="例如：午餐、房租或薪資" placeholderTextColor="#A78FA5" multiline style={[styles.input, styles.noteInput]} textAlignVertical="top" />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable onPress={() => void save()} disabled={saving} style={({ pressed }) => [styles.saveButton, pressed && styles.savePressed, saving && styles.saveDisabled]}>
            <Text style={styles.saveText}>{saving ? "儲存中…" : "儲存記帳"}</Text>
          </Pressable>
        </ScrollView>

        <Modal transparent visible={isDatePickerVisible} animationType="fade" onRequestClose={() => setIsDatePickerVisible(false)}>
          <View style={styles.datePickerModal}>
            <Pressable accessibilityRole="button" accessibilityLabel="關閉日期選擇器" onPress={() => setIsDatePickerVisible(false)} style={styles.datePickerBackdrop} />
            <View style={styles.datePickerSheet}>
              <View style={styles.datePickerHandle} />
              <View style={styles.datePickerHeader}>
                <Pressable accessibilityRole="button" accessibilityLabel="上一個月份" onPress={() => setCalendarCursor((current: typeof calendarCursor) => shiftCalendarMonth(current, -1))} style={({ pressed }) => [styles.monthNavButton, pressed && styles.monthNavButtonPressed]}><Text style={styles.monthNavText}>‹</Text></Pressable>
                <View style={styles.monthTitleWrap}><Text style={styles.monthTitle}>{calendarCursor.year} 年 {calendarCursor.monthIndex + 1} 月</Text><Text style={styles.monthSubtitle}>選擇交易日期</Text></View>
                <Pressable accessibilityRole="button" accessibilityLabel="下一個月份" onPress={() => setCalendarCursor((current: typeof calendarCursor) => shiftCalendarMonth(current, 1))} style={({ pressed }) => [styles.monthNavButton, pressed && styles.monthNavButtonPressed]}><Text style={styles.monthNavText}>›</Text></Pressable>
              </View>
              <View style={styles.weekdayRow}>{CALENDAR_WEEKDAYS.map((weekday) => <Text key={weekday} style={styles.weekdayText}>{weekday}</Text>)}</View>
              <View style={styles.calendarGrid}>
                {calendarDays.map((item: (typeof calendarDays)[number], index: number) => item ? (
                  <Pressable key={item.date} accessibilityRole="button" accessibilityLabel={`選擇 ${item.date}`} onPress={() => selectCalendarDate(item.date)} style={({ pressed }) => [styles.calendarDay, item.date === date && styles.calendarDaySelected, item.date === today && styles.calendarDayToday, pressed && styles.calendarDayPressed]}>
                    <Text style={[styles.calendarDayText, item.date === date && styles.calendarDayTextSelected, item.date === today && item.date !== date && styles.calendarDayTextToday]}>{item.day}</Text>
                  </Pressable>
                ) : <View key={`empty-${index}`} style={styles.calendarDay} />)}
              </View>
              <View style={styles.datePickerFooter}>
                <Pressable accessibilityRole="button" onPress={selectToday} style={({ pressed }) => [styles.todayButton, pressed && styles.datePickerButtonPressed]}><Text style={styles.todayButtonText}>今天</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => setIsDatePickerVisible(false)} style={({ pressed }) => [styles.dateDoneButton, pressed && styles.datePickerButtonPressed]}><Text style={styles.dateDoneText}>完成</Text></Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 36, gap: 20 },
  header: { marginTop: 4 },
  headerRow: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between", marginTop: 4 },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: "#3F3448", fontSize: 29, fontWeight: "900" },
  subtitle: { color: "#826F80", marginTop: 5, fontSize: 13 },
  cancelButton: { alignItems: "center", backgroundColor: "#F4ECFA", borderRadius: 10, justifyContent: "center", minHeight: 36, paddingHorizontal: 10 },
  cancelPressed: { opacity: 0.72 },
  cancelText: { color: "#7653A8", fontSize: 12, fontWeight: "900" },
  typeSwitch: { flexDirection: "row", borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#E4D7EA", backgroundColor: "#FFFCFF" },
  typeOption: { flex: 1, paddingVertical: 13, alignItems: "center" },
  typeOptionExpense: { backgroundColor: "#FBEAF1" },
  typeOptionIncome: { backgroundColor: "#F0E8FA" },
  typeText: { color: "#826F80", fontWeight: "800" },
  typeTextSelected: { color: "#C96B8B" },
  typeTextIncome: { color: "#7653A8" },
  amountBox: { backgroundColor: "#FFFCFF", padding: 18, borderRadius: 18, borderWidth: 1, borderColor: "#EADDE6" },
  fieldLabel: { color: "#5B4D62", fontSize: 13, fontWeight: "800", marginBottom: 9 },
  amountLine: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  currency: { color: "#7653A8", fontSize: 20, fontWeight: "900" },
  amountInput: { color: "#3F3448", fontSize: 34, fontWeight: "900", flex: 1, paddingVertical: 0 },
  section: { gap: 2 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#E4D7EA", backgroundColor: "#FFFCFF", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 9 },
  categoryChipActive: { backgroundColor: "#F0E8FA", borderColor: "#7653A8" },
  categoryDot: { width: 8, height: 8, borderRadius: 5 },
  categoryText: { color: "#806F84", fontSize: 12, fontWeight: "700" },
  categoryTextActive: { color: "#7653A8" },
  input: { backgroundColor: "#FFF9FC", borderWidth: 1, borderColor: "#E4D7EA", borderRadius: 14, color: "#3F3448", paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  dateFieldRow: { flexDirection: "row", gap: 8 },
  dateInput: { flex: 1, minWidth: 0 },
  datePickerButton: { alignItems: "center", backgroundColor: "#F0E8FA", borderColor: "#CBB6DF", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 4, justifyContent: "center", minWidth: 92, paddingHorizontal: 9 },
  datePickerButtonPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  datePickerButtonText: { color: "#7653A8", fontSize: 11, fontWeight: "900" },
  datePickerButtonIcon: { color: "#7653A8", fontSize: 14, fontWeight: "900", marginTop: -2 },
  noteInput: { minHeight: 92 },
  errorText: { color: "#C04E70", fontSize: 13, fontWeight: "700", marginTop: -8 },
  saveButton: { alignItems: "center", borderRadius: 15, backgroundColor: "#7653A8", paddingVertical: 15, marginTop: 2 },
  savePressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  saveDisabled: { opacity: 0.55 },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  datePickerModal: { flex: 1, justifyContent: "flex-end" },
  datePickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(67, 45, 76, 0.36)" },
  datePickerSheet: { backgroundColor: "#FFFCFF", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: 24, paddingHorizontal: 20, paddingTop: 9 },
  datePickerHandle: { alignSelf: "center", backgroundColor: "#D8CBE2", borderRadius: 3, height: 4, marginBottom: 14, width: 38 },
  datePickerHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  monthNavButton: { alignItems: "center", backgroundColor: "#F0E8FA", borderRadius: 16, height: 32, justifyContent: "center", width: 32 },
  monthNavButtonPressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
  monthNavText: { color: "#7653A8", fontSize: 27, fontWeight: "500", lineHeight: 29, marginTop: -3 },
  monthTitleWrap: { alignItems: "center" },
  monthTitle: { color: "#3F3448", fontSize: 17, fontWeight: "900" },
  monthSubtitle: { color: "#826F80", fontSize: 10, marginTop: 2 },
  weekdayRow: { flexDirection: "row", marginTop: 16 },
  weekdayText: { color: "#826F80", fontSize: 11, fontWeight: "800", textAlign: "center", width: "14.285%" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 7 },
  calendarDay: { alignItems: "center", aspectRatio: 1, justifyContent: "center", width: "14.285%" },
  calendarDaySelected: { backgroundColor: "#7653A8", borderRadius: 18 },
  calendarDayToday: { backgroundColor: "#F3E9FA", borderRadius: 18 },
  calendarDayPressed: { opacity: 0.74 },
  calendarDayText: { color: "#5C4D64", fontSize: 13, fontWeight: "800" },
  calendarDayTextSelected: { color: "#FFFFFF" },
  calendarDayTextToday: { color: "#7653A8" },
  datePickerFooter: { flexDirection: "row", gap: 9, marginTop: 15 },
  todayButton: { alignItems: "center", backgroundColor: "#F0E8FA", borderRadius: 10, flex: 1, justifyContent: "center", minHeight: 40 },
  todayButtonText: { color: "#7653A8", fontSize: 13, fontWeight: "900" },
  dateDoneButton: { alignItems: "center", backgroundColor: "#7653A8", borderRadius: 10, flex: 1, justifyContent: "center", minHeight: 40 },
  dateDoneText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
});
