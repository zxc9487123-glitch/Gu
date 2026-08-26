import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IncomeExpenseTrend } from "@/components/finance-visuals";
import { useComparisonCardPreference } from "@/hooks/use-comparison-card-preference";
import { useFinance } from "@/hooks/use-finance";
import { availableYears, categoryRankTrendsFor, categoryTotalsFor, largestExpenseIncreaseFor, monthPointsFor, money, transactionsForPeriod, trendPointsFor, type TransactionPeriod } from "@/lib/finance";

type Period = TransactionPeriod;
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);

function MonthlyChange({ label, current, previous, type, hint }: { label: string; current: number; previous: number; type: "expense" | "balance"; hint?: string | null }) {
  const difference = current - previous;
  const isFavorable = type === "expense" ? difference <= 0 : difference >= 0;
  const tone = difference === 0 ? styles.changeNeutral : isFavorable ? styles.changeFavorable : styles.changeUnfavorable;
  const direction = difference > 0 ? "↑" : difference < 0 ? "↓" : "→";
  const changeText = previous === 0
    ? current === 0 ? "無可比較資料" : `${direction} 新增（無上月基期）`
    : `${direction} ${money(Math.abs(difference))}・${Math.abs((difference / previous) * 100).toFixed(1)}%`;

  return (
    <View style={styles.monthComparisonMetric}>
      <Text style={styles.monthComparisonLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.monthComparisonCurrent}>{money(current)}</Text>
      <Text numberOfLines={1} style={[styles.monthComparisonValue, tone]}>{changeText}</Text>
      {hint ? <Text numberOfLines={2} style={styles.balanceDeclineHint}>{hint}</Text> : null}
    </View>
  );
}

export function AnalysisContent({ onCategoryPress }: { onCategoryPress?: (category: string) => void }) {
  const router = useRouter();
  const { transactions } = useFinance();
  const years = availableYears(transactions);
  const [period, setPeriod] = useState<Period>("all");
  const [isYearMenuOpen, setIsYearMenuOpen] = useState(false);
  const [isMonthSwitcherExpanded, setIsMonthSwitcherExpanded] = useState(false);
  const [isComparisonSettingsVisible, setIsComparisonSettingsVisible] = useState(false);
  const { visibleComparisonCards, setComparisonCardVisible } = useComparisonCardPreference();
  const selectedMonth = typeof period === "object" ? period : null;
  const firstYear = years[0] ?? new Date().getFullYear();
  const selectedYear = typeof period === "number" ? period : selectedMonth?.year ?? firstYear;
  const isAllPeriod = period === "all";
  const filtered = useMemo(() => transactionsForPeriod(transactions, period), [transactions, period]);
  const categories = useMemo(() => categoryTotalsFor(filtered), [filtered]);
  const rankTrends = useMemo(() => categoryRankTrendsFor(transactions, filtered), [transactions, filtered]);
  const monthlyIncomeExpense = useMemo(() => monthPointsFor(transactions, selectedYear), [selectedYear, transactions]);
  const displayedTrendPoints = useMemo(() => trendPointsFor(transactions, isAllPeriod ? "all" : selectedYear), [isAllPeriod, selectedYear, transactions]);
  const previousYearMonthlyIncomeExpense = useMemo(() => monthPointsFor(transactions, selectedYear - 1), [selectedYear, transactions]);
  const comparisonMonthIndex = selectedMonth
    ? selectedMonth.month - 1
    : monthlyIncomeExpense.reduce((latestIndex, point, index) => point.income !== 0 || point.expense !== 0 ? index : latestIndex, -1);
  const comparisonCurrent = comparisonMonthIndex >= 0 ? monthlyIncomeExpense[comparisonMonthIndex] : null;
  const comparisonPrevious = comparisonMonthIndex > 0
    ? monthlyIncomeExpense[comparisonMonthIndex - 1]
    : comparisonMonthIndex === 0 ? previousYearMonthlyIncomeExpense[11] : null;
  const comparisonCurrentTransactions = useMemo(() => comparisonMonthIndex >= 0
    ? transactionsForPeriod(transactions, { year: selectedYear, month: comparisonMonthIndex + 1 })
    : [], [comparisonMonthIndex, selectedYear, transactions]);
  const comparisonPreviousTransactions = useMemo(() => {
    if (comparisonMonthIndex > 0) return transactionsForPeriod(transactions, { year: selectedYear, month: comparisonMonthIndex });
    if (comparisonMonthIndex === 0) return transactionsForPeriod(transactions, { year: selectedYear - 1, month: 12 });
    return [];
  }, [comparisonMonthIndex, selectedYear, transactions]);
  const balanceDeclineHint = useMemo(() => {
    if (!comparisonCurrent || !comparisonPrevious) return null;
    const currentBalance = comparisonCurrent.income - comparisonCurrent.expense;
    const previousBalance = comparisonPrevious.income - comparisonPrevious.expense;
    if (currentBalance >= previousBalance) return null;
    const mainExpenseIncrease = largestExpenseIncreaseFor(comparisonCurrentTransactions, comparisonPreviousTransactions);
    return mainExpenseIncrease
      ? `主要支出：${mainExpenseIncrease.category} +${money(mainExpenseIncrease.increase)}`
      : "本月支出未增加，主要受到收入減少影響";
  }, [comparisonCurrent, comparisonCurrentTransactions, comparisonPrevious, comparisonPreviousTransactions]);
  const periodSubtitle = isAllPeriod
    ? "查看累積支出的分類排行。"
    : selectedMonth
      ? `查看 ${selectedMonth.year} 年 ${selectedMonth.month} 月支出的分類排行。`
      : `查看 ${period} 年度支出的分類排行。`;
  const trendTitle = isAllPeriod ? "全年度收入與消費趨勢" : `${selectedYear} 年收入與消費趨勢`;
  const trendSubtitle = isAllPeriod ? "顯示各年度收入與消費金額的變化。" : "顯示每月收入與消費金額的變化。";
  const selectMonth = (month: number) => {
    setPeriod({ year: selectedYear, month });
    setIsYearMenuOpen(false);
    setIsMonthSwitcherExpanded(false);
  };

  return (
        <View style={styles.screen}>
      <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.subtitle}>{periodSubtitle}</Text>
        </View>
        <View style={styles.segmentControl}>
          <Pressable onPress={() => { setPeriod("all"); setIsYearMenuOpen(false); }} style={[styles.segment, styles.totalSegment, isAllPeriod && styles.segmentSelected]}>
            <Text style={[styles.segmentText, isAllPeriod && styles.segmentTextSelected]}>總年度</Text>
          </Pressable>
          <View style={styles.yearPicker}>
            <Pressable onPress={() => setIsYearMenuOpen((value) => !value)} style={[styles.segment, styles.yearPickerButton, !isAllPeriod && styles.segmentSelected]}>
              <Text style={[styles.segmentText, !isAllPeriod && styles.segmentTextSelected]}>{selectedYear} 年度</Text>
              <Text style={[styles.yearPickerChevron, !isAllPeriod && styles.segmentTextSelected]}>{isYearMenuOpen ? "⌃" : "⌄"}</Text>
            </Pressable>
            {isYearMenuOpen ? (
              <View style={styles.yearMenu}>
                {years.map((year) => (
                  <Pressable key={year} onPress={() => { setPeriod(year); setIsYearMenuOpen(false); }} style={[styles.yearMenuItem, selectedYear === year && !isAllPeriod && styles.yearMenuItemSelected]}>
                    <Text style={[styles.yearMenuText, selectedYear === year && !isAllPeriod && styles.yearMenuTextSelected]}>{year} 年度</Text>
                    {selectedYear === year && !isAllPeriod ? <Text style={styles.yearMenuCheck}>✓</Text> : null}
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.monthSwitcher}>
          <View style={styles.monthSwitcherHeader}>
            <Text style={styles.monthSwitcherTitle}>快速月份</Text>
            <View style={styles.monthSwitcherActions}>
              <Text style={styles.monthSwitcherYear}>{selectedYear} 年</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="展開或收合快速月份" onPress={() => setIsMonthSwitcherExpanded((value) => !value)} style={({ pressed }) => [styles.monthSwitcherIconButton, pressed && styles.monthSwitcherIconButtonPressed]}>
                <Text style={styles.monthSwitcherChevron}>{isMonthSwitcherExpanded ? "⌃" : "⌄"}</Text>
              </Pressable>
            </View>
          </View>
          {isMonthSwitcherExpanded ? <View style={styles.monthGrid}>
            {MONTH_OPTIONS.map((month) => {
              const isSelected = selectedMonth?.year === selectedYear && selectedMonth.month === month;
              return (
                <Pressable key={month} onPress={() => selectMonth(month)} style={({ pressed }) => [styles.monthButton, isSelected && styles.monthButtonSelected, pressed && styles.monthButtonPressed]}>
                  <Text style={[styles.monthButtonText, isSelected && styles.monthButtonTextSelected]}>{month}月</Text>
                </Pressable>
              );
            })}
          </View> : null}
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>支出排行</Text>
          <View style={styles.rankList}>
            {categories.length === 0 ? <Text style={styles.emptyText}>尚無支出資料。</Text> : categories.slice(0, 3).map((item, index) => {
              const trend = rankTrends[item.name];
              const trendText = trend?.direction === "up" ? `↑ 第${trend.previousRank}名→第${trend.currentRank}名` : trend?.direction === "down" ? `↓ 第${trend.previousRank}名→第${trend.currentRank}名` : trend?.direction === "same" ? `→ 維持第${trend.currentRank}名` : trend?.direction === "new" ? `新上榜第${trend.currentRank}名` : trend?.direction === "inactive" ? `上月第${trend.previousRank}名` : "尚無月度比較";
              const trendStyle = trend?.direction === "up" ? styles.rankTrendUp : trend?.direction === "down" ? styles.rankTrendDown : trend?.direction === "new" ? styles.rankTrendNew : styles.rankTrendNeutral;
              return (
                <Pressable key={item.name} onPress={() => onCategoryPress ? onCategoryPress(item.name) : router.push({ pathname: "/transactions", params: { category: item.name } })} style={({ pressed }) => [styles.rankRow, pressed && styles.rankRowPressed]}>
                  {index < 3 ? <View style={[styles.rankBadge, index === 0 ? styles.rankBadgeFirst : index === 1 ? styles.rankBadgeSecond : styles.rankBadgeThird]}><Text style={styles.rankBadgeText}>#{index + 1}</Text></View> : <Text style={styles.rankNumber}>{String(index + 1).padStart(2, "0")}</Text>}
                  <View style={[styles.rankDot, { backgroundColor: item.color }]} />
                  <View style={styles.rankCopy}><Text style={styles.rankName}>{item.name}</Text><Text numberOfLines={1} style={[styles.rankTrend, trendStyle]}>{trendText}</Text></View>
                  <Text style={styles.rankAmount}>{money(item.amount)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{trendTitle}</Text>
          <Text style={styles.panelSubtitle}>{trendSubtitle}</Text>
          <IncomeExpenseTrend points={displayedTrendPoints} />
          {comparisonCurrent && comparisonPrevious ? (
            <View style={styles.monthComparison}>
              <View style={styles.monthComparisonHeader}>
                <View style={styles.monthComparisonHeaderCopy}>
                  <Text style={styles.monthComparisonTitle}>相較上月</Text>
                  <Text style={styles.monthComparisonPeriod}>{comparisonCurrent.label} vs {comparisonPrevious.label}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="自訂比較卡顯示設定" onPress={() => setIsComparisonSettingsVisible(true)} style={({ pressed }) => [styles.comparisonSettingsButton, pressed && styles.comparisonSettingsButtonPressed]}>
                  <Text style={styles.comparisonSettingsIcon}>⚙</Text>
                </Pressable>
              </View>
              <View style={styles.monthComparisonMetrics}>
                {visibleComparisonCards.expense ? <MonthlyChange label="消費" current={comparisonCurrent.expense} previous={comparisonPrevious.expense} type="expense" /> : null}
                {visibleComparisonCards.balance ? <MonthlyChange label="淨結餘" current={comparisonCurrent.income - comparisonCurrent.expense} previous={comparisonPrevious.income - comparisonPrevious.expense} type="balance" hint={balanceDeclineHint} /> : null}
                {!visibleComparisonCards.expense && !visibleComparisonCards.balance ? <Text style={styles.noComparisonCards}>尚未選擇比較卡片，請點選右上角設定。</Text> : null}
              </View>
            </View>
          ) : null}
        </View>
      </View>
      <Modal transparent visible={isComparisonSettingsVisible} animationType="fade" onRequestClose={() => setIsComparisonSettingsVisible(false)}>
        <View style={styles.comparisonSettingsModal}>
          <Pressable accessibilityRole="button" accessibilityLabel="關閉比較卡設定" onPress={() => setIsComparisonSettingsVisible(false)} style={styles.comparisonSettingsBackdrop} />
          <View style={styles.comparisonSettingsSheet}>
            <View style={styles.drawerHandle} />
            <View style={styles.comparisonSettingsHeader}>
              <View style={styles.comparisonSettingsCopy}><Text style={styles.comparisonSettingsTitle}>比較卡設定</Text><Text style={styles.comparisonSettingsSubtitle}>選擇要顯示在相較上月區塊的卡片。</Text></View>
              <Pressable accessibilityRole="button" onPress={() => setIsComparisonSettingsVisible(false)} style={({ pressed }) => [styles.comparisonSettingsDoneButton, pressed && styles.comparisonSettingsButtonPressed]}><Text style={styles.comparisonSettingsDoneText}>完成</Text></Pressable>
            </View>
            {(["expense", "balance"] as const).map((key) => {
              const isVisible = visibleComparisonCards[key];
              const label = key === "expense" ? "消費" : "淨結餘";
              const description = key === "expense" ? "顯示消費差額與變化比例" : "顯示淨結餘與下降原因提示";
              return <Pressable key={key} accessibilityRole="switch" accessibilityLabel={`顯示${label}比較卡`} accessibilityState={{ checked: isVisible }} onPress={() => void setComparisonCardVisible(key, !isVisible)} style={({ pressed }) => [styles.comparisonOption, pressed && styles.comparisonOptionPressed]}><View style={styles.comparisonOptionCopy}><Text style={styles.comparisonOptionTitle}>{label}</Text><Text style={styles.comparisonOptionDescription}>{description}</Text></View><View style={[styles.comparisonToggle, isVisible && styles.comparisonToggleActive]}><View style={[styles.comparisonToggleKnob, isVisible && styles.comparisonToggleKnobActive]} /></View></Pressable>;
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function AnalysisScreen() {
  return <ScreenContainer containerClassName="bg-background"><AnalysisContent /></ScreenContainer>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FFF4F8", flex: 1, overflow: "hidden" },
  content: { flex: 1, gap: 6, overflow: "hidden", padding: 10, paddingBottom: 6 },
  header: { marginTop: 1 },
  title: { color: "#1F2421", fontSize: 22, fontWeight: "900" },
  subtitle: { color: "#826F80", marginTop: 2, fontSize: 10 },
  segmentControl: { flexDirection: "row", alignSelf: "flex-start", borderWidth: 1, borderColor: "#E3D7E7", borderRadius: 12, backgroundColor: "#FCF8FF", position: "relative", zIndex: 20, elevation: 20 },
  segment: { paddingVertical: 7, paddingHorizontal: 11 },
  totalSegment: { borderTopLeftRadius: 11, borderBottomLeftRadius: 11 },
  segmentSelected: { backgroundColor: "#F0E8FA" },
  segmentText: { color: "#806F84", fontSize: 12, fontWeight: "700" },
  segmentTextSelected: { color: "#7653A8" },
  yearPicker: { position: "relative" },
  yearPickerButton: { flexDirection: "row", alignItems: "center", gap: 4, borderLeftWidth: 1, borderLeftColor: "#E3D7E7", borderTopRightRadius: 11, borderBottomRightRadius: 11 },
  yearPickerChevron: { color: "#806F84", fontSize: 14, lineHeight: 16, fontWeight: "900" },
  yearMenu: { position: "absolute", top: 45, right: 0, minWidth: 116, backgroundColor: "#FFFCFF", borderRadius: 12, borderWidth: 1, borderColor: "#E3D7E7", overflow: "hidden", shadowColor: "#5F496C", shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 12, zIndex: 30 },
  yearMenuItem: { minHeight: 43, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  yearMenuItemSelected: { backgroundColor: "#F0E8FA" },
  yearMenuText: { color: "#5B4D62", fontSize: 12, fontWeight: "800" },
  yearMenuTextSelected: { color: "#7653A8" },
  yearMenuCheck: { color: "#7653A8", fontSize: 13, fontWeight: "900" },
  monthSwitcher: { backgroundColor: "#FCF9FF", borderColor: "#E4DAEE", borderRadius: 12, borderWidth: 1, padding: 8, position: "relative", zIndex: 15, elevation: 15 },
  monthSwitcherHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  monthSwitcherTitle: { color: "#5B4D62", fontSize: 12, fontWeight: "900" },
  monthSwitcherActions: { alignItems: "center", flexDirection: "row", gap: 8 },
  monthSwitcherYear: { color: "#7653A8", fontSize: 11, fontWeight: "800" },
  monthSwitcherIconButton: { alignItems: "center", backgroundColor: "#F0E8FA", borderRadius: 12, height: 24, justifyContent: "center", width: 24 },
  monthSwitcherIconButtonPressed: { opacity: 0.72 },
  monthSwitcherChevron: { color: "#7653A8", fontSize: 15, fontWeight: "900", marginTop: -2 },
  monthGrid: { backgroundColor: "#FFFCFF", borderColor: "#E4DAEE", borderRadius: 12, borderWidth: 1, elevation: 14, flexDirection: "row", flexWrap: "wrap", gap: 6, left: 0, padding: 9, position: "absolute", right: 0, shadowColor: "#5F496C", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 12, top: 42, zIndex: 30 },
  monthButton: { alignItems: "center", backgroundColor: "#FFF5F8", borderColor: "#E8DBE6", borderRadius: 7, borderWidth: 1, flexBasis: "23.5%", flexGrow: 1, justifyContent: "center", minHeight: 28, paddingHorizontal: 4 },
  monthButtonSelected: { backgroundColor: "#F2EAFE", borderColor: "#9C7AC7" },
  monthButtonPressed: { opacity: 0.7 },
  monthButtonText: { color: "#806F84", fontSize: 11, fontWeight: "800" },
  monthButtonTextSelected: { color: "#7653A8" },
  panel: { borderRadius: 14, backgroundColor: "#FFFCFE", padding: 8, borderWidth: 1, borderColor: "#EADDE6" },
  panelTitle: { color: "#3F3448", fontSize: 16, fontWeight: "900" },
  panelSubtitle: { color: "#826F80", fontSize: 10, marginTop: 1, marginBottom: 4 },
  rankList: { gap: 1 },
  rankRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4, borderRadius: 8 },
  rankRowPressed: { backgroundColor: "#F5ECFA", opacity: 0.86, transform: [{ scale: 0.985 }] },
  rankNumber: { color: "#929A94", fontSize: 12, fontWeight: "900", width: 28 },
  rankBadge: { width: 28, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center", marginRight: 1 },
  rankBadgeFirst: { backgroundColor: "#C64B42" },
  rankBadgeSecond: { backgroundColor: "#DF7A31" },
  rankBadgeThird: { backgroundColor: "#B88A16" },
  rankBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  rankDot: { width: 10, height: 10, borderRadius: 5, marginRight: 9 },
  rankCopy: { flex: 1, minWidth: 0 },
  rankName: { color: "#4B3E55", fontSize: 12, fontWeight: "700" },
  rankTrend: { fontSize: 10, fontWeight: "800", marginTop: 2 },
  rankTrendUp: { color: "#7653A8" },
  rankTrendDown: { color: "#C64B42" },
  rankTrendNew: { color: "#8A6BAE" },
  rankTrendNeutral: { color: "#9A8B9B" },
  rankAmount: { color: "#3F3448", fontSize: 13, fontWeight: "900" },
  monthComparison: { borderTopColor: "#E8DFEB", borderTopWidth: 1, marginTop: 5, paddingTop: 6 },
  monthComparisonHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  monthComparisonHeaderCopy: { alignItems: "center", flex: 1, flexDirection: "row", gap: 7, minWidth: 0 },
  monthComparisonTitle: { color: "#56475F", fontSize: 11, fontWeight: "900" },
  monthComparisonPeriod: { color: "#826F80", fontSize: 10, fontWeight: "700" },
  comparisonSettingsButton: { alignItems: "center", backgroundColor: "#F0E8FA", borderRadius: 12, height: 24, justifyContent: "center", marginLeft: 8, width: 24 },
  comparisonSettingsButtonPressed: { opacity: 0.7 },
  comparisonSettingsIcon: { color: "#7653A8", fontSize: 14, fontWeight: "900", lineHeight: 17 },
  monthComparisonMetrics: { flexDirection: "row", gap: 8, marginTop: 4 },
  monthComparisonMetric: { backgroundColor: "#FAF5FE", borderRadius: 8, flex: 1, minWidth: 0, paddingHorizontal: 6, paddingVertical: 4 },
  monthComparisonLabel: { color: "#826F80", fontSize: 9, fontWeight: "800" },
  monthComparisonCurrent: { color: "#4B3E55", fontSize: 10, fontWeight: "900", marginTop: 1 },
  monthComparisonValue: { fontSize: 9, fontWeight: "900", marginTop: 2 },
  balanceDeclineHint: { color: "#A95676", fontSize: 8, fontWeight: "800", lineHeight: 12, marginTop: 4 },
  noComparisonCards: { color: "#826F80", fontSize: 10, fontWeight: "700", paddingVertical: 5 },
  changeFavorable: { color: "#5A7F72" },
  changeUnfavorable: { color: "#C96B8B" },
  changeNeutral: { color: "#826F80" },
  comparisonSettingsModal: { flex: 1, justifyContent: "flex-end" },
  comparisonSettingsBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(22, 30, 26, 0.42)" },
  comparisonSettingsSheet: { backgroundColor: "#FFFCFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 26, paddingHorizontal: 20, paddingTop: 9 },
  drawerHandle: { alignSelf: "center", backgroundColor: "#D8CBE2", borderRadius: 2, height: 4, marginBottom: 14, width: 38 },
  comparisonSettingsHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  comparisonSettingsCopy: { flex: 1, minWidth: 0, paddingRight: 10 },
  comparisonSettingsTitle: { color: "#3F3448", fontSize: 18, fontWeight: "900" },
  comparisonSettingsSubtitle: { color: "#826F80", fontSize: 11, lineHeight: 16, marginTop: 3 },
  comparisonSettingsDoneButton: { alignItems: "center", backgroundColor: "#F0E8FA", borderRadius: 9, justifyContent: "center", minHeight: 32, paddingHorizontal: 10 },
  comparisonSettingsDoneText: { color: "#7653A8", fontSize: 12, fontWeight: "900" },
  comparisonOption: { alignItems: "center", backgroundColor: "#FFF5F8", borderColor: "#E8DBE6", borderRadius: 11, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 8, minHeight: 58, paddingHorizontal: 11, paddingVertical: 9 },
  comparisonOptionPressed: { opacity: 0.72 },
  comparisonOptionCopy: { flex: 1, minWidth: 0, paddingRight: 10 },
  comparisonOptionTitle: { color: "#4B3E55", fontSize: 12, fontWeight: "900" },
  comparisonOptionDescription: { color: "#826F80", fontSize: 10, marginTop: 3 },
  comparisonToggle: { backgroundColor: "#D7CBDD", borderRadius: 12, height: 24, justifyContent: "center", paddingHorizontal: 3, width: 42 },
  comparisonToggleActive: { alignItems: "flex-end", backgroundColor: "#7653A8" },
  comparisonToggleKnob: { backgroundColor: "#FFFFFF", borderRadius: 9, height: 18, width: 18 },
  comparisonToggleKnobActive: { backgroundColor: "#FFFFFF" },
  emptyText: { color: "#826F80", fontSize: 11, paddingVertical: 8 },
});
