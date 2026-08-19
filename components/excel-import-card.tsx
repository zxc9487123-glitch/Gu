import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system/next";
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useState } from "react";

import { applyExcelAutoCategoryRules, detectExcelImportDuplicates, overrideExcelPreviewCategoryType, parseExcelTransactions, type ExcelAutoCategoryRule, type ExcelAutoCategoryRuleInput, type ExcelImportMode, type ExcelImportPreview } from "@/lib/excel-import";
import { categoriesFor, type Transaction, type TransactionType } from "@/lib/finance";

const EXCEL_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
];

type Props = {
  existingTransactions: Transaction[];
  autoRules: ExcelAutoCategoryRule[];
  onAddAutoRule: (input: ExcelAutoCategoryRuleInput) => Promise<ExcelAutoCategoryRule>;
  onAddAutoRules: (inputs: ExcelAutoCategoryRuleInput[]) => Promise<ExcelAutoCategoryRule[]>;
  onConfirm: (preview: ExcelImportPreview, mode: ExcelImportMode) => Promise<{ added: number; updated: number; skipped: number }>;
};

async function fileBuffer(asset: DocumentPicker.DocumentPickerAsset) {
  if (Platform.OS === "web" && asset.file) return asset.file.arrayBuffer();
  return new File(asset.uri).arrayBuffer();
}

export function ExcelImportCard({ existingTransactions, autoRules, onAddAutoRule, onAddAutoRules, onConfirm }: Props) {
  const [preview, setPreview] = useState<ExcelImportPreview | null>(null);
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [mode, setMode] = useState<ExcelImportMode>("skip");
  const [showAllRows, setShowAllRows] = useState(false);
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [ruleKeyword, setRuleKeyword] = useState("");
  const [ruleType, setRuleType] = useState<TransactionType>("expense");
  const [ruleCategory, setRuleCategory] = useState(categoriesFor("expense")[0]?.name ?? "其他支出");
  const [ruleError, setRuleError] = useState("");
  const [rememberingRow, setRememberingRow] = useState<number | null>(null);
  const [rememberKeyword, setRememberKeyword] = useState("");
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
      setPreview(applyExcelAutoCategoryRules(parsed, autoRules));
      setFilename(asset.name);
      setRuleKeyword("");
      setRuleError("");
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

  const confirmRemovePreviewTransaction = (item: ExcelImportPreview["valid"][number]) => {
    Alert.alert("從匯入預覽移除？", `第 ${item.row} 列將不會匯入，且不會影響目前裝置中的既有交易。`, [
      { text: "取消", style: "cancel" },
      { text: "移除此筆", style: "destructive", onPress: () => setPreview((current) => current ? { ...current, valid: current.valid.filter((candidate) => candidate.row !== item.row) } : current) },
    ]);
  };

  const categoryCounts = preview?.valid.reduce<Record<string, number>>((counts, item) => {
    counts[item.category] = (counts[item.category] ?? 0) + 1;
    return counts;
  }, {}) ?? {};
  const normalizedRuleKeyword = ruleKeyword.trim().toLocaleLowerCase();
  const ruleMatchCount = normalizedRuleKeyword ? preview?.valid.filter((item) => item.note.toLocaleLowerCase().includes(normalizedRuleKeyword)).length ?? 0 : 0;
  const duplicates = preview ? detectExcelImportDuplicates(existingTransactions, preview.valid) : [];
  const duplicateByRow = new Map(duplicates.map((item) => [item.row, item]));
  const chooseRuleType = (nextType: TransactionType) => {
    setRuleType(nextType);
    setRuleCategory(categoriesFor(nextType)[0]?.name ?? "未分類");
  };
  const applySavedRulesToPreview = () => {
    setPreview((current) => current ? applyExcelAutoCategoryRules(current, autoRules) : current);
  };
  const saveRuleAndApply = async () => {
    if (!ruleKeyword.trim()) {
      setRuleError("請先輸入要比對的備註關鍵字。");
      return;
    }
    const rule = await onAddAutoRule({ keyword: ruleKeyword.trim(), type: ruleType, category: ruleCategory });
    setPreview((current) => current ? applyExcelAutoCategoryRules(current, [rule, ...autoRules]) : current);
    setRuleKeyword("");
    setRuleError("");
  };

  const manualCorrections = preview?.valid.filter((item) => item.typeResolution === "manual" && item.note.trim()) ?? [];

  const startRememberingManualCorrection = (item: ExcelImportPreview["valid"][number]) => {
    setRememberingRow(item.row);
    setRememberKeyword(item.note.trim());
    setRuleError("");
  };

  const saveManualCorrectionRule = async (item: ExcelImportPreview["valid"][number]) => {
    const keyword = rememberKeyword.trim();
    if (!keyword) return;
    const existingRule = autoRules.find((rule) => rule.keyword.toLocaleLowerCase() === keyword.toLocaleLowerCase() && rule.type === item.type && rule.category === item.category);
    if (existingRule) {
      setResult(`「${keyword}」已有相同的自動分類規則。`);
      setRememberingRow(null);
      return;
    }
    setIsSaving(true);
    try {
      await onAddAutoRule({ keyword, type: item.type, category: item.category });
      setResult(`已記住此修正：下次備註含「${keyword}」時，會自動分類為${item.type === "expense" ? "支出" : "收入"}／${item.category}。`);
      setRememberingRow(null);
    } catch {
      setError("無法儲存自動分類規則，請稍後再試。");
    } finally {
      setIsSaving(false);
    }
  };

  const createRulesFromAllManualCorrections = async () => {
    const existingKeywords = new Set(autoRules.map((rule) => rule.keyword.trim().toLocaleLowerCase()));
    const uniqueManualCorrections = new Map<string, ExcelImportPreview["valid"][number]>();
    manualCorrections.forEach((item) => {
      const keyword = item.note.trim().toLocaleLowerCase();
      if (!existingKeywords.has(keyword) && !uniqueManualCorrections.has(keyword)) uniqueManualCorrections.set(keyword, item);
    });
    const inputs = [...uniqueManualCorrections.values()].map((item) => ({ keyword: item.note.trim(), type: item.type, category: item.category }));
    if (inputs.length === 0) {
      setResult("所有手動修正交易都已有相同關鍵字的規則。 ");
      return;
    }
    setIsSaving(true);
    try {
      const added = await onAddAutoRules(inputs);
      setResult(`已從 ${manualCorrections.length} 筆手動修正建立 ${added.length} 條自動分類規則。`);
    } catch {
      setError("無法批次儲存自動分類規則，請稍後再試。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>匯入 Excel</Text>
      <Text style={styles.description}>支援 .xlsx／.xls；格式問題會在預覽中標示。</Text>
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
          <View style={styles.rulePanel}>
            <View style={styles.rulePanelHeading}>
              <View style={styles.rulePanelCopy}><Text style={styles.keywordTitle}>自動分類規則</Text><Text style={styles.keywordDescription}>1. 輸入備註關鍵字　2. 指定收支與分類　3. 先預覽後儲存套用。</Text></View>
              <Pressable disabled={autoRules.length === 0} onPress={applySavedRulesToPreview} style={({ pressed }) => [styles.applySavedRulesButton, pressed && styles.pressed, autoRules.length === 0 && styles.disabled]}><Text style={styles.applySavedRulesText}>套用已存規則</Text></Pressable>
            </View>
            <TextInput value={ruleKeyword} onChangeText={(value) => { setRuleKeyword(value); setRuleError(""); }} placeholder="1. 輸入備註關鍵字，例如 UBER" placeholderTextColor="#929A94" style={styles.keywordInput} returnKeyType="next" />
            <Text style={styles.keywordMatchText}>{normalizedRuleKeyword ? `預覽符合 ${ruleMatchCount} 筆交易，尚未寫入正式資料` : "輸入關鍵字後顯示可套用筆數"}</Text>
            <View style={styles.ruleTypeActions}>
              <Pressable onPress={() => chooseRuleType("expense")} style={({ pressed }) => [styles.ruleTypeButton, ruleType === "expense" && styles.ruleTypeExpenseActive, pressed && styles.pressed]}><Text style={[styles.ruleTypeText, ruleType === "expense" && styles.ruleTypeExpenseText]}>2. 支出</Text></Pressable>
              <Pressable onPress={() => chooseRuleType("income")} style={({ pressed }) => [styles.ruleTypeButton, ruleType === "income" && styles.ruleTypeIncomeActive, pressed && styles.pressed]}><Text style={[styles.ruleTypeText, ruleType === "income" && styles.ruleTypeIncomeText]}>2. 收入</Text></Pressable>
            </View>
            <View style={styles.ruleCategoryGrid}>{categoriesFor(ruleType).map((category) => <Pressable key={category.name} onPress={() => setRuleCategory(category.name)} style={({ pressed }) => [styles.ruleCategoryChip, ruleCategory === category.name && styles.ruleCategoryChipActive, pressed && styles.pressed]}><Text style={[styles.ruleCategoryText, ruleCategory === category.name && styles.ruleCategoryTextActive]}>{category.name}</Text></Pressable>)}</View>
            {ruleError ? <Text style={styles.ruleError}>{ruleError}</Text> : null}
            <Pressable disabled={ruleMatchCount === 0 || isSaving} onPress={() => void saveRuleAndApply()} style={({ pressed }) => [styles.saveRuleButton, pressed && styles.pressed, (ruleMatchCount === 0 || isSaving) && styles.disabled]}><Text style={styles.saveRuleText}>3. 儲存規則並先套用到預覽</Text></Pressable>
            {autoRules.length > 0 ? <Text style={styles.savedRuleHint}>已儲存 {autoRules.length} 條規則；同筆交易符合多條時，最新規則優先。</Text> : null}
          </View>
          {manualCorrections.length > 1 ? <Pressable disabled={isSaving} onPress={() => void createRulesFromAllManualCorrections()} style={({ pressed }) => [styles.batchRememberButton, pressed && styles.pressed, isSaving && styles.disabled]}><View style={styles.batchRememberCopy}><Text style={styles.batchRememberTitle}>一鍵建立手動修正規則</Text><Text style={styles.batchRememberText}>將 {manualCorrections.length} 筆已手動修改交易各自儲存為規則。</Text></View><Text style={styles.batchRememberAction}>建立</Text></Pressable> : null}
          {duplicates.length > 0 ? <View style={styles.duplicatePanel}><Text style={styles.duplicateTitle}>可能重複交易（{duplicates.length}）</Text><Text style={styles.duplicateText}>已先標示可能重複項目；完全相同的交易會略過，日期、類型與分類相同的項目可開啟更新模式覆蓋。</Text></View> : null}
          {(showAllRows ? preview.valid : preview.valid.slice(0, 8)).map((item, index) => (
            <View key={`${item.date}-${item.amount}-${index}`} style={styles.previewRow}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewCategory}>{item.category}</Text>
                <View style={styles.previewBadges}>
                  <View style={[styles.sourceBadge, item.typeResolution === "inferred" && styles.sourceBadgeInferred, item.typeResolution === "manual" && styles.sourceBadgeManual, item.typeResolution === "rule" && styles.sourceBadgeRule]}>
                    <Text style={[styles.sourceBadgeText, item.typeResolution === "inferred" && styles.sourceBadgeTextInferred, item.typeResolution === "manual" && styles.sourceBadgeTextManual, item.typeResolution === "rule" && styles.sourceBadgeTextRule]}>{item.typeResolution === "explicit" ? "原始類型" : item.typeResolution === "manual" ? "已手動修改" : item.typeResolution === "rule" ? "規則套用" : "自動推斷"}</Text>
                  </View>
                  {duplicateByRow.has(item.row) ? <View style={styles.duplicateBadge}><Text style={styles.duplicateBadgeText}>可能重複</Text></View> : null}
                </View>
              </View>
              <Text style={styles.previewMeta}>第 {item.row} 列 ・ NT$ {item.amount.toLocaleString("zh-TW")}</Text>
              {item.appliedRuleName ? <Text style={styles.ruleAppliedText}>已依「{item.appliedRuleName}」套用分類</Text> : null}
              <View style={styles.typeActions}>
                <Pressable onPress={() => overrideType(index, "expense")} style={[styles.typeButton, item.type === "expense" && styles.typeButtonExpense]}>
                  <Text style={[styles.typeButtonText, item.type === "expense" && styles.typeButtonExpenseText]}>支出</Text>
                </Pressable>
                <Pressable onPress={() => overrideType(index, "income")} style={[styles.typeButton, item.type === "income" && styles.typeButtonIncome]}>
                  <Text style={[styles.typeButtonText, item.type === "income" && styles.typeButtonIncomeText]}>收入</Text>
                </Pressable>
              </View>
              <Pressable disabled={isSaving} onPress={() => confirmRemovePreviewTransaction(item)} style={({ pressed }) => [styles.removePreviewButton, pressed && styles.pressed, isSaving && styles.disabled]}><Text style={styles.removePreviewText}>刪除此筆預覽交易</Text></Pressable>
              {item.typeResolution === "manual" && item.note.trim() ? (rememberingRow === item.row ? <View style={styles.rememberEditor}><Text style={styles.rememberEditorLabel}>比對關鍵字</Text><TextInput value={rememberKeyword} onChangeText={setRememberKeyword} placeholder="輸入用於比對的關鍵字" placeholderTextColor="#87949C" style={styles.rememberEditorInput} returnKeyType="done" onSubmitEditing={() => void saveManualCorrectionRule(item)} /><Text style={styles.rememberEditorHint}>後續備註含有此文字時，會套用目前的收支與分類。</Text><View style={styles.rememberEditorActions}><Pressable onPress={() => setRememberingRow(null)} style={({ pressed }) => [styles.rememberCancelButton, pressed && styles.pressed]}><Text style={styles.rememberCancelText}>取消</Text></Pressable><Pressable disabled={isSaving || !rememberKeyword.trim()} onPress={() => void saveManualCorrectionRule(item)} style={({ pressed }) => [styles.rememberSaveButton, pressed && styles.pressed, (isSaving || !rememberKeyword.trim()) && styles.disabled]}><Text style={styles.rememberSaveText}>儲存規則</Text></Pressable></View></View> : <Pressable disabled={isSaving} onPress={() => startRememberingManualCorrection(item)} style={({ pressed }) => [styles.rememberCorrectionButton, pressed && styles.pressed, isSaving && styles.disabled]}><Text style={styles.rememberCorrectionText}>記住此修正</Text><Text style={styles.rememberCorrectionHint}>先編輯比對關鍵字後再儲存</Text></Pressable>) : null}
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
  panel: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#ECE7DE" },
  title: { color: "#1F2421", fontSize: 16, fontWeight: "900" },
  description: { color: "#7A837D", fontSize: 12, lineHeight: 18, marginTop: 5 },
  selectButton: { marginTop: 10, borderRadius: 12, paddingVertical: 10, alignItems: "center", backgroundColor: "#E8F2ED", borderWidth: 1, borderColor: "#B9D6CA" },
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
  rulePanel: { marginTop: 13, padding: 11, borderRadius: 12, backgroundColor: "#F2F6F3", borderWidth: 1, borderColor: "#D7E6DD" },
  rulePanelHeading: { alignItems: "flex-start", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  rulePanelCopy: { flex: 1, minWidth: 0 },
  applySavedRulesButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#B9D6CA", borderRadius: 8, borderWidth: 1, minHeight: 30, paddingHorizontal: 8 },
  applySavedRulesText: { color: "#0E6B56", fontSize: 10, fontWeight: "900" },
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
  ruleTypeActions: { flexDirection: "row", gap: 7, marginTop: 8 },
  ruleTypeButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#CFDAD2", borderRadius: 8, borderWidth: 1, flex: 1, minHeight: 33, justifyContent: "center" },
  ruleTypeExpenseActive: { backgroundColor: "#FFF1ED", borderColor: "#EDC1B5" },
  ruleTypeIncomeActive: { backgroundColor: "#EBF5EF", borderColor: "#B9D6CA" },
  ruleTypeText: { color: "#69756E", fontSize: 11, fontWeight: "900" },
  ruleTypeExpenseText: { color: "#C85F3A" },
  ruleTypeIncomeText: { color: "#0E6B56" },
  ruleCategoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  ruleCategoryChip: { backgroundColor: "#FFFFFF", borderColor: "#CFDAD2", borderRadius: 8, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 5 },
  ruleCategoryChipActive: { backgroundColor: "#E8F2ED", borderColor: "#0E6B56" },
  ruleCategoryText: { color: "#66736B", fontSize: 10, fontWeight: "800" },
  ruleCategoryTextActive: { color: "#0E6B56" },
  ruleError: { color: "#B5472C", fontSize: 10, fontWeight: "800", marginTop: 7 },
  saveRuleButton: { alignItems: "center", backgroundColor: "#0E6B56", borderRadius: 9, justifyContent: "center", marginTop: 9, minHeight: 35 },
  saveRuleText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  savedRuleHint: { color: "#587066", fontSize: 10, lineHeight: 15, marginTop: 7 },
  batchRememberButton: { alignItems: "center", backgroundColor: "#EDF3FF", borderColor: "#C7D6F0", borderRadius: 11, borderWidth: 1, flexDirection: "row", gap: 10, justifyContent: "space-between", marginTop: 12, padding: 10 },
  batchRememberCopy: { flex: 1, minWidth: 0 },
  batchRememberTitle: { color: "#365C96", fontSize: 12, fontWeight: "900" },
  batchRememberText: { color: "#58729D", fontSize: 10, lineHeight: 15, marginTop: 3 },
  batchRememberAction: { color: "#365C96", fontSize: 11, fontWeight: "900" },
  duplicatePanel: { backgroundColor: "#FFF6E9", borderColor: "#F0D59A", borderRadius: 12, borderWidth: 1, marginTop: 12, padding: 10 },
  duplicateTitle: { color: "#8A5E05", fontSize: 12, fontWeight: "900" },
  duplicateText: { color: "#8A6A25", fontSize: 10, lineHeight: 16, marginTop: 3 },
  previewRow: { marginTop: 10, padding: 10, borderRadius: 11, backgroundColor: "#F8F6F1" },
  previewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  previewBadges: { alignItems: "flex-end", flexDirection: "row", flexShrink: 0, gap: 4 },
  previewCategory: { color: "#334039", fontSize: 13, fontWeight: "800" },
  previewMeta: { color: "#7A837D", fontSize: 11, marginTop: 3 },
  sourceBadge: { borderRadius: 9, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: "#E7ECE8" },
  sourceBadgeInferred: { backgroundColor: "#FFF0CD" },
  sourceBadgeManual: { backgroundColor: "#E7EDF8" },
  sourceBadgeRule: { backgroundColor: "#E8F2ED" },
  sourceBadgeText: { color: "#607068", fontSize: 10, fontWeight: "900" },
  sourceBadgeTextInferred: { color: "#8A5E05" },
  sourceBadgeTextManual: { color: "#365C96" },
  sourceBadgeTextRule: { color: "#0E6B56" },
  duplicateBadge: { backgroundColor: "#FFF0CD", borderRadius: 9, paddingHorizontal: 7, paddingVertical: 3 },
  duplicateBadgeText: { color: "#8A5E05", fontSize: 10, fontWeight: "900" },
  ruleAppliedText: { color: "#0E6B56", fontSize: 10, fontWeight: "800", marginTop: 4 },
  typeActions: { flexDirection: "row", gap: 7, marginTop: 9 },
  typeButton: { flex: 1, borderRadius: 9, borderWidth: 1, borderColor: "#DDE1DC", backgroundColor: "#FFFFFF", paddingVertical: 7, alignItems: "center" },
  typeButtonExpense: { backgroundColor: "#F9E9E5", borderColor: "#E9B9AB" },
  typeButtonIncome: { backgroundColor: "#E8F2ED", borderColor: "#B9D6CA" },
  typeButtonText: { color: "#7A837D", fontSize: 11, fontWeight: "900" },
  typeButtonExpenseText: { color: "#C85F3A" },
  typeButtonIncomeText: { color: "#0E6B56" },
  removePreviewButton: { alignSelf: "flex-end", marginTop: 7, paddingHorizontal: 8, paddingVertical: 4 },
  removePreviewText: { color: "#B5472C", fontSize: 10, fontWeight: "900" },
  rememberCorrectionButton: { alignItems: "center", backgroundColor: "#EDF3FF", borderColor: "#C7D6F0", borderRadius: 9, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingHorizontal: 9, paddingVertical: 7 },
  rememberCorrectionText: { color: "#365C96", fontSize: 11, fontWeight: "900" },
  rememberCorrectionHint: { color: "#58729D", flex: 1, fontSize: 9, marginLeft: 8, textAlign: "right" },
  rememberEditor: { backgroundColor: "#EDF3FF", borderColor: "#C7D6F0", borderRadius: 9, borderWidth: 1, marginTop: 8, padding: 9 },
  rememberEditorLabel: { color: "#365C96", fontSize: 10, fontWeight: "900" },
  rememberEditorInput: { backgroundColor: "#FFFFFF", borderColor: "#C7D6F0", borderRadius: 8, borderWidth: 1, color: "#334039", fontSize: 11, marginTop: 6, minHeight: 36, paddingHorizontal: 9 },
  rememberEditorHint: { color: "#58729D", fontSize: 9, lineHeight: 14, marginTop: 5 },
  rememberEditorActions: { flexDirection: "row", gap: 7, marginTop: 8 },
  rememberCancelButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#C7D6F0", borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 32 },
  rememberCancelText: { color: "#58729D", fontSize: 10, fontWeight: "900" },
  rememberSaveButton: { alignItems: "center", backgroundColor: "#365C96", borderRadius: 8, flex: 1, justifyContent: "center", minHeight: 32 },
  rememberSaveText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
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
