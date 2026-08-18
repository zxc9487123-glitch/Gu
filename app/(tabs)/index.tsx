import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { useRouter } from "expo-router";

import { DonutChart, Treemap } from "@/components/finance-visuals";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useFinance } from "@/hooks/use-finance";
import { useSavingsGoal } from "@/hooks/use-savings-goal";
import { availableYears, categoryTotalsFor, money, summaryFor, transactionsForPeriod, type TransactionPeriod } from "@/lib/finance";
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

function LivingAmountCard({ amount, expense }: { amount: number; expense: number }) {
  const positive = amount >= 0;
  const expenseComparison = livingExpenseComparisonFor(amount, expense);
  const exceedsExpense = expenseComparison.difference >= 0;
  const expenseUsage = livingExpenseUsageFor(amount, expense);
  const expenseAlert = livingExpenseAlertFor(amount, expense);
  return (
    <View style={[styles.livingCard, styles.annualLivingCard]}>
      <View style={styles.livingHeading}>
        <View>
          <Text style={styles.livingLabel}>年度生活金額</Text>
          <Text style={styles.livingFormula}>年度收入 ÷ 3</Text>
        </View>
        <View style={styles.livingIcon}>
          <IconSymbol name="house.fill" size={24} color="#315E96" />
        </View>
      </View>
      <View>
        <Text style={[styles.livingAmount, positive ? styles.livingAmountPositive : styles.livingAmountNegative]}>{money(amount, positive)}</Text>
        <Text style={styles.livingHint}>{positive ? "本年度可用於日常生活的金額" : "年度支出已超出生活金額"}</Text>
        <View style={styles.expenseComparisonRow}>
          <View style={styles.expenseComparisonDetail}>
            <Text style={styles.expenseComparisonLabel}>{exceedsExpense ? "高於支出" : "低於支出"}</Text>
            <Text style={[styles.expenseComparisonAmount, exceedsExpense ? styles.expenseComparisonPositive : styles.expenseComparisonNegative]}>{money(Math.abs(expenseComparison.difference))}</Text>
          </View>
        </View>
        <View style={styles.expenseUsageHeader}>
          <Text style={styles.expenseUsageLabel}>年度生活支出使用率</Text>
          <Text style={[styles.expenseUsagePercent, expenseUsage.status === "green" ? styles.expenseUsageGreen : expenseUsage.status === "yellow" ? styles.expenseUsageYellow : expenseUsage.status === "orange" ? styles.expenseUsageOrange : styles.expenseUsageRed]}>{expenseUsage.percent === null ? "不適用" : `${expenseUsage.percent}%`}</Text>
        </View>
        <View style={styles.expenseUsageTrack}>
          <View style={[styles.expenseUsageFill, expenseUsage.status === "green" ? styles.expenseUsageFillGreen : expenseUsage.status === "yellow" ? styles.expenseUsageFillYellow : expenseUsage.status === "orange" ? styles.expenseUsageFillOrange : styles.expenseUsageFillRed, { width: `${Math.round(expenseUsage.progress * 100)}%` }]} />
        </View>
        {expenseAlert.status === "warning" ? <View style={[styles.expenseOverAlert, styles.expenseWarningAlert]}><Text style={[styles.expenseOverAlertText, styles.expenseWarningAlertText]}>接近上限：年度生活支出已達生活金額 {expenseAlert.usagePercent}%</Text></View> : null}
        {expenseAlert.status === "over" ? <View style={styles.expenseOverAlert}><Text style={styles.expenseOverAlertText}>超標警示：年度生活支出超過生活金額 {money(expenseAlert.overage)}</Text></View> : null}
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
      {progress.status === "not-set" ? (
        <View style={styles.savingsGoalEmpty}><Text style={styles.savingsGoalEmptyText}>請至「設定」輸入存款目標金額</Text></View>
      ) : (
        <>
          <View style={styles.savingsGoalMetaRow}>
            <Text style={styles.savingsGoalMetaText}>目標 {money(progress.goal ?? 0)}</Text>
            <Text style={[styles.savingsGoalPercent, progress.status === "achieved" && styles.savingsGoalAchieved]}>{progress.progressPercent}%</Text>
          </View>
          <View style={styles.savingsGoalTrack}><View style={[styles.savingsGoalFill, progress.status === "achieved" && styles.savingsGoalFillAchieved, { width: progressWidth }]} /></View>
          <Text style={[styles.savingsGoalRemaining, progress.status === "achieved" && styles.savingsGoalAchieved]}>{progress.status === "achieved" ? `已超越目標 ${money(Math.max(saved - (progress.goal ?? 0), 0))}` : `距離目標尚差 ${money(progress.remaining ?? 0)}`}</Text>
        </>
      )}
    </Pressable>
  );
}

function Panel({ title, subtitle, children, compact = false }: { title: string; subtitle?: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <View style={[styles.panel, compact && styles.compactPanel]}>
      <View style={[styles.panelHeading, compact && styles.compactPanelHeading]}>
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
  const years = availableYears(transactions);
  const [period, setPeriod] = useState<TransactionPeriod>("all");
  const [isYearMenuOpen, setIsYearMenuOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const filtered = useMemo(() => transactionsForPeriod(transactions, period), [transactions, period]);
  const summary = useMemo(() => summaryFor(filtered), [filtered]);
  const categories = useMemo(() => categoryTotalsFor(filtered), [filtered]);
  const firstYear = years[0] ?? new Date().getFullYear();
  const selectedYear = period === "all" ? firstYear : typeof period === "number" ? period : period.year;
  const periodLabel = period === "all" ? "全年度" : typeof period === "number" ? `${period} 年度` : `${period.year} 年 ${period.month} 月`;
  const selectPeriod = (nextPeriod: TransactionPeriod) => {
    setPeriod(nextPeriod);
    setIsYearMenuOpen(false);
  };
  const isPeriodSelected = (candidate: TransactionPeriod) =>
    candidate === "all"
      ? period === "all"
      : typeof candidate === "number"
        ? period === candidate
        : typeof period === "object" && period.year === candidate.year && period.month === candidate.month;

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="展開或收合月份選擇"
            onPress={() => setIsMonthPickerOpen((value) => !value)}
            style={({ pressed }) => [styles.monthPickerToggle, pressed && styles.monthPickerTogglePressed]}
          >
            <View>
              <Text style={styles.monthPickerTitle}>月份</Text>
              <Text style={styles.monthPickerSubtitle}>{typeof period === "object" ? `${period.month} 月已選取` : `選擇 ${selectedYear} 年月份`}</Text>
            </View>
            <Text style={styles.monthPickerChevron}>{isMonthPickerOpen ? "⌃" : "⌄"}</Text>
          </Pressable>
          {isMonthPickerOpen ? (
            <View style={styles.monthPickerGrid}>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
                const candidate = { year: selectedYear, month };
                return (
                  <Pressable
                    key={month}
                    onPress={() => {
                      selectPeriod(candidate);
                      setIsMonthPickerOpen(false);
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

        <View style={styles.metricGrid}>
          <View style={styles.metricTopRow}>
            <View style={styles.metricColumn}>
              <MetricCard label="總收入" amount={isLoading ? "載入中" : money(summary.income)} tone="income" />
              <MetricCard label="總支出" amount={isLoading ? "載入中" : money(summary.expense)} tone="expense" />
            </View>
            <View style={styles.metricSideColumn}>
              <LivingAmountCard amount={livingAmountFor(summary.income, summary.expense)} expense={summary.expense} />
            </View>
          </View>
          {period === "all" ? <SavingsGoalCard saved={summary.net} goal={savingsGoal} onPress={() => router.navigate("/settings")} /> : null}
        </View>

        <Panel title="支出分類地圖" subtitle="依金額查看分類結構" compact>
          <Treemap data={categories} />
        </Panel>

        <Panel title="支出分類佔比" subtitle="各分類支出金額比例">
          <DonutChart data={categories} />
        </Panel>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 28, gap: 14 },
  header: { marginTop: 4 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIcon: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, borderColor: "#D7C9B8" },
  title: { fontSize: 27, lineHeight: 34, fontWeight: "900", color: "#1F2421" },
  subtitle: { marginTop: 2, fontSize: 12, color: "#7A837D" },
  periodPicker: { alignSelf: "flex-end", marginTop: -48, position: "relative", zIndex: 20, elevation: 20 },
  periodPickerButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DED8CE", borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 8, minWidth: 128, paddingHorizontal: 14, paddingVertical: 10 },
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
  monthPickerSection: { backgroundColor: "#FFFFFF", borderColor: "#ECE7DE", borderRadius: 14, borderWidth: 1, marginTop: 10, overflow: "hidden" },
  monthPickerToggle: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 13, paddingVertical: 10 },
  monthPickerTogglePressed: { backgroundColor: "#F7F8F5" },
  monthPickerTitle: { color: "#34473D", fontSize: 12, fontWeight: "900" },
  monthPickerSubtitle: { color: "#7A837D", fontSize: 10, marginTop: 2 },
  monthPickerChevron: { color: "#0E6B56", fontSize: 15, fontWeight: "900" },
  monthPickerGrid: { borderTopColor: "#ECE7DE", borderTopWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 7, padding: 11 },
  monthPickerChip: { alignItems: "center", borderColor: "#E2DED5", borderRadius: 8, borderWidth: 1, minWidth: 42, paddingHorizontal: 7, paddingVertical: 7 },
  monthPickerChipSelected: { backgroundColor: "#E8F1EC", borderColor: "#98C4B2" },
  monthPickerChipText: { color: "#59655E", fontSize: 11, fontWeight: "800" },
  monthPickerChipTextSelected: { color: "#0E6B56" },
  metricGrid: { gap: 10, marginTop: 34 },
  metricTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  metricColumn: { flex: 1, gap: 10 },
  metricSideColumn: { flex: 1, gap: 10 },
  metricCard: { borderRadius: 17, backgroundColor: "#FFFFFF", padding: 14, borderWidth: 1, borderColor: "#ECE7DE", minHeight: 112 },
  metricHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metricLabel: { color: "#657069", fontSize: 12, fontWeight: "800" },
  metricIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#E6F3ED" },
  metricIconExpense: { backgroundColor: "#F8E9E6" },
  metricIconText: { color: "#0E6B56", fontSize: 17, fontWeight: "900" },
  metricIconTextExpense: { color: "#C85F3A" },
  metricAmount: { color: "#0E6B56", fontSize: 19, lineHeight: 24, fontWeight: "900", marginTop: 18 },
  expenseAmount: { color: "#C85F3A" },
  livingCard: { borderRadius: 17, backgroundColor: "#EEF5F1", padding: 12, borderWidth: 1, borderColor: "#CEE1D8", gap: 9 },
  annualLivingCard: { backgroundColor: "#EEF3FA", borderColor: "#D3DFEF" },
  livingHeading: { flexDirection: "row", justifyContent: "space-between", gap: 7 },
  livingLabel: { color: "#34473D", fontSize: 13, fontWeight: "900" },
  livingFormula: { color: "#6D7B72", fontSize: 10, marginTop: 4 },
  livingIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#DCEDE5", alignItems: "center", justifyContent: "center" },
  livingAmount: { fontSize: 19, lineHeight: 24, fontWeight: "900" },
  livingAmountPositive: { color: "#0E6B56" },
  livingAmountNegative: { color: "#C85F3A" },
  livingHint: { color: "#6D7B72", fontSize: 10, lineHeight: 14, marginTop: 2 },
  expenseComparisonRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "flex-end", marginTop: 4 },
  expenseComparisonDetail: { alignItems: "flex-end" },
  expenseComparisonLabel: { color: "#6D7B72", fontSize: 9, fontWeight: "800" },
  expenseComparisonAmount: { color: "#34473D", fontSize: 12, lineHeight: 16, fontWeight: "900", marginTop: 2 },
  expenseComparisonPositive: { color: "#0E6B56" },
  expenseComparisonNegative: { color: "#C85F3A" },
  expenseUsageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 7 },
  expenseUsageLabel: { color: "#587066", fontSize: 10, fontWeight: "800" },
  expenseUsagePercent: { fontSize: 11, fontWeight: "900" },
  expenseUsageGreen: { color: "#0E6B56" },
  expenseUsageYellow: { color: "#B47A0B" },
  expenseUsageOrange: { color: "#C85F3A" },
  expenseUsageRed: { color: "#B5472C" },
  expenseUsageTrack: { height: 8, borderRadius: 4, backgroundColor: "#E2E9E5", overflow: "hidden", marginTop: 5 },
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
  savingsGoalCard: { borderRadius: 18, backgroundColor: "#F3F0FB", padding: 14, borderWidth: 1, borderColor: "#DDD5F0" },
  savingsGoalPressed: { opacity: 0.84 },
  savingsGoalBarTop: { alignItems: "flex-start", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  savingsGoalHeading: { flexDirection: "row", alignItems: "center" },
  savingsGoalValueRow: { alignItems: "flex-end", flexShrink: 1, minWidth: 0 },
  savingsGoalTitle: { color: "#3E365F", flexShrink: 1, fontSize: 19, fontWeight: "900", lineHeight: 26, minWidth: 0 },
  savingsGoalAmount: { color: "#0E6B56", fontSize: 20, lineHeight: 26, fontWeight: "900", textAlign: "right" },
  savingsGoalAmountPositive: { color: "#0E6B56" },
  savingsGoalAmountNegative: { color: "#C85F3A" },
  savingsGoalCaption: { color: "#7A7192", fontSize: 10, marginTop: 1, textAlign: "right" },
  savingsGoalEmpty: { marginTop: 10, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: "#FFFFFF" },
  savingsGoalEmptyText: { color: "#69529D", fontSize: 11, fontWeight: "800" },
  savingsGoalMetaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  savingsGoalMetaText: { color: "#665D7D", fontSize: 11, fontWeight: "800" },
  savingsGoalPercent: { color: "#69529D", fontSize: 15, fontWeight: "900" },
  savingsGoalTrack: { height: 7, borderRadius: 4, backgroundColor: "#DED7EE", overflow: "hidden", marginTop: 5 },
  savingsGoalFill: { height: "100%", borderRadius: 5, backgroundColor: "#69529D" },
  savingsGoalFillAchieved: { backgroundColor: "#0E6B56" },
  savingsGoalRemaining: { color: "#665D7D", fontSize: 11, fontWeight: "800", marginTop: 6 },
  savingsGoalAchieved: { color: "#0E6B56" },
  panel: { borderRadius: 20, backgroundColor: "#FFFFFF", padding: 16, borderWidth: 1, borderColor: "#ECE7DE" },
  compactPanel: { padding: 14 },
  panelHeading: { marginBottom: 14 },
  compactPanelHeading: { marginBottom: 9 },
  panelTitle: { color: "#1F2421", fontSize: 19, fontWeight: "900" },
  panelSubtitle: { color: "#7A837D", fontSize: 12, marginTop: 3 },
});
