import { useLocalSearchParams } from "expo-router";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";

import { AnalysisContent } from "@/app/(tabs)/analysis";
import { TransactionsContent } from "@/app/(tabs)/transactions";
import { ScreenContainer } from "@/components/screen-container";

type WorkspaceMode = "analysis" | "details";

export default function AccountingScreen() {
  const { mode, category } = useLocalSearchParams<{ mode?: string; category?: string }>();
  const [activeMode, setActiveMode] = useState<WorkspaceMode>(mode === "details" ? "details" : "analysis");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(category);
  const contentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (mode === "details") setActiveMode("details");
    if (category) setSelectedCategory(category);
  }, [category, mode]);

  const changeMode = useCallback((nextMode: WorkspaceMode) => {
    if (nextMode === activeMode) return;
    Animated.timing(contentOpacity, { toValue: 0, duration: 90, useNativeDriver: true }).start(() => {
      setActiveMode(nextMode);
      Animated.timing(contentOpacity, { toValue: 1, duration: 170, useNativeDriver: true }).start();
    });
  }, [activeMode, contentOpacity]);

  const openCategoryDetails = (nextCategory: string) => {
    setSelectedCategory(nextCategory);
    changeMode("details");
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={styles.workspaceHeader}>
        <Text style={styles.workspaceTitle}>花費分析</Text>
        <View style={styles.modeControl}>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: activeMode === "analysis" }} onPress={() => changeMode("analysis")} style={({ pressed }) => [styles.modeButton, activeMode === "analysis" && styles.modeButtonActive, pressed && styles.modeButtonPressed]}>
            <Text style={[styles.modeText, activeMode === "analysis" && styles.modeTextActive]}>總覽</Text>
          </Pressable>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: activeMode === "details" }} onPress={() => changeMode("details")} style={({ pressed }) => [styles.modeButton, activeMode === "details" && styles.modeButtonActive, pressed && styles.modeButtonPressed]}>
            <Text style={[styles.modeText, activeMode === "details" && styles.modeTextActive]}>交易</Text>
          </Pressable>
        </View>
      </View>
      <Animated.View style={[styles.modeContent, { opacity: contentOpacity }]}>
        {activeMode === "analysis" ? <AnalysisContent onCategoryPress={openCategoryDetails} /> : <TransactionsContent initialCategory={selectedCategory} onClearCategory={() => setSelectedCategory(undefined)} />}
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  workspaceHeader: { alignItems: "center", backgroundColor: "#FFF4F8", borderBottomColor: "#EADDE6", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 10 },
  workspaceTitle: { color: "#3F3448", fontSize: 21, fontWeight: "900" },
  modeControl: { backgroundColor: "#F0E8FA", borderRadius: 11, flexDirection: "row", padding: 3 },
  modeButton: { alignItems: "center", borderRadius: 8, justifyContent: "center", minHeight: 30, minWidth: 58, paddingHorizontal: 10 },
  modeButtonActive: { backgroundColor: "#FFFCFF" },
  modeButtonPressed: { opacity: 0.72 },
  modeText: { color: "#806F84", fontSize: 12, fontWeight: "800" },
  modeTextActive: { color: "#7653A8" },
  modeContent: { flex: 1, overflow: "hidden" },
});
