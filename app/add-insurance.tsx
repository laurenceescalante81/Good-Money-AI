import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, TextInput, ScrollView, Platform, FlatList, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

function goBack() { if (router.canGoBack()) router.back(); else router.replace("/(tabs)"); }
import Colors from "@/constants/colors";
import { useFinance, InsurancePolicy } from "@/contexts/FinanceContext";
import { useAccessibility } from '@/contexts/AccessibilityContext';

const POLICY_TYPES: { type: InsurancePolicy["type"]; label: string; icon: string }[] = [
  { type: "home", label: "Home", icon: "home-outline" },
  { type: "contents", label: "Contents", icon: "cube-outline" },
  { type: "car", label: "Car", icon: "car-outline" },
  { type: "health", label: "Health", icon: "heart-outline" },
  { type: "life", label: "Life", icon: "person-outline" },
  { type: "income_protection", label: "Income Protection", icon: "briefcase-outline" },
  { type: "travel", label: "Travel", icon: "airplane-outline" },
];

const FREQUENCIES: { value: InsurancePolicy["premiumFrequency"]; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

export default function AddInsuranceScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { addInsurance, insurancePolicies, deleteInsurance } = useFinance();
  const { fs, is } = useAccessibility();

  const [showForm, setShowForm] = useState(insurancePolicies.length === 0);
  const [policyType, setPolicyType] = useState<InsurancePolicy["type"]>("home");
  const [provider, setProvider] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [premium, setPremium] = useState("");
  const [frequency, setFrequency] = useState<InsurancePolicy["premiumFrequency"]>("monthly");
  const [coverAmount, setCoverAmount] = useState("");
  const [renewalMonth, setRenewalMonth] = useState("12");

  const canSave = provider.trim() && premium && parseFloat(premium) > 0;

  const handleSave = () => {
    if (!canSave) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const renewalDate = new Date();
    renewalDate.setMonth(parseInt(renewalMonth) - 1);
    if (renewalDate < new Date()) renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    addInsurance({
      type: policyType,
      provider: provider.trim(),
      policyNumber: policyNumber.trim(),
      premium: parseFloat(premium),
      premiumFrequency: frequency,
      renewalDate: renewalDate.toISOString(),
      coverAmount: parseFloat(coverAmount) || 0,
    });
    setProvider("");
    setPolicyNumber("");
    setPremium("");
    setCoverAmount("");
    setShowForm(false);
  };

  const typeIcons: Record<string, string> = {
    home: "home-outline", car: "car-outline", health: "heart-outline",
    life: "person-outline", income_protection: "briefcase-outline",
    contents: "cube-outline", travel: "airplane-outline",
  };
  const typeLabels: Record<string, string> = {
    home: "Home", car: "Car", health: "Health", life: "Life",
    income_protection: "Income Protection", contents: "Contents", travel: "Travel",
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={12}><Ionicons name="close" size={is(26)} color={Colors.light.text} /></Pressable>
        <Text style={[styles.topTitle, { fontSize: fs(17) }]}>Insurance</Text>
        {showForm ? (
          <Pressable onPress={handleSave} disabled={!canSave} hitSlop={12}><Ionicons name="checkmark" size={is(26)} color={canSave ? Colors.light.insurance : Colors.light.gray300} /></Pressable>
        ) : (
          <Pressable onPress={() => setShowForm(true)} hitSlop={12}><Ionicons name="add" size={is(26)} color={Colors.light.insurance} /></Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 20 }}>
        {insurancePolicies.length > 0 && !showForm && (
          <View style={styles.policyList}>
            {insurancePolicies.map(p => {
              const daysUntil = Math.ceil((new Date(p.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <Pressable
                  key={p.id}
                  onLongPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert("Delete Policy", `Remove ${typeLabels[p.type]} policy?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => deleteInsurance(p.id) },
                    ]);
                  }}
                  style={styles.policyCard}
                >
                  <View style={styles.policyRow}>
                    <View style={[styles.policyIcon, { backgroundColor: Colors.light.insurance + "15" }]}>
                      <Ionicons name={typeIcons[p.type] as any} size={is(22)} color={Colors.light.insurance} />
                    </View>
                    <View style={styles.policyInfo}>
                      <Text style={[styles.policyType, { fontSize: fs(15) }]}>{typeLabels[p.type]}</Text>
                      <Text style={[styles.policyProvider, { fontSize: fs(12) }]}>{p.provider}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" as const }}>
                      <Text style={[styles.policyPremium, { fontSize: fs(14) }]}>${p.premium}/{frequency === "monthly" ? "mo" : frequency === "annually" ? "yr" : p.premiumFrequency.slice(0, 2)}</Text>
                      <Text style={[styles.policyRenewal, daysUntil <= 30 && { color: Colors.light.expense }, { fontSize: fs(11) }]}>
                        {daysUntil > 0 ? `Renews in ${daysUntil}d` : "Renewal overdue"}
                      </Text>
                    </View>
                  </View>
                  {p.coverAmount > 0 && <Text style={[styles.policyCover, { fontSize: fs(12) }]}>Cover: ${p.coverAmount.toLocaleString("en-AU")}</Text>}
                </Pressable>
              );
            })}
          </View>
        )}

        {showForm && (
          <View>
            <View style={styles.section}>
              <Text style={[styles.label, { fontSize: fs(13) }]}>Policy Type</Text>
              <View style={styles.typeGrid}>
                {POLICY_TYPES.map(t => (
                  <Pressable key={t.type} onPress={() => setPolicyType(t.type)} style={[styles.typeBtn, policyType === t.type && styles.typeBtnActive]}>
                    <Ionicons name={t.icon as any} size={is(20)} color={policyType === t.type ? Colors.light.white : Colors.light.insurance} />
                    <Text style={[styles.typeText, policyType === t.type && styles.typeTextActive, { fontSize: fs(13) }]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.section}>
              <Text style={[styles.label, { fontSize: fs(13) }]}>Provider</Text>
              <TextInput style={[styles.input, { fontSize: fs(16) }]} placeholder="e.g. NRMA, Medibank, TAL" placeholderTextColor={Colors.light.textMuted} value={provider} onChangeText={setProvider} />
            </View>
            <View style={styles.section}>
              <Text style={[styles.label, { fontSize: fs(13) }]}>Policy Number (optional)</Text>
              <TextInput style={[styles.input, { fontSize: fs(16) }]} placeholder="Policy number" placeholderTextColor={Colors.light.textMuted} value={policyNumber} onChangeText={setPolicyNumber} />
            </View>
            <View style={styles.section}>
              <Text style={[styles.label, { fontSize: fs(13) }]}>Premium</Text>
              <View style={styles.premRow}>
                <Text style={[styles.dollarSm, { fontSize: fs(20) }]}>$</Text>
                <TextInput style={[styles.premInput, { fontSize: fs(20) }]} placeholder="150" placeholderTextColor={Colors.light.gray300} keyboardType="decimal-pad" value={premium} onChangeText={setPremium} />
              </View>
              <View style={styles.freqRow}>
                {FREQUENCIES.map(f => (
                  <Pressable key={f.value} onPress={() => setFrequency(f.value)} style={[styles.freqBtn, frequency === f.value && styles.freqBtnActive]}>
                    <Text style={[styles.freqText, frequency === f.value && styles.freqTextActive, { fontSize: fs(12) }]}>{f.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.section}>
              <Text style={[styles.label, { fontSize: fs(13) }]}>Cover Amount (optional)</Text>
              <View style={styles.premRow}>
                <Text style={[styles.dollarSm, { fontSize: fs(20) }]}>$</Text>
                <TextInput style={[styles.premInput, { fontSize: fs(20) }]} placeholder="500000" placeholderTextColor={Colors.light.gray300} keyboardType="decimal-pad" value={coverAmount} onChangeText={setCoverAmount} />
              </View>
            </View>
            <View style={styles.section}>
              <Text style={[styles.label, { fontSize: fs(13) }]}>Renewal Month</Text>
              <View style={styles.monthGrid}>
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map(m => {
                  const monthName = new Date(2024, parseInt(m) - 1).toLocaleDateString("en-AU", { month: "short" });
                  return (
                    <Pressable key={m} onPress={() => setRenewalMonth(m)} style={[styles.monthBtn, renewalMonth === m && styles.monthBtnActive]}>
                      <Text style={[styles.monthText, renewalMonth === m && styles.monthTextActive, { fontSize: fs(12) }]}>{monthName}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {!showForm && insurancePolicies.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={is(48)} color={Colors.light.gray300} />
            <Text style={[styles.emptyText, { fontSize: fs(16) }]}>No insurance policies</Text>
            <Text style={[styles.emptySubtext, { fontSize: fs(13) }]}>Add your policies to track premiums and renewal dates</Text>
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
  section: { paddingHorizontal: 20, marginBottom: 22 },
  label: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.textMuted, marginBottom: 10 },
  input: { fontFamily: "DMSans_500Medium", fontSize: 16, color: Colors.light.text, backgroundColor: Colors.light.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: Colors.light.card },
  typeBtnActive: { backgroundColor: Colors.light.insurance },
  typeText: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.text },
  typeTextActive: { color: Colors.light.white },
  premRow: { flexDirection: "row", alignItems: "center" },
  dollarSm: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.light.text, marginRight: 4 },
  premInput: { fontFamily: "DMSans_600SemiBold", fontSize: 20, color: Colors.light.text, flex: 1, padding: 0 },
  freqRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  freqBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.light.card, alignItems: "center" },
  freqBtnActive: { backgroundColor: Colors.light.insurance },
  freqText: { fontFamily: "DMSans_500Medium", fontSize: 12, color: Colors.light.textSecondary },
  freqTextActive: { color: Colors.light.white },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monthBtn: { width: "22%", paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.light.card, alignItems: "center", flexGrow: 1 },
  monthBtnActive: { backgroundColor: Colors.light.insurance },
  monthText: { fontFamily: "DMSans_500Medium", fontSize: 12, color: Colors.light.textSecondary },
  monthTextActive: { color: Colors.light.white },
  policyList: { paddingHorizontal: 20, gap: 10 },
  policyCard: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 16 },
  policyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  policyIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  policyInfo: { flex: 1 },
  policyType: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.text },
  policyProvider: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 2 },
  policyPremium: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.text },
  policyRenewal: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.light.textMuted, marginTop: 2 },
  policyCover: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textSecondary, marginTop: 8 },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyText: { fontFamily: "DMSans_600SemiBold", fontSize: 16, color: Colors.light.textSecondary, marginTop: 16 },
  emptySubtext: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.light.textMuted, marginTop: 4, textAlign: "center", paddingHorizontal: 40 },
});
