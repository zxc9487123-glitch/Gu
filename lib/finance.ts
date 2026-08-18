export type TransactionType = "income" | "expense";

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
};

export type TransactionFilters = {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  minimumAmount?: number;
  maximumAmount?: number;
};

export type TransactionSort = {
  field: "date" | "amount";
  direction: "ascending" | "descending";
};

export type Category = {
  name: string;
  color: string;
  type: TransactionType;
};

export type CategoryTotal = Category & {
  amount: number;
  ratio: number;
};

export type CategoryRankTrend = {
  currentRank: number | null;
  previousRank: number | null;
  direction: "up" | "down" | "same" | "new" | "inactive";
  change: number | null;
};

export type MonthlyExpenseRanking = {
  key: string;
  label: string;
  rankings: CategoryTotal[];
};

export type MonthPoint = {
  label: string;
  income: number;
  expense: number;
  balance: number;
};

export type AnnualSummaryPoint = MonthPoint & {
  net: number;
  incomeChangePercent: number | null;
  expenseChangePercent: number | null;
  netChangePercent: number | null;
};

export type YearExpenseInsight = {
  averageMonthlyExpense: number;
  highestExpenseMonth: { label: string; amount: number } | null;
};

export const EXPENSE_CATEGORIES: Category[] = [
  { name: "餐飲／食品", color: "#C76867", type: "expense" },
  { name: "購物", color: "#D39A2E", type: "expense" },
  { name: "娛樂／訂閱", color: "#C85F3A", type: "expense" },
  { name: "網購", color: "#28647C", type: "expense" },
  { name: "交通／Uber", color: "#777A9D", type: "expense" },
  { name: "旅遊／住宿交通", color: "#87925B", type: "expense" },
  { name: "繳費／帳單", color: "#9D637E", type: "expense" },
  { name: "現金提款", color: "#247667", type: "expense" },
  { name: "網路／3C服務", color: "#52A594", type: "expense" },
  { name: "其他支出", color: "#9AA5A0", type: "expense" },
];

export const INCOME_CATEGORIES: Category[] = [
  { name: "薪資", color: "#0E6B56", type: "income" },
  { name: "獎金", color: "#3E8C71", type: "income" },
  { name: "投資收益", color: "#558D7A", type: "income" },
  { name: "其他收入", color: "#78A896", type: "income" },
];

const EXPENSE_RANK_COLORS = ["#C64B42", "#DF7A31", "#B88A16"];
const OTHER_EXPENSE_COLOR = "#A3AAA5";

export const categoriesFor = (type: TransactionType) =>
  type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

export const money = (amount: number, showSign = false) => {
  const sign = showSign && amount > 0 ? "+" : "";
  return `${sign}NT$ ${Math.round(amount).toLocaleString("zh-TW")}`;
};

export const dateLabel = (date: string) => {
  const parsed = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("zh-TW", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(parsed);
};

export const currentDateInput = () => new Date().toISOString().slice(0, 10);

export const availableYears = (transactions: Transaction[]) => {
  const years = new Set(transactions.map((item) => new Date(`${item.date}T12:00:00`).getFullYear()));
  years.add(new Date().getFullYear());
  return [...years].sort((a, b) => b - a);
};

export const transactionsForPeriod = (transactions: Transaction[], period: "all" | number) =>
  period === "all"
    ? transactions
    : transactions.filter((item) => new Date(`${item.date}T12:00:00`).getFullYear() === period);

export const filteredTransactionsFor = (transactions: Transaction[], filters: TransactionFilters) =>
  transactions.filter((item) => {
    if (filters.category && item.category !== filters.category) return false;
    if (filters.dateFrom && item.date < filters.dateFrom) return false;
    if (filters.dateTo && item.date > filters.dateTo) return false;
    if (filters.minimumAmount !== undefined && item.amount < filters.minimumAmount) return false;
    if (filters.maximumAmount !== undefined && item.amount > filters.maximumAmount) return false;
    return true;
  });

export const sortTransactionsFor = (transactions: Transaction[], sort: TransactionSort) =>
  [...transactions].sort((left, right) => {
    const comparison = sort.field === "date"
      ? left.date.localeCompare(right.date) || left.id.localeCompare(right.id)
      : left.amount - right.amount || left.date.localeCompare(right.date) || left.id.localeCompare(right.id);
    return sort.direction === "ascending" ? comparison : -comparison;
  });

export const summaryFor = (transactions: Transaction[]) => {
  const income = transactions
    .filter((item) => item.type === "income")
    .reduce((total, item) => total + item.amount, 0);
  const expense = transactions
    .filter((item) => item.type === "expense")
    .reduce((total, item) => total + item.amount, 0);

  return { income, expense, net: income - expense };
};

export const categoryTotalsFor = (transactions: Transaction[]): CategoryTotal[] => {
  const expenseItems = transactions.filter((item) => item.type === "expense");
  const total = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const totalByName = expenseItems.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.category] = (accumulator[item.category] ?? 0) + item.amount;
    return accumulator;
  }, {});

  const rankedTotals = Object.entries(totalByName)
    .map(([name, amount]) => {
      const category = EXPENSE_CATEGORIES.find((item) => item.name === name) ?? {
        name,
        color: OTHER_EXPENSE_COLOR,
        type: "expense" as const,
      };
      return { ...category, amount, ratio: total === 0 ? 0 : amount / total };
    })
    .sort((a, b) => b.amount - a.amount);

  return rankedTotals.map((item, index) => ({
    ...item,
    color: EXPENSE_RANK_COLORS[index] ?? OTHER_EXPENSE_COLOR,
  }));
};

const categoryRanksFor = (transactions: Transaction[]) =>
  categoryTotalsFor(transactions).reduce<Record<string, number>>((ranks, category, index) => {
    ranks[category.name] = index + 1;
    return ranks;
  }, {});

export const categoryRankTrendsFor = (transactions: Transaction[], focusTransactions: Transaction[]): Record<string, CategoryRankTrend> => {
  const latestDate = focusTransactions.reduce<Date | null>((latest, transaction) => {
    const date = new Date(`${transaction.date}T12:00:00`);
    return latest === null || date > latest ? date : latest;
  }, null);
  if (latestDate === null) return {};

  const currentYear = latestDate.getFullYear();
  const currentMonth = latestDate.getMonth();
  const previousDate = new Date(currentYear, currentMonth - 1, 1);
  const previousYear = previousDate.getFullYear();
  const previousMonth = previousDate.getMonth();
  const belongsTo = (year: number, month: number) => (transaction: Transaction) => {
    const date = new Date(`${transaction.date}T12:00:00`);
    return date.getFullYear() === year && date.getMonth() === month && transaction.type === "expense";
  };
  const currentRanks = categoryRanksFor(transactions.filter(belongsTo(currentYear, currentMonth)));
  const previousRanks = categoryRanksFor(transactions.filter(belongsTo(previousYear, previousMonth)));
  const names = new Set([...Object.keys(currentRanks), ...Object.keys(previousRanks)]);

  return Object.fromEntries([...names].map((name) => {
    const currentRank = currentRanks[name] ?? null;
    const previousRank = previousRanks[name] ?? null;
    if (currentRank === null) return [name, { currentRank, previousRank, direction: "inactive", change: null } satisfies CategoryRankTrend];
    if (previousRank === null) return [name, { currentRank, previousRank, direction: "new", change: null } satisfies CategoryRankTrend];
    const change = previousRank - currentRank;
    return [name, { currentRank, previousRank, direction: change > 0 ? "up" : change < 0 ? "down" : "same", change: Math.abs(change) } satisfies CategoryRankTrend];
  }));
};

export const monthlyExpenseRankingsFor = (transactions: Transaction[]): MonthlyExpenseRanking[] => {
  const monthKeys = [...new Set(transactions.filter((transaction) => transaction.type === "expense").map((transaction) => transaction.date.slice(0, 7)))].sort();
  return monthKeys.slice(-6).map((key) => {
    const [, rawMonth] = key.split("-");
    return {
      key,
      label: `${Number(rawMonth)}月`,
      rankings: categoryTotalsFor(transactions.filter((transaction) => transaction.type === "expense" && transaction.date.startsWith(key))).slice(0, 3),
    };
  });
};

export const monthPointsFor = (transactions: Transaction[], period: "all" | number): MonthPoint[] => {
  const selectedYear = period === "all" ? new Date().getFullYear() : period;
  let runningBalance = 0;

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const monthTransactions = transactions.filter((item) => {
      const date = new Date(`${item.date}T12:00:00`);
      return date.getFullYear() === selectedYear && date.getMonth() === monthIndex;
    });
    const income = monthTransactions
      .filter((item) => item.type === "income")
      .reduce((total, item) => total + item.amount, 0);
    const expense = monthTransactions
      .filter((item) => item.type === "expense")
      .reduce((total, item) => total + item.amount, 0);
    runningBalance += income - expense;
    return { label: `${monthIndex + 1}月`, income, expense, balance: runningBalance };
  });
};

export const annualPointsFor = (transactions: Transaction[]): MonthPoint[] => {
  const totalsByYear = transactions.reduce<Record<number, { income: number; expense: number }>>((totals, transaction) => {
    const year = new Date(`${transaction.date}T12:00:00`).getFullYear();
    const total = totals[year] ?? { income: 0, expense: 0 };
    total[transaction.type] += transaction.amount;
    totals[year] = total;
    return totals;
  }, {});
  let runningBalance = 0;

  return Object.entries(totalsByYear)
    .map(([year, total]) => ({ year: Number(year), ...total }))
    .sort((a, b) => a.year - b.year)
    .map(({ year, income, expense }) => {
      runningBalance += income - expense;
      return { label: `${year}年`, income, expense, balance: runningBalance };
    });
};

export const trendPointsFor = (transactions: Transaction[], period: "all" | number) =>
  period === "all" ? annualPointsFor(transactions) : monthPointsFor(transactions, period);

const percentageChangeFor = (current: number, previous: number) =>
  previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100;

export const annualSummariesFor = (points: MonthPoint[]): AnnualSummaryPoint[] =>
  points.map((point, index) => {
    const previous = points[index - 1];
    const net = point.income - point.expense;
    const previousNet = previous ? previous.income - previous.expense : 0;
    return {
      ...point,
      net,
      incomeChangePercent: previous ? percentageChangeFor(point.income, previous.income) : null,
      expenseChangePercent: previous ? percentageChangeFor(point.expense, previous.expense) : null,
      netChangePercent: previous ? percentageChangeFor(net, previousNet) : null,
    };
  });

export const yearExpenseInsightFor = (transactions: Transaction[]): YearExpenseInsight => {
  const monthlyExpenses = Array.from({ length: 12 }, () => 0);
  transactions
    .filter((transaction) => transaction.type === "expense")
    .forEach((transaction) => {
      const month = new Date(`${transaction.date}T12:00:00`).getMonth();
      monthlyExpenses[month] += transaction.amount;
    });
  const totalExpense = monthlyExpenses.reduce((total, amount) => total + amount, 0);
  const highestAmount = Math.max(...monthlyExpenses);
  const highestIndex = monthlyExpenses.indexOf(highestAmount);

  return {
    averageMonthlyExpense: totalExpense / 12,
    highestExpenseMonth: highestAmount > 0 ? { label: `${highestIndex + 1}月`, amount: highestAmount } : null,
  };
};

export const annualExpenseInsightsFor = (transactions: Transaction[]): Record<string, YearExpenseInsight> => {
  const transactionsByYear = transactions.reduce<Record<number, Transaction[]>>((groups, transaction) => {
    const year = new Date(`${transaction.date}T12:00:00`).getFullYear();
    (groups[year] ??= []).push(transaction);
    return groups;
  }, {});

  return Object.fromEntries(
    Object.entries(transactionsByYear).map(([year, items]) => [`${year}年`, yearExpenseInsightFor(items)]),
  );
};

export const sortedTransactions = (transactions: Transaction[]) =>
  sortTransactionsFor(transactions, { field: "date", direction: "descending" });
