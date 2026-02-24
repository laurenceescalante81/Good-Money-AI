import React, { useEffect, useState, useMemo } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Line, Text as SvgText, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";
import Colors from "@/constants/colors";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useFinance } from "@/contexts/FinanceContext";
import { useRewards } from "@/contexts/RewardsContext";
import { MessageOverlay } from "@/contexts/AppMessagesContext";
import CoinHeader from '@/components/CoinHeader';
import { useResponsive } from '@/hooks/useResponsive';

const DEFAULT_CTAS: Record<string, string> = {
  mortgage: "Get a free rate review",
  super: "Optimise your super today",
  insurance: "Compare & save on premiums",
  savings: "Boost your savings plan",
  banks: "Link your accounts for real-time insights",
  budget: "Take control of your cash flow",
  planning: "See your wealth projection to retirement",
  fact_find: "Complete your profile for tailored advice",
  rewards: "Earn rewards & redeem for cashback",
};

function fmt(amount: number): string {
  return "$" + amount.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtK(n: number): string {
  if (Math.abs(n) >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
  if (Math.abs(n) >= 1000) return "$" + (n / 1000).toFixed(0) + "K";
  return "$" + n.toFixed(0);
}

function SetupWithCoin({ fontSize }: { fontSize: number }) {
  const coinSize = Math.round(fontSize * 0.9);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Text style={[styles.pillarValue, { fontSize, color: Colors.light.tint }]}>Setup</Text>
      <View style={{ width: coinSize, height: coinSize, borderRadius: coinSize / 2, backgroundColor: '#D4AF37', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E8C84A' }}>
        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: coinSize * 0.55, color: '#fff', marginTop: -0.5 }}>G</Text>
      </View>
    </View>
  );
}

function PillarCard({ icon, iconColor, bgColor, title, value, subtitle, cta, onPress, isSetup }: {
  icon: string; iconColor: string; bgColor: string; title: string; value: string; subtitle: string; cta: string; onPress: () => void; isSetup?: boolean;
}) {
  const { fs, is } = useAccessibility();
  const { isDesktop } = useResponsive();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pillarCard, isDesktop && { width: '30%' as any, flexBasis: '30%' as any }, pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] }]}>
      <View style={[styles.pillarIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon as any} size={is(22)} color={iconColor} />
      </View>
      <Text style={[styles.pillarTitle, { fontSize: fs(13) }]}>{title}</Text>
      {isSetup ? (
        <SetupWithCoin fontSize={fs(18)} />
      ) : (
        <Text style={[styles.pillarValue, { color: iconColor, fontSize: fs(18) }]}>{value}</Text>
      )}
      <Text style={[styles.pillarSubtitle, { fontSize: fs(11) }]}>{subtitle}</Text>
      <View style={[styles.pillarCta, { backgroundColor: iconColor + '12' }]}>
        <Text style={[styles.pillarCtaText, { color: iconColor, fontSize: fs(10) }]}>{cta}</Text>
        <Ionicons name="chevron-forward" size={is(12)} color={iconColor} />
      </View>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const { fs, is } = useAccessibility();
  const { isMobile, contentWidth, sidePadding } = useResponsive();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 16 : insets.top;
  const {
    mortgage, superDetails, insurancePolicies, goals,
    getTotalIncome, getTotalExpenses, calculateMortgageRepayment,
    calculateSuperProjection, getTotalInsuranceCost, profileMode,
  } = useFinance();

  const { state: rewardsState, missions, badges, xpForLevel, is2xWeekend } = useRewards();
  const [ctaTexts, setCtaTexts] = useState<Record<string, string>>(DEFAULT_CTAS);

  useEffect(() => {
    const BASE = Platform.OS === "web" ? "" : `http://${process.env.EXPO_PUBLIC_API_HOST || "localhost"}:5000`;
    fetch(`${BASE}/api/ctas`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        const map: Record<string, string> = { ...DEFAULT_CTAS };
        data.forEach((c: any) => { if (c.tab_key && c.cta_text) map[c.tab_key] = c.cta_text; });
        setCtaTexts(map);
      }
    }).catch(() => {});
  }, []);

  const income = getTotalIncome();
  const expenses = getTotalExpenses();
  const balance = income - expenses;
  const mortgageCalc = calculateMortgageRepayment();
  const superProj = calculateSuperProjection();
  const insuranceCost = getTotalInsuranceCost();

  const totalGoalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const totalGoalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);

  const levelNames = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Elite', 'Legend', 'Mythic', 'Champion', 'Grand Master'];
  const levelName = levelNames[Math.min(rewardsState.level - 1, levelNames.length - 1)];
  const xpNeeded = xpForLevel(rewardsState.level);
  const xpPct = xpNeeded > 0 ? Math.min((rewardsState.xp / xpNeeded) * 100, 100) : 0;
  const activeMissions = missions.filter(m => !m.completed);
  const completedMissionCount = missions.filter(m => m.completed).length;
  const unlockedBadgeCount = badges.filter(b => b.unlocked).length;

  const screenW = Math.min(Dimensions.get("window").width - 40, 500);
  const chartW = screenW;
  const chartH = 180;
  const padL = 50;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const monthlySavings = income - expenses;
  const wealthProjection = useMemo(() => {
    const points: { year: number; wealth: number; property: number; super_: number; savings: number }[] = [];
    const propertyValue = mortgage?.propertyValue || 0;
    const loanAmount = mortgage?.loanAmount || 0;
    const superBalance = superDetails?.balance || 0;
    const annualSuperContrib = superDetails ? superDetails.salary * (superDetails.employerRate / 100) : 0;
    const currentSavings = goals.reduce((s, g) => s + g.currentAmount, 0);
    const annualSavings = Math.max(0, monthlySavings * 12);
    const propertyGrowth = 0.04;
    const superGrowth = 0.07;
    const savingsGrowth = 0.04;
    const mortgageRate = mortgage ? mortgage.interestRate / 100 : 0;

    let propVal = propertyValue;
    let loanBal = loanAmount;
    let superBal = superBalance;
    let savBal = currentSavings;
    const annualMortgageRepay = mortgageCalc.monthly * 12;

    for (let y = 0; y <= 10; y++) {
      const equity = propVal - loanBal;
      const totalWealth = equity + superBal + savBal;
      points.push({ year: y, wealth: totalWealth, property: equity, super_: superBal, savings: savBal });
      propVal *= (1 + propertyGrowth);
      if (loanBal > 0 && mortgage) {
        const interest = loanBal * mortgageRate;
        const principal = Math.min(loanBal, annualMortgageRepay - interest);
        loanBal = Math.max(0, loanBal - principal);
      }
      superBal = (superBal + annualSuperContrib) * (1 + superGrowth);
      savBal = (savBal + annualSavings) * (1 + savingsGrowth);
    }
    return points;
  }, [mortgage, superDetails, goals, monthlySavings, mortgageCalc.monthly]);

  const maxWealth = Math.max(...wealthProjection.map(p => p.wealth), 1);
  const minWealth = Math.min(...wealthProjection.map(p => p.wealth), 0);
  const range = maxWealth - minWealth || 1;

  const toX = (i: number) => padL + (i / 10) * plotW;
  const toY = (v: number) => padT + plotH - ((v - minWealth) / range) * plotH;

  const wealthPath = wealthProjection.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.wealth).toFixed(1)}`).join(' ');
  const areaPath = wealthPath + ` L${toX(10).toFixed(1)},${(padT + plotH).toFixed(1)} L${padL},${(padT + plotH).toFixed(1)} Z`;

  const yTicks = 4;
  const yLines = Array.from({ length: yTicks + 1 }, (_, i) => {
    const val = minWealth + (range / yTicks) * i;
    return { val, y: toY(val) };
  });

  const finalWealth = wealthProjection[wealthProjection.length - 1]?.wealth || 0;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: isMobile ? 120 : 60 }}
      >
        <CoinHeader
          title="Overview"
          subtitle={new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
        />

        <View style={[styles.body, { alignSelf: 'center', width: '100%', maxWidth: contentWidth, paddingHorizontal: sidePadding }]}>
          <Text style={[styles.sectionTitle, { fontSize: fs(18) }]}>Financial Snapshot</Text>
          <View style={styles.pillarGrid}>
            <PillarCard
              icon="home-outline"
              iconColor={Colors.light.mortgage}
              bgColor={Colors.light.mortgage + "15"}
              title="Mortgage"
              value={mortgage ? fmt(mortgageCalc.monthly) + "/mo" : ""}
              isSetup={!mortgage}
              subtitle={mortgage ? fmt(mortgage.loanAmount) + " loan" : "Set up your home loan"}
              cta={ctaTexts.mortgage}
              onPress={() => mortgage ? router.push("/(tabs)/mortgage") : router.push("/setup-mortgage")}
            />
            <PillarCard
              icon="trending-up-outline"
              iconColor={Colors.light.super}
              bgColor={Colors.light.super + "15"}
              title="Super"
              value={superDetails ? fmt(superDetails.balance) : ""}
              isSetup={!superDetails}
              subtitle={superDetails ? fmt(Math.round(superProj.atRetirement)) + " at 67" : "Track your super"}
              cta={ctaTexts.super}
              onPress={() => superDetails ? router.push("/(tabs)/super") : router.push("/setup-super")}
            />
            <PillarCard
              icon="shield-checkmark-outline"
              iconColor={Colors.light.insurance}
              bgColor={Colors.light.insurance + "15"}
              title="Insurance"
              value={insurancePolicies.length > 0 ? fmt(insuranceCost) + "/yr" : ""}
              isSetup={insurancePolicies.length === 0}
              subtitle={insurancePolicies.length > 0 ? `${insurancePolicies.length} ${insurancePolicies.length === 1 ? 'policy' : 'policies'}` : "Add your policies"}
              cta={ctaTexts.insurance}
              onPress={() => router.push("/add-insurance")}
            />
            <PillarCard
              icon="flag-outline"
              iconColor={Colors.light.budget}
              bgColor={Colors.light.budget + "15"}
              title="Savings"
              value={goals.length > 0 ? fmt(totalGoalSaved) : ""}
              isSetup={goals.length === 0}
              subtitle={goals.length > 0 ? `of ${fmt(totalGoalTarget)} target` : "Set a savings goal"}
              cta={ctaTexts.savings}
              onPress={() => router.push("/add-goal")}
            />
            <PillarCard
              icon="wallet-outline"
              iconColor="#6366F1"
              bgColor="#6366F115"
              title="Budget"
              value={income > 0 || expenses > 0 ? (balance >= 0 ? "+" : "") + fmt(balance) + "/mo" : ""}
              isSetup={!(income > 0 || expenses > 0)}
              subtitle={income > 0 ? fmt(income) + " in, " + fmt(expenses) + " out" : "Track your cash flow"}
              cta={ctaTexts.budget}
              onPress={() => router.push("/(tabs)/budget")}
            />
            <PillarCard
              icon="business-outline"
              iconColor="#0D9488"
              bgColor="#0D948815"
              title="Banks"
              value="Open Banking"
              subtitle="Connect your accounts"
              cta={ctaTexts.banks}
              onPress={() => router.push("/(tabs)/budget")}
            />
          </View>

          <Pressable onPress={() => router.push("/(tabs)/index")} style={({ pressed }) => [pressed && { opacity: 0.95 }]}>
            <LinearGradient colors={['#0C1B2A', '#1B3A5C']} style={styles.rewardsSummary}>
              <View style={styles.rewardsSummaryHeader}>
                <View style={styles.rewardsTitleRow}>
                  <Ionicons name="star" size={is(18)} color="#D4AF37" />
                  <Text style={[styles.rewardsSummaryTitle, { fontSize: fs(17) }]}>Rewards</Text>
                </View>
                <Ionicons name="chevron-forward" size={is(18)} color="rgba(255,255,255,0.5)" />
              </View>

              <View style={styles.rewardsTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rewardsPointsBig, { fontSize: fs(30) }]}>{rewardsState.points.toLocaleString()}<Text style={[styles.rewardsPointsSuffix, { fontSize: fs(14) }]}> coins</Text></Text>
                  {(rewardsState.tokenBalance ?? 0) > 0 && (
                    <View style={styles.rewardsTokenRow}>
                      <View style={styles.rewardsTokenDot} />
                      <Text style={[styles.rewardsTokenText, { fontSize: fs(12) }]}>{(rewardsState.tokenBalance ?? 0).toFixed(2)} Good Coins</Text> 
                    </View>
                  )}
                </View>
                <View style={styles.rewardsLevelBadge}>
                  <Text style={[styles.rewardsLevelNum, { fontSize: fs(22) }]}>{rewardsState.level}</Text>
                  <Text style={[styles.rewardsLevelName, { fontSize: fs(10) }]}>{levelName}</Text>
                </View>
              </View>

              <View style={styles.rewardsXpRow}>
                <View style={styles.rewardsXpBarBg}>
                  <LinearGradient colors={['#6366F1', '#8B5CF6']} style={[styles.rewardsXpBarFill, { width: `${xpPct}%` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                </View>
                <Text style={[styles.rewardsXpText, { fontSize: fs(10) }]}>{rewardsState.xp}/{xpNeeded} XP</Text>
              </View>

              <View style={styles.rewardsStatsRow}>
                <View style={styles.rewardsStatItem}>
                  <Ionicons name="checkmark-circle" size={is(14)} color="#4ade80" />
                  <Text style={[styles.rewardsStatValue, { fontSize: fs(13) }]}>{completedMissionCount}/{missions.length}</Text>
                  <Text style={[styles.rewardsStatLabel, { fontSize: fs(11) }]}>missions</Text>
                </View>
                <View style={styles.rewardsStatDivider} />
                <View style={styles.rewardsStatItem}>
                  <Ionicons name="trophy" size={is(14)} color="#D4AF37" />
                  <Text style={[styles.rewardsStatValue, { fontSize: fs(13) }]}>{unlockedBadgeCount}/{badges.length}</Text>
                  <Text style={[styles.rewardsStatLabel, { fontSize: fs(11) }]}>badges</Text>
                </View>
                {is2xWeekend && (
                  <>
                    <View style={styles.rewardsStatDivider} />
                    <View style={styles.rewards2xBadge}>
                      <Ionicons name="flash" size={is(12)} color="#D4AF37" />
                      <Text style={[styles.rewards2xText, { fontSize: fs(11) }]}>2x</Text>
                    </View>
                  </>
                )}
              </View>

              {activeMissions.length > 0 && (
                <View style={styles.rewardsMissionsPreview}>
                  {activeMissions.slice(0, 2).map(m => {
                    const effectivePts = m.is2xActive ? m.basePoints * 2 : m.basePoints;
                    return (
                      <View key={m.id} style={styles.rewardsMissionRow}>
                        <View style={[styles.rewardsMissionIcon, { backgroundColor: m.iconBg + '20' }]}>
                          <Ionicons name={m.icon as any} size={is(14)} color={m.iconBg} />
                        </View>
                        <Text style={[styles.rewardsMissionName, { fontSize: fs(12) }]} numberOfLines={1}>{m.title}</Text>
                        <Text style={[styles.rewardsMissionPts, { fontSize: fs(12) }]}>+{effectivePts}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.rewardsCtaRow}>
                <Ionicons name="gift-outline" size={is(14)} color="#D4AF37" />
                <Text style={[styles.rewardsCtaText, { fontSize: fs(12) }]}>{ctaTexts.rewards}</Text>
                <Ionicons name="chevron-forward" size={is(14)} color="rgba(255,255,255,0.4)" />
              </View>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => router.push("/(tabs)/planning")} style={({ pressed }) => [pressed && { opacity: 0.95 }]}>
            <LinearGradient colors={[Colors.light.navy, Colors.light.navyMid]} style={styles.projectionSection}>
              <View style={styles.projectionHeader}>
                <View style={styles.projectionTitleRow}>
                  <Ionicons name="analytics" size={is(18)} color={Colors.light.tealLight} />
                  <Text style={[styles.projectionTitle, { fontSize: fs(17) }]}>10-Year Wealth Projection</Text>
                </View>
                <Ionicons name="chevron-forward" size={is(18)} color="rgba(255,255,255,0.5)" />
              </View>

              <View style={styles.projectionValueRow}>
                <Text style={[styles.projectionValueLabel, { fontSize: fs(12) }]}>Projected net wealth</Text>
                <Text style={[styles.projectionValue, { fontSize: fs(28) }]}>{fmt(Math.round(finalWealth))}</Text>
              </View>

              <View style={styles.chartWrap}>
                <Svg width={chartW} height={chartH}>
                  <Defs>
                    <SvgLinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={Colors.light.tealLight} stopOpacity="0.3" />
                      <Stop offset="1" stopColor={Colors.light.tealLight} stopOpacity="0.02" />
                    </SvgLinearGradient>
                  </Defs>
                  {yLines.map((yl, i) => (
                    <React.Fragment key={i}>
                      <Line x1={padL} y1={yl.y} x2={chartW - padR} y2={yl.y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                      <SvgText x={padL - 6} y={yl.y + 4} fill="rgba(255,255,255,0.35)" fontSize={9} textAnchor="end" fontFamily="DM Sans">{fmtK(yl.val)}</SvgText>
                    </React.Fragment>
                  ))}
                  {[0, 2, 5, 8, 10].map(y => (
                    <SvgText key={y} x={toX(y)} y={padT + plotH + 16} fill="rgba(255,255,255,0.35)" fontSize={9} textAnchor="middle" fontFamily="DM Sans">Yr {y}</SvgText>
                  ))}
                  <Path d={areaPath} fill="url(#areaGrad)" />
                  <Path d={wealthPath} fill="none" stroke={Colors.light.tealLight} strokeWidth={2.5} strokeLinejoin="round" />
                  {wealthProjection.length > 0 && (
                    <Circle cx={toX(10)} cy={toY(finalWealth)} r={4} fill={Colors.light.tealLight} stroke="#fff" strokeWidth={1.5} />
                  )}
                </Svg>
              </View>

              <View style={styles.projectionLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.light.mortgage }]} />
                  <Text style={[styles.legendText, { fontSize: fs(11) }]}>Property: {fmtK(wealthProjection[wealthProjection.length - 1]?.property || 0)}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.light.super }]} />
                  <Text style={[styles.legendText, { fontSize: fs(11) }]}>Super: {fmtK(wealthProjection[wealthProjection.length - 1]?.super_ || 0)}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.light.budget }]} />
                  <Text style={[styles.legendText, { fontSize: fs(11) }]}>Savings: {fmtK(wealthProjection[wealthProjection.length - 1]?.savings || 0)}</Text>
                </View>
              </View>

              <View style={styles.projectionCta}>
                <Ionicons name="analytics-outline" size={is(14)} color={Colors.light.tealLight} />
                <Text style={[styles.projectionCtaText, { fontSize: fs(12) }]}>{ctaTexts.planning}</Text>
                <Ionicons name="chevron-forward" size={is(14)} color="rgba(255,255,255,0.4)" />
              </View>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
      <MessageOverlay screen="overview" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { paddingHorizontal: 20, paddingBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 26, color: Colors.light.text },
  headerDate: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.light.textMuted, marginTop: 2 },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.light.gray100, alignItems: "center", justifyContent: "center" },
  body: { paddingTop: 24 },
  sectionTitle: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.light.text, marginBottom: 14 },
  pillarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  pillarCard: { width: "48%", backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, flexGrow: 1, flexBasis: "45%" },
  pillarIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  pillarTitle: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.textMuted, marginBottom: 4 },
  pillarValue: { fontFamily: "DMSans_700Bold", fontSize: 18, marginBottom: 2 },
  pillarSubtitle: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.light.textMuted },
  pillarCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 10, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8 },
  pillarCtaText: { fontFamily: "DMSans_600SemiBold", fontSize: 10 },
  rewardsSummary: { borderRadius: 20, padding: 18, marginBottom: 24 },
  rewardsSummaryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  rewardsTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rewardsSummaryTitle: { fontFamily: "DMSans_700Bold", fontSize: 17, color: "#fff" },
  rewardsTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  rewardsPointsBig: { fontFamily: "DMSans_700Bold", fontSize: 30, color: "#fff" },
  rewardsPointsSuffix: { fontFamily: "DMSans_500Medium", fontSize: 14, color: "rgba(255,255,255,0.5)" },
  rewardsTokenRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  rewardsTokenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D4AF37" },
  rewardsTokenText: { fontFamily: "DMSans_500Medium", fontSize: 12, color: "#D4AF37" },
  rewardsLevelBadge: { alignItems: "center", backgroundColor: "rgba(99,102,241,0.2)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(99,102,241,0.3)" },
  rewardsLevelNum: { fontFamily: "DMSans_700Bold", fontSize: 22, color: "#8B5CF6" },
  rewardsLevelName: { fontFamily: "DMSans_500Medium", fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 1 },
  rewardsXpRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  rewardsXpBarBg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  rewardsXpBarFill: { height: 6, borderRadius: 3 },
  rewardsXpText: { fontFamily: "DMSans_400Regular", fontSize: 10, color: "rgba(255,255,255,0.4)", width: 70, textAlign: "right" as const },
  rewardsStatsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  rewardsStatItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  rewardsStatValue: { fontFamily: "DMSans_700Bold", fontSize: 13, color: "#fff" },
  rewardsStatLabel: { fontFamily: "DMSans_400Regular", fontSize: 11, color: "rgba(255,255,255,0.4)" },
  rewardsStatDivider: { width: 1, height: 14, backgroundColor: "rgba(255,255,255,0.1)" },
  rewards2xBadge: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "rgba(212,175,55,0.15)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  rewards2xText: { fontFamily: "DMSans_700Bold", fontSize: 11, color: "#D4AF37" },
  rewardsMissionsPreview: { marginTop: 12, gap: 6 },
  rewardsMissionRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  rewardsMissionIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rewardsMissionName: { flex: 1, fontFamily: "DMSans_500Medium", fontSize: 12, color: "rgba(255,255,255,0.7)" },
  rewardsMissionPts: { fontFamily: "DMSans_700Bold", fontSize: 12, color: "#4ade80" },
  rewardsCtaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, backgroundColor: "rgba(212,175,55,0.1)", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  rewardsCtaText: { flex: 1, fontFamily: "DMSans_600SemiBold", fontSize: 12, color: "#D4AF37" },
  projectionSection: { borderRadius: 20, padding: 18, marginBottom: 24 },
  projectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  projectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  projectionTitle: { fontFamily: "DMSans_700Bold", fontSize: 17, color: "#fff" },
  projectionValueRow: { marginBottom: 12 },
  projectionValueLabel: { fontFamily: "DMSans_400Regular", fontSize: 12, color: "rgba(255,255,255,0.5)" },
  projectionValue: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.light.tealLight, marginTop: 2 },
  chartWrap: { marginBottom: 12 },
  projectionLegend: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: "DMSans_500Medium", fontSize: 11, color: "rgba(255,255,255,0.6)" },
  projectionCta: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(13,148,136,0.12)", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  projectionCtaText: { flex: 1, fontFamily: "DMSans_600SemiBold", fontSize: 12, color: Colors.light.tealLight },
});
