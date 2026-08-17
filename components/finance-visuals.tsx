import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

import type { CategoryTotal, MonthPoint } from "@/lib/finance";

const PLOT_WIDTH = 316;
const PLOT_HEIGHT = 128;

function EmptyChart({ label }: { label: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );
}

export function Treemap({ data }: { data: CategoryTotal[] }) {
  if (data.length === 0) return <EmptyChart label="新增支出後，這裡會顯示分類結構" />;

  const [largest, ...rest] = data;
  const rightItems = rest.slice(0, 6);
  return (
    <View style={styles.treemap}>
      <View style={[styles.treemapLargest, { backgroundColor: largest.color }]}>
        <Text style={styles.treemapLargestLabel}>{largest.name}</Text>
        <Text style={styles.treemapLargestRatio}>{Math.round(largest.ratio * 100)}%</Text>
      </View>
      <View style={styles.treemapRight}>
        <View style={styles.treemapTopRow}>
          {rightItems.slice(0, 3).map((item) => (
            <TreemapBlock key={item.name} item={item} />
          ))}
        </View>
        <View style={styles.treemapBottomRow}>
          {rightItems.slice(3).map((item) => (
            <TreemapBlock key={item.name} item={item} compact />
          ))}
        </View>
      </View>
    </View>
  );
}

function TreemapBlock({ item, compact = false }: { item: CategoryTotal; compact?: boolean }) {
  return (
    <View style={[styles.treemapBlock, { backgroundColor: item.color, flex: Math.max(item.ratio, 0.15) }]}>
      <Text numberOfLines={2} style={[styles.treemapBlockLabel, compact && styles.treemapCompactLabel]}>
        {item.name}
      </Text>
      {!compact && <Text style={styles.treemapBlockRatio}>{Math.round(item.ratio * 100)}%</Text>}
    </View>
  );
}

export function TrendLine({ points }: { points: MonthPoint[] }) {
  const hasActivity = points.some((point) => point.income !== 0 || point.expense !== 0);
  if (!hasActivity) return <EmptyChart label="新增交易後，這裡會顯示年度收支趨勢" />;

  const values = points.map((point) => point.balance);
  const minimum = Math.min(...values, 0);
  const maximum = Math.max(...values, 1);
  const range = Math.max(maximum - minimum, 1);
  const plotPoints = values
    .map((value, index) => {
      const x = 6 + (index / Math.max(points.length - 1, 1)) * (PLOT_WIDTH - 12);
      const y = 10 + (1 - (value - minimum) / range) * (PLOT_HEIGHT - 20);
      return `${x},${y}`;
    })
    .join(" ");
  const labelCount = Math.min(points.length, 5);
  const labelIndexes = points.length === 1
    ? [0]
    : Array.from({ length: labelCount }, (_, index) => Math.round((index * (points.length - 1)) / (labelCount - 1)));

  return (
    <View>
      <Svg width="100%" height={PLOT_HEIGHT} viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`}>
        {[30, 64, 98].map((y) => (
          <Line key={y} x1="6" x2={PLOT_WIDTH - 6} y1={y} y2={y} stroke="#E5E2DC" strokeDasharray="3 5" />
        ))}
        <Polyline points={plotPoints} fill="none" stroke="#C85F3A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <View style={styles.monthLabels}>
        {labelIndexes.map((index) => (
          <Text key={index} style={styles.axisText}>{points[index]?.label}</Text>
        ))}
      </View>
    </View>
  );
}

export function DonutChart({ data }: { data: CategoryTotal[] }) {
  if (data.length === 0) return <EmptyChart label="尚無支出分類資料" />;

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <View style={styles.donutLayout}>
      <View style={styles.donutWrap}>
        <Svg width="132" height="132" viewBox="0 0 132 132">
          <Circle cx="66" cy="66" r={radius} stroke="#E9E7E2" strokeWidth="22" fill="none" />
          {data.map((item) => {
            const dash = Math.max(item.ratio * circumference - 2, 0);
            const segment = (
              <Circle
                key={item.name}
                cx="66"
                cy="66"
                r={radius}
                stroke={item.color}
                strokeWidth="22"
                fill="none"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                rotation="-90"
                origin="66,66"
              />
            );
            offset += item.ratio * circumference;
            return segment;
          })}
        </Svg>
        <View style={styles.donutCenter}>
          <Text style={styles.donutCenterLabel}>支出</Text>
          <Text style={styles.donutCenterText}>占比</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {data.slice(0, 6).map((item) => (
          <View key={item.name} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text numberOfLines={1} style={styles.legendName}>{item.name}</Text>
            <Text style={styles.legendRatio}>{Math.round(item.ratio * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: { minHeight: 120, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  emptyText: { color: "#7A837D", fontSize: 13, lineHeight: 20, textAlign: "center" },
  treemap: { height: 186, flexDirection: "row", gap: 5, borderRadius: 14, overflow: "hidden" },
  treemapLargest: { flex: 1.05, justifyContent: "center", alignItems: "center", padding: 10 },
  treemapLargestLabel: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", textAlign: "center" },
  treemapLargestRatio: { color: "#FFFFFF", fontSize: 25, fontWeight: "900", marginTop: 4 },
  treemapRight: { flex: 1.55, gap: 5 },
  treemapTopRow: { flex: 1.15, flexDirection: "row", gap: 5 },
  treemapBottomRow: { flex: 0.85, flexDirection: "row", gap: 5 },
  treemapBlock: { minWidth: 0, justifyContent: "center", alignItems: "center", padding: 5 },
  treemapBlockLabel: { color: "#FFFFFF", fontSize: 12, fontWeight: "800", textAlign: "center", lineHeight: 17 },
  treemapCompactLabel: { fontSize: 10, lineHeight: 14 },
  treemapBlockRatio: { color: "#FFFFFF", fontSize: 17, fontWeight: "900", marginTop: 2 },
  monthLabels: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6, marginTop: 4 },
  axisText: { color: "#7A837D", fontSize: 11 },
  donutLayout: { flexDirection: "row", alignItems: "center", gap: 12 },
  donutWrap: { width: 132, height: 132, alignItems: "center", justifyContent: "center" },
  donutCenter: { position: "absolute", alignItems: "center" },
  donutCenterLabel: { color: "#7A837D", fontSize: 11 },
  donutCenterText: { color: "#1F2421", fontSize: 14, fontWeight: "800" },
  legend: { flex: 1, gap: 6 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendName: { flex: 1, color: "#4C5650", fontSize: 12 },
  legendRatio: { color: "#1F2421", fontSize: 12, fontWeight: "800" },
});
