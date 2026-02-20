import React from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useFinance } from "@/contexts/FinanceContext";

function fmt(amount: number): string {
  return "$" + amount.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function PillarCard({ icon, iconColor, bgColor, title, value, subtitle, onPress }: {
  icon: string; iconColor: string; bgColor: string; title: string; value: string; subtitle: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pillarCard, pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] }]}>
      <View style={[styles.pillarIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon as any} size={22} color={iconColor} />
      </View>
      <Text style={styles.pillarTitle}>{title}</Text>
      <Text style={[styles.pillarValue, { color: iconColor }]}>{value}</Text>
      <Text style={styles.pillarSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const {
    mortgage, superDetails, insurancePolicies, goals,
    getTotalIncome, getTotalExpenses, calculateMortgageRepayment,
    calculateSuperProjection, getTotalInsuranceCost, profileMode,
  } = useFinance();

  const income = getTotalIncome();
  const expenses = getTotalExpenses();
  const balance = income - expenses;
  const mortgageCalc = calculateMortgageRepayment();
  const superProj = calculateSuperProjection();
  const insuranceCost = getTotalInsuranceCost();

  const totalGoalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const totalGoalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);

  return (
    <View style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <LinearGradient colors={[Colors.light.navy, Colors.light.navyMid]} style={[styles.hero, { paddingTop: topInset + 16 }]}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroGreeting}>
                {profileMode === "couple" ? "Shared Finances" : "Your Finances"}
              </Text>
              <Text style={styles.heroMonth}>
                {new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
              </Text>
            </View>
            <Pressable onPress={() => router.push("/settings")} hitSlop={12}>
              <View style={styles.settingsBtn}>
                <Feather name="settings" size={20} color={Colors.light.white} />
              </View>
            </Pressable>
          </View>

          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Monthly Cash Flow</Text>
            <Text style={[styles.balanceAmount, { color: balance >= 0 ? Colors.light.budgetLight : Colors.light.expenseLight }]}>
              {balance >= 0 ? "+" : ""}{fmt(balance)}
            </Text>
          </View>

          <View style={styles.heroCards}>
            <View style={[styles.heroCard, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
              <Ionicons name="arrow-down-circle" size={18} color={Colors.light.incomeLight} />
              <Text style={styles.heroCardLabel}>Income</Text>
              <Text style={[styles.heroCardAmount, { color: Colors.light.incomeLight }]}>{fmt(income)}</Text>
            </View>
            <View style={[styles.heroCard, { backgroundColor: "rgba(239,68,68,0.15)" }]}>
              <Ionicons name="arrow-up-circle" size={18} color={Colors.light.expenseLight} />
              <Text style={styles.heroCardLabel}>Expenses</Text>
              <Text style={[styles.heroCardAmount, { color: Colors.light.expenseLight }]}>{fmt(expenses)}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {(mortgage || superDetails || expenses > 0) && (
            <LinearGradient colors={[Colors.light.tint, Colors.light.navy]} style={styles.optiGradient}>
              <View style={styles.optiGradientHeader}>
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={styles.optiGradientTitle}>Optimisation Opportunities</Text>
              </View>
              {mortgage && mortgage.repaymentType === "principal_interest" && (() => {
                const rate = mortgage.interestRate / 100 / 12;
                const nMonths = mortgage.loanTermYears * 12;
                const basePmt = rate === 0 ? mortgage.loanAmount / nMonths : mortgage.loanAmount * (rate * Math.pow(1 + rate, nMonths)) / (Math.pow(1 + rate, nMonths) - 1);
                const totalPmt = (basePmt + 500);
                let balance = mortgage.loanAmount;
                let months = 0;
                let paid = 0;
                while (balance > 0 && months < nMonths * 2) {
                  const interest = balance * rate;
                  const principal = Math.min(totalPmt - interest, balance);
                  if (principal <= 0) break;
                  balance -= principal;
                  paid += totalPmt;
                  months++;
                }
                const baseTotalInt = (basePmt * nMonths) - mortgage.loanAmount;
                const extraTotalInt = paid - mortgage.loanAmount;
                const saved = Math.max(0, baseTotalInt - extraTotalInt);
                return (
                  <Pressable onPress={() => router.push("/(tabs)/mortgage")} style={({ pressed }) => [styles.optiCard, pressed && { opacity: 0.85 }]}>
                    <View style={styles.optiIconCircle}>
                      <Ionicons name="home-outline" size={20} color="#fff" />
                    </View>
                    <View style={styles.optiInfo}>
                      <Text style={styles.optiLabel}>Mortgage: +$500/mo</Text>
                      <Text style={styles.optiValue}>Save {fmt(Math.round(saved))} in interest</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
                  </Pressable>
                );
              })()}
              {superDetails && (() => {
                const growthRate = 0.07;
                const yearsToRetirement = 67 - 30;
                const annualContrib = superDetails.salary * (superDetails.employerRate / 100);
                let baseBalance = superDetails.balance;
                for (let i = 0; i < yearsToRetirement; i++) baseBalance = (baseBalance + annualContrib) * (1 + growthRate);
                let extraBalance = superDetails.balance;
                const totalContrib = annualContrib + 2400;
                for (let i = 0; i < yearsToRetirement; i++) extraBalance = (extraBalance + totalContrib) * (1 + growthRate);
                const gain = extraBalance - baseBalance;
                return (
                  <Pressable onPress={() => router.push("/(tabs)/super")} style={({ pressed }) => [styles.optiCard, pressed && { opacity: 0.85 }]}>
                    <View style={styles.optiIconCircle}>
                      <Ionicons name="trending-up-outline" size={20} color="#fff" />
                    </View>
                    <View style={styles.optiInfo}>
                      <Text style={styles.optiLabel}>Super: +$200/mo sacrifice</Text>
                      <Text style={styles.optiValue}>+{fmt(Math.round(gain))} at retirement</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
                  </Pressable>
                );
              })()}
              {expenses > 0 && (() => {
                const annualSaving = expenses * 0.1 * 12;
                let invested = 0;
                for (let i = 0; i < 10; i++) invested = (invested + annualSaving) * 1.07;
                return (
                  <Pressable onPress={() => router.push("/(tabs)/budget")} style={({ pressed }) => [styles.optiCard, pressed && { opacity: 0.85 }]}>
                    <View style={styles.optiIconCircle}>
                      <Ionicons name="wallet-outline" size={20} color="#fff" />
                    </View>
                    <View style={styles.optiInfo}>
                      <Text style={styles.optiLabel}>Budget: cut 10% spending</Text>
                      <Text style={styles.optiValue}>{fmt(Math.round(invested))} over 10 years</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
                  </Pressable>
                );
              })()}
            </LinearGradient>
          )}

          <Text style={styles.sectionTitle}>Financial Snapshot</Text>
          <View style={styles.pillarGrid}>
            <PillarCard
              icon="home-outline"
              iconColor={Colors.light.mortgage}
              bgColor={Colors.light.mortgage + "15"}
              title="Mortgage"
              value={mortgage ? fmt(mortgageCalc.monthly) + "/mo" : "Not set"}
              subtitle={mortgage ? fmt(mortgage.loanAmount) + " loan" : "Set up your home loan"}
              onPress={() => mortgage ? router.push("/(tabs)/mortgage") : router.push("/setup-mortgage")}
            />
            <PillarCard
              icon="trending-up-outline"
              iconColor={Colors.light.super}
              bgColor={Colors.light.super + "15"}
              title="Super"
              value={superDetails ? fmt(superDetails.balance) : "Not set"}
              subtitle={superDetails ? fmt(Math.round(superProj.atRetirement)) + " at 67" : "Track your super"}
              onPress={() => superDetails ? router.push("/(tabs)/super") : router.push("/setup-super")}
            />
            <PillarCard
              icon="shield-checkmark-outline"
              iconColor={Colors.light.insurance}
              bgColor={Colors.light.insurance + "15"}
              title="Insurance"
              value={insurancePolicies.length > 0 ? fmt(insuranceCost) + "/yr" : "None"}
              subtitle={insurancePolicies.length > 0 ? `${insurancePolicies.length} ${insurancePolicies.length === 1 ? 'policy' : 'policies'}` : "Add your policies"}
              onPress={() => router.push("/add-insurance")}
            />
            <PillarCard
              icon="flag-outline"
              iconColor={Colors.light.budget}
              bgColor={Colors.light.budget + "15"}
              title="Savings"
              value={goals.length > 0 ? fmt(totalGoalSaved) : "No goals"}
              subtitle={goals.length > 0 ? `of ${fmt(totalGoalTarget)} target` : "Set a savings goal"}
              onPress={() => router.push("/add-goal")}
            />
          </View>

          {insurancePolicies.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Insurance Policies</Text>
              {insurancePolicies.map(p => {
                const typeLabels: Record<string, string> = {
                  home: "Home", car: "Car", health: "Health", life: "Life",
                  income_protection: "Income Protection", contents: "Contents", travel: "Travel",
                };
                const typeIcons: Record<string, string> = {
                  home: "home-outline", car: "car-outline", health: "heart-outline",
                  life: "person-outline", income_protection: "briefcase-outline",
                  contents: "cube-outline", travel: "airplane-outline",
                };
                const daysUntilRenewal = Math.ceil((new Date(p.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <View key={p.id} style={styles.insuranceItem}>
                    <View style={[styles.insuranceIcon, { backgroundColor: Colors.light.insurance + "15" }]}>
                      <Ionicons name={typeIcons[p.type] as any || "shield-outline"} size={20} color={Colors.light.insurance} />
                    </View>
                    <View style={styles.insuranceInfo}>
                      <Text style={styles.insuranceName}>{typeLabels[p.type] || p.type}</Text>
                      <Text style={styles.insuranceProvider}>{p.provider}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" as const }}>
                      <Text style={styles.insurancePremium}>${p.premium}/{p.premiumFrequency === "monthly" ? "mo" : p.premiumFrequency === "annually" ? "yr" : p.premiumFrequency}</Text>
                      <Text style={[styles.insuranceRenewal, daysUntilRenewal <= 30 && { color: Colors.light.expense }]}>
                        {daysUntilRenewal > 0 ? `${daysUntilRenewal}d to renewal` : "Overdue"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {goals.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Savings Goals</Text>
              {goals.map(g => {
                const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
                return (
                  <View key={g.id} style={styles.goalItem}>
                    <View style={[styles.goalIconWrap, { backgroundColor: Colors.light.budget + "15" }]}>
                      <Ionicons name={g.icon as any} size={18} color={Colors.light.budget} />
                    </View>
                    <View style={styles.goalInfo}>
                      <Text style={styles.goalName}>{g.name}</Text>
                      <View style={styles.goalBarBg}>
                        <View style={[styles.goalBarFill, { width: `${Math.min(pct, 100)}%` }]} />
                      </View>
                    </View>
                    <Text style={styles.goalPct}>{Math.round(pct)}%</Text>
                  </View>
                );
              })}
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  hero: { paddingHorizontal: 20, paddingBottom: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroGreeting: { fontFamily: "DMSans_600SemiBold", fontSize: 16, color: Colors.light.white },
  heroMonth: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.light.gray400, marginTop: 2 },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  balanceSection: { marginTop: 20, marginBottom: 20 },
  balanceLabel: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.light.gray400 },
  balanceAmount: { fontFamily: "DMSans_700Bold", fontSize: 38, marginTop: 4 },
  heroCards: { flexDirection: "row", gap: 12 },
  heroCard: { flex: 1, borderRadius: 14, padding: 12, gap: 4 },
  heroCardLabel: { fontFamily: "DMSans_500Medium", fontSize: 12, color: "rgba(255,255,255,0.6)" },
  heroCardAmount: { fontFamily: "DMSans_700Bold", fontSize: 17 },
  body: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.light.text, marginBottom: 14 },
  section: { marginTop: 24 },
  optiGradient: { borderRadius: 20, padding: 20, marginBottom: 24 },
  optiGradientHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  optiGradientTitle: { fontFamily: "DMSans_700Bold", fontSize: 18, color: "#fff" },
  optiCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 14, marginBottom: 8 },
  optiIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  optiInfo: { flex: 1 },
  optiLabel: { fontFamily: "DMSans_500Medium", fontSize: 13, color: "rgba(255,255,255,0.7)" },
  optiValue: { fontFamily: "DMSans_700Bold", fontSize: 15, color: "#fff", marginTop: 2 },
  pillarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  pillarCard: { width: "48%", backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, flexGrow: 1, flexBasis: "45%" },
  pillarIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  pillarTitle: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.textMuted, marginBottom: 4 },
  pillarValue: { fontFamily: "DMSans_700Bold", fontSize: 18, marginBottom: 2 },
  pillarSubtitle: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.light.textMuted },
  insuranceItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.light.card, borderRadius: 14, padding: 14, marginBottom: 8 },
  insuranceIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  insuranceInfo: { flex: 1 },
  insuranceName: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.text },
  insuranceProvider: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 2 },
  insurancePremium: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.text },
  insuranceRenewal: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.light.textMuted, marginTop: 2 },
  goalItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.light.card, borderRadius: 14, padding: 14, marginBottom: 8 },
  goalIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  goalInfo: { flex: 1, gap: 6 },
  goalName: { fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.light.text },
  goalBarBg: { height: 6, backgroundColor: Colors.light.gray100, borderRadius: 3, overflow: "hidden" },
  goalBarFill: { height: 6, borderRadius: 3, backgroundColor: Colors.light.budget },
  goalPct: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.light.budget },
});
