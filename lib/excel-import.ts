import * as XLSX from "xlsx";

import { currentDateInput, type Transaction, type TransactionType } from "./finance";

export type ImportDraft = Omit<Transaction, "id">;
export type ExcelImportMode = "skip" | "update";
export type ImportIssue = { row: number | null; message: string };
export type TypeResolution = "explicit" | "inferred" | "manual";
export type ImportPreviewTransaction = ImportDraft & { row: number; typeResolution: TypeResolution };

export type ExcelImportPreview = {
  valid: ImportPreviewTransaction[];
  issues: ImportIssue[];
  scannedRows: number;
  worksheetName: string;
  workbookSheets: string[];
  headerRow: number | null;
  detectedHeaders: string[];
};

export type DeduplicationResult = { accepted: ImportDraft[]; skipped: number };
export type MergeImportResult = { transactions: Transaction[]; added: number; updated: number; skipped: number };

type ColumnIndexes = {
  date: number;
  type: number;
  category: number;
  amount: number;
  income: number;
  expense: number;
  note: number;
};

type WorksheetCandidate = {
  name: string;
  rows: unknown[][];
  headerIndex: number;
  indexes: ColumnIndexes;
  score: number;
};

const HEADER_ALIASES: Record<keyof ColumnIndexes, string[]> = {
  date: ["日期", "交易日期", "記帳日期", "日期時間", "交易時間", "date", "datetime", "transactiondate"],
  type: ["類型", "收支類型", "收支", "收支別", "收入支出", "交易類型", "type", "transactiontype"],
  category: ["分類", "類別", "交易分類", "支出類別", "項目", "品項", "名稱", "category", "categories", "item"],
  amount: ["金額", "交易金額", "總額", "總計", "amount", "value", "total", "transactionamount"],
  income: ["收入", "收入金額", "income", "credit"],
  expense: ["支出", "支出金額", "expense", "debit"],
  note: ["備註", "摘要", "說明", "備考", "描述", "note", "memo", "description", "remark"],
};

const REQUIRED_LABELS: Record<"date" | "category" | "amount", string> = {
  date: "日期",
  category: "分類",
  amount: "金額",
};

const MAX_ROWS = 1000;
const MAX_HEADER_SCAN_ROWS = 60;
const text = (value: unknown) => String(value ?? "").trim();
const normalized = (value: unknown) =>
  text(value)
    .toLowerCase()
    .replace(/(?:新臺幣|新台幣|ntd|nt\$|twd|currency|元|幣)/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");

function emptyPreview(worksheetName: string, workbookSheets: string[], message: string, detectedHeaders: string[] = []): ExcelImportPreview {
  return { valid: [], issues: [{ row: null, message }], scannedRows: 0, worksheetName, workbookSheets, headerRow: null, detectedHeaders };
}

function findColumn(headers: unknown[], aliases: string[]) {
  return headers.findIndex((header) => aliases.includes(normalized(header)));
}

function indexesFor(headers: unknown[]): ColumnIndexes {
  return {
    date: findColumn(headers, HEADER_ALIASES.date),
    type: findColumn(headers, HEADER_ALIASES.type),
    category: findColumn(headers, HEADER_ALIASES.category),
    amount: findColumn(headers, HEADER_ALIASES.amount),
    income: findColumn(headers, HEADER_ALIASES.income),
    expense: findColumn(headers, HEADER_ALIASES.expense),
    note: findColumn(headers, HEADER_ALIASES.note),
  };
}

function headerScore(indexes: ColumnIndexes) {
  const hasValue = indexes.amount >= 0 || indexes.income >= 0 || indexes.expense >= 0;
  if (indexes.date < 0 || !hasValue) return -1;
  const score = [indexes.date, indexes.type, indexes.category, indexes.amount, indexes.income, indexes.expense, indexes.note].filter((index) => index >= 0).length;
  return score + (indexes.category >= 0 ? 3 : 0) + (indexes.type >= 0 ? 2 : 0);
}

function candidateFor(name: string, worksheet: XLSX.WorkSheet): WorksheetCandidate | null {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "", raw: true });
  let best: WorksheetCandidate | null = null;
  rows.slice(0, MAX_HEADER_SCAN_ROWS).forEach((row, headerIndex) => {
    const indexes = indexesFor(row);
    const score = headerScore(indexes);
    if (score >= 0 && (!best || score > best.score)) best = { name, rows, headerIndex, indexes, score };
  });
  return best;
}

function parseType(value: unknown): TransactionType | null {
  const input = normalized(value);
  if (["收入", "income", "入", "credit"].includes(input)) return "income";
  if (["支出", "expense", "出", "debit"].includes(input)) return "expense";
  return null;
}

function parseAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.abs(value);
  const raw = text(value);
  const isNegative = /^\(.*\)$/.test(raw) || /[-−–]/.test(raw);
  const sanitized = raw.replace(/[,$\s()\-−–]|nt\$/gi, "");
  const parsed = Number(sanitized);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return isNegative ? Math.abs(parsed) : parsed;
}

function amountSign(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.sign(value);
  const raw = text(value);
  if (!raw) return 0;
  if (/^\(.*\)$/.test(raw) || /[-−–]/.test(raw)) return -1;
  const sanitized = raw.replace(/[,$\s()]/g, "").replace(/nt\$/gi, "");
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? Math.sign(parsed) : 0;
}

function parseDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const raw = text(value).replace(/[./]/g, "-").replace(/年/g, "-").replace(/月/g, "-").replace(/日/g, "");
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

function categoryFor(row: unknown[], indexes: ColumnIndexes) {
  const category = indexes.category >= 0 ? text(row[indexes.category]) : "";
  return category || "未分類";
}

function cdTransferTypeFor(row: unknown[]): TransactionType | null {
  const contents = row.map(normalized);
  if (contents.some((content) => content.includes("cd轉出"))) return "expense";
  if (contents.some((content) => content.includes("cd轉入"))) return "income";
  return null;
}

function quotedCell(value: unknown) {
  const content = text(value);
  if (!content) return "空白";
  return `「${content.length > 32 ? `${content.slice(0, 32)}…` : content}」`;
}

function invalidDateMessage(value: unknown) {
  return text(value)
    ? `日期欄的${quotedCell(value)}無法辨識；請使用 YYYY-MM-DD、YYYY/MM/DD 或 YYYY年M月D日。`
    : "日期欄未填寫；請使用 YYYY-MM-DD、YYYY/MM/DD 或 YYYY年M月D日。";
}

function invalidTypeMessage(row: unknown[], indexes: ColumnIndexes) {
  const source = indexes.type >= 0 ? row[indexes.type] : "";
  return text(source)
    ? `收支類型${quotedCell(source)}無法辨識，且無法由金額正負號推斷；請填寫「收入」或「支出」。`
    : "收支類型未填寫，且無法由金額正負號推斷；請填寫「收入」或「支出」。";
}

function invalidAmountMessage(row: unknown[], indexes: ColumnIndexes) {
  if (indexes.amount >= 0) {
    const source = row[indexes.amount];
    return text(source)
      ? `金額欄的${quotedCell(source)}不是大於 0 的數字；請移除文字、貨幣符號或確認數值。`
      : "金額欄未填寫；請填入大於 0 的數字。";
  }
  const income = indexes.income >= 0 ? row[indexes.income] : "";
  const expense = indexes.expense >= 0 ? row[indexes.expense] : "";
  if (!text(income) && !text(expense)) return "收入金額與支出金額欄均未填寫；請至少填入一個大於 0 的數字。";
  return `收入金額 ${quotedCell(income)}、支出金額 ${quotedCell(expense)} 均無法作為大於 0 的金額。`;
}

function amountAndTypeFor(row: unknown[], indexes: ColumnIndexes) {
  let type = indexes.type >= 0 ? parseType(row[indexes.type]) : null;
  let typeResolution: TypeResolution | null = type ? "explicit" : null;
  let amount = indexes.amount >= 0 ? parseAmount(row[indexes.amount]) : Number.NaN;
  const directAmountSign = indexes.amount >= 0 ? amountSign(row[indexes.amount]) : 0;
  const income = indexes.income >= 0 ? parseAmount(row[indexes.income]) : Number.NaN;
  const expense = indexes.expense >= 0 ? parseAmount(row[indexes.expense]) : Number.NaN;

  if ((!Number.isFinite(amount) || amount <= 0) && Number.isFinite(income) && income > 0) {
    amount = income;
    type = "income";
    typeResolution = "inferred";
  }
  if ((!Number.isFinite(amount) || amount <= 0) && Number.isFinite(expense) && expense > 0) {
    amount = expense;
    type = "expense";
    typeResolution = "inferred";
  }
  if (!type && Number.isFinite(income) && income > 0) {
    type = "income";
    typeResolution = "inferred";
  }
  if (!type && Number.isFinite(expense) && expense > 0) {
    type = "expense";
    typeResolution = "inferred";
  }
  if (!type && Number.isFinite(amount) && amount > 0 && directAmountSign !== 0) {
    type = directAmountSign > 0 ? "income" : "expense";
    typeResolution = "inferred";
  }
  // 銀行明細中的 CD 轉帳文字代表資金流向，優先於金額正負號與非標準交易類型。
  const cdTransferType = cdTransferTypeFor(row);
  if (cdTransferType) {
    type = cdTransferType;
    typeResolution = "inferred";
  }
  return { amount, type, typeResolution };
}

export function parseExcelTransactions(buffer: ArrayBuffer): ExcelImportPreview {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const workbookSheets = workbook.SheetNames;
  if (workbookSheets.length === 0) return emptyPreview("無工作表", [], "Excel 檔案中找不到任何工作表。");

  const candidates = workbookSheets
    .map((name) => {
      const worksheet = workbook.Sheets[name];
      return worksheet ? candidateFor(name, worksheet) : null;
    })
    .filter((candidate): candidate is WorksheetCandidate => candidate !== null)
    .sort((a, b) => b.score - a.score || b.rows.length - a.rows.length);

  if (candidates.length === 0) {
    const sampleSheet = workbook.Sheets[workbookSheets[0]];
    const sampleRows = sampleSheet ? XLSX.utils.sheet_to_json<unknown[]>(sampleSheet, { header: 1, defval: "", raw: true }) : [];
    const detectedHeaders = sampleRows.slice(0, 8).flat().map(text).filter(Boolean).slice(0, 12);
    return emptyPreview(workbookSheets[0], workbookSheets, "已讀取工作表，但找不到包含「日期」及金額欄位的資料列。請確認欄位名稱或改用日期、類型、分類、金額格式。", detectedHeaders);
  }

  const candidate = candidates[0];
  const detectedHeaders = candidate.rows[candidate.headerIndex].map(text).filter(Boolean);
  const valid: ImportPreviewTransaction[] = [];
  const issues: ImportIssue[] = [];
  const dataRows = candidate.rows.slice(candidate.headerIndex + 1, candidate.headerIndex + 1 + MAX_ROWS);

  dataRows.forEach((row, offset) => {
    const rowNumber = candidate.headerIndex + offset + 2;
    if (emptyRow(row)) return;
    const date = parseDate(row[candidate.indexes.date]);
    const { amount, type, typeResolution } = amountAndTypeFor(row, candidate.indexes);
    const category = categoryFor(row, candidate.indexes);
    const note = candidate.indexes.note >= 0 ? text(row[candidate.indexes.note]) : "";
    const problems = [
      !date ? invalidDateMessage(row[candidate.indexes.date]) : null,
      !Number.isFinite(amount) || amount <= 0 ? invalidAmountMessage(row, candidate.indexes) : null,
      !type ? invalidTypeMessage(row, candidate.indexes) : null,
    ].filter((message): message is string => Boolean(message));
    const isInvalid = !date || !type || !Number.isFinite(amount) || amount <= 0;
    if (isInvalid) {
      issues.push({ row: rowNumber, message: problems.join("\n") });
      return;
    }
    valid.push({ date, type, category, amount, note, row: rowNumber, typeResolution: typeResolution ?? "inferred" });
  });

  if (dataRows.length === 0) issues.push({ row: candidate.headerIndex + 1, message: "已辨識欄位列，但該工作表在欄位列之後沒有資料。" });
  if (candidate.rows.length > candidate.headerIndex + MAX_ROWS + 1) {
    issues.push({ row: candidate.headerIndex + MAX_ROWS + 2, message: `單次最多可匯入 ${MAX_ROWS} 筆，後續資料未處理。` });
  }
  return { valid, issues, scannedRows: dataRows.filter((row) => !emptyRow(row)).length, worksheetName: candidate.name, workbookSheets, headerRow: candidate.headerIndex + 1, detectedHeaders };
}

function fingerprint(transaction: Omit<Transaction, "id">) {
  return [transaction.date, transaction.type, transaction.category, transaction.amount, transaction.note.trim()].join("|");
}

function cleanDraft(transaction: ImportDraft): ImportDraft {
  return {
    date: transaction.date,
    type: transaction.type,
    category: transaction.category,
    amount: transaction.amount,
    note: transaction.note,
  };
}

function identityKey(transaction: Omit<Transaction, "id">) {
  return [transaction.date, transaction.type, transaction.category].join("|");
}

export function deduplicateExcelImports(existing: Transaction[], drafts: ImportDraft[]): DeduplicationResult {
  const seen = new Set(existing.map(fingerprint));
  const accepted: ImportDraft[] = [];
  let skipped = 0;
  drafts.forEach((draft) => {
    const clean = cleanDraft(draft);
    const key = fingerprint(clean);
    if (seen.has(key)) {
      skipped += 1;
      return;
    }
    seen.add(key);
    accepted.push(clean);
  });
  return { accepted, skipped };
}

export function mergeExcelImports(existing: Transaction[], drafts: ImportDraft[], mode: ExcelImportMode, createId: () => string): MergeImportResult {
  const transactions = [...existing];
  const byIdentity = new Map<string, number>();
  transactions.forEach((transaction, index) => {
    if (!byIdentity.has(identityKey(transaction))) byIdentity.set(identityKey(transaction), index);
  });
  let added = 0;
  let updated = 0;
  let skipped = 0;
  drafts.forEach((draft) => {
    const clean = cleanDraft(draft);
    const key = identityKey(clean);
    const existingIndex = byIdentity.get(key);
    if (existingIndex === undefined) {
      transactions.push({ ...clean, id: createId() });
      byIdentity.set(key, transactions.length - 1);
      added += 1;
      return;
    }
    const current = transactions[existingIndex];
    if (mode === "skip" || fingerprint(current) === fingerprint(clean)) {
      skipped += 1;
      return;
    }
    transactions[existingIndex] = { ...current, ...clean };
    updated += 1;
  });
  return { transactions, added, updated, skipped };
}

export function excelTemplateExample() {
  return [["日期", "類型", "分類", "金額", "備註"], [currentDateInput(), "支出", "餐飲／食品", 150, "午餐"]];
}
