import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";

import { DonutChart } from "@/components/finance-visuals";
import { ScreenContainer } from "@/components/screen-container";
import { useFinance } from "@/hooks/use-finance";
import { availableYears, categoryRankTrendsFor, categoryTotalsFor, money, transactionsForPeriod } from "@/lib/finance";

type Period = "all" | number;

export default function AnalysisScreen() {
  const { transactions } = useFinance();
  const years = availableYears(transactions);
  const [period, setPeriod] = useState<Period>("all");
  const [isYearMenuOpen, setIsYearMenuOpen] = useState(false);
  const filtered = useMemo(() => transactionsForPeriod(transactions, period), [transactions, period]);
  const categories = useMemo(() => categoryTotalsFor(filtered), [filtered]);
  const rankTrends = useMemo(() => categoryRankTrendsFor(transactions, filtered), [transactions, filtered]);
  const topThree = categories.slice(0, 3);
  const firstYear = years[0] ?? new Date().getFullYear();
  const scopeLabel = period === "all" ? "所有已記錄支出" : `${period} 年度支出`;

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>花費分析</Text>
          <Text style={styles.subtitle}>{period === "all" ? "查看累積支出的分類排行與結構。" : `查看 ${period} 年度支出的分類排行與結構。`}</Text>
        </View>
        <View style={styles.segmentControl}>
          <Pressable onPress={() => { setPeriod("all"); setIsYearMenuOpen(false); }} style={[styles.segment, styles.totalSegment, period === "all" && styles.segmentSelected]}>
            <Text style={[styles.segmentText, period === "all" && styles.segmentTextSelected]}>總年度</Text>
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
        <View style={styles.highlightCard}>
          <Text style={styles.highlightEyebrow}>最大支出分類</Text>
          <Text style={styles.highlightTitle}>{topThree[0]?.name ?? "尚無資料"}</Text>
          <Text style={styles.highlightValue}>{topThree[0] ? money(topThree[0].amount) : "新增交易後顯示"}</Text>
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>分類佔比</Text>
          <Text style={styles.panelSubtitle}>依{scopeLabel}計算</Text>
          <DonutChart data={categories} />
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>支出排行</Text>
          <View style={styles.rankList}>
            {categories.length === 0 ? <Text style={styles.emptyText}>尚無支出資料。</Text> : categories.map((item, index) => {
              const trend = rankTrends[item.name];
              const trendText = trend?.direction === "up" ? `↑ ${trend.change}` : trend?.direction === "down" ? `↓ ${trend.change}` : trend?.direction === "same" ? "→" : trend?.direction === "new" ? "新" : "—";
              const trendStyle = trend?.direction === "up" ? styles.rankTrendUp : trend?.direction === "down" ? styles.rankTrendDown : trend?.direction === "new" ? styles.rankTrendNew : styles.rankTrendNeutral;
              return (
                <View key={item.name} style={styles.rankRow}>
                  {index < 3 ? <View style={[styles.rankBadge, index === 0 ? styles.rankBadgeFirst : index === 1 ? styles.rankBadgeSecond : styles.rankBadgeThird]}><Text style={styles.rankBadgeText}>#{index + 1}</Text></View> : <Text style={styles.rankNumber}>{String(index + 1).padStart(2, "0")}</Text>}
                  <View style={[styles.rankDot, { backgroundColor: item.color }]} />
                  <Text style={styles.rankName}>{item.name}</Text>
                  <Text style={[styles.rankTrend, trendStyle]}>{trendText}</Text>
                  <Text style={styles.rankAmount}>{money(item.amount)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 34, gap: 15 },
  header: { marginTop: 4 },
  title: { color: "#1F2421", fontSize: 29, fontWeight: "900" },
  subtitle: { color: "#7A837D", marginTop: 5, fontSize: 13 },
  segmentControl: { flexDirection: "row", alignSelf: "flex-start", borderWidth: 1, borderColor: "#DED8CE", borderRadius: 12, backgroundColor: "#FFFFFF", position: "relative", zIndex: 20, elevation: 20 },
  segment: { paddingVertical: 9, paddingHorizontal: 14 },
  totalSegment: { borderTopLeftRadius: 11, borderBottomLeftRadius: 11 },
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
  highlightCard: { backgroundColor: "#0E6B56", borderRadius: 20, padding: 19 },
  highlightEyebrow: { color: "#BFE1D4", fontSize: 12, fontWeight: "800" },
  highlightTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "900", marginTop: 7 },
  highlightValue: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", marginTop: 5 },
  panel: { borderRadius: 20, backgroundColor: "#FFFFFF", padding: 16, borderWidth: 1, borderColor: "#ECE7DE" },
  panelTitle: { color: "#1F2421", fontSize: 19, fontWeight: "900" },
  panelSubtitle: { color: "#7A837D", fontSize: 12, marginTop: 3, marginBottom: 14 },
  rankList: { gap: 1 },
  rankRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  rankNumber: { color: "#929A94", fontSize: 12, fontWeight: "900", width: 28 },
  rankBadge: { width: 28, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center", marginRight: 1 },
  rankBadgeFirst: { backgroundColor: "#C64B42" },
  rankBadgeSecond: { backgroundColor: "#DF7A31" },
  rankBadgeThird: { backgroundColor: "#B88A16" },
  rankBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  rankDot: { width: 10, height: 10, borderRadius: 5, marginRight: 9 },
  rankName: { color: "#38443D", flex: 1, fontSize: 14, fontWeight: "700" },
  rankTrend: { minWidth: 28, fontSize: 11, fontWeight: "900", textAlign: "right", marginRight: 8 },
  rankTrendUp: { color: "#0E6B56" },
  rankTrendDown: { color: "#C64B42" },
  rankTrendNew: { color: "#315E96" },
  rankTrendNeutral: { color: "#929A94" },
  rankAmount: { color: "#1F2421", fontSize: 13, fontWeight: "900" },
  emptyText: { color: "#7A837D", fontSize: 13, paddingVertical: 14 },
});
