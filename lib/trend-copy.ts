export type TrendPeriod = "all" | number;

export function trendCopyFor(period: TrendPeriod) {
  if (period === "all") {
    return { title: "年度趨勢", subtitle: "全年度收支變化" };
  }
  return { title: "月趨勢", subtitle: `${period} 年逐月淨現金流` };
}
