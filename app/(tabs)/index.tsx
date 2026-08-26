import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { useRouter } from "expo-router";

import { DonutChart } from "@/components/finance-visuals";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useFinance } from "@/hooks/use-finance";
import { useMonthPickerPreference } from "@/hooks/use-month-picker-preference";
import { useSavingsGoal } from "@/hooks/use-savings-goal";
import { availableYears, categoryTotalsFor, dateLabel, money, summaryFor, transactionsForPeriod, type TransactionPeriod } from "@/lib/finance";
import { livingAmountFor, livingExpenseAlertFor, livingExpenseComparisonFor, livingExpenseUsageFor } from "@/lib/living-amount";
import { savingsGoalProgressFor } from "@/lib/savings-goal";

function MetricCard({ label, amount, tone }: { label: string; amount: string; tone: "income" | "expense" }) {
  const icon = tone === "income" ? "↗" : "↘";
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeading}>
        <Text style={styles.metricLabel}>{label}</Text>
        <View style={[styles.metricIcon, tone === "expense" && styles.metricIconExpense]}>
          <Text style={[styles.metricIconText, tone === "expense" && styles.metricIconTextExpense]}>{icon}</Text>
        </View>
      </View>
      <Text style={[styles.metricAmount, tone === "expense" && styles.expenseAmount]}>{amount}</Text>
    </View>
  );
}

function LivingAmountCard({ amount, expense, scope }: { amount: number; expense: number; scope: "年度" | "本月" }) {
  const positive = amount >= 0;
  const expenseComparison = livingExpenseComparisonFor(amount, expense);
  const exceedsExpense = expenseComparison.difference >= 0;
  const expenseUsage = livingExpenseUsageFor(amount, expense);
  const expenseAlert = livingExpenseAlertFor(amount, expense);
  return (
    <View style={[styles.livingCard, styles.annualLivingCard]}>
      <View style={styles.livingHeading}>
        <View>
          <Text style={styles.livingLabel}>{scope}生活金額</Text>
          <Text style={styles.livingFormula}>{scope}收入 ÷ 3</Text>
        </View>
        <View style={styles.livingIcon}>
          <IconSymbol name="house.fill" size={24} color="#315E96" />
        </View>
      </View>
      <View>
        <Text style={[styles.livingAmount, positive ? styles.livingAmountPositive : styles.livingAmountNegative]}>{money(amount, positive)}</Text>
        <Text style={styles.livingHint}>{positive ? `${scope}可用於日常生活的金額` : `${scope}支出已超出生活金額`}</Text>
        <View style={styles.expenseComparisonRow}>
          <View style={styles.expenseComparisonDetail}>
            <Text style={styles.expenseComparisonLabel}>{exceedsExpense ? "高於支出" : "低於支出"}</Text>
            <Text style={[styles.expenseComparisonAmount, exceedsExpense ? styles.expenseComparisonPositive : styles.expenseComparisonNegative]}>{money(Math.abs(expenseComparison.difference))}</Text>
          </View>
        </View>
        <View style={styles.expenseUsageHeader}>
          <Text style={styles.expenseUsageLabel}>{scope}生活支出使用率</Text>
          <Text style={[styles.expenseUsagePercent, expenseUsage.status === "green" ? styles.expenseUsageGreen : expenseUsage.status === "yellow" ? styles.expenseUsageYellow : expenseUsage.status === "orange" ? styles.expenseUsageOrange : styles.expenseUsageRed]}>{expenseUsage.percent === null ? "不適用" : `${expenseUsage.percent}%`}</Text>
        </View>
        <View style={styles.expenseUsageTrack}>
          <View style={[styles.expenseUsageFill, expenseUsage.status === "green" ? styles.expenseUsageFillGreen : expenseUsage.status === "yellow" ? styles.expenseUsageFillYellow : expenseUsage.status === "orange" ? styles.expenseUsageFillOrange : styles.expenseUsageFillRed, { width: `${Math.round(expenseUsage.progress * 100)}%` }]} />
        </View>
        {expenseAlert.status === "warning" ? <View style={[styles.expenseOverAlert, styles.expenseWarningAlert]}><Text style={[styles.expenseOverAlertText, styles.expenseWarningAlertText]}>接近上限：{scope}生活支出已達生活金額 {expenseAlert.usagePercent}%</Text></View> : null}
        {expenseAlert.status === "over" ? <View style={styles.expenseOverAlert}><Text style={styles.expenseOverAlertText}>超標警示：{scope}生活支出超過生活金額 {money(expenseAlert.overage)}</Text></View> : null}
      </View>
    </View>
  );
}

function SavingsGoalCard({ saved, goal, onPress }: { saved: number; goal: number | null; onPress: () => void }) {
  const progress = savingsGoalProgressFor(saved, goal);
  const savedPositive = saved >= 0;
  const progressWidth = `${Math.round(progress.progressFraction * 100)}%` as const;
  return (
    <Pressable accessibilityLabel="前往設定存款目標" accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.savingsGoalCard, pressed && styles.savingsGoalPressed]}>
      <View style={styles.savingsGoalBarTop}>
        <Text numberOfLines={1} style={styles.savingsGoalTitle}>存款目標</Text>
        <View style={styles.savingsGoalValueRow}>
          <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={[styles.savingsGoalAmount, savedPositive ? styles.savingsGoalAmountPositive : styles.savingsGoalAmountNegative]}>{money(saved, savedPositive)}</Text>
          <Text style={styles.savingsGoalCaption}>目前累積存款</Text>
        </View>
      </View>
      {progress.status !== "not-set" ? (
        <>
          <View style={styles.savingsGoalMetaRow}>
            <Text style={styles.savingsGoalMetaText}>目標 {money(progress.goal ?? 0)}</Text>
            <Text style={[styles.savingsGoalPercent, progress.status === "achieved" && styles.savingsGoalAchieved]}>{progress.progressPercent}%</Text>
          </View>
          <View style={styles.savingsGoalTrack}><View style={[styles.savingsGoalFill, progress.status === "achieved" && styles.savingsGoalFillAchieved, { width: progressWidth }]} /></View>
          <Text style={[styles.savingsGoalRemaining, progress.status === "achieved" && styles.savingsGoalAchieved]}>{progress.status === "achieved" ? `已超越目標 ${money(Math.max(saved - (progress.goal ?? 0), 0))}` : `距離目標尚差 ${money(progress.remaining ?? 0)}`}</Text>
        </>
      ) : null}
    </Pressable>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeading}>
        <Text style={styles.panelTitle}>{title}</Text>
        {subtitle ? <Text style={styles.panelSubtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { transactions, isLoading } = useFinance();
  const { savingsGoal } = useSavingsGoal();
  const { isMonthPickerExpanded, setMonthPickerExpanded } = useMonthPickerPreference();
  const years = availableYears(transactions);
  const [period, setPeriod] = useState<TransactionPeriod>("all");
  const [isYearMenuOpen, setIsYearMenuOpen] = useState(false);
  const [isBreakdownDrawerVisible, setIsBreakdownDrawerVisible] = useState(false);
  const filtered = useMemo(() => transactionsForPeriod(transactions, period), [transactions, period]);
  const summary = useMemo(() => summaryFor(filtered), [filtered]);
  const categories = useMemo(() => categoryTotalsFor(filtered), [filtered]);
  const incomeTransactions = useMemo(() => filtered.filter((item) => item.type === "income").sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id)), [filtered]);
  const expenseTransactions = useMemo(() => filtered.filter((item) => item.type === "expense").sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id)), [filtered]);
  const firstYear = years[0] ?? new Date().getFullYear();
  const selectedYear = period === "all" ? firstYear : typeof period === "number" ? period : period.year;
  const periodLabel = period === "all" ? "全年度" : typeof period === "number" ? `${period} 年度` : `${period.year} 年 ${period.month} 月`;
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const isCurrentMonthSelected = typeof period === "object" && period.year === currentYear && period.month === currentMonth;
  const isMonthlyPeriod = typeof period === "object";
  const isYearlyPeriod = typeof period === "number";
  const summaryScope = isMonthlyPeriod ? `${period.month}月` : isYearlyPeriod ? `${period}年` : "總";
  const breakdownLabel = isMonthlyPeriod ? `${period.month}月單筆收支明細` : isYearlyPeriod ? `${period}年單筆收支明細` : "全年度單筆收支明細";
  const selectPeriod = (nextPeriod: TransactionPeriod) => {
    setPeriod(nextPeriod);
    setIsYearMenuOpen(false);
  };
  const selectCurrentMonth = () => {
    selectPeriod({ year: currentYear, month: currentMonth });
    void setMonthPickerExpanded(false);
  };
  const isPeriodSelected = (candidate: TransactionPeriod) =>
    candidate === "all"
      ? period === "all"
      : typeof candidate === "number"
        ? period === candidate
        : typeof period === "object" && period.year === candidate.year && period.month === candidate.month;

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image source={require("../../assets/images/icon.png")} style={styles.brandIcon} />
            <View>
              <Text style={styles.title}>財務總覽</Text>
              <Text style={styles.subtitle}>{period === "all" ? "全年度收支概況與趨勢分析" : `${periodLabel}收支概況與趨勢分析`}</Text>
            </View>
          </View>
        </View>

        <View style={styles.periodPicker}>
          <Pressable accessibilityRole="button" accessibilityLabel="選擇統計期間" onPress={() => setIsYearMenuOpen((value) => !value)} style={({ pressed }) => [styles.periodPickerButton, pressed && styles.periodPickerPressed]}>
            <Text style={styles.periodPickerLabel}>{periodLabel}</Text>
            <Text style={styles.periodPickerChevron}>{isYearMenuOpen ? "⌃" : "⌄"}</Text>
          </Pressable>
          {isYearMenuOpen ? (
            <View style={styles.periodMenu}>
              <Text style={styles.periodMenuSectionLabel}>期間</Text>
              <Pressable onPress={() => selectPeriod("all")} style={[styles.periodMenuOption, isPeriodSelected("all") && styles.periodMenuOptionSelected]}>
                <Text style={[styles.periodMenuOptionText, isPeriodSelected("all") && styles.periodMenuOptionTextSelected]}>全年度</Text>
                {isPeriodSelected("all") ? <Text style={styles.periodMenuCheck}>✓</Text> : null}
              </Pressable>
              <Text style={styles.periodMenuSectionLabel}>年度</Text>
              <View style={styles.periodOptionGrid}>
                {years.map((year) => (
                  <Pressable key={year} onPress={() => selectPeriod(year)} style={[styles.periodChip, isPeriodSelected(year) && styles.periodChipSelected]}>
                    <Text style={[styles.periodChipText, isPeriodSelected(year) && styles.periodChipTextSelected]}>{year}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.monthPickerSection}>
          <View style={styles.monthPickerHeader}>
            <View style={styles.monthPickerInfo}>
              <Text style={styles.monthPickerTitle}>月份</Text>
              <Text style={styles.monthPickerSubtitle}>{typeof period === "object" ? `${period.month} 月已選取` : `選擇 ${selectedYear} 年月份`}</Text>
            </View>
            <View style={styles.monthPickerActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="展開或收合月份選擇" onPress={() => void setMonthPickerExpanded(!isMonthPickerExpanded)} style={({ pressed }) => [styles.monthPickerIconButton, pressed && styles.monthPickerIconButtonPressed]}>
                <Text style={styles.monthPickerChevron}>{isMonthPickerExpanded ? "⌃" : "⌄"}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="切換至本月" onPress={selectCurrentMonth} style={({ pressed }) => [styles.monthCurrentButton, isCurrentMonthSelected && styles.monthCurrentButtonSelected, pressed && styles.monthCurrentButtonPressed]}>
                <Text style={[styles.monthCurrentButtonText, isCurrentMonthSelected && styles.monthCurrentButtonTextSelected]}>本月</Text>
              </Pressable>
            </View>
          </View>
          {isMonthPickerExpanded ? (
            <View style={styles.monthPickerGrid}>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
                const candidate = { year: selectedYear, month };
                return (
                  <Pressable
                    key={month}
                    onPress={() => {
                      selectPeriod(candidate);
                      void setMonthPickerExpanded(false);
                    }}
                    style={[styles.monthPickerChip, isPeriodSelected(candidate) && styles.monthPickerChipSelected]}
                  >
                    <Text style={[styles.monthPickerChipText, isPeriodSelected(candidate) && styles.monthPickerChipTextSelected]}>{month}月</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        {period === "all" ? <SavingsGoalCard saved={summary.net} goal={savingsGoal} onPress={() => router.navigate("/settings")} /> : null}

        <View style={styles.metricGrid}>
          <View style={styles.metricTopRow}>
            <View style={styles.metricColumn}>
              <MetricCard label={`${summaryScope}收入`} amount={isLoading ? "載入中" : money(summary.income)} tone="income" />
              <MetricCard label={`${summaryScope}支出`} amount={isLoading ? "載入中" : money(summary.expense)} tone="expense" />
            </View>
            <View style={styles.metricSideColumn}>
              <LivingAmountCard amount={livingAmountFor(summary.income, summary.expense)} expense={summary.expense} scope={isMonthlyPeriod ? "本月" : "年度"} />
            </View>
          </View>
        </View>

        <Panel title="支出分類佔比" subtitle="點選分類查看交易明細">
          <DonutChart data={categories} onCategoryPress={(category) => router.push({ pathname: "/accounting", params: { mode: "details", category } })} />
        </Panel>

        {period !== "all" ? <>
          <Pressable accessibilityRole="button" accessibilityLabel="開啟單筆收支明細" onPress={() => setIsBreakdownDrawerVisible(true)} style={({ pressed }) => [styles.breakdownPanel, styles.breakdownToggle, pressed && styles.breakdownTogglePressed]}>
            <View style={styles.breakdownToggleCopy}>
              <Text style={styles.breakdownTitle}>{breakdownLabel}</Text>
              <Text style={styles.breakdownSubtitle}>收入 {incomeTransactions.length} 筆 ・ 支出 {expenseTransactions.length} 筆</Text>
            </View>
            <View style={styles.breakdownChevron}><Text style={styles.breakdownChevronText}>⌃</Text></View>
          </Pressable>
          <Modal transparent visible={isBreakdownDrawerVisible} animationType="slide" onRequestClose={() => setIsBreakdownDrawerVisible(false)}>
            <View style={styles.breakdownModal}>
              <Pressable accessibilityRole="button" accessibilityLabel="關閉單筆收支明細" onPress={() => setIsBreakdownDrawerVisible(false)} style={styles.breakdownBackdrop} />
              <View style={styles.breakdownSheet}>
                <View style={styles.breakdownSheetHandle} />
                <View style={styles.breakdownSheetHeader}>
                  <View style={styles.breakdownSheetCopy}><Text style={styles.breakdownSheetTitle}>{breakdownLabel}</Text><Text style={styles.breakdownSheetSubtitle}>收入 {incomeTransactions.length} 筆 ・ 支出 {expenseTransactions.length} 筆</Text></View>
                  <Pressable accessibilityRole="button" onPress={() => setIsBreakdownDrawerVisible(false)} style={({ pressed }) => [styles.breakdownCloseButton, pressed && styles.breakdownTogglePressed]}><Text style={styles.breakdownCloseText}>完成</Text></Pressable>
                </View>
                <ScrollView contentContainerStyle={styles.breakdownContent} showsVerticalScrollIndicator={false}>
              <View style={styles.breakdownColumn}>
                <View style={styles.breakdownColumnHeading}><Text style={styles.incomeBreakdownTitle}>收入</Text><Text style={styles.breakdownTotal}>{money(summary.income)}</Text></View>
                {incomeTransactions.length === 0 ? <Text style={styles.breakdownEmpty}>本期尚無收入</Text> : incomeTransactions.map((item) => <Pressable key={`income-${item.id}`} onPress={() => { setIsBreakdownDrawerVisible(false); router.push({ pathname: "/accounting", params: { mode: "details", category: item.category } }); }} style={({ pressed }) => [styles.breakdownRow, pressed && styles.breakdownRowPressed]}><View style={styles.breakdownNameWrap}><Text numberOfLines={1} style={styles.breakdownName}>{item.note || item.category}</Text><Text numberOfLines={1} style={styles.breakdownCount}>{dateLabel(item.date)} ・ {item.category}</Text></View><Text style={styles.incomeBreakdownAmount}>{money(item.amount)}</Text></Pressable>)}
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownColumn}>
                <View style={styles.breakdownColumnHeading}><Text style={styles.expenseBreakdownTitle}>支出</Text><Text style={styles.breakdownTotal}>{money(summary.expense)}</Text></View>
                {expenseTransactions.length === 0 ? <Text style={styles.breakdownEmpty}>本期尚無支出</Text> : expenseTransactions.map((item) => <Pressable key={`expense-${item.id}`} onPress={() => { setIsBreakdownDrawerVisible(false); router.push({ pathname: "/accounting", params: { mode: "details", category: item.category } }); }} style={({ pressed }) => [styles.breakdownRow, pressed && styles.breakdownRowPressed]}><View style={styles.breakdownNameWrap}><Text numberOfLines={1} style={styles.breakdownName}>{item.note || item.category}</Text><Text numberOfLines={1} style={styles.breakdownCount}>{dateLabel(item.date)} ・ {item.category}</Text></View><Text style={styles.expenseBreakdownAmount}>{money(item.amount)}</Text></Pressable>)}
              </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </> : null}

      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, overflow: "hidden", padding: 12, paddingBottom: 8, gap: 8 },
  header: { marginTop: 1 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIcon: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: "#D7C9B8" },
  title: { fontSize: 22, lineHeight: 27, fontWeight: "900", color: "#1F2421" },
  subtitle: { marginTop: 1, fontSize: 10, color: "#7A837D" },
  periodPicker: { alignSelf: "flex-end", marginTop: -40, position: "relative", zIndex: 20, elevation: 20 },
  periodPickerButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DED8CE", borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 6, minWidth: 112, paddingHorizontal: 11, paddingVertical: 8 },
  periodPickerPressed: { opacity: 0.78 },
  periodPickerLabel: { color: "#0E6B56", flex: 1, fontSize: 12, fontWeight: "900" },
  periodPickerChevron: { color: "#6E7871", fontSize: 14, lineHeight: 16, fontWeight: "900" },
  periodMenu: { backgroundColor: "#FFFFFF", borderColor: "#DED8CE", borderRadius: 14, borderWidth: 1, maxWidth: 232, minWidth: 218, padding: 10, position: "absolute", right: 0, shadowColor: "#34473D", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 12, top: 46, zIndex: 30, elevation: 12 },
  periodMenuSectionLabel: { color: "#7A837D", fontSize: 10, fontWeight: "800", marginBottom: 6, marginTop: 8 },
  periodMenuOption: { alignItems: "center", borderRadius: 9, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 8 },
  periodMenuOptionSelected: { backgroundColor: "#E8F1EC" },
  periodMenuOptionText: { color: "#47534C", fontSize: 12, fontWeight: "800" },
  periodMenuOptionTextSelected: { color: "#0E6B56" },
  periodMenuCheck: { color: "#0E6B56", fontSize: 13, fontWeight: "900" },
  periodOptionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  periodChip: { alignItems: "center", borderColor: "#E2DED5", borderRadius: 8, borderWidth: 1, minWidth: 42, paddingHorizontal: 7, paddingVertical: 7 },
  periodChipSelected: { backgroundColor: "#E8F1EC", borderColor: "#98C4B2" },
  periodChipText: { color: "#59655E", fontSize: 11, fontWeight: "800" },
  periodChipTextSelected: { color: "#0E6B56" },
  monthPickerSection: { backgroundColor: "#FFFFFF", borderColor: "#ECE7DE", borderRadius: 12, borderWidth: 1, marginTop: 4, overflow: "visible", position: "relative", zIndex: 15, elevation: 15 },
  monthPickerHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 6 },
  monthPickerInfo: { flex: 1, minWidth: 0 },
  monthPickerActions: { alignItems: "center", flexDirection: "row", gap: 7 },
  monthPickerTitle: { color: "#34473D", fontSize: 12, fontWeight: "900" },
  monthPickerSubtitle: { color: "#7A837D", fontSize: 10, marginTop: 2 },
  monthPickerIconButton: { alignItems: "center", backgroundColor: "#E8F1EC", borderRadius: 13, height: 26, justifyContent: "center", width: 26 },
  monthPickerIconButtonPressed: { opacity: 0.72 },
  monthPickerChevron: { color: "#0E6B56", fontSize: 15, fontWeight: "900", marginTop: -2 },
  monthCurrentButton: { alignItems: "center", borderColor: "#BCD8CB", borderRadius: 7, borderWidth: 1, justifyContent: "center", minWidth: 39, paddingHorizontal: 7, paddingVertical: 5 },
  monthCurrentButtonSelected: { backgroundColor: "#E8F1EC", borderColor: "#0E6B56" },
  monthCurrentButtonPressed: { opacity: 0.72 },
  monthCurrentButtonText: { color: "#0E6B56", fontSize: 11, fontWeight: "900" },
  monthCurrentButtonTextSelected: { color: "#075543" },
  monthPickerGrid: { backgroundColor: "#FFFFFF", borderColor: "#ECE7DE", borderRadius: 12, borderWidth: 1, elevation: 14, flexDirection: "row", flexWrap: "wrap", gap: 6, left: 0, padding: 10, position: "absolute", right: 0, shadowColor: "#34473D", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 12, top: 44, zIndex: 30 },
  monthPickerChip: { alignItems: "center", borderColor: "#E2DED5", borderRadius: 7, borderWidth: 1, minWidth: 38, paddingHorizontal: 6, paddingVertical: 6 },
  monthPickerChipSelected: { backgroundColor: "#E8F1EC", borderColor: "#98C4B2" },
  monthPickerChipText: { color: "#59655E", fontSize: 11, fontWeight: "800" },
  monthPickerChipTextSelected: { color: "#0E6B56" },
  metricGrid: { gap: 8, marginTop: 0 },
  metricTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  metricColumn: { flex: 1, gap: 8 },
  metricSideColumn: { flex: 1, gap: 8 },
  metricCard: { borderRadius: 14, backgroundColor: "#FFFFFF", padding: 10, borderWidth: 1, borderColor: "#ECE7DE", minHeight: 78 },
  metricHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metricLabel: { color: "#657069", fontSize: 12, fontWeight: "800" },
  metricIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#E6F3ED" },
  metricIconExpense: { backgroundColor: "#F8E9E6" },
  metricIconText: { color: "#0E6B56", fontSize: 17, fontWeight: "900" },
  metricIconTextExpense: { color: "#C85F3A" },
  metricAmount: { color: "#0E6B56", fontSize: 16, lineHeight: 20, fontWeight: "900", marginTop: 9 },
  expenseAmount: { color: "#C85F3A" },
  livingCard: { borderRadius: 14, backgroundColor: "#EEF5F1", padding: 9, borderWidth: 1, borderColor: "#CEE1D8", gap: 5 },
  annualLivingCard: { backgroundColor: "#EEF3FA", borderColor: "#D3DFEF" },
  livingHeading: { flexDirection: "row", justifyContent: "space-between", gap: 7 },
  livingLabel: { color: "#34473D", fontSize: 11, fontWeight: "900" },
  livingFormula: { color: "#6D7B72", fontSize: 9, marginTop: 2 },
  livingIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#DCEDE5", alignItems: "center", justifyContent: "center" },
  livingAmount: { fontSize: 16, lineHeight: 20, fontWeight: "900" },
  livingAmountPositive: { color: "#0E6B56" },
  livingAmountNegative: { color: "#C85F3A" },
  livingHint: { color: "#6D7B72", fontSize: 10, lineHeight: 14, marginTop: 2 },
  expenseComparisonRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "flex-end", marginTop: 4 },
  expenseComparisonDetail: { alignItems: "flex-end" },
  expenseComparisonLabel: { color: "#6D7B72", fontSize: 9, fontWeight: "800" },
  expenseComparisonAmount: { color: "#34473D", fontSize: 12, lineHeight: 16, fontWeight: "900", marginTop: 2 },
  expenseComparisonPositive: { color: "#0E6B56" },
  expenseComparisonNegative: { color: "#C85F3A" },
  expenseUsageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  expenseUsageLabel: { color: "#587066", fontSize: 10, fontWeight: "800" },
  expenseUsagePercent: { fontSize: 11, fontWeight: "900" },
  expenseUsageGreen: { color: "#0E6B56" },
  expenseUsageYellow: { color: "#B47A0B" },
  expenseUsageOrange: { color: "#C85F3A" },
  expenseUsageRed: { color: "#B5472C" },
  expenseUsageTrack: { height: 6, borderRadius: 3, backgroundColor: "#E2E9E5", overflow: "hidden", marginTop: 3 },
  expenseUsageFill: { height: "100%", borderRadius: 4 },
  expenseUsageFillGreen: { backgroundColor: "#0E6B56" },
  expenseUsageFillYellow: { backgroundColor: "#D7A62A" },
  expenseUsageFillOrange: { backgroundColor: "#E5863D" },
  expenseUsageFillRed: { backgroundColor: "#C85F3A" },
  expenseOverAlert: { marginTop: 7, borderRadius: 8, backgroundColor: "#FBE0D7", paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: "#EDB4A3" },
  expenseOverAlertText: { color: "#B5472C", fontSize: 10, lineHeight: 14, fontWeight: "900" },
  expenseWarningAlert: { backgroundColor: "#FFF0C8", borderColor: "#E9C46A" },
  expenseWarningAlertText: { color: "#8A5E05" },
  livingDivider: { height: 1, backgroundColor: "#D6E5DD", marginVertical: 9 },
  monthDifference: { fontSize: 10, lineHeight: 15, fontWeight: "900", marginTop: 7 },
  monthDifferencePositive: { color: "#0E6B56" },
  monthDifferenceNegative: { color: "#C85F3A" },
  savingsGoalCard: { borderRadius: 12, backgroundColor: "#F3F0FB", paddingHorizontal: 11, paddingVertical: 7, borderWidth: 1, borderColor: "#DDD5F0" },
  savingsGoalPressed: { opacity: 0.84 },
  savingsGoalBarTop: { alignItems: "flex-start", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  savingsGoalHeading: { flexDirection: "row", alignItems: "center" },
  savingsGoalValueRow: { alignItems: "flex-end", flexShrink: 1, minWidth: 0 },
  savingsGoalTitle: { color: "#3E365F", flexShrink: 1, fontSize: 14, fontWeight: "900", lineHeight: 18, minWidth: 0 },
  savingsGoalAmount: { color: "#0E6B56", fontSize: 15, lineHeight: 18, fontWeight: "900", textAlign: "right" },
  savingsGoalAmountPositive: { color: "#0E6B56" },
  savingsGoalAmountNegative: { color: "#C85F3A" },
  savingsGoalCaption: { color: "#7A7192", fontSize: 9, marginTop: 0, textAlign: "right" },
  savingsGoalMetaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 7 },
  savingsGoalMetaText: { color: "#665D7D", fontSize: 11, fontWeight: "800" },
  savingsGoalPercent: { color: "#69529D", fontSize: 15, fontWeight: "900" },
  savingsGoalTrack: { height: 6, borderRadius: 3, backgroundColor: "#DED7EE", overflow: "hidden", marginTop: 4 },
  savingsGoalFill: { height: "100%", borderRadius: 5, backgroundColor: "#69529D" },
  savingsGoalFillAchieved: { backgroundColor: "#0E6B56" },
  savingsGoalRemaining: { color: "#665D7D", fontSize: 10, fontWeight: "800", marginTop: 4 },
  savingsGoalAchieved: { color: "#0E6B56" },
  panel: { borderRadius: 15, backgroundColor: "#FFFFFF", padding: 10, borderWidth: 1, borderColor: "#ECE7DE" },
  panelHeading: { marginBottom: 7 },
  panelTitle: { color: "#1F2421", fontSize: 16, fontWeight: "900" },
  panelSubtitle: { color: "#7A837D", fontSize: 10, marginTop: 2 },
  breakdownPanel: { backgroundColor: "#FFFFFF", borderColor: "#ECE7DE", borderRadius: 15, borderWidth: 1, overflow: "hidden" },
  breakdownToggle: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10 },
  breakdownTogglePressed: { backgroundColor: "#F5F7F4" },
  breakdownToggleCopy: { flex: 1, minWidth: 0 },
  breakdownTitle: { color: "#1F2421", fontSize: 14, fontWeight: "900" },
  breakdownSubtitle: { color: "#7A837D", fontSize: 10, marginTop: 2 },
  breakdownChevron: { alignItems: "center", backgroundColor: "#E8F1EC", borderRadius: 13, height: 26, justifyContent: "center", marginLeft: 10, width: 26 },
  breakdownChevronText: { color: "#0E6B56", fontSize: 15, fontWeight: "900", marginTop: -2 },
  breakdownContent: { borderTopColor: "#ECE7DE", borderTopWidth: 1, padding: 10 },
  breakdownColumn: { gap: 4 },
  breakdownColumnHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  incomeBreakdownTitle: { color: "#0E6B56", fontSize: 12, fontWeight: "900" },
  expenseBreakdownTitle: { color: "#C85F3A", fontSize: 12, fontWeight: "900" },
  breakdownTotal: { color: "#536059", fontSize: 11, fontWeight: "900" },
  breakdownRow: { alignItems: "center", backgroundColor: "#FAFBF9", borderRadius: 8, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 6 },
  breakdownRowPressed: { opacity: 0.72 },
  breakdownNameWrap: { flex: 1, minWidth: 0, paddingRight: 8 },
  breakdownName: { color: "#3C4941", fontSize: 11, fontWeight: "800" },
  breakdownCount: { color: "#89928C", fontSize: 9, marginTop: 1 },
  incomeBreakdownAmount: { color: "#0E6B56", fontSize: 11, fontWeight: "900" },
  expenseBreakdownAmount: { color: "#C85F3A", fontSize: 11, fontWeight: "900" },
  breakdownEmpty: { color: "#8A948D", fontSize: 10, paddingVertical: 8, textAlign: "center" },
  breakdownDivider: { backgroundColor: "#ECE7DE", height: 1, marginVertical: 10 },
  breakdownAllButton: { alignItems: "center", backgroundColor: "#E8F1EC", borderRadius: 8, flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingHorizontal: 9, paddingVertical: 7 },
  breakdownAllText: { color: "#0E6B56", fontSize: 11, fontWeight: "900" },
  breakdownAllChevron: { color: "#0E6B56", fontSize: 18, fontWeight: "900", lineHeight: 18 },
  breakdownModal: { flex: 1, justifyContent: "flex-end" },
  breakdownBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(22, 30, 26, 0.42)" },
  breakdownSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "82%", paddingBottom: 18, paddingHorizontal: 16, paddingTop: 9 },
  breakdownSheetHandle: { alignSelf: "center", backgroundColor: "#D8DDD8", borderRadius: 2, height: 4, marginBottom: 13, width: 38 },
  breakdownSheetHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  breakdownSheetCopy: { flex: 1, minWidth: 0, paddingRight: 10 },
  breakdownSheetTitle: { color: "#1F2421", fontSize: 18, fontWeight: "900" },
  breakdownSheetSubtitle: { color: "#718078", fontSize: 11, marginTop: 3 },
  breakdownCloseButton: { alignItems: "center", backgroundColor: "#E7F2ED", borderRadius: 9, justifyContent: "center", minHeight: 32, paddingHorizontal: 10 },
  breakdownCloseText: { color: "#0E6B56", fontSize: 12, fontWeight: "900" },
});
