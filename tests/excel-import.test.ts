import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { deduplicateExcelImports, mergeExcelImports, parseExcelTransactions } from "../lib/excel-import";
import type { Transaction } from "../lib/finance";

function workbookBuffer(rows: unknown[][]) {
  return workbookWithSheets([{ name: "交易", rows }]);
}

function workbookWithSheets(sheets: Array<{ name: string; rows: unknown[][] }>) {
  const workbook = XLSX.utils.book_new();
  sheets.forEach((definition) => XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(definition.rows), definition.name));
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

function drafts(preview: ReturnType<typeof parseExcelTransactions>) {
  return preview.valid.map(({ row: _row, typeResolution: _typeResolution, ...draft }) => draft);
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
    expect(result.headerRow).toBe(1);
    expect(drafts(result)).toEqual([
      { date: "2026-08-17", type: "expense", category: "餐飲／食品", amount: 150, note: "午餐" },
      { date: "2026-08-18", type: "income", category: "薪資", amount: 50000, note: "八月薪資" },
      { date: "2026-08-20", type: "income", category: "購物", amount: 100, note: "錯誤類型" },
    ]);
    expect(result.issues).toHaveLength(1);
  });

  it("reports the exact Excel row and every invalid field in that row", () => {
    const result = parseExcelTransactions(workbookBuffer([
      ["日期", "類型", "分類", "金額", "備註"],
      ["2026-19-40", "其他", "餐飲／食品", "金額待補", "多個欄位不符"],
    ]));

    expect(result.valid).toHaveLength(0);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.row).toBe(2);
    expect(result.issues[0]?.message).toContain("日期欄的「2026-19-40」無法辨識");
    expect(result.issues[0]?.message).toContain("金額欄的「金額待補」不是大於 0 的數字");
    expect(result.issues[0]?.message).toContain("收支類型「其他」無法辨識");
  });

  it("finds a transaction sheet after a cover sheet and accepts alternate headers", () => {
    const result = parseExcelTransactions(workbookWithSheets([
      { name: "封面", rows: [["我的記帳本"], ["本工作表僅供說明"]] },
      { name: "八月明細", rows: [
        ["2026 年度收支"],
        [],
        ["交易日期", "項目", "收入金額", "支出金額", "備考"],
        ["2026年8月17日", "午餐", 0, 150, "公司附近"],
        ["2026/08/18", "薪資", 50000, 0, "八月薪資"],
      ] },
    ]));

    expect(result.worksheetName).toBe("八月明細");
    expect(result.workbookSheets).toEqual(["封面", "八月明細"]);
    expect(result.headerRow).toBe(3);
    expect(drafts(result)).toEqual([
      { date: "2026-08-17", type: "expense", category: "午餐", amount: 150, note: "公司附近" },
      { date: "2026-08-18", type: "income", category: "薪資", amount: 50000, note: "八月薪資" },
    ]);
  });

  it("recognizes bank-export headers with currency units and parentheses", () => {
    const result = parseExcelTransactions(workbookWithSheets([
      { name: "匯出資訊", rows: [["銀行交易明細匯出"]] },
      { name: "交易明細", rows: [
        ["交易日期", "類型", "分類", "摘要", "金額 (NT$)", "交易後餘額 (NT$)", "銀行摘要", "備註"],
        ["2026-08-17", "支出", "餐飲／食品", "午餐", -150, 12500, "卡片消費", ""],
        ["2026-08-18", "收入", "薪資", "八月薪資", 50000, 62500, "轉入", ""],
      ] },
    ]));

    expect(result.worksheetName).toBe("交易明細");
    expect(drafts(result)).toEqual([
      { date: "2026-08-17", type: "expense", category: "餐飲／食品", amount: 150, note: "午餐" },
      { date: "2026-08-18", type: "income", category: "薪資", amount: 50000, note: "八月薪資" },
    ]);
  });

  it("infers type from signed amounts when the transaction type is blank or nonstandard", () => {
    const result = parseExcelTransactions(workbookBuffer([
      ["交易日期", "類型", "分類", "金額 (NT$)", "摘要"],
      ["2025-12-31", "", "交通/Uber", -179, "未填類型的扣款"],
      ["2025-12-30", "", "其他收入", 880, "未填類型的入帳"],
      ["2025-12-29", "支出", "購物", 300, "已填類型優先"],
      ["2025-12-28", "收入", "薪資", -50000, "已填類型優先"],
      ["2025-12-27", "其他交易", "銀行轉帳", -600, "非標準類型扣款"],
    ]));

    expect(drafts(result)).toEqual([
      { date: "2025-12-31", type: "expense", category: "交通/Uber", amount: 179, note: "未填類型的扣款" },
      { date: "2025-12-30", type: "income", category: "其他收入", amount: 880, note: "未填類型的入帳" },
      { date: "2025-12-29", type: "expense", category: "購物", amount: 300, note: "已填類型優先" },
      { date: "2025-12-28", type: "income", category: "薪資", amount: 50000, note: "已填類型優先" },
      { date: "2025-12-27", type: "expense", category: "銀行轉帳", amount: 600, note: "非標準類型扣款" },
    ]);
    expect(result.valid.map((item) => item.typeResolution)).toEqual(["inferred", "inferred", "explicit", "explicit", "inferred"]);
  });

  it("treats CD轉出 as an expense even when the bank export uses a positive amount", () => {
    const result = parseExcelTransactions(workbookBuffer([
      ["交易日期", "交易類型", "分類", "摘要", "金額 (NT$)"],
      ["2025-12-25", "帳戶轉帳", "帳戶轉帳", "CD轉出", 1416],
    ]));

    expect(drafts(result)).toEqual([
      { date: "2025-12-25", type: "expense", category: "帳戶轉帳", amount: 1416, note: "CD轉出" },
    ]);
    expect(result.valid[0]?.typeResolution).toBe("inferred");
  });

  it("returns sheet diagnostics when no recognizable transaction headers are present", () => {
    const result = parseExcelTransactions(workbookWithSheets([
      { name: "封面", rows: [["我的財務摘要"], ["本月結餘", 1000]] },
      { name: "資料", rows: [["編號", "名稱", "數量"], [1, "午餐", 1]] },
    ]));

    expect(result.valid).toHaveLength(0);
    expect(result.workbookSheets).toEqual(["封面", "資料"]);
    expect(result.issues[0]?.row).toBeNull();
    expect(result.issues[0]?.message).toContain("日期");
    expect(result.detectedHeaders).toContain("我的財務摘要");
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

  it("imports a manually corrected preview row without saving preview-only fields", () => {
    const preview = parseExcelTransactions(workbookBuffer([
      ["交易日期", "類型", "分類", "金額", "摘要"],
      ["2025-12-31", "其他交易", "銀行轉帳", -600, "先自動推斷為支出"],
    ]));
    const corrected = { ...preview.valid[0]!, type: "income" as const, typeResolution: "manual" as const };
    const merged = mergeExcelImports([], [corrected], "skip", () => "manual-id");

    expect(merged.transactions).toEqual([
      { id: "manual-id", date: "2025-12-31", type: "income", category: "銀行轉帳", amount: 600, note: "先自動推斷為支出" },
    ]);
  });
});
