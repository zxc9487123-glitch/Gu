import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { router } from "expo-router";

import { DonutChart, Treemap, TrendLine } from "@/components/finance-visuals";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useFinance } from "@/hooks/use-finance";
import { useLivingBudget } from "@/hooks/use-living-budget";
import { annualLivingBudgetFor } from "@/lib/annual-living";
import { budgetAlertFor, budgetProgressPercentFor, type BudgetAlert } from "@/lib/budget-status";
import { availableYears, categoryTotalsFor, money, monthPointsFor, summaryFor, transactionsForPeriod } from "@/lib/finance";
import { monthlyLivingComparison } from "@/lib/monthly-living";
import { trendCopyFor } from "@/lib/trend-copy";

type Period = "all" | number;

function MetricCard({ label, amount, tone }: { label: string; amount: string; tone: "income" | "expense" | "net" }) {
  const icon = tone === "income" ? "↗" : tone === "expense" ? "↘" : "◎";
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

function LivingAmountCard({ amount, expense, budget, difference }: { amount: number; expense: number; budget: number | null; difference: number }) {
  const positive = amount >= 0;
  const differencePositive = difference >= 0;
  const budgetRemaining = budget === null ? null : budget - expense;
  const budgetAlert: BudgetAlert | null = budget === null ? null : budgetAlertFor(expense, budget);
  const progressPercent = budgetAlert ? budgetProgressPercentFor(budgetAlert.usageRate) : 0;
  return (
    <View style={[styles.livingCard, budgetAlert?.status === "warning" && styles.livingCardWarning, budgetAlert?.status === "over" && styles.livingCardOver]}>
      <View style={styles.livingHeading}>
        <View>
          <Text style={styles.livingLabel}>生活金額</Text>
          <Text style={styles.livingFormula}>收入 ÷ 3 − 支出</Text>
        </View>
        <View style={styles.livingIcon}>
          <IconSymbol name="house.fill" size={24} color="#0E6B56" />
        </View>
      </View>
      <View>
        <Text style={[styles.livingAmount, positive ? styles.livingAmountPositive : styles.livingAmountNegative]}>{money(amount, positive)}</Text>
        <Text style={styles.livingHint}>{positive ? "可用於日常生活的金額" : "目前支出已超出生活金額"}</Text>
        <View style={styles.livingDivider} />
        {budget === null ? <Text style={styles.livingMeta}>尚未設定每月生活預算上限</Text> : <Text style={styles.livingMeta}>生活支出 {money(expense)} ／上限 {money(budget)}</Text>}
        {budgetRemaining !== null ? <Text style={[styles.livingMeta, budgetRemaining < 0 && styles.livingMetaNegative]}>{budgetRemaining >= 0 ? `距上限尚餘 ${money(budgetRemaining)}` : `超出上限 ${money(Math.abs(budgetRemaining))}`}</Text> : null}
        {budgetAlert ? <View style={styles.progressArea}><View style={styles.progressMetaRow}><Text style={styles.progressLabel}>預算使用進度</Text><Text style={[styles.progressPercent, budgetAlert.status === "warning" && styles.progressPercentWarning, budgetAlert.status === "over" && styles.progressPercentOver]}>{budgetAlert.usagePercent}%</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, budgetAlert.status === "warning" && styles.progressFillWarning, budgetAlert.status === "over" && styles.progressFillOver, { width: `${progressPercent}%` }]} /></View></View> : null}
        {budgetAlert ? <View style={[styles.budgetAlert, budgetAlert.status === "warning" && styles.budgetAlertWarning, budgetAlert.status === "over" && styles.budgetAlertOver]}><Text style={[styles.budgetAlertText, budgetAlert.status === "warning" && styles.budgetAlertTextWarning, budgetAlert.status === "over" && styles.budgetAlertTextOver]}>{budgetAlert.status === "normal" ? budgetAlert.message : `注意：${budgetAlert.message}`}</Text></View> : null}
        <Text style={[styles.monthDifference, differencePositive ? styles.monthDifferencePositive : styles.monthDifferenceNegative]}>{differencePositive ? "↑" : "↓"} 較上月 {differencePositive ? "增加" : "減少"} {money(Math.abs(difference))}</Text>
      </View>
    </View>
  );
}

function AnnualLivingBudgetCard({ expense, monthlyBudget }: { expense: number; monthlyBudget: number | null }) {
  const annual = annualLivingBudgetFor(monthlyBudget, expense);
  const budgetAlert: BudgetAlert | null = annual.annualBudget === null ? null : budgetAlertFor(annual.annualExpense, annual.annualBudget);
  const progressPercent = budgetAlert ? budgetProgressPercentFor(budgetAlert.usageRate) : 0;
  return (
    <View style={[styles.livingCard, styles.annualCard, budgetAlert?.status === "warning" && styles.livingCardWarning, budgetAlert?.status === "over" && styles.livingCardOver]}>
      <View style={styles.livingHeading}>
        <View>
          <Text style={styles.livingLabel}>年度生活預算</Text>
          <Text style={styles.livingFormula}>每月上限 × 12</Text>
        </View>
        <View style={styles.annualIcon}><IconSymbol name="calendar" size={23} color="#315E96" /></View>
      </View>
      <View>
        <Text style={styles.annualAmount}>{money(annual.annualExpense)}</Text>
        <Text style={styles.livingHint}>本年度累積生活支出</Text>
        <View style={styles.livingDivider} />
        {annual.annualBudget === null ? <Text style={styles.livingMeta}>尚未設定每月生活預算上限</Text> : <Text style={styles.livingMeta}>年度預算 {money(annual.annualBudget)}</Text>}
        {annual.remaining !== null ? <Text style={[styles.livingMeta, annual.remaining < 0 && styles.livingMetaNegative]}>{annual.remaining >= 0 ? `年度預算尚餘 ${money(annual.remaining)}` : `年度預算超出 ${money(Math.abs(annual.remaining))}`}</Text> : null}
        {budgetAlert ? <View style={styles.progressArea}><View style={styles.progressMetaRow}><Text style={styles.progressLabel}>年度預算進度</Text><Text style={[styles.progressPercent, budgetAlert.status === "warning" && styles.progressPercentWarning, budgetAlert.status === "over" && styles.progressPercentOver]}>{budgetAlert.usagePercent}%</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, budgetAlert.status === "warning" && styles.progressFillWarning, budgetAlert.status === "over" && styles.progressFillOver, { width: `${progressPercent}%` }]} /></View></View> : null}
        {budgetAlert ? <View style={[styles.budgetAlert, budgetAlert.status === "warning" && styles.budgetAlertWarning, budgetAlert.status === "over" && styles.budgetAlertOver]}><Text style={[styles.budgetAlertText, budgetAlert.status === "warning" && styles.budgetAlertTextWarning, budgetAlert.status === "over" && styles.budgetAlertTextOver]}>{budgetAlert.status === "normal" ? budgetAlert.message.replace("每月", "年度") : `注意：${budgetAlert.message.replace("每月", "年度")}`}</Text></View> : null}
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
  const { monthlyBudget } = useLivingBudget();
  const years = availableYears(transactions);
  const [period, setPeriod] = useState<Period>("all");
  const filtered = useMemo(() => transactionsForPeriod(transactions, period), [transactions, period]);
  const summary = useMemo(() => summaryFor(filtered), [filtered]);
  const categories = useMemo(() => categoryTotalsFor(filtered), [filtered]);
  const points = useMemo(() => monthPointsFor(filtered, period), [filtered, period]);
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
          <Pressable onPress={() => setPeriod("all")} style={[styles.segment, period === "all" && styles.segmentSelected]}>
            <Text style={[styles.segmentText, period === "all" && styles.segmentTextSelected]}>全年度</Text>
          </Pressable>
          <Pressable onPress={() => setPeriod(firstYear)} style={[styles.segment, period !== "all" && styles.segmentSelected]}>
            <Text style={[styles.segmentText, period !== "all" && styles.segmentTextSelected]}>{firstYear} 年度</Text>
          </Pressable>
        </View>

        <View style={styles.metricGrid}>
          <View style={styles.metricTopRow}>
            <View style={styles.metricColumn}>
              <MetricCard label="總收入" amount={isLoading ? "載入中" : money(summary.income)} tone="income" />
              <MetricCard label="總支出" amount={isLoading ? "載入中" : money(summary.expense)} tone="expense" />
            </View>
            {period === "all" ? <AnnualLivingBudgetCard expense={summary.expense} monthlyBudget={monthlyBudget} /> : <LivingAmountCard amount={monthComparison.current.livingAmount} expense={monthComparison.current.expense} budget={monthlyBudget} difference={monthComparison.difference} />}
          </View>
          <View style={styles.netCard}>
            <Text style={styles.metricLabel}>淨結餘</Text>
            <Text style={styles.netAmount}>{isLoading ? "載入中" : money(summary.net, summary.net >= 0)}</Text>
          </View>
        </View>

        <Panel title="支出分類地圖" subtitle="依金額查看分類結構">
          <Treemap data={categories} />
        </Panel>

        <Panel title={trendCopy.title} subtitle={trendCopy.subtitle}>
          <TrendLine points={points} />
        </Panel>

        <Panel title="支出分類佔比" subtitle="各分類支出金額比例">
          <DonutChart data={categories} />
        </Panel>

        {!isLoading && transactions.length === 0 ? (
          <View style={styles.emptyPrompt}>
            <Text style={styles.emptyPromptTitle}>開始建立你的收支紀錄</Text>
            <Text style={styles.emptyPromptText}>新增第一筆收入或支出後，首頁圖表會依你的資料即時計算。</Text>
            <Pressable onPress={() => router.push("./add")} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>新增第一筆記帳</Text>
            </Pressable>
          </View>
        ) : null}
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
  segmentControl: { flexDirection: "row", alignSelf: "flex-end", borderWidth: 1, borderColor: "#DED8CE", borderRadius: 12, overflow: "hidden", backgroundColor: "#FFFFFF", marginTop: -48 },
  segment: { paddingVertical: 9, paddingHorizontal: 14 },
  segmentSelected: { backgroundColor: "#E8F1EC" },
  segmentText: { color: "#6E7871", fontSize: 12, fontWeight: "700" },
  segmentTextSelected: { color: "#0E6B56" },
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
  annualCard: { backgroundColor: "#EEF3FA", borderColor: "#D3DFEF" },
  livingCardWarning: { backgroundColor: "#FFF8E8", borderColor: "#F0C86A" },
  livingCardOver: { backgroundColor: "#FFF0EC", borderColor: "#E9A38F" },
  livingHeading: { flexDirection: "row", justifyContent: "space-between", gap: 7 },
  livingLabel: { color: "#34473D", fontSize: 13, fontWeight: "900" },
  livingFormula: { color: "#6D7B72", fontSize: 10, marginTop: 4 },
  livingIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#DCEDE5", alignItems: "center", justifyContent: "center" },
  annualIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#E0EBF8", alignItems: "center", justifyContent: "center" },
  livingAmount: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  livingAmountPositive: { color: "#0E6B56" },
  livingAmountNegative: { color: "#C85F3A" },
  annualAmount: { color: "#315E96", fontSize: 22, lineHeight: 28, fontWeight: "900" },
  livingHint: { color: "#6D7B72", fontSize: 10, lineHeight: 15, marginTop: 5 },
  livingDivider: { height: 1, backgroundColor: "#D6E5DD", marginVertical: 9 },
  livingMeta: { color: "#587066", fontSize: 10, lineHeight: 15 },
  livingMetaNegative: { color: "#C85F3A", fontWeight: "800" },
  progressArea: { marginTop: 8 },
  progressMetaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  progressLabel: { color: "#587066", fontSize: 10, fontWeight: "800" },
  progressPercent: { color: "#0E6B56", fontSize: 10, fontWeight: "900" },
  progressPercentWarning: { color: "#8A5E05" },
  progressPercentOver: { color: "#B5472C" },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: "#D9E7E0", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: "#0E6B56" },
  progressFillWarning: { backgroundColor: "#D39A2E" },
  progressFillOver: { backgroundColor: "#C85F3A" },
  budgetAlert: { marginTop: 7, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: "#E4F1EB" },
  budgetAlertWarning: { backgroundColor: "#FFF0C8" },
  budgetAlertOver: { backgroundColor: "#FBE0D7" },
  budgetAlertText: { color: "#0E6B56", fontSize: 10, fontWeight: "900", lineHeight: 14 },
  budgetAlertTextWarning: { color: "#8A5E05" },
  budgetAlertTextOver: { color: "#B5472C" },
  monthDifference: { fontSize: 10, lineHeight: 15, fontWeight: "900", marginTop: 7 },
  monthDifferencePositive: { color: "#0E6B56" },
  monthDifferenceNegative: { color: "#C85F3A" },
  netCard: { width: "100%", borderRadius: 17, backgroundColor: "#FFFFFF", padding: 14, borderWidth: 1, borderColor: "#ECE7DE" },
  netAmount: { color: "#0E6B56", fontSize: 26, lineHeight: 32, fontWeight: "900", marginTop: 8 },
  panel: { borderRadius: 20, backgroundColor: "#FFFFFF", padding: 16, borderWidth: 1, borderColor: "#ECE7DE" },
  panelHeading: { marginBottom: 14 },
  panelTitle: { color: "#1F2421", fontSize: 19, fontWeight: "900" },
  panelSubtitle: { color: "#7A837D", fontSize: 12, marginTop: 3 },
  emptyPrompt: { backgroundColor: "#EEF5F1", padding: 18, borderRadius: 18, alignItems: "center" },
  emptyPromptTitle: { color: "#1F2421", fontWeight: "900", fontSize: 16 },
  emptyPromptText: { color: "#657069", fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 6 },
  primaryButton: { marginTop: 14, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: "#0E6B56" },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 13 },
});
