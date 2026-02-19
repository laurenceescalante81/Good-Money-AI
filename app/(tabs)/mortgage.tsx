import React from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useFinance } from "@/contexts/FinanceContext";

function fmt(n: number): string { return "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function fmtDec(n: number): string { return "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

export default function MortgageScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { mortgage, calculateMortgageRepayment, clearMortgage } = useFinance();

  if (!mortgage) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <Text style={styles.title}>Mortgage</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: Colors.light.mortgage + "15" }]}>
            <Ionicons name="home-outline" size={48} color={Colors.light.mortgage} />
          </View>
          <Text style={styles.emptyText}>No mortgage set up</Text>
          <Text style={styles.emptySubtext}>Add your home loan details to track repayments and see how extra payments can save you money</Text>
          <Pressable style={({ pressed }) => [styles.setupBtn, pressed && { opacity: 0.9 }]} onPress={() => router.push("/setup-mortgage")}>
            <Ionicons name="add" size={20} color={Colors.light.white} />
            <Text style={styles.setupBtnText}>Set Up Mortgage</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const calc = calculateMortgageRepayment();
  const lvr = mortgage.propertyValue > 0 ? (mortgage.loanAmount / mortgage.propertyValue) * 100 : 0;
  const equity = mortgage.propertyValue - mortgage.loanAmount;

  const baseRate = mortgage.interestRate / 100 / 12;
  const baseN = mortgage.loanTermYears * 12;
  let baseMonthly: number;
  if (mortgage.repaymentType === "interest_only") {
    baseMonthly = mortgage.loanAmount * baseRate;
  } else {
    baseMonthly = baseRate === 0 ? mortgage.loanAmount / baseN : mortgage.loanAmount * (baseRate * Math.pow(1 + baseRate, baseN)) / (Math.pow(1 + baseRate, baseN) - 1);
  }
  const baseTotalInterest = (baseMonthly * baseN) - mortgage.loanAmount;
  const extraSaving = mortgage.extraRepayment > 0 ? Math.max(0, baseTotalInterest - calc.totalInterest) : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <Text style={styles.title}>Mortgage</Text>
          <View style={styles.headerBtns}>
            <Pressable onPress={() => router.push("/setup-mortgage")} hitSlop={12}>
              <Ionicons name="pencil" size={22} color={Colors.light.mortgage} />
            </Pressable>
            <Pressable onPress={() => Alert.alert("Remove Mortgage", "Clear your mortgage details?", [
              { text: "Cancel", style: "cancel" },
              { text: "Remove", style: "destructive", onPress: clearMortgage },
            ])} hitSlop={12}>
              <Ionicons name="trash-outline" size={22} color={Colors.light.expense} />
            </Pressable>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Monthly Repayment</Text>
          <Text style={styles.heroAmount}>{fmtDec(calc.monthly)}</Text>
          {mortgage.extraRepayment > 0 && (
            <Text style={styles.heroExtra}>Includes {fmt(mortgage.extraRepayment)} extra</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loan Details</Text>
          <View style={styles.card}>
            <StatRow label="Lender" value={mortgage.lender || "Not specified"} />
            <StatRow label="Loan Amount" value={fmt(mortgage.loanAmount)} />
            <StatRow label="Interest Rate" value={`${mortgage.interestRate}% p.a.`} />
            <StatRow label="Loan Term" value={`${mortgage.loanTermYears} years`} />
            <StatRow label="Type" value={mortgage.repaymentType === "principal_interest" ? "P&I" : "Interest Only"} />
            <StatRow label="Years Remaining" value={`${calc.yearsRemaining.toFixed(1)} years`} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property & Equity</Text>
          <View style={styles.card}>
            <StatRow label="Property Value" value={fmt(mortgage.propertyValue)} />
            <StatRow label="Equity" value={fmt(equity)} color={equity >= 0 ? Colors.light.income : Colors.light.expense} />
            <StatRow label="LVR" value={`${lvr.toFixed(1)}%`} color={lvr > 80 ? Colors.light.expense : Colors.light.income} />
            <View style={styles.lvrBarBg}>
              <View style={[styles.lvrBarFill, { width: `${Math.min(lvr, 100)}%`, backgroundColor: lvr > 80 ? Colors.light.expense : Colors.light.mortgage }]} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interest Breakdown</Text>
          <View style={styles.card}>
            <StatRow label="Total Interest (life of loan)" value={fmt(Math.max(0, calc.totalInterest))} color={Colors.light.expense} />
            <StatRow label="Total Repayment" value={fmt(calc.totalPayment)} />
            {mortgage.extraRepayment > 0 && (
              <View style={styles.savingBadge}>
                <Ionicons name="sparkles" size={16} color={Colors.light.income} />
                <Text style={styles.savingText}>
                  Extra repayments could save you {fmt(Math.round(extraSaving))} in interest
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
  headerBtns: { flexDirection: "row", gap: 16 },
  title: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.light.text },
  heroCard: { marginHorizontal: 20, backgroundColor: Colors.light.mortgage, borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 8 },
  heroLabel: { fontFamily: "DMSans_500Medium", fontSize: 14, color: "rgba(255,255,255,0.7)" },
  heroAmount: { fontFamily: "DMSans_700Bold", fontSize: 36, color: Colors.light.white, marginTop: 4 },
  heroExtra: { fontFamily: "DMSans_400Regular", fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.light.text, marginBottom: 10 },
  card: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, gap: 12 },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statLabel: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.light.textSecondary },
  statValue: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.text },
  lvrBarBg: { height: 8, backgroundColor: Colors.light.gray100, borderRadius: 4, overflow: "hidden", marginTop: 4 },
  lvrBarFill: { height: 8, borderRadius: 4 },
  savingBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.light.income + "10", borderRadius: 10, padding: 12, marginTop: 4 },
  savingText: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.income, flex: 1 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingTop: 60 },
  emptyIcon: { width: 100, height: 100, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyText: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.light.text, marginBottom: 8 },
  emptySubtext: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.light.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  setupBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.light.mortgage, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 },
  setupBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.white },
});
