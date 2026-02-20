import React from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useFinance } from "@/contexts/FinanceContext";

function fmt(n: number): string { return "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

export default function SuperScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { superDetails, calculateSuperProjection, clearSuper } = useFinance();

  if (!superDetails) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <Text style={styles.title}>Super</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: Colors.light.super + "15" }]}>
            <Ionicons name="trending-up-outline" size={48} color={Colors.light.super} />
          </View>
          <Text style={styles.emptyText}>Track your super</Text>
          <Text style={styles.emptySubtext}>Add your superannuation details to project your retirement balance and track employer contributions</Text>
          <Pressable style={({ pressed }) => [styles.setupBtn, pressed && { opacity: 0.9 }]} onPress={() => router.push("/setup-super")}>
            <Ionicons name="add" size={20} color={Colors.light.white} />
            <Text style={styles.setupBtnText}>Set Up Super</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const proj = calculateSuperProjection();
  const annualContrib = superDetails.salary * (superDetails.employerRate / 100);
  const monthlyContrib = annualContrib / 12;

  const milestones = [
    { amount: 100000, label: "$100K" },
    { amount: 250000, label: "$250K" },
    { amount: 500000, label: "$500K" },
    { amount: 1000000, label: "$1M" },
    { amount: 2000000, label: "$2M" },
  ];
  const nextMilestone = milestones.find(m => m.amount > superDetails.balance);
  const milestoneProgress = nextMilestone ? (superDetails.balance / nextMilestone.amount) * 100 : 100;

  return (
    <View style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <Text style={styles.title}>Super</Text>
          <View style={styles.headerBtns}>
            <Pressable onPress={() => router.push("/setup-super")} hitSlop={12}>
              <Ionicons name="pencil" size={22} color={Colors.light.super} />
            </Pressable>
            <Pressable onPress={() => Alert.alert("Remove Super", "Clear your super details?", [
              { text: "Cancel", style: "cancel" },
              { text: "Remove", style: "destructive", onPress: clearSuper },
            ])} hitSlop={12}>
              <Ionicons name="trash-outline" size={22} color={Colors.light.expense} />
            </Pressable>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Current Balance</Text>
          <Text style={styles.heroAmount}>{fmt(superDetails.balance)}</Text>
          <Text style={styles.heroSub}>{superDetails.fund}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contributions</Text>
          <View style={styles.card}>
            <StatRow label="Salary" value={fmt(superDetails.salary) + "/yr"} />
            <StatRow label="Employer Rate (SG)" value={`${superDetails.employerRate}%`} />
            <StatRow label="Annual Contribution" value={fmt(Math.round(annualContrib))} color={Colors.light.super} />
            <StatRow label="Monthly Contribution" value={fmt(Math.round(monthlyContrib))} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Retirement Projection</Text>
          <View style={styles.card}>
            <StatRow label="Projected at 67" value={fmt(Math.round(proj.atRetirement))} color={Colors.light.super} />
            <StatRow label="Years to Retirement" value={`${proj.yearsToRetirement} years`} />
            <StatRow label="Monthly Income (est.)" value={fmt(Math.round(proj.monthlyInRetirement))} color={Colors.light.income} />
            <View style={styles.projNote}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.light.textMuted} />
              <Text style={styles.projNoteText}>Based on 7% annual growth and 4% drawdown rate</Text>
            </View>
          </View>
        </View>

        {nextMilestone && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next Milestone</Text>
            <View style={styles.milestoneCard}>
              <View style={styles.milestoneHeader}>
                <Ionicons name="flag" size={20} color={Colors.light.super} />
                <Text style={styles.milestoneLabel}>{nextMilestone.label}</Text>
              </View>
              <View style={styles.milestoneBarBg}>
                <View style={[styles.milestoneBarFill, { width: `${Math.min(milestoneProgress, 100)}%` }]} />
              </View>
              <Text style={styles.milestoneText}>
                {fmt(nextMilestone.amount - superDetails.balance)} to go
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fund Details</Text>
          <View style={styles.card}>
            <StatRow label="Fund" value={superDetails.fund} />
            <StatRow label="Investment Option" value={superDetails.investmentOption} />
            <StatRow label="Last Updated" value={new Date(superDetails.lastUpdated).toLocaleDateString("en-AU")} />
          </View>
        </View>

        {(() => {
          const currentAge = 30;
          const retirementAge = 67;
          const yearsToRetirement = retirementAge - currentAge;
          const growthRate = 0.07;

          const projectWithExtra = (extraMonthly: number) => {
            let balance = superDetails.balance;
            const annualContrib = superDetails.salary * (superDetails.employerRate / 100);
            const totalAnnualContrib = annualContrib + (extraMonthly * 12);
            for (let i = 0; i < yearsToRetirement; i++) {
              balance = (balance + totalAnnualContrib) * (1 + growthRate);
            }
            return balance;
          };

          const baseProjection = proj.atRetirement;
          const extraAmounts = [50, 100, 250, 500];

          const salarySacrifice200 = projectWithExtra(200);
          const extra200 = salarySacrifice200 - baseProjection;
          const extraMonthlyIncome200 = (extra200 * 0.04) / 12;

          return (
            <LinearGradient colors={[Colors.light.super, "#1a3a6b"]} style={styles.valueBanner}>
              <View style={styles.valueBannerHeader}>
                <Ionicons name="rocket-outline" size={20} color="#fff" />
                <Text style={styles.valueBannerTitle}>Grow Your Super</Text>
              </View>

              <Text style={styles.valueBannerSubtitle}>Adding $200/mo salary sacrifice could give you</Text>
              <View style={styles.valueBannerRow}>
                <View style={styles.valueBannerItem}>
                  <Text style={styles.valueBannerBigNum}>{fmt(Math.round(extra200))}</Text>
                  <Text style={styles.valueBannerSmall}>extra at retirement</Text>
                </View>
                <View style={styles.valueBannerDivider} />
                <View style={styles.valueBannerItem}>
                  <Text style={styles.valueBannerBigNum}>+{fmt(Math.round(extraMonthlyIncome200))}</Text>
                  <Text style={styles.valueBannerSmall}>per month extra income</Text>
                </View>
              </View>

              <View style={styles.valueBannerPill}>
                <Ionicons name="information-circle-outline" size={14} color="#fff" />
                <Text style={styles.valueBannerPillText}>
                  Pre-tax contributions are taxed at only 15% vs your marginal rate
                </Text>
              </View>

              <View style={styles.scenarioGrid}>
                {extraAmounts.map(extra => {
                  const projected = projectWithExtra(extra);
                  const gain = projected - baseProjection;
                  const monthlyGain = (gain * 0.04) / 12;
                  return (
                    <View key={extra} style={styles.scenarioItem}>
                      <Text style={styles.scenarioExtra}>+${extra}/mo</Text>
                      <Text style={styles.scenarioSaved}>{fmt(Math.round(gain))}</Text>
                      <Text style={styles.scenarioYears}>+{fmt(Math.round(monthlyGain))}/mo</Text>
                    </View>
                  );
                })}
              </View>
            </LinearGradient>
          );
        })()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
  headerBtns: { flexDirection: "row", gap: 16 },
  title: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.light.text },
  heroCard: { marginHorizontal: 20, backgroundColor: Colors.light.super, borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 8 },
  heroLabel: { fontFamily: "DMSans_500Medium", fontSize: 14, color: "rgba(255,255,255,0.7)" },
  heroAmount: { fontFamily: "DMSans_700Bold", fontSize: 36, color: Colors.light.white, marginTop: 4 },
  heroSub: { fontFamily: "DMSans_400Regular", fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.light.text, marginBottom: 10 },
  card: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, gap: 12 },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statLabel: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.light.textSecondary },
  statValue: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.text },
  projNote: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 4 },
  projNoteText: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.light.textMuted, flex: 1 },
  milestoneCard: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 16 },
  milestoneHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  milestoneLabel: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.light.super },
  milestoneBarBg: { height: 10, backgroundColor: Colors.light.gray100, borderRadius: 5, overflow: "hidden" },
  milestoneBarFill: { height: 10, borderRadius: 5, backgroundColor: Colors.light.super },
  milestoneText: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.light.textMuted, marginTop: 8, textAlign: "right" },
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
  scenarioItem: { flex: 1, minWidth: "22%" as any, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, padding: 10, alignItems: "center" as const },
  scenarioExtra: { fontFamily: "DMSans_600SemiBold", fontSize: 11, color: "rgba(255,255,255,0.7)" },
  scenarioSaved: { fontFamily: "DMSans_700Bold", fontSize: 13, color: "#fff", marginTop: 4 },
  scenarioYears: { fontFamily: "DMSans_400Regular", fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingTop: 60 },
  emptyIcon: { width: 100, height: 100, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyText: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.light.text, marginBottom: 8 },
  emptySubtext: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.light.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  setupBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.light.super, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 },
  setupBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.white },
});
