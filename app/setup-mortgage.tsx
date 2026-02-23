import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, TextInput, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

function goBack() { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/mortgage"); }
import Colors from "@/constants/colors";
import { useFinance } from "@/contexts/FinanceContext";
import { useAccessibility } from '@/contexts/AccessibilityContext';

export default function SetupMortgageScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 16 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { mortgage, setMortgage } = useFinance();
  const { fs, is } = useAccessibility();

  const [loanAmount, setLoanAmount] = useState(mortgage?.loanAmount?.toString() || "");
  const [interestRate, setInterestRate] = useState(mortgage?.interestRate?.toString() || "");
  const [loanTerm, setLoanTerm] = useState(mortgage?.loanTermYears?.toString() || "30");
  const [repType, setRepType] = useState<"principal_interest" | "interest_only">(mortgage?.repaymentType || "principal_interest");
  const [extraRep, setExtraRep] = useState(mortgage?.extraRepayment?.toString() || "0");
  const [propertyValue, setPropertyValue] = useState(mortgage?.propertyValue?.toString() || "");
  const [lender, setLender] = useState(mortgage?.lender || "");

  const canSave = loanAmount && parseFloat(loanAmount) > 0 && interestRate && parseFloat(interestRate) > 0;

  const handleSave = () => {
    if (!canSave) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMortgage({
      loanAmount: parseFloat(loanAmount),
      interestRate: parseFloat(interestRate),
      loanTermYears: parseInt(loanTerm) || 30,
      repaymentType: repType,
      extraRepayment: parseFloat(extraRep) || 0,
      propertyValue: parseFloat(propertyValue) || 0,
      startDate: mortgage?.startDate || new Date().toISOString(),
      lender,
    });
    goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={12}><Ionicons name="close" size={is(26)} color={Colors.light.text} /></Pressable>
        <Text style={[styles.topTitle, { fontSize: fs(17) }]}>{mortgage ? "Edit Mortgage" : "Set Up Mortgage"}</Text>
        <Pressable onPress={handleSave} disabled={!canSave} hitSlop={12}><Ionicons name="checkmark" size={is(26)} color={canSave ? Colors.light.mortgage : Colors.light.gray300} /></Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 20 }}>
        <View style={styles.section}>
          <Text style={[styles.label, { fontSize: fs(13) }]}>Lender</Text>
          <TextInput style={[styles.input, { fontSize: fs(16) }]} placeholder="e.g. CommBank, ANZ, Westpac" placeholderTextColor={Colors.light.textMuted} value={lender} onChangeText={setLender} />
        </View>
        <View style={styles.section}>
          <Text style={[styles.label, { fontSize: fs(13) }]}>Loan Amount</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.dollar, { fontSize: fs(32) }]}>$</Text>
            <TextInput style={[styles.amountInput, { fontSize: fs(32) }]} placeholder="500000" placeholderTextColor={Colors.light.gray300} keyboardType="decimal-pad" value={loanAmount} onChangeText={setLoanAmount} />
          </View>
        </View>
        <View style={styles.section}>
          <Text style={[styles.label, { fontSize: fs(13) }]}>Property Value</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.dollarSm, { fontSize: fs(20) }]}>$</Text>
            <TextInput style={[styles.inputSm, { fontSize: fs(20) }]} placeholder="750000" placeholderTextColor={Colors.light.gray300} keyboardType="decimal-pad" value={propertyValue} onChangeText={setPropertyValue} />
          </View>
        </View>
        <View style={styles.section}>
          <Text style={[styles.label, { fontSize: fs(13) }]}>Interest Rate (% p.a.)</Text>
          <TextInput style={[styles.input, { fontSize: fs(16) }]} placeholder="6.2" placeholderTextColor={Colors.light.textMuted} keyboardType="decimal-pad" value={interestRate} onChangeText={setInterestRate} />
        </View>
        <View style={styles.section}>
          <Text style={[styles.label, { fontSize: fs(13) }]}>Loan Term</Text>
          <View style={styles.termRow}>
            {["15", "20", "25", "30"].map(t => (
              <Pressable key={t} onPress={() => setLoanTerm(t)} style={[styles.termBtn, loanTerm === t && styles.termBtnActive]}>
                <Text style={[styles.termText, loanTerm === t && styles.termTextActive, { fontSize: fs(14) }]}>{t} yrs</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <Text style={[styles.label, { fontSize: fs(13) }]}>Repayment Type</Text>
          <View style={styles.termRow}>
            <Pressable onPress={() => setRepType("principal_interest")} style={[styles.repBtn, repType === "principal_interest" && styles.repBtnActive]}>
              <Text style={[styles.termText, repType === "principal_interest" && styles.termTextActive, { fontSize: fs(14) }]}>P&I</Text>
            </Pressable>
            <Pressable onPress={() => setRepType("interest_only")} style={[styles.repBtn, repType === "interest_only" && styles.repBtnActive]}>
              <Text style={[styles.termText, repType === "interest_only" && styles.termTextActive, { fontSize: fs(14) }]}>Interest Only</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={[styles.label, { fontSize: fs(13) }]}>Extra Monthly Repayment</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.dollarSm, { fontSize: fs(20) }]}>$</Text>
            <TextInput style={[styles.inputSm, { fontSize: fs(20) }]} placeholder="0" placeholderTextColor={Colors.light.gray300} keyboardType="decimal-pad" value={extraRep} onChangeText={setExtraRep} />
          </View>
          <Text style={[styles.hint, { fontSize: fs(12) }]}>Extra repayments can save thousands in interest</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 },
  topTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 17, color: Colors.light.text },
  section: { paddingHorizontal: 20, marginBottom: 22 },
  label: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.textMuted, marginBottom: 8 },
  input: { fontFamily: "DMSans_500Medium", fontSize: 16, color: Colors.light.text, backgroundColor: Colors.light.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14 },
  amountRow: { flexDirection: "row", alignItems: "center" },
  dollar: { fontFamily: "DMSans_700Bold", fontSize: 32, color: Colors.light.text, marginRight: 4 },
  dollarSm: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.light.text, marginRight: 4 },
  amountInput: { fontFamily: "DMSans_700Bold", fontSize: 32, color: Colors.light.text, flex: 1, padding: 0 },
  inputSm: { fontFamily: "DMSans_600SemiBold", fontSize: 20, color: Colors.light.text, flex: 1, padding: 0 },
  termRow: { flexDirection: "row", gap: 10 },
  termBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.light.card, alignItems: "center" },
  termBtnActive: { backgroundColor: Colors.light.mortgage },
  termText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.textSecondary },
  termTextActive: { color: Colors.light.white },
  repBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.light.card, alignItems: "center" },
  repBtnActive: { backgroundColor: Colors.light.mortgage },
  hint: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 6 },
});
