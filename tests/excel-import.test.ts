import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { deduplicateExcelImports, mergeExcelImports, parseExcelTransactions } from "../lib/excel-import";
import type { Transaction } from "../lib/finance";

function workbookBuffer(rows: unknown[][]) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "交易");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("Excel import", () => {
  it("parses valid rows and reports invalid rows", () => {
    const result = parseExcelTransactions(workbookBuffer([
      ["日期", "類型", "分類", "金額", "備註"],
      ["2026-08-17", "支出", "餐飲／食品", 150, "午餐"],
      ["2026/08/18", "收入", "薪資", "50000", "八月薪資"],
      ["2026-13-01", "支出", "購物", 100, "錯誤日期"],
      ["2026-08-20", "未知", "購物", 100, "錯誤類型"],
    ]));

    expect(result.worksheetName).toBe("交易");
    expect(result.valid).toEqual([
      { date: "2026-08-17", type: "expense", category: "餐飲／食品", amount: 150, note: "午餐" },
      { date: "2026-08-18", type: "income", category: "薪資", amount: 50000, note: "八月薪資" },
    ]);
    expect(result.issues).toHaveLength(2);
  });

  it("requires the mandatory headers", () => {
    const result = parseExcelTransactions(workbookBuffer([
      ["日期", "類型", "金額"],
      ["2026-08-17", "支出", 150],
    ]));

    expect(result.valid).toHaveLength(0);
    expect(result.issues[0]?.message).toContain("分類");
  });

  it("skips records that already exist or repeat within the selected sheet", () => {
    const existing: Transaction[] = [
      { id: "stored", date: "2026-08-17", type: "expense", category: "餐飲／食品", amount: 150, note: "午餐" },
    ];
    const result = deduplicateExcelImports(existing, [
      { date: "2026-08-17", type: "expense", category: "餐飲／食品", amount: 150, note: "午餐" },
      { date: "2026-08-18", type: "expense", category: "購物", amount: 300, note: "書籍" },
      { date: "2026-08-18", type: "expense", category: "購物", amount: 300, note: "書籍" },
    ]);

    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]?.category).toBe("購物");
    expect(result.skipped).toBe(2);
  });

  it("updates a matching transaction only when update mode is enabled", () => {
    const existing: Transaction[] = [
      { id: "stored", date: "2026-08-17", type: "expense", category: "餐飲／食品", amount: 150, note: "午餐" },
    ];
    const drafts = [
      { date: "2026-08-17", type: "expense" as const, category: "餐飲／食品", amount: 180, note: "午餐調整" },
      { date: "2026-08-18", type: "income" as const, category: "薪資", amount: 50000, note: "八月薪資" },
    ];

    const skipped = mergeExcelImports(existing, drafts, "skip", () => "new");
    expect(skipped).toMatchObject({ added: 1, updated: 0, skipped: 1 });
    expect(skipped.transactions.find((item) => item.id === "stored")?.amount).toBe(150);

    const updated = mergeExcelImports(existing, drafts, "update", () => "new");
    expect(updated).toMatchObject({ added: 1, updated: 1, skipped: 0 });
    expect(updated.transactions.find((item) => item.id === "stored")).toMatchObject({ amount: 180, note: "午餐調整" });
  });
});
