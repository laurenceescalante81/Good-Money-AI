import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, TextInput, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

function goBack() { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/super"); }
import Colors from "@/constants/colors";
import { useFinance } from "@/contexts/FinanceContext";
import { useAccessibility } from '@/contexts/AccessibilityContext';

const INVESTMENT_OPTIONS = ["Balanced", "Growth", "High Growth", "Conservative", "Cash"];

const POPULAR_FUNDS = ["AustralianSuper", "Rest Super", "Sunsuper", "UniSuper", "Hostplus", "HESTA", "Cbus", "Other"];

export default function SetupSuperScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { superDetails, setSuperDetails } = useFinance();
  const { fs, is } = useAccessibility();

  const [balance, setBalance] = useState(superDetails?.balance?.toString() || "");
  const [fund, setFund] = useState(superDetails?.fund || "");
  const [customFund, setCustomFund] = useState("");
  const [employerRate, setEmployerRate] = useState(superDetails?.employerRate?.toString() || "11.5");
  const [salary, setSalary] = useState(superDetails?.salary?.toString() || "");
  const [investOption, setInvestOption] = useState(superDetails?.investmentOption || "Balanced");

  const selectedFund = fund === "Other" ? customFund : fund;
  const canSave = balance && parseFloat(balance) >= 0 && selectedFund && salary && parseFloat(salary) > 0;

  const handleSave = () => {
    if (!canSave) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSuperDetails({
      balance: parseFloat(balance),
      fund: selectedFund,
      employerRate: parseFloat(employerRate) || 11.5,
      salary: parseFloat(salary),
      investmentOption: investOption,
      lastUpdated: new Date().toISOString(),
    });
    goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={12}><Ionicons name="close" size={is(26)} color={Colors.light.text} /></Pressable>
        <Text style={[styles.topTitle, { fontSize: fs(17) }]}>{superDetails ? "Edit Super" : "Set Up Super"}</Text>
        <Pressable onPress={handleSave} disabled={!canSave} hitSlop={12}><Ionicons name="checkmark" size={is(26)} color={canSave ? Colors.light.super : Colors.light.gray300} /></Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 20 }}>
        <View style={styles.section}>
          <Text style={[styles.label, { fontSize: fs(13) }]}>Current Balance</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.dollar, { fontSize: fs(32) }]}>$</Text>
            <TextInput style={[styles.amountInput, { fontSize: fs(32) }]} placeholder="85000" placeholderTextColor={Colors.light.gray300} keyboardType="decimal-pad" value={balance} onChangeText={setBalance} autoFocus />
          </View>
        </View>
        <View style={styles.section}>
          <Text style={[styles.label, { fontSize: fs(13) }]}>Super Fund</Text>
          <View style={styles.fundGrid}>
            {POPULAR_FUNDS.map(f => (
              <Pressable key={f} onPress={() => setFund(f)} style={[styles.fundBtn, fund === f && styles.fundBtnActive]}>
                <Text style={[styles.fundText, fund === f && styles.fundTextActive, { fontSize: fs(13) }]}>{f}</Text>
              </Pressable>
            ))}
          </View>
          {fund === "Other" && (
            <TextInput style={[styles.input, { marginTop: 10, fontSize: fs(16) }]} placeholder="Fund name" placeholderTextColor={Colors.light.textMuted} value={customFund} onChangeText={setCustomFund} />
          )}
        </View>
        <View style={styles.section}>
          <Text style={[styles.label, { fontSize: fs(13) }]}>Annual Salary (before tax)</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.dollarSm, { fontSize: fs(20) }]}>$</Text>
            <TextInput style={[styles.inputSm, { fontSize: fs(20) }]} placeholder="85000" placeholderTextColor={Colors.light.gray300} keyboardType="decimal-pad" value={salary} onChangeText={setSalary} />
          </View>
        </View>
        <View style={styles.section}>
          <Text style={[styles.label, { fontSize: fs(13) }]}>Employer SG Rate (%)</Text>
          <View style={styles.rateRow}>
            {["11", "11.5", "12", "15"].map(r => (
              <Pressable key={r} onPress={() => setEmployerRate(r)} style={[styles.rateBtn, employerRate === r && styles.rateBtnActive]}>
                <Text style={[styles.rateText, employerRate === r && styles.rateTextActive, { fontSize: fs(14) }]}>{r}%</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.hint, { fontSize: fs(12) }]}>Current SG rate is 11.5% (rising to 12% from July 2025)</Text>
        </View>
        <View style={styles.section}>
          <Text style={[styles.label, { fontSize: fs(13) }]}>Investment Option</Text>
          <View style={styles.fundGrid}>
            {INVESTMENT_OPTIONS.map(o => (
              <Pressable key={o} onPress={() => setInvestOption(o)} style={[styles.optBtn, investOption === o && styles.optBtnActive]}>
                <Text style={[styles.fundText, investOption === o && styles.fundTextActive, { fontSize: fs(13) }]}>{o}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 },
  topTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 17, color: Colors.light.text },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  label: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.textMuted, marginBottom: 10 },
  input: { fontFamily: "DMSans_500Medium", fontSize: 16, color: Colors.light.text, backgroundColor: Colors.light.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14 },
  amountRow: { flexDirection: "row", alignItems: "center" },
  dollar: { fontFamily: "DMSans_700Bold", fontSize: 32, color: Colors.light.text, marginRight: 4 },
  dollarSm: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.light.text, marginRight: 4 },
  amountInput: { fontFamily: "DMSans_700Bold", fontSize: 32, color: Colors.light.text, flex: 1, padding: 0 },
  inputSm: { fontFamily: "DMSans_600SemiBold", fontSize: 20, color: Colors.light.text, flex: 1, padding: 0 },
  fundGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fundBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: Colors.light.card },
  fundBtnActive: { backgroundColor: Colors.light.super },
  fundText: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.text },
  fundTextActive: { color: Colors.light.white },
  rateRow: { flexDirection: "row", gap: 10 },
  rateBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.light.card, alignItems: "center" },
  rateBtnActive: { backgroundColor: Colors.light.super },
  rateText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.textSecondary },
  rateTextActive: { color: Colors.light.white },
  optBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: Colors.light.card },
  optBtnActive: { backgroundColor: Colors.light.super },
  hint: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 8 },
});
