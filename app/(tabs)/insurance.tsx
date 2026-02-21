import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useFinance } from "@/contexts/FinanceContext";

type CategoryKey = "car" | "home" | "life";

interface CoverageTier {
  level: string;
  monthly: string;
  coverAmount: string;
  consequences: string[];
  tag?: string;
  tagColor?: string;
}

interface CategoryData {
  key: CategoryKey;
  title: string;
  icon: string;
  color: string;
  gradient: [string, string];
  tiers: CoverageTier[];
  tips: string[];
  optimisations: string[];
}

const CATEGORIES: CategoryData[] = [
  {
    key: "car",
    title: "Car Insurance",
    icon: "car-sport-outline",
    color: "#6366F1",
    gradient: ["#6366F1", "#4338CA"],
    tiers: [
      {
        level: "Third Party Only",
        monthly: "$30–$50",
        coverAmount: "No cover for your car",
        tag: "Budget",
        tagColor: "#F59E0B",
        consequences: [
          "Covers damage you cause to other people's cars and property",
          "Your own car gets no payout if stolen, written off, or damaged in an accident",
          "You pay all repair costs yourself — a minor panel repair can be $2,000+",
          "If your car is totalled, you lose the full asset value with zero compensation",
        ],
      },
      {
        level: "Third Party Fire & Theft",
        monthly: "$50–$80",
        coverAmount: "Market value if stolen/fire",
        tag: "Mid-range",
        tagColor: "#3B82F6",
        consequences: [
          "Covers damage to other vehicles plus theft and fire damage to yours",
          "No payout if you crash your car — only theft or fire triggers a claim",
          "Stolen car replaced at agreed or market value (minus excess)",
          "Good balance if you drive an older car worth $5K–$15K",
        ],
      },
      {
        level: "Comprehensive",
        monthly: "$80–$200",
        coverAmount: "Agreed/market value",
        tag: "Recommended",
        tagColor: "#10B981",
        consequences: [
          "Full protection: accidents, theft, fire, storm, vandalism, and third party damage",
          "Crash your car? Insurer covers repairs or replacement minus excess ($500–$1,500)",
          "Often includes hire car, windscreen cover, roadside assist, and new-for-old on recent cars",
          "Essential if your car is worth more than $15K or you're still paying off a loan",
        ],
      },
    ],
    tips: [
      "Compare at least 3 quotes — premiums vary by up to 40% for the same cover",
      "Increase your excess from $500 to $1,000 to lower premiums by 10–20%",
      "Check if your super fund offers discounted car insurance as a member perk",
      "Pay annually instead of monthly to avoid the ~15% instalment surcharge",
      "Dashcam footage can help dispute fault and keep your premium low",
    ],
    optimisations: [
      "Bundle home + car with one insurer for 10–15% multi-policy discount",
      "If your car is under 3 years old, choose agreed value — market value depreciates fast",
      "Review your km estimate — driving less than 10,000km/yr can cut premiums 5–10%",
      "Named drivers only (no 'any driver') reduces risk profile and lowers cost",
      "Ask about no-claim bonus protection — costs ~$30/yr but saves hundreds on renewals",
    ],
  },
  {
    key: "home",
    title: "Home & Contents",
    icon: "home-outline",
    color: "#3B82F6",
    gradient: ["#3B82F6", "#1D4ED8"],
    tiers: [
      {
        level: "Contents Only",
        monthly: "$20–$50",
        coverAmount: "$20K–$80K contents",
        tag: "Renters",
        tagColor: "#8B5CF6",
        consequences: [
          "Protects your belongings (furniture, electronics, clothes) inside a rented home",
          "No cover for the building itself — that's the landlord's responsibility",
          "If a fire or flood destroys everything, insurer pays to replace your possessions",
          "Without it, replacing a full household of items could cost $30,000–$80,000 out of pocket",
        ],
      },
      {
        level: "Building Only",
        monthly: "$60–$120",
        coverAmount: "$300K–$800K rebuild",
        tag: "Homeowners",
        tagColor: "#3B82F6",
        consequences: [
          "Covers the physical structure — walls, roof, fixtures, fences, garages",
          "If your home is destroyed by storm, fire, or flood, insurer pays rebuild costs",
          "Does not cover your personal belongings inside the home",
          "Essential if you have a mortgage — most lenders require building insurance",
        ],
      },
      {
        level: "Building + Contents",
        monthly: "$90–$200",
        coverAmount: "Full property + contents",
        tag: "Recommended",
        tagColor: "#10B981",
        consequences: [
          "Complete protection for both your home structure and everything inside it",
          "Covers storm damage, fire, theft, burst pipes, accidental damage, and liability",
          "Typical Australian home rebuild cost is $350K–$600K — this covers the full amount",
          "Often includes temporary accommodation if your home becomes unliveable",
        ],
      },
    ],
    tips: [
      "Use your council's property data to calculate accurate rebuild cost — don't just guess",
      "Update your contents sum insured every year as you acquire new items",
      "Check if you're in a flood/bushfire zone — standard policies often exclude these",
      "Add portable contents cover for items you take outside (laptops, phones, jewellery)",
      "Photograph and list valuable items as evidence in case you need to make a claim",
    ],
    optimisations: [
      "Install deadlocks, smoke alarms, and security cameras for 5–10% premium discounts",
      "Opt for a higher excess ($500 → $1,000) if you rarely claim — saves $150–$300/yr",
      "Bundle building + contents with one insurer rather than separate policies",
      "Check strata insurance if you own a unit — you may only need contents cover",
      "Review sub-limits on valuables — default jewellery limits are often only $2,500 per item",
    ],
  },
  {
    key: "life",
    title: "Life Insurance",
    icon: "heart-outline",
    color: "#EC4899",
    gradient: ["#EC4899", "#BE185D"],
    tiers: [
      {
        level: "Basic (via Super)",
        monthly: "$15–$40",
        coverAmount: "$100K–$300K",
        tag: "Default",
        tagColor: "#F59E0B",
        consequences: [
          "Most Australians already have basic life cover inside their super fund",
          "Payout of $100K–$300K goes to your nominated beneficiary if you pass away",
          "May not be enough to pay off a mortgage and support a family for years",
          "Premiums are deducted from your super balance — eroding your retirement savings",
        ],
      },
      {
        level: "Standard Cover",
        monthly: "$50–$120",
        coverAmount: "$500K–$1M",
        tag: "Families",
        tagColor: "#3B82F6",
        consequences: [
          "Enough to pay off an average Australian mortgage ($550K) and leave a buffer",
          "Can cover 3–5 years of family living expenses while your partner adjusts",
          "Often includes terminal illness benefit — pays out early if diagnosed",
          "Can add TPD (Total & Permanent Disability) for an extra $20–$40/mo",
        ],
      },
      {
        level: "Premium Cover",
        monthly: "$120–$300",
        coverAmount: "$1M–$3M+",
        tag: "High earners",
        tagColor: "#10B981",
        consequences: [
          "Replaces your income for 10–15+ years, covering mortgage, kids' education, and lifestyle",
          "Includes trauma/critical illness cover — lump sum if diagnosed with cancer, stroke, heart attack",
          "Income protection add-on pays up to 75% of your salary if you can't work due to illness/injury",
          "Ensures your family maintains their standard of living long-term without financial stress",
        ],
      },
    ],
    tips: [
      "Check your super fund's default cover first — you may already have $200K+ in life insurance",
      "Rule of thumb: cover should be 10–12x your annual income plus outstanding debts",
      "Stepped premiums start cheap but rise steeply after 40 — level premiums stay flat",
      "Nominate a binding beneficiary on your super to avoid delays in payout",
      "Consider income protection separately — it's tax deductible when held outside super",
    ],
    optimisations: [
      "Hold life and TPD inside super to pay with pre-tax dollars (saves 15–30%)",
      "Hold income protection outside super — premiums are personally tax deductible",
      "Don't duplicate cover — check your super fund before buying a separate policy",
      "Review cover at life events: marriage, kids, mortgage — adjust as needs change",
      "Compare super fund insurance vs retail policies — retail often has better terms and definitions",
    ],
  },
];

function fmt(n: number): string { return "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

function annualCost(p: { premium: number; premiumFrequency: string }): number {
  const mult: Record<string, number> = { weekly: 52, fortnightly: 26, monthly: 12, quarterly: 4, annually: 1 };
  return p.premium * (mult[p.premiumFrequency] || 12);
}

export default function InsuranceScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { insurancePolicies, getTotalInsuranceCost } = useFinance();
  const [expandedCategory, setExpandedCategory] = useState<CategoryKey | null>(null);

  const totalAnnual = getTotalInsuranceCost();
  const totalMonthly = totalAnnual / 12;

  const policiesByCategory = (key: CategoryKey) => {
    if (key === "home") return insurancePolicies.filter(p => p.type === "home" || p.type === "contents");
    if (key === "car") return insurancePolicies.filter(p => p.type === "car");
    return insurancePolicies.filter(p => p.type === "life" || p.type === "income_protection");
  };

  const toggleCategory = (key: CategoryKey) => {
    setExpandedCategory(prev => prev === key ? null : key);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <Text style={styles.title}>Insurance</Text>
          <Pressable onPress={() => router.push("/add-insurance")} hitSlop={12}>
            <Ionicons name="add-circle" size={28} color={Colors.light.insurance} />
          </Pressable>
        </View>

        {insurancePolicies.length > 0 && (
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: Colors.light.insurance + "12" }]}>
              <Text style={styles.summaryLabel}>Annual Cost</Text>
              <Text style={[styles.summaryVal, { color: Colors.light.insurance }]}>{fmt(totalAnnual)}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: Colors.light.insurance + "12" }]}>
              <Text style={styles.summaryLabel}>Monthly</Text>
              <Text style={[styles.summaryVal, { color: Colors.light.insurance }]}>{fmt(totalMonthly)}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: Colors.light.insurance + "12" }]}>
              <Text style={styles.summaryLabel}>Policies</Text>
              <Text style={[styles.summaryVal, { color: Colors.light.insurance }]}>{insurancePolicies.length}</Text>
            </View>
          </View>
        )}

        {CATEGORIES.map(cat => {
          const myPolicies = policiesByCategory(cat.key);
          const isExpanded = expandedCategory === cat.key;
          const catAnnual = myPolicies.reduce((s, p) => s + annualCost(p), 0);

          return (
            <View key={cat.key} style={styles.categorySection}>
              <Pressable onPress={() => toggleCategory(cat.key)} style={({ pressed }) => [pressed && { opacity: 0.95 }]}>
                <LinearGradient colors={cat.gradient} style={styles.categoryHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <View style={styles.categoryHeaderLeft}>
                    <View style={styles.categoryIconCircle}>
                      <Ionicons name={cat.icon as any} size={22} color="#fff" />
                    </View>
                    <View>
                      <Text style={styles.categoryTitle}>{cat.title}</Text>
                      <Text style={styles.categorySubtitle}>
                        {myPolicies.length > 0
                          ? `${myPolicies.length} ${myPolicies.length === 1 ? "policy" : "policies"} — ${fmt(catAnnual)}/yr`
                          : "No active policies"}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="rgba(255,255,255,0.8)" />
                </LinearGradient>
              </Pressable>

              {isExpanded && (
                <View style={styles.categoryBody}>
                  {myPolicies.length > 0 && (
                    <View style={styles.myPoliciesSection}>
                      <Text style={styles.subSectionTitle}>Your Active Policies</Text>
                      {myPolicies.map(p => (
                        <View key={p.id} style={styles.miniPolicyCard}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.miniPolicyProvider}>{p.provider}</Text>
                            <Text style={styles.miniPolicyDetail}>Cover: {fmt(p.coverAmount)} — #{p.policyNumber || "N/A"}</Text>
                          </View>
                          <View style={{ alignItems: "flex-end" as const }}>
                            <Text style={styles.miniPolicyPremium}>${p.premium}/{p.premiumFrequency === "monthly" ? "mo" : p.premiumFrequency === "annually" ? "yr" : p.premiumFrequency === "weekly" ? "wk" : "qtr"}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  <Text style={styles.subSectionTitle}>Coverage Levels</Text>
                  {cat.tiers.map((tier, idx) => (
                    <View key={idx} style={styles.tierCard}>
                      <View style={styles.tierHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.tierTitleRow}>
                            <Text style={styles.tierLevel}>{tier.level}</Text>
                            {tier.tag && (
                              <View style={[styles.tierTag, { backgroundColor: (tier.tagColor || "#6B7280") + "18" }]}>
                                <Text style={[styles.tierTagText, { color: tier.tagColor }]}>{tier.tag}</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.tierCostRow}>
                            <Text style={styles.tierMonthly}>{tier.monthly}/mo</Text>
                            <Text style={styles.tierCover}>{tier.coverAmount}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.tierConsequences}>
                        <Text style={styles.consequencesLabel}>What this means in practice:</Text>
                        {tier.consequences.map((c, ci) => (
                          <View key={ci} style={styles.consequenceRow}>
                            <View style={[styles.consequenceDot, { backgroundColor: cat.color + "40" }]} />
                            <Text style={styles.consequenceText}>{c}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}

                  <View style={styles.tipsCard}>
                    <View style={styles.tipsHeader}>
                      <Ionicons name="bulb-outline" size={18} color="#F59E0B" />
                      <Text style={styles.tipsTitle}>Coverage Tips</Text>
                    </View>
                    {cat.tips.map((tip, i) => (
                      <View key={i} style={styles.tipRow}>
                        <Text style={styles.tipNumber}>{i + 1}</Text>
                        <Text style={styles.tipText}>{tip}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.optimiseCard}>
                    <View style={styles.tipsHeader}>
                      <Ionicons name="flash-outline" size={18} color="#10B981" />
                      <Text style={[styles.tipsTitle, { color: "#10B981" }]}>Save Money</Text>
                    </View>
                    {cat.optimisations.map((opt, i) => (
                      <View key={i} style={styles.tipRow}>
                        <View style={styles.optCheckCircle}>
                          <Ionicons name="checkmark" size={10} color="#10B981" />
                        </View>
                        <Text style={styles.tipText}>{opt}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.otherSection}>
          <Text style={styles.otherTitle}>Other Insurance</Text>
          <Text style={styles.otherSubtext}>Health, travel, and income protection policies can also be tracked</Text>
          <Pressable style={({ pressed }) => [styles.addPolicyBtn, pressed && { opacity: 0.9 }]} onPress={() => router.push("/add-insurance")}>
            <Ionicons name="add" size={18} color={Colors.light.tint} />
            <Text style={styles.addPolicyBtnText}>Add a Policy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 16 },
  title: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.light.text },
  summaryRow: { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: "center" as const },
  summaryLabel: { fontFamily: "DMSans_500Medium", fontSize: 11, color: Colors.light.textSecondary },
  summaryVal: { fontFamily: "DMSans_700Bold", fontSize: 18, marginTop: 4 },
  categorySection: { marginHorizontal: 20, marginBottom: 12 },
  categoryHeader: { borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  categoryHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  categoryIconCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  categoryTitle: { fontFamily: "DMSans_700Bold", fontSize: 17, color: "#fff" },
  categorySubtitle: { fontFamily: "DMSans_400Regular", fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  categoryBody: { backgroundColor: Colors.light.card, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, marginTop: -8, paddingTop: 16, paddingHorizontal: 14, paddingBottom: 14 },
  myPoliciesSection: { marginBottom: 16 },
  subSectionTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.text, marginBottom: 10 },
  miniPolicyCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.light.background, borderRadius: 12, padding: 12, marginBottom: 6 },
  miniPolicyProvider: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: Colors.light.text },
  miniPolicyDetail: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.light.textMuted, marginTop: 2 },
  miniPolicyPremium: { fontFamily: "DMSans_700Bold", fontSize: 14, color: Colors.light.text },
  tierCard: { backgroundColor: Colors.light.background, borderRadius: 14, padding: 14, marginBottom: 10 },
  tierHeader: { flexDirection: "row", alignItems: "flex-start" },
  tierTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 },
  tierLevel: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.light.text },
  tierTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tierTagText: { fontFamily: "DMSans_600SemiBold", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  tierCostRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  tierMonthly: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.light.tint },
  tierCover: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted },
  tierConsequences: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.light.gray200 },
  consequencesLabel: { fontFamily: "DMSans_500Medium", fontSize: 11, color: Colors.light.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  consequenceRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  consequenceDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  consequenceText: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.light.text, lineHeight: 19, flex: 1 },
  tipsCard: { backgroundColor: "#FEF3C7", borderRadius: 14, padding: 14, marginBottom: 10 },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  tipsTitle: { fontFamily: "DMSans_700Bold", fontSize: 14, color: "#92400E" },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  tipNumber: { fontFamily: "DMSans_700Bold", fontSize: 12, color: "#B45309", width: 16, textAlign: "center" as const, marginTop: 1 },
  tipText: { fontFamily: "DMSans_400Regular", fontSize: 13, color: "#78350F", lineHeight: 19, flex: 1 },
  optimiseCard: { backgroundColor: "#D1FAE5", borderRadius: 14, padding: 14, marginBottom: 6 },
  optCheckCircle: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#10B98120", alignItems: "center", justifyContent: "center", marginTop: 2 },
  otherSection: { marginHorizontal: 20, marginTop: 8, backgroundColor: Colors.light.card, borderRadius: 16, padding: 20, alignItems: "center" as const },
  otherTitle: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.light.text, marginBottom: 6 },
  otherSubtext: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.light.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 14 },
  addPolicyBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderColor: Colors.light.tint, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20 },
  addPolicyBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.tint },
});
