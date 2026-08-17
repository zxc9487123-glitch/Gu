import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { router } from "expo-router";

import { DonutChart, Treemap, TrendLine } from "@/components/finance-visuals";
import { ScreenContainer } from "@/components/screen-container";
import { useFinance } from "@/hooks/use-finance";
import { availableYears, categoryTotalsFor, money, monthPointsFor, summaryFor, transactionsForPeriod } from "@/lib/finance";
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
  const filtered = useMemo(() => transactionsForPeriod(transactions, period), [transactions, period]);
  const summary = useMemo(() => summaryFor(filtered), [filtered]);
  const categories = useMemo(() => categoryTotalsFor(filtered), [filtered]);
  const points = useMemo(() => monthPointsFor(filtered, period), [filtered, period]);
  const firstYear = years[0] ?? new Date().getFullYear();
  const trendCopy = trendCopyFor(period);

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
          <MetricCard label="總收入" amount={isLoading ? "載入中" : money(summary.income)} tone="income" />
          <MetricCard label="總支出" amount={isLoading ? "載入中" : money(summary.expense)} tone="expense" />
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
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 34 },
  metricCard: { width: "48.6%", borderRadius: 17, backgroundColor: "#FFFFFF", padding: 14, borderWidth: 1, borderColor: "#ECE7DE", minHeight: 112 },
  metricHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metricLabel: { color: "#657069", fontSize: 12, fontWeight: "800" },
  metricIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#E6F3ED" },
  metricIconExpense: { backgroundColor: "#F8E9E6" },
  metricIconText: { color: "#0E6B56", fontSize: 17, fontWeight: "900" },
  metricIconTextExpense: { color: "#C85F3A" },
  metricAmount: { color: "#0E6B56", fontSize: 22, lineHeight: 28, fontWeight: "900", marginTop: 18 },
  expenseAmount: { color: "#C85F3A" },
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
