import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";

import { DonutChart, Treemap, TrendLine } from "@/components/finance-visuals";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useFinance } from "@/hooks/use-finance";
import { annualExpenseInsightsFor, availableYears, categoryTotalsFor, money, summaryFor, transactionsForPeriod, trendPointsFor } from "@/lib/finance";
import { livingAmountFor, livingExpenseAlertFor, livingExpenseComparisonFor, livingExpenseSharePercentFor } from "@/lib/living-amount";
import { monthlyLivingComparison } from "@/lib/monthly-living";
import { trendCopyFor } from "@/lib/trend-copy";

type Period = "all" | number;

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

function LivingAmountCard({ amount, expense, difference = 0, scope = "month" }: { amount: number; expense: number; difference?: number; scope?: "month" | "year" }) {
  const isYear = scope === "year";
  const positive = amount >= 0;
  const differencePositive = difference >= 0;
  const expenseComparison = livingExpenseComparisonFor(amount, expense);
  const exceedsExpense = expenseComparison.difference >= 0;
  const expenseSharePercent = livingExpenseSharePercentFor(amount, expense);
  const expenseAlert = livingExpenseAlertFor(amount, expense);
  return (
    <View style={[styles.livingCard, isYear && styles.annualLivingCard]}>
      <View style={styles.livingHeading}>
        <View>
          <Text style={styles.livingLabel}>{isYear ? "年度生活金額" : "生活金額"}</Text>
          <Text style={styles.livingFormula}>{isYear ? "年度收入 ÷ 3 − 年度支出" : "收入 ÷ 3 − 支出"}</Text>
        </View>
        <View style={styles.livingIcon}>
          <IconSymbol name="house.fill" size={24} color={isYear ? "#315E96" : "#0E6B56"} />
        </View>
      </View>
      <View>
        <Text style={[styles.livingAmount, positive ? styles.livingAmountPositive : styles.livingAmountNegative]}>{money(amount, positive)}</Text>
        <Text style={styles.livingHint}>{positive ? (isYear ? "本年度可用於日常生活的金額" : "可用於日常生活的金額") : `${isYear ? "年度" : "目前"}支出已超出生活金額`}</Text>
        <View style={styles.expenseComparisonRow}>
          <View>
            <Text style={styles.expenseComparisonLabel}>{isYear ? "年度生活支出" : "本月生活支出"}</Text>
            <Text style={styles.expenseComparisonAmount}>{money(expense)}</Text>
          </View>
          <View style={styles.expenseComparisonDetail}>
            <Text style={styles.expenseComparisonLabel}>{isYear ? "年度生活金額" : "生活金額"}{exceedsExpense ? "高於" : "低於"}支出</Text>
            <Text style={[styles.expenseComparisonAmount, exceedsExpense ? styles.expenseComparisonPositive : styles.expenseComparisonNegative]}>{money(Math.abs(expenseComparison.difference))}</Text>
          </View>
        </View>
        <Text style={[styles.expenseShareText, expenseSharePercent !== null && expenseSharePercent < 0 && styles.expenseComparisonNegative]}>{isYear ? "年度生活金額占年度生活支出" : "生活金額占本月生活支出"}：{expenseSharePercent === null ? "不適用" : `${expenseSharePercent}%`}</Text>
        {expenseAlert.status === "warning" ? <View style={[styles.expenseOverAlert, styles.expenseWarningAlert]}><Text style={[styles.expenseOverAlertText, styles.expenseWarningAlertText]}>接近上限：{isYear ? "年度" : "本月"}生活支出已達生活金額 {expenseAlert.usagePercent}%</Text></View> : null}
        {expenseAlert.status === "over" ? <View style={styles.expenseOverAlert}><Text style={styles.expenseOverAlertText}>超標警示：{isYear ? "年度" : "本月"}生活支出超過生活金額 {money(expenseAlert.overage)}</Text></View> : null}
        {!isYear ? <><View style={styles.livingDivider} /><Text style={[styles.monthDifference, differencePositive ? styles.monthDifferencePositive : styles.monthDifferenceNegative]}>{differencePositive ? "↑" : "↓"} 較上月 {differencePositive ? "增加" : "減少"} {money(Math.abs(difference))}</Text></> : null}
      </View>
    </View>
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
  const { transactions, isLoading } = useFinance();
  const years = availableYears(transactions);
  const [period, setPeriod] = useState<Period>("all");
  const [isYearMenuOpen, setIsYearMenuOpen] = useState(false);
  const filtered = useMemo(() => transactionsForPeriod(transactions, period), [transactions, period]);
  const summary = useMemo(() => summaryFor(filtered), [filtered]);
  const categories = useMemo(() => categoryTotalsFor(filtered), [filtered]);
  const points = useMemo(() => trendPointsFor(filtered, period), [filtered, period]);
  const annualExpenseInsights = useMemo(() => period === "all" ? annualExpenseInsightsFor(transactions) : {}, [transactions, period]);
  const firstYear = years[0] ?? new Date().getFullYear();
  const trendCopy = trendCopyFor(period);
  const monthComparison = useMemo(() => monthlyLivingComparison(transactions), [transactions]);

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image source={require("../../assets/images/icon.png")} style={styles.brandIcon} />
            <View>
              <Text style={styles.title}>財務總覽</Text>
              <Text style={styles.subtitle}>{period === "all" ? "全年度收支概況與趨勢分析" : `${period} 年度收支概況與趨勢分析`}</Text>
            </View>
          </View>
        </View>

        <View style={styles.segmentControl}>
          <Pressable onPress={() => { setPeriod("all"); setIsYearMenuOpen(false); }} style={[styles.segment, styles.allYearsSegment, period === "all" && styles.segmentSelected]}>
            <Text style={[styles.segmentText, period === "all" && styles.segmentTextSelected]}>全年度</Text>
          </Pressable>
          <View style={styles.yearPicker}>
            <Pressable onPress={() => setIsYearMenuOpen((value) => !value)} style={[styles.segment, styles.yearPickerButton, period !== "all" && styles.segmentSelected]}>
              <Text style={[styles.segmentText, period !== "all" && styles.segmentTextSelected]}>{period === "all" ? firstYear : period} 年度</Text>
              <Text style={[styles.yearPickerChevron, period !== "all" && styles.segmentTextSelected]}>{isYearMenuOpen ? "⌃" : "⌄"}</Text>
            </Pressable>
            {isYearMenuOpen ? (
              <View style={styles.yearMenu}>
                {years.map((year) => (
                  <Pressable key={year} onPress={() => { setPeriod(year); setIsYearMenuOpen(false); }} style={[styles.yearMenuItem, period === year && styles.yearMenuItemSelected]}>
                    <Text style={[styles.yearMenuText, period === year && styles.yearMenuTextSelected]}>{year} 年度</Text>
                    {period === year ? <Text style={styles.yearMenuCheck}>✓</Text> : null}
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.metricGrid}>
          <View style={styles.metricTopRow}>
            <View style={styles.metricColumn}>
              <MetricCard label="總收入" amount={isLoading ? "載入中" : money(summary.income)} tone="income" />
              <MetricCard label="總支出" amount={isLoading ? "載入中" : money(summary.expense)} tone="expense" />
            </View>
            {period === "all" ? <LivingAmountCard scope="year" amount={livingAmountFor(summary.income, summary.expense)} expense={summary.expense} /> : <LivingAmountCard amount={monthComparison.current.livingAmount} expense={monthComparison.current.expense} difference={monthComparison.difference} />}
          </View>
        </View>

        <Panel title="支出分類地圖" subtitle="依金額查看分類結構">
          <Treemap data={categories} />
        </Panel>

        {period === "all" ? (
          <Panel title={trendCopy.title} subtitle={trendCopy.subtitle}>
            <TrendLine points={points} showAnnualSummary annualExpenseInsights={annualExpenseInsights} />
          </Panel>
        ) : null}

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
  segmentControl: { flexDirection: "row", alignSelf: "flex-end", borderWidth: 1, borderColor: "#DED8CE", borderRadius: 12, backgroundColor: "#FFFFFF", marginTop: -48, position: "relative", zIndex: 20, elevation: 20 },
  segment: { paddingVertical: 9, paddingHorizontal: 14 },
  allYearsSegment: { borderTopLeftRadius: 11, borderBottomLeftRadius: 11 },
  segmentSelected: { backgroundColor: "#E8F1EC" },
  segmentText: { color: "#6E7871", fontSize: 12, fontWeight: "700" },
  segmentTextSelected: { color: "#0E6B56" },
  yearPicker: { position: "relative" },
  yearPickerButton: { flexDirection: "row", alignItems: "center", gap: 4, borderLeftWidth: 1, borderLeftColor: "#DED8CE", borderTopRightRadius: 11, borderBottomRightRadius: 11 },
  yearPickerChevron: { color: "#6E7871", fontSize: 14, lineHeight: 16, fontWeight: "900" },
  yearMenu: { position: "absolute", top: 45, right: 0, minWidth: 116, backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#DED8CE", overflow: "hidden", shadowColor: "#34473D", shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 12, zIndex: 30 },
  yearMenuItem: { minHeight: 43, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  yearMenuItemSelected: { backgroundColor: "#E8F1EC" },
  yearMenuText: { color: "#47534C", fontSize: 12, fontWeight: "800" },
  yearMenuTextSelected: { color: "#0E6B56" },
  yearMenuCheck: { color: "#0E6B56", fontSize: 13, fontWeight: "900" },
  metricGrid: { gap: 10, marginTop: 34 },
  metricTopRow: { flexDirection: "row", gap: 10 },
  metricColumn: { flex: 1, gap: 10 },
  metricCard: { borderRadius: 17, backgroundColor: "#FFFFFF", padding: 14, borderWidth: 1, borderColor: "#ECE7DE", minHeight: 112 },
  metricHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metricLabel: { color: "#657069", fontSize: 12, fontWeight: "800" },
  metricIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#E6F3ED" },
  metricIconExpense: { backgroundColor: "#F8E9E6" },
  metricIconText: { color: "#0E6B56", fontSize: 17, fontWeight: "900" },
  metricIconTextExpense: { color: "#C85F3A" },
  metricAmount: { color: "#0E6B56", fontSize: 22, lineHeight: 28, fontWeight: "900", marginTop: 18 },
  expenseAmount: { color: "#C85F3A" },
  livingCard: { flex: 1, borderRadius: 17, backgroundColor: "#EEF5F1", padding: 14, borderWidth: 1, borderColor: "#CEE1D8", minHeight: 278, justifyContent: "space-between" },
  annualLivingCard: { backgroundColor: "#EEF3FA", borderColor: "#D3DFEF" },
  livingHeading: { flexDirection: "row", justifyContent: "space-between", gap: 7 },
  livingLabel: { color: "#34473D", fontSize: 13, fontWeight: "900" },
  livingFormula: { color: "#6D7B72", fontSize: 10, marginTop: 4 },
  livingIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#DCEDE5", alignItems: "center", justifyContent: "center" },
  livingAmount: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  livingAmountPositive: { color: "#0E6B56" },
  livingAmountNegative: { color: "#C85F3A" },
  livingHint: { color: "#6D7B72", fontSize: 10, lineHeight: 15, marginTop: 5 },
  expenseComparisonRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginTop: 9 },
  expenseComparisonDetail: { alignItems: "flex-end" },
  expenseComparisonLabel: { color: "#6D7B72", fontSize: 9, fontWeight: "800" },
  expenseComparisonAmount: { color: "#34473D", fontSize: 12, lineHeight: 16, fontWeight: "900", marginTop: 2 },
  expenseComparisonPositive: { color: "#0E6B56" },
  expenseComparisonNegative: { color: "#C85F3A" },
  expenseShareText: { color: "#587066", fontSize: 10, fontWeight: "800", marginTop: 6 },
  expenseOverAlert: { marginTop: 7, borderRadius: 8, backgroundColor: "#FBE0D7", paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: "#EDB4A3" },
  expenseOverAlertText: { color: "#B5472C", fontSize: 10, lineHeight: 14, fontWeight: "900" },
  expenseWarningAlert: { backgroundColor: "#FFF0C8", borderColor: "#E9C46A" },
  expenseWarningAlertText: { color: "#8A5E05" },
  livingDivider: { height: 1, backgroundColor: "#D6E5DD", marginVertical: 9 },
  monthDifference: { fontSize: 10, lineHeight: 15, fontWeight: "900", marginTop: 7 },
  monthDifferencePositive: { color: "#0E6B56" },
  monthDifferenceNegative: { color: "#C85F3A" },
  panel: { borderRadius: 20, backgroundColor: "#FFFFFF", padding: 16, borderWidth: 1, borderColor: "#ECE7DE" },
  panelHeading: { marginBottom: 14 },
  panelTitle: { color: "#1F2421", fontSize: 19, fontWeight: "900" },
  panelSubtitle: { color: "#7A837D", fontSize: 12, marginTop: 3 },
});
