import React from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useFinance } from "@/contexts/FinanceContext";
import { useRewards } from "@/contexts/RewardsContext";
import { MessageOverlay } from "@/contexts/AppMessagesContext";
import CoinHeader from '@/components/CoinHeader';
import { useAccessibility } from '@/contexts/AccessibilityContext';

function fmt(n: number): string { return "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
function fmtDec(n: number): string { return "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  const { fs } = useAccessibility();
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statLabel, { fontSize: fs(14) }]}>{label}</Text>
      <Text style={[styles.statValue, { fontSize: fs(14) }, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

export default function MortgageScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { mortgage, calculateMortgageRepayment, clearMortgage } = useFinance();
  const { state: rewardsState, missions, completeMission } = useRewards();
  const { fs, is } = useAccessibility();
  const mortgageMission = missions.find(m => m.id === 'run_valuation' && !m.completed);

  if (!mortgage) {
    return (
      <View style={styles.container}>
        <CoinHeader title="Mortgage" />
        <Text style={[styles.pageDesc, { fontSize: fs(14) }]}>Track your home loan and see the impact of extra repayments.</Text>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: Colors.light.mortgage + "15" }]}>
            <Ionicons name="home-outline" size={is(48)} color={Colors.light.mortgage} />
          </View>
          <Text style={[styles.emptyText, { fontSize: fs(20) }]}>No mortgage set up</Text>
          <Text style={[styles.emptySubtext, { fontSize: fs(14) }]}>Add your home loan details to track repayments and see how extra payments can save you money</Text>
          <Pressable style={({ pressed }) => [styles.setupBtn, pressed && { opacity: 0.9 }]} onPress={() => router.push("/setup-mortgage")}>
            <Ionicons name="add" size={is(20)} color={Colors.light.white} />
            <Text style={[styles.setupBtnText, { fontSize: fs(15) }]}>Set Up Mortgage</Text>
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
        <CoinHeader title="Mortgage" />
        <Text style={[styles.pageDesc, { fontSize: fs(14) }]}>Track your home loan and see the impact of extra repayments.</Text>
        <View style={[styles.header]}>
          <View />
          <View style={styles.headerBtns}>
            <Pressable onPress={() => router.push("/setup-mortgage")} hitSlop={12}>
              <Ionicons name="pencil" size={is(22)} color={Colors.light.mortgage} />
            </Pressable>
            <Pressable onPress={() => Alert.alert("Remove Mortgage", "Clear your mortgage details?", [
              { text: "Cancel", style: "cancel" },
              { text: "Remove", style: "destructive", onPress: clearMortgage },
            ])} hitSlop={12}>
              <Ionicons name="trash-outline" size={is(22)} color={Colors.light.expense} />
            </Pressable>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={[styles.heroLabel, { fontSize: fs(14) }]}>Monthly Repayment</Text>
          <Text style={[styles.heroAmount, { fontSize: fs(36) }]}>{fmtDec(calc.monthly)}</Text>
          {mortgage.extraRepayment > 0 && (
            <Text style={[styles.heroExtra, { fontSize: fs(13) }]}>Includes {fmt(mortgage.extraRepayment)} extra</Text>
          )}
        </View>

        {(() => {
          const testExtras = [100, 250, 500, 1000];
          const rate = mortgage.interestRate / 100 / 12;
          const nMonths = mortgage.loanTermYears * 12;

          let baseMonthlyPmt: number;
          if (mortgage.repaymentType === "interest_only") {
            baseMonthlyPmt = mortgage.loanAmount * rate;
          } else {
            baseMonthlyPmt = rate === 0 ? mortgage.loanAmount / nMonths : mortgage.loanAmount * (rate * Math.pow(1 + rate, nMonths)) / (Math.pow(1 + rate, nMonths) - 1);
          }
          const baseTotalPaid = baseMonthlyPmt * nMonths;
          const baseTotalInt = baseTotalPaid - mortgage.loanAmount;

          const calcSaving = (extra: number) => {
            if (mortgage.repaymentType === "interest_only" || rate === 0) return { savedPerYear: extra * 12 * 0.05, saved10yr: extra * 12 * 10 * 0.05, savedLife: 0, yearsSaved: 0 };
            const totalMonthly = baseMonthlyPmt + extra;
            let balance = mortgage.loanAmount;
            let monthsPaid = 0;
            let totalPaid = 0;
            while (balance > 0 && monthsPaid < nMonths * 2) {
              const interest = balance * rate;
              const principal = Math.min(totalMonthly - interest, balance);
              if (principal <= 0) break;
              balance -= principal;
              totalPaid += totalMonthly;
              monthsPaid++;
            }
            const totalIntPaid = totalPaid - mortgage.loanAmount;
            const savedLife = Math.max(0, baseTotalInt - totalIntPaid);
            const yearsSaved = Math.max(0, (nMonths - monthsPaid) / 12);
            const savedPerYear = mortgage.loanTermYears > 0 ? savedLife / mortgage.loanTermYears : 0;
            const saved10yr = Math.min(savedLife, savedPerYear * 10);
            return { savedPerYear, saved10yr, savedLife, yearsSaved };
          };

          const currentExtraSaving = mortgage.extraRepayment > 0 ? calcSaving(mortgage.extraRepayment) : null;
          const bestScenario = calcSaving(500);

          return (
            <LinearGradient colors={[Colors.light.mortgage, "#1a6b5a"]} style={styles.valueBanner}>
              <View style={styles.valueBannerHeader}>
                <Ionicons name="sparkles" size={is(20)} color="#fff" />
                <Text style={[styles.valueBannerTitle, { fontSize: fs(18) }]}>Optimise Your Mortgage</Text>
              </View>

              {currentExtraSaving && mortgage.extraRepayment > 0 ? (
                <>
                  <Text style={[styles.valueBannerSubtitle, { fontSize: fs(13) }]}>Your {fmt(mortgage.extraRepayment)}/mo extra repayment saves</Text>
                  <View style={styles.valueBannerRow}>
                    <View style={styles.valueBannerItem}>
                      <Text style={[styles.valueBannerBigNum, { fontSize: fs(26) }]}>{fmt(Math.round(currentExtraSaving.savedPerYear))}</Text>
                      <Text style={[styles.valueBannerSmall, { fontSize: fs(11) }]}>per year</Text>
                    </View>
                    <View style={styles.valueBannerDivider} />
                    <View style={styles.valueBannerItem}>
                      <Text style={[styles.valueBannerBigNum, { fontSize: fs(26) }]}>{fmt(Math.round(currentExtraSaving.saved10yr))}</Text>
                      <Text style={[styles.valueBannerSmall, { fontSize: fs(11) }]}>over 10 years</Text>
                    </View>
                  </View>
                  <View style={styles.valueBannerPill}>
                    <Ionicons name="time-outline" size={is(14)} color="#fff" />
                    <Text style={[styles.valueBannerPillText, { fontSize: fs(12) }]}>
                      Pay off {currentExtraSaving.yearsSaved.toFixed(1)} years early — {fmt(Math.round(currentExtraSaving.savedLife))} total saved
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.valueBannerSubtitle, { fontSize: fs(13) }]}>Adding $500/mo extra could save you</Text>
                  <View style={styles.valueBannerRow}>
                    <View style={styles.valueBannerItem}>
                      <Text style={[styles.valueBannerBigNum, { fontSize: fs(26) }]}>{fmt(Math.round(bestScenario.savedPerYear))}</Text>
                      <Text style={[styles.valueBannerSmall, { fontSize: fs(11) }]}>per year</Text>
                    </View>
                    <View style={styles.valueBannerDivider} />
                    <View style={styles.valueBannerItem}>
                      <Text style={[styles.valueBannerBigNum, { fontSize: fs(26) }]}>{fmt(Math.round(bestScenario.saved10yr))}</Text>
                      <Text style={[styles.valueBannerSmall, { fontSize: fs(11) }]}>over 10 years</Text>
                    </View>
                  </View>
                  <View style={styles.valueBannerPill}>
                    <Ionicons name="time-outline" size={is(14)} color="#fff" />
                    <Text style={[styles.valueBannerPillText, { fontSize: fs(12) }]}>
                      {bestScenario.yearsSaved.toFixed(1)} years earlier payoff — {fmt(Math.round(bestScenario.savedLife))} less interest
                    </Text>
                  </View>
                </>
              )}

              <View style={styles.scenarioGrid}>
                {testExtras.map(extra => {
                  const s = calcSaving(extra);
                  const isActive = mortgage.extraRepayment === extra;
                  return (
                    <View key={extra} style={[styles.scenarioItem, isActive && styles.scenarioItemActive]}>
                      <Text style={[styles.scenarioExtra, { fontSize: fs(11) }]}>+{fmt(extra)}/mo</Text>
                      <Text style={[styles.scenarioSaved, { fontSize: fs(13) }]}>{fmt(Math.round(s.savedLife))}</Text>
                      <Text style={[styles.scenarioYears, { fontSize: fs(10) }]}>{s.yearsSaved.toFixed(1)}yr faster</Text>
                    </View>
                  );
                })}
              </View>
            </LinearGradient>
          );
        })()}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: fs(16) }]}>Loan Details</Text>
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
          <Text style={[styles.sectionTitle, { fontSize: fs(16) }]}>Property & Equity</Text>
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
          <Text style={[styles.sectionTitle, { fontSize: fs(16) }]}>Interest Breakdown</Text>
          <View style={styles.card}>
            <StatRow label="Total Interest (life of loan)" value={fmt(Math.max(0, calc.totalInterest))} color={Colors.light.expense} />
            <StatRow label="Total Repayment" value={fmt(calc.totalPayment)} />
            {mortgage.extraRepayment > 0 && (
              <View style={styles.savingBadge}>
                <Ionicons name="sparkles" size={is(16)} color={Colors.light.income} />
                <Text style={[styles.savingText, { fontSize: fs(13) }]}>
                  Extra repayments could save you {fmt(Math.round(extraSaving))} in interest
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <LinearGradient colors={["#0F4C3A", "#1B6B52"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.salesCta}>
            <View style={styles.salesCtaHeader}>
              <View style={styles.salesCtaBadge}>
                <Ionicons name="trending-down" size={is(14)} color="#10B981" />
                <Text style={[styles.salesCtaBadgeText, { fontSize: fs(11) }]}>SAVE MORE</Text>
              </View>
            </View>
            <Text style={[styles.salesCtaTitle, { fontSize: fs(20) }]}>
              Could a rate review save you{'\n'}thousands over your loan?
            </Text>
            <Text style={[styles.salesCtaBody, { fontSize: fs(14) }]}>
              Even a 0.25% rate reduction on a {fmt(mortgage.loanAmount)} loan could save you{' '}
              <Text style={{ fontFamily: 'DMSans_700Bold', color: '#4ADE80' }}>
                {fmt(Math.round(mortgage.loanAmount * 0.0025 * mortgage.loanTermYears))}
              </Text>{' '}
              over {mortgage.loanTermYears} years. Most Australians don't review their rate — don't leave money on the table.
            </Text>
            <View style={styles.salesCtaStats}>
              <View style={styles.salesCtaStat}>
                <Ionicons name="wallet-outline" size={is(18)} color="#4ADE80" />
                <Text style={[styles.salesCtaStatText, { fontSize: fs(12) }]}>
                  {fmt(Math.round(mortgage.loanAmount * 0.0025 * mortgage.loanTermYears / mortgage.loanTermYears))}/yr potential savings
                </Text>
              </View>
              <View style={styles.salesCtaStat}>
                <Ionicons name="shield-checkmark-outline" size={is(18)} color="#4ADE80" />
                <Text style={[styles.salesCtaStatText, { fontSize: fs(12) }]}>Free, no-obligation review</Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.salesCtaBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
              onPress={() => router.push("/(tabs)/overview")}
            >
              <Text style={[styles.salesCtaBtnText, { fontSize: fs(15) }]}>Get a Free Rate Review</Text>
              <Ionicons name="arrow-forward" size={is(18)} color="#0F4C3A" />
            </Pressable>
          </LinearGradient>
        </View>

        <Pressable onPress={() => router.push("/(tabs)/rewards")} style={({ pressed }) => [pressed && { opacity: 0.95 }]}>
          <View style={styles.missionBanner}>
            <View style={styles.missionBannerTop}>
              <View style={styles.missionPtsCircle}>
                <Ionicons name="star" size={is(14)} color="#D4AF37" />
                <Text style={[styles.missionPtsNum, { fontSize: fs(13) }]}>{rewardsState.points.toLocaleString()}</Text>
              </View>
            </View>
            {mortgageMission && (
              <Pressable onPress={() => completeMission('run_valuation')} style={({ pressed }) => [styles.missionPrompt, pressed && { opacity: 0.85 }]}>
                <View style={[styles.missionPromptIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="home-outline" size={is(14)} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.missionPromptTitle, { fontSize: fs(12) }]}>{mortgageMission.title}</Text>
                  <Text style={[styles.missionPromptDesc, { fontSize: fs(10) }]}>{mortgageMission.description}</Text>
                </View>
                <Text style={[styles.missionPromptPts, { fontSize: fs(13) }]}>+{mortgageMission.is2xActive ? mortgageMission.basePoints * 2 : mortgageMission.basePoints}</Text>
              </Pressable>
            )}
          </View>
        </Pressable>

      </ScrollView>
      <MessageOverlay screen="mortgage" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  pageDesc: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.light.textSecondary, paddingHorizontal: 20, marginBottom: 16 },
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
  valueBanner: { marginHorizontal: 20, borderRadius: 20, padding: 20, marginBottom: 16 },
  valueBannerHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  valueBannerTitle: { fontFamily: "DMSans_700Bold", fontSize: 18, color: "#fff" },
  valueBannerSubtitle: { fontFamily: "DMSans_500Medium", fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 12 },
  valueBannerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  valueBannerItem: { flex: 1, alignItems: "center" as const },
  valueBannerBigNum: { fontFamily: "DMSans_700Bold", fontSize: 26, color: "#fff" },
  valueBannerSmall: { fontFamily: "DMSans_400Regular", fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  valueBannerDivider: { width: 1, height: 40, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 8 },
  valueBannerPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 14 },
  valueBannerPillText: { fontFamily: "DMSans_500Medium", fontSize: 12, color: "#fff", flex: 1 },
  scenarioGrid: { flexDirection: "row", flexWrap: "wrap" as const, gap: 8 },
  scenarioItem: { flex: 1, minWidth: "22%" as any, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, padding: 10, alignItems: "center" as const, borderWidth: 1, borderColor: "transparent" },
  scenarioItemActive: { borderColor: "#fff", backgroundColor: "rgba(255,255,255,0.2)" },
  scenarioExtra: { fontFamily: "DMSans_600SemiBold", fontSize: 11, color: "rgba(255,255,255,0.7)" },
  scenarioSaved: { fontFamily: "DMSans_700Bold", fontSize: 13, color: "#fff", marginTop: 4 },
  scenarioYears: { fontFamily: "DMSans_400Regular", fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingTop: 60 },
  emptyIcon: { width: 100, height: 100, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyText: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.light.text, marginBottom: 8 },
  emptySubtext: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.light.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  setupBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.light.mortgage, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 },
  setupBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.white },
  missionBanner: { marginHorizontal: 20, marginTop: 20, backgroundColor: Colors.light.card, borderRadius: 16, padding: 14 },
  missionBannerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  missionPtsCircle: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#D4AF3715", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  missionPtsNum: { fontFamily: "DMSans_700Bold", fontSize: 13, color: "#D4AF37" },
  missionStreakBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F59E0B15", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  missionStreakNum: { fontFamily: "DMSans_700Bold", fontSize: 13, color: "#F59E0B" },
  missionPrompt: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.light.background, borderRadius: 12, padding: 10 },
  missionPromptIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  missionPromptTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 12, color: Colors.light.text },
  missionPromptDesc: { fontFamily: "DMSans_400Regular", fontSize: 10, color: Colors.light.textMuted, marginTop: 1 },
  missionPromptPts: { fontFamily: "DMSans_700Bold", fontSize: 13, color: "#4ade80" },
  salesCta: { borderRadius: 20, padding: 24 },
  salesCtaHeader: { marginBottom: 12 },
  salesCtaBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(16,185,129,0.15)", alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  salesCtaBadgeText: { fontFamily: "DMSans_700Bold", fontSize: 11, color: "#10B981", letterSpacing: 1 },
  salesCtaTitle: { fontFamily: "DMSans_700Bold", fontSize: 20, color: "#fff", lineHeight: 28, marginBottom: 12 },
  salesCtaBody: { fontFamily: "DMSans_400Regular", fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 22, marginBottom: 16 },
  salesCtaStats: { gap: 10, marginBottom: 20 },
  salesCtaStat: { flexDirection: "row", alignItems: "center", gap: 10 },
  salesCtaStatText: { fontFamily: "DMSans_500Medium", fontSize: 12, color: "rgba(255,255,255,0.75)", flex: 1 },
  salesCtaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#4ADE80", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24 },
  salesCtaBtnText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: "#0F4C3A" },
});
