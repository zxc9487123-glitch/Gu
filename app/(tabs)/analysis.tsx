import { ScrollView, StyleSheet, Text, View } from "react-native";

import { DonutChart } from "@/components/finance-visuals";
import { ScreenContainer } from "@/components/screen-container";
import { useFinance } from "@/hooks/use-finance";
import { categoryTotalsFor, money } from "@/lib/finance";

export default function AnalysisScreen() {
  const { transactions } = useFinance();
  const categories = categoryTotalsFor(transactions);
  const topThree = categories.slice(0, 3);

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>花費分析</Text>
          <Text style={styles.subtitle}>查看累積支出的分類排行與結構。</Text>
        </View>
        <View style={styles.highlightCard}>
          <Text style={styles.highlightEyebrow}>最大支出分類</Text>
          <Text style={styles.highlightTitle}>{topThree[0]?.name ?? "尚無資料"}</Text>
          <Text style={styles.highlightValue}>{topThree[0] ? money(topThree[0].amount) : "新增交易後顯示"}</Text>
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>分類佔比</Text>
          <Text style={styles.panelSubtitle}>依所有已記錄支出計算</Text>
          <DonutChart data={categories} />
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>支出排行</Text>
          <View style={styles.rankList}>
            {categories.length === 0 ? <Text style={styles.emptyText}>尚無支出資料。</Text> : categories.map((item, index) => (
              <View key={item.name} style={styles.rankRow}>
                <Text style={styles.rankNumber}>{String(index + 1).padStart(2, "0")}</Text>
                <View style={[styles.rankDot, { backgroundColor: item.color }]} />
                <Text style={styles.rankName}>{item.name}</Text>
                <Text style={styles.rankAmount}>{money(item.amount)}</Text>
              </View>
            ))}
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
  rankDot: { width: 10, height: 10, borderRadius: 5, marginRight: 9 },
  rankName: { color: "#38443D", flex: 1, fontSize: 14, fontWeight: "700" },
  rankAmount: { color: "#1F2421", fontSize: 13, fontWeight: "900" },
  emptyText: { color: "#7A837D", fontSize: 13, paddingVertical: 14 },
});
