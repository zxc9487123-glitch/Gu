export type TransactionType = "income" | "expense";

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
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

export type MonthPoint = {
  label: string;
  income: number;
  expense: number;
  balance: number;
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

  return Object.entries(totalByName)
    .map(([name, amount]) => {
      const category = EXPENSE_CATEGORIES.find((item) => item.name === name) ?? {
        name,
        color: "#9AA5A0",
        type: "expense" as const,
      };
      return { ...category, amount, ratio: total === 0 ? 0 : amount / total };
    })
    .sort((a, b) => b.amount - a.amount);
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

export const sortedTransactions = (transactions: Transaction[]) =>
  [...transactions].sort((a, b) => new Date(`${b.date}T12:00:00`).getTime() - new Date(`${a.date}T12:00:00`).getTime());
