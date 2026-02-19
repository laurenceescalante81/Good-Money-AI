import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, TextInput, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useFinance } from "@/contexts/FinanceContext";

const BUDGET_CATEGORIES = [
  { name: "Food", icon: "restaurant-outline", color: "#F59E0B" },
  { name: "Transport", icon: "car-outline", color: "#3B82F6" },
  { name: "Shopping", icon: "bag-outline", color: "#EC4899" },
  { name: "Bills", icon: "flash-outline", color: "#EF4444" },
  { name: "Entertainment", icon: "game-controller-outline", color: "#8B5CF6" },
  { name: "Health", icon: "heart-outline", color: "#10B981" },
  { name: "Education", icon: "book-outline", color: "#06B6D4" },
  { name: "Other", icon: "ellipsis-horizontal-circle-outline", color: "#6B7280" },
];

export default function AddBudgetScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { addBudget, budgets } = useFinance();

  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");

  const selectedCat = BUDGET_CATEGORIES.find(c => c.name === category);
  const alreadyExists = budgets.some(b => b.category === category);
  const canSave = category && limit && parseFloat(limit) > 0 && !alreadyExists;

  const handleSave = () => {
    if (!canSave || !selectedCat) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addBudget({
      category,
      limit: parseFloat(limit),
      color: selectedCat.color,
    });
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.topTitle}>New Budget</Text>
        <Pressable onPress={handleSave} disabled={!canSave} hitSlop={12}>
          <Ionicons name="checkmark" size={26} color={canSave ? Colors.light.tint : Colors.light.gray300} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 20 }}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.catGrid}>
            {BUDGET_CATEGORIES.map(c => {
              const exists = budgets.some(b => b.category === c.name);
              return (
                <Pressable
                  key={c.name}
                  onPress={() => !exists && setCategory(c.name)}
                  style={[
                    styles.catBtn,
                    category === c.name && { backgroundColor: c.color + "20", borderColor: c.color },
                    exists && { opacity: 0.4 },
                  ]}
                  disabled={exists}
                >
                  <View style={[styles.catBtnIcon, { backgroundColor: c.color + "15" }]}>
                    <Ionicons name={c.icon as any} size={20} color={c.color} />
                  </View>
                  <Text style={[styles.catBtnText, category === c.name && { color: c.color }]}>
                    {c.name}
                  </Text>
                  {exists && <Ionicons name="checkmark-circle" size={14} color={Colors.light.gray400} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Monthly Limit</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountCurrency}>$</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={Colors.light.gray300}
              keyboardType="decimal-pad"
              value={limit}
              onChangeText={setLimit}
            />
          </View>
        </View>

        <View style={styles.presetRow}>
          {[100, 250, 500, 1000].map(v => (
            <Pressable
              key={v}
              onPress={() => setLimit(v.toString())}
              style={[styles.presetBtn, limit === v.toString() && styles.presetBtnActive]}
            >
              <Text style={[styles.presetText, limit === v.toString() && styles.presetTextActive]}>${v}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 },
  topTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 17, color: Colors.light.text },
  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionLabel: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.textMuted, marginBottom: 12 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: Colors.light.card, borderWidth: 1.5, borderColor: "transparent" },
  catBtnIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  catBtnText: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.text },
  amountRow: { flexDirection: "row", alignItems: "center" },
  amountCurrency: { fontFamily: "DMSans_700Bold", fontSize: 36, color: Colors.light.text, marginRight: 4 },
  amountInput: { fontFamily: "DMSans_700Bold", fontSize: 36, color: Colors.light.text, flex: 1, padding: 0 },
  presetRow: { flexDirection: "row", paddingHorizontal: 20, gap: 10 },
  presetBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.light.card, alignItems: "center" },
  presetBtnActive: { backgroundColor: Colors.light.navy },
  presetText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.textSecondary },
  presetTextActive: { color: Colors.light.white },
});
