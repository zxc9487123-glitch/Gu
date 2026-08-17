import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system/next";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

import { parseExcelTransactions, type ExcelImportPreview } from "@/lib/excel-import";

const EXCEL_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
];

type Props = {
  onConfirm: (preview: ExcelImportPreview) => Promise<{ added: number; skipped: number }>;
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
    } catch {
      setError("無法讀取此 Excel 檔案。請確認檔案為 .xlsx 或 .xls 格式。" );
    } finally {
      setIsParsing(false);
    }
  };

  const importPreview = async () => {
    if (!preview || preview.valid.length === 0) return;
    setIsSaving(true);
    try {
      const imported = await onConfirm(preview);
      setResult(`已新增 ${imported.added} 筆交易；略過 ${imported.skipped} 筆重複資料。`);
      setPreview(null);
      setFilename("");
    } catch {
      setError("匯入時發生問題，請稍後再試。" );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>匯入 Excel</Text>
      <Text style={styles.description}>第一張工作表請包含：日期、類型、分類、金額、備註。類型限「收入」或「支出」，日期使用 YYYY-MM-DD。</Text>
      <Pressable onPress={() => void selectFile()} disabled={isParsing || isSaving} style={({ pressed }) => [styles.selectButton, pressed && styles.pressed, (isParsing || isSaving) && styles.disabled]}>
        <Text style={styles.selectText}>{isParsing ? "正在讀取檔案…" : "選擇 Excel 檔案"}</Text>
      </Pressable>
      {filename ? <Text style={styles.filename}>已選擇：{filename}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {result ? <Text style={styles.success}>{result}</Text> : null}

      {preview ? (
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>匯入預覽</Text>
          <Text style={styles.previewText}>工作表「{preview.worksheetName}」：掃描 {preview.scannedRows} 列，其中 {preview.valid.length} 列可匯入。</Text>
          {preview.valid.slice(0, 3).map((item, index) => (
            <View key={`${item.date}-${item.amount}-${index}`} style={styles.previewRow}>
              <Text style={styles.previewCategory}>{item.category}</Text>
              <Text style={styles.previewMeta}>{item.date} ・ {item.type === "income" ? "收入" : "支出"} ・ NT$ {item.amount.toLocaleString("zh-TW")}</Text>
            </View>
          ))}
          {preview.issues.slice(0, 3).map((issue) => <Text key={`${issue.row}-${issue.message}`} style={styles.issue}>第 {issue.row} 列：{issue.message}</Text>)}
          {preview.issues.length > 3 ? <Text style={styles.issue}>另有 {preview.issues.length - 3} 項資料問題。</Text> : null}
          <Pressable onPress={() => void importPreview()} disabled={preview.valid.length === 0 || isSaving} style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed, (preview.valid.length === 0 || isSaving) && styles.disabled]}>
            <Text style={styles.confirmText}>{isSaving ? "正在匯入…" : `確認匯入 ${preview.valid.length} 筆`}</Text>
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
  previewRow: { marginTop: 10, padding: 10, borderRadius: 11, backgroundColor: "#F8F6F1" },
  previewCategory: { color: "#334039", fontSize: 13, fontWeight: "800" },
  previewMeta: { color: "#7A837D", fontSize: 11, marginTop: 3 },
  issue: { color: "#B5472C", fontSize: 11, lineHeight: 17, marginTop: 7 },
  confirmButton: { marginTop: 15, borderRadius: 13, paddingVertical: 12, alignItems: "center", backgroundColor: "#0E6B56" },
  confirmText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
});
