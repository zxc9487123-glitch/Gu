import * as XLSX from "xlsx";

import { currentDateInput, type Transaction, type TransactionType } from "./finance";

export type ImportDraft = Omit<Transaction, "id">;

export type ImportIssue = {
  row: number;
  message: string;
};

export type ExcelImportPreview = {
  valid: ImportDraft[];
  issues: ImportIssue[];
  scannedRows: number;
  worksheetName: string;
};

export type DeduplicationResult = {
  accepted: ImportDraft[];
  skipped: number;
};

const HEADER_ALIASES: Record<"date" | "type" | "category" | "amount" | "note", string[]> = {
  date: ["日期", "date"],
  type: ["類型", "收支類型", "type"],
  category: ["分類", "類別", "category"],
  amount: ["金額", "amount"],
  note: ["備註", "說明", "note", "memo"],
};

const MAX_ROWS = 1000;
const text = (value: unknown) => String(value ?? "").trim();
const normalized = (value: unknown) => text(value).replace(/[\s_－–—-]/g, "").toLowerCase();

function findColumn(headers: unknown[], aliases: string[]) {
  return headers.findIndex((header) => aliases.includes(normalized(header)));
}

function parseType(value: unknown): TransactionType | null {
  const input = normalized(value);
  if (["收入", "income", "入"].includes(input)) return "income";
  if (["支出", "expense", "出"].includes(input)) return "expense";
  return null;
}

function parseAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const sanitized = text(value).replace(/[,$\s]|nt\$/gi, "");
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const raw = text(value).replace(/[./]/g, "-");
  const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const test = new Date(year, month - 1, day);
  if (test.getFullYear() !== year || test.getMonth() !== month - 1 || test.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function emptyRow(row: unknown[]) {
  return row.every((cell) => text(cell) === "");
}

export function parseExcelTransactions(buffer: ArrayBuffer): ExcelImportPreview {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const worksheetName = workbook.SheetNames[0] ?? "第一張工作表";
  const worksheet = workbook.Sheets[worksheetName];
  if (!worksheet) return { valid: [], issues: [{ row: 0, message: "找不到可讀取的工作表。" }], scannedRows: 0, worksheetName };

  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "", raw: true });
  const headerIndex = rows.findIndex((row) => row.some((cell) => HEADER_ALIASES.date.includes(normalized(cell))));
  if (headerIndex < 0) {
    return { valid: [], issues: [{ row: 0, message: "找不到欄位列。請使用「日期、類型、分類、金額、備註」欄位。" }], scannedRows: 0, worksheetName };
  }

  const headers = rows[headerIndex];
  const indexes = {
    date: findColumn(headers, HEADER_ALIASES.date),
    type: findColumn(headers, HEADER_ALIASES.type),
    category: findColumn(headers, HEADER_ALIASES.category),
    amount: findColumn(headers, HEADER_ALIASES.amount),
    note: findColumn(headers, HEADER_ALIASES.note),
  };
  const missing = Object.entries(indexes).filter(([, index]) => index < 0).map(([key]) => key);
  if (missing.length > 0) {
    const labels: Record<string, string> = { date: "日期", type: "類型", category: "分類", amount: "金額" };
    return { valid: [], issues: [{ row: headerIndex + 1, message: `缺少必要欄位：${missing.map((key) => labels[key] ?? key).join("、")}。` }], scannedRows: 0, worksheetName };
  }

  const valid: ImportDraft[] = [];
  const issues: ImportIssue[] = [];
  const dataRows = rows.slice(headerIndex + 1, headerIndex + 1 + MAX_ROWS);
  dataRows.forEach((row, offset) => {
    const rowNumber = headerIndex + offset + 2;
    if (emptyRow(row)) return;
    const date = parseDate(row[indexes.date]);
    const type = parseType(row[indexes.type]);
    const category = text(row[indexes.category]);
    const amount = parseAmount(row[indexes.amount]);
    const note = indexes.note >= 0 ? text(row[indexes.note]) : "";
    if (!date) {
      issues.push({ row: rowNumber, message: "日期格式無效，請使用 YYYY-MM-DD。" });
      return;
    }
    if (!type) {
      issues.push({ row: rowNumber, message: "類型須填寫「收入」或「支出」。" });
      return;
    }
    if (!category) {
      issues.push({ row: rowNumber, message: "缺少分類。" });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      issues.push({ row: rowNumber, message: "金額必須是大於 0 的數字。" });
      return;
    }
    valid.push({ date, type, category, amount, note });
  });
  if (rows.length > headerIndex + MAX_ROWS + 1) {
    issues.push({ row: headerIndex + MAX_ROWS + 2, message: `單次最多可匯入 ${MAX_ROWS} 筆，後續資料未處理。` });
  }
  return { valid, issues, scannedRows: dataRows.filter((row) => !emptyRow(row)).length, worksheetName };
}

function fingerprint(transaction: Omit<Transaction, "id">) {
  return [transaction.date, transaction.type, transaction.category, transaction.amount, transaction.note.trim()].join("|");
}

export function deduplicateExcelImports(existing: Transaction[], drafts: ImportDraft[]): DeduplicationResult {
  const seen = new Set(existing.map(fingerprint));
  const accepted: ImportDraft[] = [];
  let skipped = 0;
  drafts.forEach((draft) => {
    const key = fingerprint(draft);
    if (seen.has(key)) {
      skipped += 1;
      return;
    }
    seen.add(key);
    accepted.push(draft);
  });
  return { accepted, skipped };
}

export function excelTemplateExample() {
  return [["日期", "類型", "分類", "金額", "備註"], [currentDateInput(), "支出", "餐飲／食品", 150, "午餐"]];
}
