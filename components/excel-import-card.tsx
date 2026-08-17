import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system/next";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useState } from "react";

import { overrideExcelPreviewCategoryType, overrideExcelPreviewNoteKeywordType, parseExcelTransactions, type ExcelImportMode, type ExcelImportPreview } from "@/lib/excel-import";
import type { TransactionType } from "@/lib/finance";

const EXCEL_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
];

type Props = {
  onConfirm: (preview: ExcelImportPreview, mode: ExcelImportMode) => Promise<{ added: number; updated: number; skipped: number }>;
};

async function fileBuffer(asset: DocumentPicker.DocumentPickerAsset) {
  if (Platform.OS === "web" && asset.file) return asset.file.arrayBuffer();
  return new File(asset.uri).arrayBuffer();
}

export function ExcelImportCard({ onConfirm }: Props) {
  const [preview, setPreview] = useState<ExcelImportPreview | null>(null);
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [mode, setMode] = useState<ExcelImportMode>("skip");
  const [showAllRows, setShowAllRows] = useState(false);
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [noteKeyword, setNoteKeyword] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectFile = async () => {
    setError("");
    setResult("");
    try {
      const selection = await DocumentPicker.getDocumentAsync({ type: EXCEL_TYPES, copyToCacheDirectory: true, multiple: false });
      if (selection.canceled) return;
      const asset = selection.assets[0];
      if (!asset) return;
      if (asset.size && asset.size > 10 * 1024 * 1024) {
        setError("檔案超過 10MB，請先縮小 Excel 檔案後再匯入。");
        return;
      }
      setIsParsing(true);
      const buffer = await fileBuffer(asset);
      const parsed = parseExcelTransactions(buffer);
      setPreview(parsed);
      setFilename(asset.name);
      setNoteKeyword("");
      setShowAllRows(false);
      setShowAllIssues(false);
    } catch {
      setError("無法讀取此 Excel 檔案。請確認檔案為 .xlsx 或 .xls 格式，且檔案未受密碼或保護設定限制。");
    } finally {
      setIsParsing(false);
    }
  };

  const importPreview = async () => {
    if (!preview || preview.valid.length === 0) return;
    setIsSaving(true);
    try {
      const imported = await onConfirm(preview, mode);
      setResult(`已新增 ${imported.added} 筆、更新 ${imported.updated} 筆；略過 ${imported.skipped} 筆。`);
      setPreview(null);
      setFilename("");
    } catch {
      setError("匯入時發生問題，請稍後再試。" );
    } finally {
      setIsSaving(false);
    }
  };

  const overrideType = (index: number, type: TransactionType) => {
    setPreview((current) => {
      if (!current) return current;
      return {
        ...current,
        valid: current.valid.map((item, itemIndex) => itemIndex === index ? { ...item, type, typeResolution: "manual" } : item),
      };
    });
  };

  const overrideCategoryType = (category: string, type: TransactionType) => {
    setPreview((current) => current ? overrideExcelPreviewCategoryType(current, category, type) : current);
  };

  const overrideNoteKeywordType = (type: TransactionType) => {
    setPreview((current) => current ? overrideExcelPreviewNoteKeywordType(current, noteKeyword, type) : current);
  };

  const categoryCounts = preview?.valid.reduce<Record<string, number>>((counts, item) => {
    counts[item.category] = (counts[item.category] ?? 0) + 1;
    return counts;
  }, {}) ?? {};
  const normalizedNoteKeyword = noteKeyword.trim().toLocaleLowerCase();
  const noteKeywordMatchCount = normalizedNoteKeyword ? preview?.valid.filter((item) => item.note.toLocaleLowerCase().includes(normalizedNoteKeyword)).length ?? 0 : 0;

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>匯入 Excel</Text>
      <Text style={styles.description}>系統會自動掃描所有工作表。可使用「日期、類型、分類、金額、備註」，或以「收入金額／支出金額」分欄；若格式不符，預覽會標示工作表、Excel 實際列號與欄位原因。</Text>
      <Pressable onPress={() => void selectFile()} disabled={isParsing || isSaving} style={({ pressed }) => [styles.selectButton, pressed && styles.pressed, (isParsing || isSaving) && styles.disabled]}>
        <Text style={styles.selectText}>{isParsing ? "正在讀取檔案…" : "選擇 Excel 檔案"}</Text>
      </Pressable>
      {filename ? <Text style={styles.filename}>已選擇：{filename}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {result ? <Text style={styles.success}>{result}</Text> : null}

      {preview ? (
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>匯入預覽</Text>
          <Text style={styles.previewText}>已選用工作表「{preview.worksheetName}」{preview.headerRow ? `第 ${preview.headerRow} 列欄位` : ""}：掃描 {preview.scannedRows} 列，其中 {preview.valid.length} 列可匯入。</Text>
          <Text style={styles.diagnostic}>已檢查工作表：{preview.workbookSheets.join("、") || "無"}</Text>
          {preview.detectedHeaders.length > 0 ? <Text style={styles.diagnostic}>辨識欄位／內容：{preview.detectedHeaders.slice(0, 8).join("、")}</Text> : null}
          {preview.valid.some((item) => item.typeResolution === "inferred") ? <Text style={styles.inferenceNotice}>含自動推斷交易：可在下方逐筆切換為收入或支出。</Text> : null}
          <Pressable onPress={() => setMode((value) => value === "skip" ? "update" : "skip")} style={[styles.modeRow, mode === "update" && styles.modeRowActive]}>
            <View style={styles.modeCopy}>
              <Text style={styles.modeTitle}>更新既有交易</Text>
              <Text style={styles.modeText}>比對相同日期、類型與分類；開啟後以 Excel 的金額與備註覆蓋既有交易。</Text>
            </View>
            <View style={[styles.switchTrack, mode === "update" && styles.switchTrackActive]}>
              <View style={[styles.switchThumb, mode === "update" && styles.switchThumbActive]} />
            </View>
          </Pressable>
          <View style={styles.keywordPanel}>
            <Text style={styles.keywordTitle}>依備註關鍵字批次套用</Text>
            <Text style={styles.keywordDescription}>輸入備註中的文字，例如「UBER」或「訂閱」；符合的交易會一次改為指定收支類型。</Text>
            <TextInput value={noteKeyword} onChangeText={setNoteKeyword} placeholder="輸入備註關鍵字" placeholderTextColor="#929A94" style={styles.keywordInput} returnKeyType="done" />
            <Text style={styles.keywordMatchText}>{normalizedNoteKeyword ? `符合 ${noteKeywordMatchCount} 筆交易` : "輸入關鍵字後顯示符合筆數"}</Text>
            <View style={styles.keywordActions}>
              <Pressable disabled={noteKeywordMatchCount === 0} onPress={() => overrideNoteKeywordType("expense")} style={({ pressed }) => [styles.keywordActionButton, styles.keywordExpenseButton, pressed && styles.pressed, noteKeywordMatchCount === 0 && styles.disabled]}>
                <Text style={styles.keywordExpenseText}>符合項目全設為支出</Text>
              </Pressable>
              <Pressable disabled={noteKeywordMatchCount === 0} onPress={() => overrideNoteKeywordType("income")} style={({ pressed }) => [styles.keywordActionButton, styles.keywordIncomeButton, pressed && styles.pressed, noteKeywordMatchCount === 0 && styles.disabled]}>
                <Text style={styles.keywordIncomeText}>符合項目全設為收入</Text>
              </Pressable>
            </View>
          </View>
          {(showAllRows ? preview.valid : preview.valid.slice(0, 8)).map((item, index) => (
            <View key={`${item.date}-${item.amount}-${index}`} style={styles.previewRow}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewCategory}>{item.category}</Text>
                <View style={[styles.sourceBadge, item.typeResolution === "inferred" && styles.sourceBadgeInferred, item.typeResolution === "manual" && styles.sourceBadgeManual]}>
                  <Text style={[styles.sourceBadgeText, item.typeResolution === "inferred" && styles.sourceBadgeTextInferred, item.typeResolution === "manual" && styles.sourceBadgeTextManual]}>{item.typeResolution === "explicit" ? "原始類型" : item.typeResolution === "manual" ? "已手動修改" : "自動推斷"}</Text>
                </View>
              </View>
              <Text style={styles.previewMeta}>第 {item.row} 列 ・ NT$ {item.amount.toLocaleString("zh-TW")}</Text>
              <View style={styles.typeActions}>
                <Pressable onPress={() => overrideType(index, "expense")} style={[styles.typeButton, item.type === "expense" && styles.typeButtonExpense]}>
                  <Text style={[styles.typeButtonText, item.type === "expense" && styles.typeButtonExpenseText]}>支出</Text>
                </Pressable>
                <Pressable onPress={() => overrideType(index, "income")} style={[styles.typeButton, item.type === "income" && styles.typeButtonIncome]}>
                  <Text style={[styles.typeButtonText, item.type === "income" && styles.typeButtonIncomeText]}>收入</Text>
                </Pressable>
              </View>
              {(categoryCounts[item.category] ?? 0) > 1 ? (
                <View style={styles.batchCategoryActions}>
                  <Text style={styles.batchCategoryLabel}>同分類 {categoryCounts[item.category]} 筆</Text>
                  <View style={styles.batchCategoryButtons}>
                    <Pressable onPress={() => overrideCategoryType(item.category, "expense")} style={[styles.batchCategoryButton, styles.batchCategoryExpenseButton]}>
                      <Text style={styles.batchCategoryExpenseText}>全部支出</Text>
                    </Pressable>
                    <Pressable onPress={() => overrideCategoryType(item.category, "income")} style={[styles.batchCategoryButton, styles.batchCategoryIncomeButton]}>
                      <Text style={styles.batchCategoryIncomeText}>全部收入</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          ))}
          {preview.valid.length > 8 ? <Pressable onPress={() => setShowAllRows((value) => !value)} style={styles.showMoreButton}><Text style={styles.showMoreText}>{showAllRows ? "收合預覽列" : `顯示全部 ${preview.valid.length} 筆並逐筆更正`}</Text></Pressable> : null}
          {preview.issues.length > 0 ? (
            <View style={styles.issuesPanel}>
              <Text style={styles.issuesTitle}>資料問題（{preview.issues.length}）</Text>
              <Text style={styles.issuesDescription}>工作表「{preview.worksheetName}」中無法匯入的資料如下；請依 Excel 的實際列號修正後重新選檔。</Text>
              {(showAllIssues ? preview.issues : preview.issues.slice(0, 3)).map((issue, index) => (
                <View key={`${issue.row ?? "header"}-${issue.message}-${index}`} style={styles.issueRow}>
                  <Text style={styles.issueLocation}>{issue.row ? `第 ${issue.row} 列` : "欄位偵測"}</Text>
                  <Text style={styles.issue}>{issue.message}</Text>
                </View>
              ))}
              {preview.issues.length > 3 ? <Pressable onPress={() => setShowAllIssues((value) => !value)} style={styles.showIssuesButton}><Text style={styles.showIssuesText}>{showAllIssues ? "收合問題清單" : `顯示全部 ${preview.issues.length} 項問題`}</Text></Pressable> : null}
            </View>
          ) : null}
          <Pressable onPress={() => void importPreview()} disabled={preview.valid.length === 0 || isSaving} style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed, (preview.valid.length === 0 || isSaving) && styles.disabled]}>
            <Text style={styles.confirmText}>{isSaving ? "正在匯入…" : mode === "update" ? `確認匯入並更新 ${preview.valid.length} 筆` : `確認匯入 ${preview.valid.length} 筆`}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 17, borderWidth: 1, borderColor: "#ECE7DE" },
  title: { color: "#1F2421", fontSize: 17, fontWeight: "900" },
  description: { color: "#7A837D", fontSize: 13, lineHeight: 20, marginTop: 8 },
  selectButton: { marginTop: 14, borderRadius: 13, paddingVertical: 12, alignItems: "center", backgroundColor: "#E8F2ED", borderWidth: 1, borderColor: "#B9D6CA" },
  selectText: { color: "#0E6B56", fontSize: 13, fontWeight: "900" },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
  filename: { color: "#4F5B54", fontSize: 12, marginTop: 10 },
  error: { color: "#B5472C", fontSize: 12, lineHeight: 18, marginTop: 10 },
  success: { color: "#0E6B56", fontSize: 12, lineHeight: 18, marginTop: 10, fontWeight: "800" },
  preview: { marginTop: 15, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#ECE7DE" },
  previewTitle: { color: "#1F2421", fontSize: 14, fontWeight: "900" },
  previewText: { color: "#6D7770", fontSize: 12, lineHeight: 18, marginTop: 4 },
  diagnostic: { color: "#7A837D", fontSize: 11, lineHeight: 17, marginTop: 5 },
  inferenceNotice: { color: "#8A5E05", fontSize: 11, lineHeight: 17, marginTop: 7, fontWeight: "800" },
  modeRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 13, padding: 11, borderRadius: 12, backgroundColor: "#F8F6F1", borderWidth: 1, borderColor: "#ECE7DE" },
  modeRowActive: { backgroundColor: "#E8F2ED", borderColor: "#B9D6CA" },
  modeCopy: { flex: 1 },
  modeTitle: { color: "#334039", fontSize: 13, fontWeight: "900" },
  modeText: { color: "#6D7770", fontSize: 11, lineHeight: 16, marginTop: 3 },
  switchTrack: { width: 37, height: 22, borderRadius: 12, backgroundColor: "#BEC6C0", justifyContent: "center", padding: 3 },
  switchTrackActive: { backgroundColor: "#0E6B56" },
  switchThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFFFFF", alignSelf: "flex-start" },
  switchThumbActive: { alignSelf: "flex-end" },
  keywordPanel: { marginTop: 13, padding: 11, borderRadius: 12, backgroundColor: "#F2F6F3", borderWidth: 1, borderColor: "#D7E6DD" },
  keywordTitle: { color: "#334039", fontSize: 13, fontWeight: "900" },
  keywordDescription: { color: "#66736B", fontSize: 11, lineHeight: 16, marginTop: 3 },
  keywordInput: { marginTop: 9, minHeight: 38, borderRadius: 9, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#CFDAD2", paddingHorizontal: 10, color: "#334039", fontSize: 12 },
  keywordMatchText: { color: "#587066", fontSize: 10, fontWeight: "800", marginTop: 7 },
  keywordActions: { flexDirection: "row", gap: 7, marginTop: 8 },
  keywordActionButton: { flex: 1, minHeight: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, borderWidth: 1 },
  keywordExpenseButton: { backgroundColor: "#FFF1ED", borderColor: "#EDC1B5" },
  keywordIncomeButton: { backgroundColor: "#EBF5EF", borderColor: "#B9D6CA" },
  keywordExpenseText: { color: "#C85F3A", fontSize: 10, fontWeight: "900", textAlign: "center" },
  keywordIncomeText: { color: "#0E6B56", fontSize: 10, fontWeight: "900", textAlign: "center" },
  previewRow: { marginTop: 10, padding: 10, borderRadius: 11, backgroundColor: "#F8F6F1" },
  previewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  previewCategory: { color: "#334039", fontSize: 13, fontWeight: "800" },
  previewMeta: { color: "#7A837D", fontSize: 11, marginTop: 3 },
  sourceBadge: { borderRadius: 9, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: "#E7ECE8" },
  sourceBadgeInferred: { backgroundColor: "#FFF0CD" },
  sourceBadgeManual: { backgroundColor: "#E7EDF8" },
  sourceBadgeText: { color: "#607068", fontSize: 10, fontWeight: "900" },
  sourceBadgeTextInferred: { color: "#8A5E05" },
  sourceBadgeTextManual: { color: "#365C96" },
  typeActions: { flexDirection: "row", gap: 7, marginTop: 9 },
  typeButton: { flex: 1, borderRadius: 9, borderWidth: 1, borderColor: "#DDE1DC", backgroundColor: "#FFFFFF", paddingVertical: 7, alignItems: "center" },
  typeButtonExpense: { backgroundColor: "#F9E9E5", borderColor: "#E9B9AB" },
  typeButtonIncome: { backgroundColor: "#E8F2ED", borderColor: "#B9D6CA" },
  typeButtonText: { color: "#7A837D", fontSize: 11, fontWeight: "900" },
  typeButtonExpenseText: { color: "#C85F3A" },
  typeButtonIncomeText: { color: "#0E6B56" },
  batchCategoryActions: { marginTop: 9, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#E8E3DB", flexDirection: "row", alignItems: "center", gap: 8 },
  batchCategoryLabel: { flex: 1, color: "#6D7770", fontSize: 10, fontWeight: "800" },
  batchCategoryButtons: { flexDirection: "row", gap: 6 },
  batchCategoryButton: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1 },
  batchCategoryExpenseButton: { backgroundColor: "#FFF1ED", borderColor: "#EDC1B5" },
  batchCategoryIncomeButton: { backgroundColor: "#EBF5EF", borderColor: "#B9D6CA" },
  batchCategoryExpenseText: { color: "#C85F3A", fontSize: 10, fontWeight: "900" },
  batchCategoryIncomeText: { color: "#0E6B56", fontSize: 10, fontWeight: "900" },
  showMoreButton: { marginTop: 10, alignItems: "center", paddingVertical: 10, borderRadius: 10, backgroundColor: "#F1F6F3" },
  showMoreText: { color: "#0E6B56", fontSize: 12, fontWeight: "900" },
  issuesPanel: { marginTop: 14, padding: 11, borderRadius: 12, backgroundColor: "#FFF3F0", borderWidth: 1, borderColor: "#F1C6BA" },
  issuesTitle: { color: "#9C351E", fontSize: 13, fontWeight: "900" },
  issuesDescription: { color: "#9C513E", fontSize: 11, lineHeight: 17, marginTop: 4 },
  issueRow: { marginTop: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: "#F4D8D0" },
  issueLocation: { color: "#9C351E", fontSize: 11, fontWeight: "900" },
  issue: { color: "#B5472C", fontSize: 11, lineHeight: 17, marginTop: 3 },
  showIssuesButton: { alignSelf: "flex-start", marginTop: 10, paddingVertical: 5 },
  showIssuesText: { color: "#9C351E", fontSize: 11, fontWeight: "900" },
  confirmButton: { marginTop: 15, borderRadius: 13, paddingVertical: 12, alignItems: "center", backgroundColor: "#0E6B56" },
  confirmText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
});
