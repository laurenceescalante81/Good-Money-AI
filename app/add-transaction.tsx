import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, TextInput, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

function goBack() { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/budget"); }
import Colors from "@/constants/colors";
import { useFinance, TransactionType } from "@/contexts/FinanceContext";
import { useAccessibility } from '@/contexts/AccessibilityContext';

const EXPENSE_CATS = [
  { name: "Groceries", icon: "cart-outline", color: "#F59E0B" },
  { name: "Rent", icon: "home-outline", color: "#3B82F6" },
  { name: "Petrol", icon: "car-outline", color: "#6366F1" },
  { name: "Utilities", icon: "flash-outline", color: "#EF4444" },
  { name: "Dining Out", icon: "restaurant-outline", color: "#EC4899" },
  { name: "Transport", icon: "bus-outline", color: "#14B8A6" },
  { name: "Health", icon: "heart-outline", color: "#10B981" },
  { name: "Entertainment", icon: "game-controller-outline", color: "#8B5CF6" },
  { name: "Shopping", icon: "bag-outline", color: "#F43F5E" },
  { name: "Education", icon: "book-outline", color: "#06B6D4" },
  { name: "Other", icon: "ellipsis-horizontal-circle-outline", color: "#6B7280" },
];

const INCOME_CATS = [
  { name: "Salary", icon: "cash-outline", color: "#10B981" },
  { name: "Freelance", icon: "briefcase-outline", color: "#3B82F6" },
  { name: "Investment", icon: "trending-up-outline", color: "#8B5CF6" },
  { name: "Other", icon: "ellipsis-horizontal-circle-outline", color: "#6B7280" },
];

export default function AddTransactionScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 16 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { addTransaction, profileMode } = useFinance();
  const { fs, is } = useAccessibility();

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [owner, setOwner] = useState<"me" | "partner">("me");

  const categories = type === "expense" ? EXPENSE_CATS : INCOME_CATS;
  const canSave = amount && parseFloat(amount) > 0 && category;

  const handleSave = () => {
    if (!canSave) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addTransaction({ type, amount: parseFloat(amount), category, note, date: new Date().toISOString(), owner });
    goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={12}><Ionicons name="close" size={is(26)} color={Colors.light.text} /></Pressable>
        <Text style={[styles.topTitle, { fontSize: fs(17) }]}>New Transaction</Text>
        <Pressable onPress={handleSave} disabled={!canSave} hitSlop={12}><Ionicons name="checkmark" size={is(26)} color={canSave ? Colors.light.tint : Colors.light.gray300} /></Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 20 }}>
        <View style={styles.typeRow}>
          <Pressable onPress={() => { setType("expense"); setCategory(""); }} style={[styles.typeBtn, type === "expense" && styles.typeBtnExp]}>
            <Ionicons name="arrow-up-circle" size={is(20)} color={type === "expense" ? Colors.light.white : Colors.light.expense} />
            <Text style={[styles.typeText, type === "expense" && styles.typeTextActive, { fontSize: fs(15) }]}>Expense</Text>
          </Pressable>
          <Pressable onPress={() => { setType("income"); setCategory(""); }} style={[styles.typeBtn, type === "income" && styles.typeBtnInc]}>
            <Ionicons name="arrow-down-circle" size={is(20)} color={type === "income" ? Colors.light.white : Colors.light.income} />
            <Text style={[styles.typeText, type === "income" && styles.typeTextActive, { fontSize: fs(15) }]}>Income</Text>
          </Pressable>
        </View>
        <View style={styles.section}>
          <Text style={[styles.label, { fontSize: fs(13) }]}>Amount (AUD)</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.dollar, { fontSize: fs(36) }]}>$</Text>
            <TextInput style={[styles.amountInput, { fontSize: fs(36) }]} placeholder="0.00" placeholderTextColor={Colors.light.gray300} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} autoFocus />
          </View>
        </View>
        <View style={styles.section}>
          <Text style={[styles.label, { fontSize: fs(13) }]}>Category</Text>
          <View style={styles.catGrid}>
            {categories.map(c => (
              <Pressable key={c.name} onPress={() => setCategory(c.name)} style={[styles.catBtn, category === c.name && { backgroundColor: c.color + "20", borderColor: c.color }]}>
                <View style={[styles.catIcon, { backgroundColor: c.color + "15" }]}><Ionicons name={c.icon as any} size={is(18)} color={c.color} /></View>
                <Text style={[styles.catText, category === c.name && { color: c.color }, { fontSize: fs(13) }]}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <Text style={[styles.label, { fontSize: fs(13) }]}>Note (optional)</Text>
          <TextInput style={[styles.noteInput, { fontSize: fs(15) }]} placeholder="What's this for?" placeholderTextColor={Colors.light.textMuted} value={note} onChangeText={setNote} />
        </View>
        {profileMode === "couple" && (
          <View style={styles.section}>
            <Text style={[styles.label, { fontSize: fs(13) }]}>Who</Text>
            <View style={styles.ownerRow}>
              <Pressable onPress={() => setOwner("me")} style={[styles.ownerBtn, owner === "me" && styles.ownerActive]}>
                <Ionicons name="person" size={is(18)} color={owner === "me" ? Colors.light.white : Colors.light.textSecondary} />
                <Text style={[styles.ownerText, owner === "me" && styles.ownerTextActive, { fontSize: fs(14) }]}>Me</Text>
              </Pressable>
              <Pressable onPress={() => setOwner("partner")} style={[styles.ownerBtn, owner === "partner" && styles.ownerActive]}>
                <Ionicons name="people" size={is(18)} color={owner === "partner" ? Colors.light.white : Colors.light.textSecondary} />
                <Text style={[styles.ownerText, owner === "partner" && styles.ownerTextActive, { fontSize: fs(14) }]}>Partner</Text>
              </Pressable>
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
  typeRow: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  typeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.light.card },
  typeBtnExp: { backgroundColor: Colors.light.expense },
  typeBtnInc: { backgroundColor: Colors.light.income },
  typeText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.textSecondary },
  typeTextActive: { color: Colors.light.white },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  label: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.textMuted, marginBottom: 10 },
  amountRow: { flexDirection: "row", alignItems: "center" },
  dollar: { fontFamily: "DMSans_700Bold", fontSize: 36, color: Colors.light.text, marginRight: 4 },
  amountInput: { fontFamily: "DMSans_700Bold", fontSize: 36, color: Colors.light.text, flex: 1, padding: 0 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: Colors.light.card, borderWidth: 1.5, borderColor: "transparent" },
  catIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  catText: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.text },
  noteInput: { fontFamily: "DMSans_400Regular", fontSize: 15, color: Colors.light.text, backgroundColor: Colors.light.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14 },
  ownerRow: { flexDirection: "row", gap: 12 },
  ownerBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.light.card },
  ownerActive: { backgroundColor: Colors.light.navy },
  ownerText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.textSecondary },
  ownerTextActive: { color: Colors.light.white },
});
