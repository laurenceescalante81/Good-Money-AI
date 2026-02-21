import React from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useFinance, InsurancePolicy } from "@/contexts/FinanceContext";
import { useRewards } from "@/contexts/RewardsContext";

function fmt(n: number): string { return "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  home: { label: "Home", icon: "home-outline", color: "#3B82F6" },
  car: { label: "Car", icon: "car-outline", color: "#6366F1" },
  health: { label: "Health", icon: "heart-outline", color: "#10B981" },
  life: { label: "Life", icon: "person-outline", color: "#8B5CF6" },
  income_protection: { label: "Income Protection", icon: "briefcase-outline", color: "#F59E0B" },
  contents: { label: "Contents", icon: "cube-outline", color: "#EC4899" },
  travel: { label: "Travel", icon: "airplane-outline", color: "#14B8A6" },
};

function annualCost(p: InsurancePolicy): number {
  const mult: Record<string, number> = { weekly: 52, fortnightly: 26, monthly: 12, quarterly: 4, annually: 1 };
  return p.premium * (mult[p.premiumFrequency] || 12);
}

export default function InsuranceScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { insurancePolicies, deleteInsurance, getTotalInsuranceCost } = useFinance();
  const { state: rewardsState, missions, completeMission } = useRewards();
  const insuranceMission = missions.find(m => m.id === 'review_insurance' && !m.completed);

  const totalAnnual = getTotalInsuranceCost();
  const totalMonthly = totalAnnual / 12;
  const upcoming = [...insurancePolicies]
    .filter(p => {
      const days = Math.ceil((new Date(p.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days > 0 && days <= 90;
    })
    .sort((a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime());

  const handleDelete = (p: InsurancePolicy) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const meta = TYPE_META[p.type] || { label: p.type };
    Alert.alert("Delete Policy", `Remove your ${meta.label} policy from ${p.provider}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteInsurance(p.id) },
    ]);
  };

  if (insurancePolicies.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <Text style={styles.title}>Insurance</Text>
          <Pressable onPress={() => router.push("/add-insurance")} hitSlop={12}>
            <Ionicons name="add-circle" size={28} color={Colors.light.insurance} />
          </Pressable>
        </View>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: Colors.light.insurance + "15" }]}>
            <Ionicons name="shield-checkmark-outline" size={48} color={Colors.light.insurance} />
          </View>
          <Text style={styles.emptyText}>No insurance policies</Text>
          <Text style={styles.emptySubtext}>Add your home, car, health, life, and other insurance policies to track premiums and renewal dates</Text>
          <Pressable style={({ pressed }) => [styles.setupBtn, pressed && { opacity: 0.9 }]} onPress={() => router.push("/add-insurance")}>
            <Ionicons name="add" size={20} color={Colors.light.white} />
            <Text style={styles.setupBtnText}>Add Policy</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <Text style={styles.title}>Insurance</Text>
          <Pressable onPress={() => router.push("/add-insurance")} hitSlop={12}>
            <Ionicons name="add-circle" size={28} color={Colors.light.insurance} />
          </Pressable>
        </View>

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

        {upcoming.length > 0 && (
          <View style={styles.section}>
            <LinearGradient colors={[Colors.light.insurance, "#1a3a6b"]} style={styles.renewalBanner}>
              <View style={styles.renewalHeader}>
                <Ionicons name="calendar-outline" size={18} color="#fff" />
                <Text style={styles.renewalTitle}>Upcoming Renewals</Text>
              </View>
              {upcoming.map(p => {
                const meta = TYPE_META[p.type] || { label: p.type, icon: "shield-outline", color: "#6B7280" };
                const days = Math.ceil((new Date(p.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <View key={p.id} style={styles.renewalItem}>
                    <View style={[styles.renewalIcon, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                      <Ionicons name={meta.icon as any} size={16} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.renewalName}>{meta.label} — {p.provider}</Text>
                      <Text style={styles.renewalDate}>{new Date(p.renewalDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</Text>
                    </View>
                    <View style={[styles.renewalDays, days <= 30 && { backgroundColor: "rgba(239,68,68,0.3)" }]}>
                      <Text style={styles.renewalDaysText}>{days}d</Text>
                    </View>
                  </View>
                );
              })}
            </LinearGradient>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Policies</Text>
          {insurancePolicies.map(p => {
            const meta = TYPE_META[p.type] || { label: p.type, icon: "shield-outline", color: "#6B7280" };
            const daysUntilRenewal = Math.ceil((new Date(p.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const annual = annualCost(p);
            return (
              <Pressable key={p.id} onLongPress={() => handleDelete(p)} style={styles.policyCard}>
                <View style={styles.policyTop}>
                  <View style={[styles.policyIcon, { backgroundColor: meta.color + "15" }]}>
                    <Ionicons name={meta.icon as any} size={22} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.policyType}>{meta.label}</Text>
                    <Text style={styles.policyProvider}>{p.provider}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" as const }}>
                    <Text style={styles.policyPremium}>${p.premium}/{p.premiumFrequency === "monthly" ? "mo" : p.premiumFrequency === "annually" ? "yr" : p.premiumFrequency === "weekly" ? "wk" : p.premiumFrequency === "fortnightly" ? "fn" : "qtr"}</Text>
                    <Text style={styles.policyAnnual}>{fmt(annual)}/yr</Text>
                  </View>
                </View>
                <View style={styles.policyDetails}>
                  <View style={styles.policyDetail}>
                    <Text style={styles.policyDetailLabel}>Cover</Text>
                    <Text style={styles.policyDetailVal}>{fmt(p.coverAmount)}</Text>
                  </View>
                  <View style={styles.policyDetail}>
                    <Text style={styles.policyDetailLabel}>Policy #</Text>
                    <Text style={styles.policyDetailVal}>{p.policyNumber || "—"}</Text>
                  </View>
                  <View style={styles.policyDetail}>
                    <Text style={styles.policyDetailLabel}>Renewal</Text>
                    <Text style={[styles.policyDetailVal, daysUntilRenewal <= 30 && daysUntilRenewal > 0 && { color: Colors.light.expense }]}>
                      {daysUntilRenewal > 0 ? `${daysUntilRenewal} days` : "Overdue"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={() => router.push("/(tabs)/rewards")} style={({ pressed }) => [pressed && { opacity: 0.95 }]}>
          <View style={styles.missionBanner}>
            <View style={styles.missionBannerTop}>
              <View style={styles.missionPtsCircle}>
                <Ionicons name="star" size={14} color="#D4AF37" />
                <Text style={styles.missionPtsNum}>{rewardsState.points.toLocaleString()}</Text>
              </View>
            </View>
            {insuranceMission && (
              <Pressable onPress={() => completeMission('review_insurance')} style={({ pressed }) => [styles.missionPrompt, pressed && { opacity: 0.85 }]}>
                <View style={[styles.missionPromptIcon, { backgroundColor: '#3B82F620' }]}>
                  <Ionicons name="shield-checkmark-outline" size={14} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.missionPromptTitle}>{insuranceMission.title}</Text>
                  <Text style={styles.missionPromptDesc}>{insuranceMission.description}</Text>
                </View>
                <Text style={styles.missionPromptPts}>+{insuranceMission.is2xActive ? insuranceMission.basePoints * 2 : insuranceMission.basePoints}</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
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
  section: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.light.text, marginBottom: 12 },
  renewalBanner: { borderRadius: 18, padding: 16, marginBottom: 4 },
  renewalHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  renewalTitle: { fontFamily: "DMSans_700Bold", fontSize: 16, color: "#fff" },
  renewalItem: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 10, marginBottom: 6 },
  renewalIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  renewalName: { fontFamily: "DMSans_500Medium", fontSize: 12, color: "#fff" },
  renewalDate: { fontFamily: "DMSans_400Regular", fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  renewalDays: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  renewalDaysText: { fontFamily: "DMSans_700Bold", fontSize: 12, color: "#fff" },
  policyCard: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, marginBottom: 10 },
  policyTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  policyIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  policyType: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.text },
  policyProvider: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 2 },
  policyPremium: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.text },
  policyAnnual: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.light.textMuted, marginTop: 2 },
  policyDetails: { flexDirection: "row", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.light.gray100, gap: 4 },
  policyDetail: { flex: 1, alignItems: "center" as const },
  policyDetailLabel: { fontFamily: "DMSans_400Regular", fontSize: 10, color: Colors.light.textMuted },
  policyDetailVal: { fontFamily: "DMSans_600SemiBold", fontSize: 12, color: Colors.light.text, marginTop: 3 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingTop: 60 },
  emptyIcon: { width: 100, height: 100, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyText: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.light.text, marginBottom: 8 },
  emptySubtext: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.light.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  setupBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.light.insurance, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 },
  setupBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.white },
  missionBanner: { marginHorizontal: 20, marginTop: 4, backgroundColor: Colors.light.card, borderRadius: 16, padding: 14 },
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
});
