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
import { useResponsive } from '@/hooks/useResponsive';

function fmt(n: number): string { return "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  const { fs } = useAccessibility();
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statLabel, { fontSize: fs(14) }]}>{label}</Text>
      <Text style={[styles.statValue, { fontSize: fs(14) }, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

export default function SuperScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 16 : insets.top;
  const { superDetails, calculateSuperProjection, clearSuper } = useFinance();
  const { state: rewardsState, missions, completeMission } = useRewards();
  const { fs, is } = useAccessibility();
  const { isMobile, contentWidth, sidePadding } = useResponsive();
  const superMission = missions.find(m => m.id === 'compare_super' && !m.completed);

  if (!superDetails) {
    return (
      <View style={styles.container}>
        <CoinHeader title="Super" />
        <Text style={[styles.pageDesc, { fontSize: fs(14) }]}>Monitor your superannuation balance and retirement projections.</Text>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: Colors.light.super + "15" }]}>
            <Ionicons name="trending-up-outline" size={is(48)} color={Colors.light.super} />
          </View>
          <Text style={[styles.emptyText, { fontSize: fs(20) }]}>Track your super</Text>
          <Text style={[styles.emptySubtext, { fontSize: fs(14) }]}>Add your superannuation details to project your retirement balance and track employer contributions</Text>
          <Pressable style={({ pressed }) => [styles.setupBtn, pressed && { opacity: 0.9 }]} onPress={() => router.push("/setup-super")}>
            <Ionicons name="add" size={is(20)} color={Colors.light.white} />
            <Text style={[styles.setupBtnText, { fontSize: fs(15) }]}>Set Up Super</Text>
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
      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: isMobile ? 100 : 60 }}>
        <CoinHeader title="Super" />
        <View style={{ alignSelf: 'center', width: '100%', maxWidth: contentWidth, paddingHorizontal: sidePadding }}>
        <Text style={[styles.pageDesc, { fontSize: fs(14) }]}>Monitor your superannuation balance and retirement projections.</Text>
        <View style={[styles.header]}>
          <View />
          <View style={styles.headerBtns}>
            <Pressable onPress={() => router.push("/setup-super")} hitSlop={12}>
              <Ionicons name="pencil" size={is(22)} color={Colors.light.super} />
            </Pressable>
            <Pressable onPress={() => Alert.alert("Remove Super", "Clear your super details?", [
              { text: "Cancel", style: "cancel" },
              { text: "Remove", style: "destructive", onPress: clearSuper },
            ])} hitSlop={12}>
              <Ionicons name="trash-outline" size={is(22)} color={Colors.light.expense} />
            </Pressable>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={[styles.heroLabel, { fontSize: fs(14) }]}>Current Balance</Text>
          <Text style={[styles.heroAmount, { fontSize: fs(36) }]}>{fmt(superDetails.balance)}</Text>
          <Text style={[styles.heroSub, { fontSize: fs(13) }]}>{superDetails.fund}</Text>
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
                <Ionicons name="rocket-outline" size={is(20)} color="#fff" />
                <Text style={[styles.valueBannerTitle, { fontSize: fs(18) }]}>Grow Your Super</Text>
              </View>

              <Text style={[styles.valueBannerSubtitle, { fontSize: fs(13) }]}>Adding $200/mo salary sacrifice could give you</Text>
              <View style={styles.valueBannerRow}>
                <View style={styles.valueBannerItem}>
                  <Text style={[styles.valueBannerBigNum, { fontSize: fs(26) }]}>{fmt(Math.round(extra200))}</Text>
                  <Text style={[styles.valueBannerSmall, { fontSize: fs(11) }]}>extra at retirement</Text>
                </View>
                <View style={styles.valueBannerDivider} />
                <View style={styles.valueBannerItem}>
                  <Text style={[styles.valueBannerBigNum, { fontSize: fs(26) }]}>+{fmt(Math.round(extraMonthlyIncome200))}</Text>
                  <Text style={[styles.valueBannerSmall, { fontSize: fs(11) }]}>per month extra income</Text>
                </View>
              </View>

              <View style={styles.valueBannerPill}>
                <Ionicons name="information-circle-outline" size={is(14)} color="#fff" />
                <Text style={[styles.valueBannerPillText, { fontSize: fs(12) }]}>
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
                      <Text style={[styles.scenarioExtra, { fontSize: fs(11) }]}>+${extra}/mo</Text>
                      <Text style={[styles.scenarioSaved, { fontSize: fs(13) }]}>{fmt(Math.round(gain))}</Text>
                      <Text style={[styles.scenarioYears, { fontSize: fs(10) }]}>+{fmt(Math.round(monthlyGain))}/mo</Text>
                    </View>
                  );
                })}
              </View>
            </LinearGradient>
          );
        })()}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: fs(16) }]}>Contributions</Text>
          <View style={styles.card}>
            <StatRow label="Salary" value={fmt(superDetails.salary) + "/yr"} />
            <StatRow label="Employer Rate (SG)" value={`${superDetails.employerRate}%`} />
            <StatRow label="Annual Contribution" value={fmt(Math.round(annualContrib))} color={Colors.light.super} />
            <StatRow label="Monthly Contribution" value={fmt(Math.round(monthlyContrib))} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: fs(16) }]}>Retirement Projection</Text>
          <View style={styles.card}>
            <StatRow label="Projected at 67" value={fmt(Math.round(proj.atRetirement))} color={Colors.light.super} />
            <StatRow label="Years to Retirement" value={`${proj.yearsToRetirement} years`} />
            <StatRow label="Monthly Income (est.)" value={fmt(Math.round(proj.monthlyInRetirement))} color={Colors.light.income} />
            <View style={styles.projNote}>
              <Ionicons name="information-circle-outline" size={is(14)} color={Colors.light.textMuted} />
              <Text style={[styles.projNoteText, { fontSize: fs(11) }]}>Based on 7% annual growth and 4% drawdown rate</Text>
            </View>
          </View>
        </View>

        {nextMilestone && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: fs(16) }]}>Next Milestone</Text>
            <View style={styles.milestoneCard}>
              <View style={styles.milestoneHeader}>
                <Ionicons name="flag" size={is(20)} color={Colors.light.super} />
                <Text style={[styles.milestoneLabel, { fontSize: fs(20) }]}>{nextMilestone.label}</Text>
              </View>
              <View style={styles.milestoneBarBg}>
                <View style={[styles.milestoneBarFill, { width: `${Math.min(milestoneProgress, 100)}%` }]} />
              </View>
              <Text style={[styles.milestoneText, { fontSize: fs(13) }]}>
                {fmt(nextMilestone.amount - superDetails.balance)} to go
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: fs(16) }]}>Fund Details</Text>
          <View style={styles.card}>
            <StatRow label="Fund" value={superDetails.fund} />
            <StatRow label="Investment Option" value={superDetails.investmentOption} />
            <StatRow label="Last Updated" value={new Date(superDetails.lastUpdated).toLocaleDateString("en-AU")} />
          </View>
        </View>

        <View style={styles.section}>
          <LinearGradient colors={["#1E1A4C", "#3B2D8B"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.salesCta}>
            <View style={styles.salesCtaHeader}>
              <View style={styles.salesCtaBadge}>
                <Ionicons name="flash" size={is(14)} color="#A78BFA" />
                <Text style={[styles.salesCtaBadgeText, { fontSize: fs(11) }]}>RETIRE RICHER</Text>
              </View>
            </View>
            <Text style={[styles.salesCtaTitle, { fontSize: fs(20) }]}>
              Could an extra $50/week{'\n'}change your retirement?
            </Text>
            {(() => {
              const weeklyExtra = 50;
              const monthlyExtra = weeklyExtra * 52 / 12;
              const yearsToRetire = 67 - 30;
              let extraBalance = 0;
              for (let i = 0; i < yearsToRetire; i++) {
                extraBalance = (extraBalance + monthlyExtra * 12) * 1.07;
              }
              const extraMonthlyIncome = (extraBalance * 0.04) / 12;
              return (
                <>
                  <Text style={[styles.salesCtaBody, { fontSize: fs(14) }]}>
                    Just $50/week salary sacrificed into super could grow into an extra{' '}
                    <Text style={{ fontFamily: 'DMSans_700Bold', color: '#A78BFA' }}>
                      {fmt(Math.round(extraBalance))}
                    </Text>{' '}
                    by retirement — that's{' '}
                    <Text style={{ fontFamily: 'DMSans_700Bold', color: '#A78BFA' }}>
                      +{fmt(Math.round(extraMonthlyIncome))}/month
                    </Text>{' '}
                    extra income. And you'll pay less tax today.
                  </Text>
                  <View style={styles.salesCtaStats}>
                    <View style={styles.salesCtaStat}>
                      <Ionicons name="calculator-outline" size={is(18)} color="#A78BFA" />
                      <Text style={[styles.salesCtaStatText, { fontSize: fs(12) }]}>
                        Pre-tax: only 15% tax vs your marginal rate
                      </Text>
                    </View>
                    <View style={styles.salesCtaStat}>
                      <Ionicons name="trending-up" size={is(18)} color="#A78BFA" />
                      <Text style={[styles.salesCtaStatText, { fontSize: fs(12) }]}>
                        Compounds over {yearsToRetire} years at ~7% growth
                      </Text>
                    </View>
                  </View>
                </>
              );
            })()}
            <Pressable
              style={({ pressed }) => [styles.salesCtaBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
              onPress={() => router.push("/(tabs)/overview")}
            >
              <Text style={[styles.salesCtaBtnText, { fontSize: fs(15) }]}>Speak to an Adviser</Text>
              <Ionicons name="arrow-forward" size={is(18)} color="#1E1A4C" />
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
            {superMission && (
              <Pressable onPress={() => completeMission('compare_super')} style={({ pressed }) => [styles.missionPrompt, pressed && { opacity: 0.85 }]}>
                <View style={[styles.missionPromptIcon, { backgroundColor: '#8B5CF620' }]}>
                  <Ionicons name="bar-chart-outline" size={is(14)} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.missionPromptTitle, { fontSize: fs(12) }]}>{superMission.title}</Text>
                  <Text style={[styles.missionPromptDesc, { fontSize: fs(10) }]}>{superMission.description}</Text>
                </View>
                <Text style={[styles.missionPromptPts, { fontSize: fs(13) }]}>+{superMission.is2xActive ? superMission.basePoints * 2 : superMission.basePoints}</Text>
              </Pressable>
            )}
          </View>
        </Pressable>

        </View>
      </ScrollView>
      <MessageOverlay screen="super" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  pageDesc: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.light.textSecondary, marginTop: 8, marginBottom: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  headerBtns: { flexDirection: "row", gap: 16 },
  title: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.light.text },
  heroCard: { backgroundColor: Colors.light.super, borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 8 },
  heroLabel: { fontFamily: "DMSans_500Medium", fontSize: 14, color: "rgba(255,255,255,0.7)" },
  heroAmount: { fontFamily: "DMSans_700Bold", fontSize: 36, color: Colors.light.white, marginTop: 4 },
  heroSub: { fontFamily: "DMSans_400Regular", fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 },
  section: { marginTop: 20 },
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
  valueBanner: { borderRadius: 20, padding: 20, marginBottom: 16 },
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
  missionBanner: { marginTop: 20, backgroundColor: Colors.light.card, borderRadius: 16, padding: 14 },
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
  salesCtaBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(167,139,250,0.15)", alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  salesCtaBadgeText: { fontFamily: "DMSans_700Bold", fontSize: 11, color: "#A78BFA", letterSpacing: 1 },
  salesCtaTitle: { fontFamily: "DMSans_700Bold", fontSize: 20, color: "#fff", lineHeight: 28, marginBottom: 12 },
  salesCtaBody: { fontFamily: "DMSans_400Regular", fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 22, marginBottom: 16 },
  salesCtaStats: { gap: 10, marginBottom: 20 },
  salesCtaStat: { flexDirection: "row", alignItems: "center", gap: 10 },
  salesCtaStatText: { fontFamily: "DMSans_500Medium", fontSize: 12, color: "rgba(255,255,255,0.75)", flex: 1 },
  salesCtaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#A78BFA", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24 },
  salesCtaBtnText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: "#1E1A4C" },
});
