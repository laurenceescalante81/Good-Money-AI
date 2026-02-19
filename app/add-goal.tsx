import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, TextInput, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useFinance } from "@/contexts/FinanceContext";

const GOAL_ICONS = [
  { icon: "airplane-outline", label: "Travel" },
  { icon: "home-outline", label: "Home" },
  { icon: "car-outline", label: "Car" },
  { icon: "school-outline", label: "Education" },
  { icon: "medkit-outline", label: "Emergency" },
  { icon: "gift-outline", label: "Gift" },
  { icon: "diamond-outline", label: "Luxury" },
  { icon: "fitness-outline", label: "Health" },
  { icon: "laptop-outline", label: "Tech" },
  { icon: "cash-outline", label: "Savings" },
];

export default function AddGoalScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { addGoal } = useFinance();

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("cash-outline");
  const [months, setMonths] = useState("6");

  const canSave = name.trim() && targetAmount && parseFloat(targetAmount) > 0;

  const handleSave = () => {
    if (!canSave) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + parseInt(months || "6"));
    addGoal({
      name: name.trim(),
      targetAmount: parseFloat(targetAmount),
      currentAmount: 0,
      targetDate: targetDate.toISOString(),
      icon: selectedIcon,
    });
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.topTitle}>New Goal</Text>
        <Pressable onPress={handleSave} disabled={!canSave} hitSlop={12}>
          <Ionicons name="checkmark" size={26} color={canSave ? Colors.light.tint : Colors.light.gray300} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 20 }}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Goal Name</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="e.g. Vacation Fund"
            placeholderTextColor={Colors.light.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Target Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountCurrency}>$</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={Colors.light.gray300}
              keyboardType="decimal-pad"
              value={targetAmount}
              onChangeText={setTargetAmount}
            />
          </View>
        </View>

        <View style={styles.presetRow}>
          {[1000, 5000, 10000, 25000].map(v => (
            <Pressable
              key={v}
              onPress={() => setTargetAmount(v.toString())}
              style={[styles.presetBtn, targetAmount === v.toString() && styles.presetBtnActive]}
            >
              <Text style={[styles.presetText, targetAmount === v.toString() && styles.presetTextActive]}>
                ${v >= 1000 ? `${v / 1000}k` : v}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.section, { marginTop: 28 }]}>
          <Text style={styles.sectionLabel}>Timeline (months)</Text>
          <View style={styles.monthsRow}>
            {["3", "6", "12", "24"].map(m => (
              <Pressable
                key={m}
                onPress={() => setMonths(m)}
                style={[styles.monthBtn, months === m && styles.monthBtnActive]}
              >
                <Text style={[styles.monthText, months === m && styles.monthTextActive]}>{m}mo</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Icon</Text>
          <View style={styles.iconGrid}>
            {GOAL_ICONS.map(g => (
              <Pressable
                key={g.icon}
                onPress={() => setSelectedIcon(g.icon)}
                style={[styles.iconBtn, selectedIcon === g.icon && styles.iconBtnActive]}
              >
                <Ionicons name={g.icon as any} size={24} color={selectedIcon === g.icon ? Colors.light.white : Colors.light.goal} />
              </Pressable>
            ))}
          </View>
        </View>

        {canSave && (
          <View style={styles.previewCard}>
            <View style={styles.previewRow}>
              <Ionicons name={selectedIcon as any} size={28} color={Colors.light.goal} />
              <View style={styles.previewInfo}>
                <Text style={styles.previewName}>{name}</Text>
                <Text style={styles.previewTarget}>
                  Save ${(parseFloat(targetAmount) / parseInt(months || "6")).toFixed(0)}/month
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 },
  topTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 17, color: Colors.light.text },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionLabel: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.textMuted, marginBottom: 12 },
  nameInput: { fontFamily: "DMSans_500Medium", fontSize: 17, color: Colors.light.text, backgroundColor: Colors.light.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14 },
  amountRow: { flexDirection: "row", alignItems: "center" },
  amountCurrency: { fontFamily: "DMSans_700Bold", fontSize: 36, color: Colors.light.text, marginRight: 4 },
  amountInput: { fontFamily: "DMSans_700Bold", fontSize: 36, color: Colors.light.text, flex: 1, padding: 0 },
  presetRow: { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 4 },
  presetBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.light.card, alignItems: "center" },
  presetBtnActive: { backgroundColor: Colors.light.goal },
  presetText: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: Colors.light.textSecondary },
  presetTextActive: { color: Colors.light.white },
  monthsRow: { flexDirection: "row", gap: 10 },
  monthBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.light.card, alignItems: "center" },
  monthBtnActive: { backgroundColor: Colors.light.navy },
  monthText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.textSecondary },
  monthTextActive: { color: Colors.light.white },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  iconBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.light.goal + "15", alignItems: "center", justifyContent: "center" },
  iconBtnActive: { backgroundColor: Colors.light.goal },
  previewCard: { marginHorizontal: 20, backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, marginTop: 8 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  previewInfo: { flex: 1 },
  previewName: { fontFamily: "DMSans_600SemiBold", fontSize: 16, color: Colors.light.text },
  previewTarget: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.light.textMuted, marginTop: 2 },
});
