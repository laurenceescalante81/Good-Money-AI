import React, { useState, useMemo } from "react";
import { StyleSheet, Text, View, FlatList, Pressable, Platform, Alert, Modal, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useFinance, Transaction } from "@/contexts/FinanceContext";

const CATS: Record<string, { icon: string; color: string }> = {
  "Groceries": { icon: "cart-outline", color: "#F59E0B" },
  "Rent": { icon: "home-outline", color: "#3B82F6" },
  "Petrol": { icon: "car-outline", color: "#6366F1" },
  "Utilities": { icon: "flash-outline", color: "#EF4444" },
  "Dining Out": { icon: "restaurant-outline", color: "#EC4899" },
  "Transport": { icon: "bus-outline", color: "#14B8A6" },
  "Health": { icon: "heart-outline", color: "#10B981" },
  "Entertainment": { icon: "game-controller-outline", color: "#8B5CF6" },
  "Shopping": { icon: "bag-outline", color: "#F43F5E" },
  "Education": { icon: "book-outline", color: "#06B6D4" },
  "Salary": { icon: "cash-outline", color: "#10B981" },
  "Freelance": { icon: "briefcase-outline", color: "#3B82F6" },
  "Investment": { icon: "trending-up-outline", color: "#8B5CF6" },
  "Other": { icon: "ellipsis-horizontal-circle-outline", color: "#6B7280" },
};

function fmt(n: number): string { return "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

type Filter = "all" | "income" | "expense";

function TxItem({ item, onDelete }: { item: Transaction; onDelete: (id: string) => void }) {
  const cat = CATS[item.category] || CATS["Other"];
  return (
    <Pressable onLongPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert("Delete", "Remove this transaction?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDelete(item.id) },
      ]);
    }} style={styles.txItem}>
      <View style={[styles.txIcon, { backgroundColor: cat.color + "15" }]}>
        <Ionicons name={cat.icon as any} size={20} color={cat.color} />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txNote} numberOfLines={1}>{item.note || item.category}</Text>
        <Text style={styles.txMeta}>{item.category}{item.owner === "partner" ? " (Partner)" : ""}</Text>
      </View>
      <View style={{ alignItems: "flex-end" as const }}>
        <Text style={[styles.txAmount, { color: item.type === "income" ? Colors.light.income : Colors.light.expense }]}>
          {item.type === "income" ? "+" : "-"}{fmt(item.amount)}
        </Text>
        <Text style={styles.txDate}>{new Date(item.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</Text>
      </View>
    </Pressable>
  );
}

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { transactions, deleteTransaction, getTotalIncome, getTotalExpenses, getMonthlyTransactions, goals, updateGoalAmount, deleteGoal } = useFinance();
  const [filter, setFilter] = useState<Filter>("all");
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState("");

  const income = getTotalIncome();
  const expenses = getTotalExpenses();
  const monthlyTx = getMonthlyTransactions();

  const catTotals: Record<string, number> = {};
  monthlyTx.filter(t => t.type === "expense").forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

  const filtered = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter(t => t.type === filter);
  }, [transactions, filter]);

  const handleAddFunds = (id: string) => {
    setSelectedGoalId(id);
    setFundAmount("");
    setGoalModalVisible(true);
  };

  const confirmAddFunds = () => {
    const a = parseFloat(fundAmount);
    if (isNaN(a) || a <= 0 || !selectedGoalId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateGoalAmount(selectedGoalId, a);
    setGoalModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={[styles.header, { paddingTop: topInset + 16 }]}>
              <Text style={styles.title}>Budget</Text>
              <Pressable onPress={() => router.push("/add-transaction")} hitSlop={12}>
                <Ionicons name="add-circle" size={28} color={Colors.light.tint} />
              </Pressable>
            </View>

            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: Colors.light.income + "10" }]}>
                <Text style={styles.summaryLabel}>Income</Text>
                <Text style={[styles.summaryVal, { color: Colors.light.income }]}>{fmt(income)}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: Colors.light.expense + "10" }]}>
                <Text style={styles.summaryLabel}>Expenses</Text>
                <Text style={[styles.summaryVal, { color: Colors.light.expense }]}>{fmt(expenses)}</Text>
              </View>
            </View>

            {expenses > 0 && (() => {
              const topCat = sortedCats.length > 0 ? sortedCats[0] : null;
              const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
              const monthlySpareIfCut10 = expenses * 0.1;
              const annualSaving10 = monthlySpareIfCut10 * 12;
              const investedGrowth = (() => {
                let bal = 0;
                for (let i = 0; i < 10; i++) {
                  bal = (bal + annualSaving10) * 1.07;
                }
                return bal;
              })();

              return (
                <LinearGradient colors={[Colors.light.budget, "#1a4a6b"]} style={styles.valueBanner}>
                  <View style={styles.valueBannerHeader}>
                    <Ionicons name="trending-down-outline" size={20} color="#fff" />
                    <Text style={styles.valueBannerTitle}>Your Savings Potential</Text>
                  </View>

                  <Text style={styles.valueBannerSubtitle}>Cutting spending by just 10% would save</Text>
                  <View style={styles.valueBannerRow}>
                    <View style={styles.valueBannerItem}>
                      <Text style={styles.valueBannerBigNum}>{fmt(Math.round(annualSaving10))}</Text>
                      <Text style={styles.valueBannerSmall}>per year</Text>
                    </View>
                    <View style={styles.valueBannerDivider} />
                    <View style={styles.valueBannerItem}>
                      <Text style={styles.valueBannerBigNum}>{fmt(Math.round(investedGrowth))}</Text>
                      <Text style={styles.valueBannerSmall}>over 10yrs invested</Text>
                    </View>
                  </View>

                  {topCat && (
                    <View style={styles.valueBannerPill}>
                      <Ionicons name="bulb-outline" size={14} color="#fff" />
                      <Text style={styles.valueBannerPillText}>
                        Top spend: {topCat[0]} at {fmt(topCat[1])}/mo ({income > 0 ? Math.round((topCat[1] / income) * 100) : 0}% of income)
                      </Text>
                    </View>
                  )}

                  <View style={styles.savingsRateRow}>
                    <Text style={styles.savingsRateLabel}>Savings Rate</Text>
                    <View style={styles.savingsRateBarBg}>
                      <View style={[styles.savingsRateBarFill, { width: `${Math.min(Math.max(savingsRate, 0), 100)}%`, backgroundColor: savingsRate >= 20 ? "#4ade80" : savingsRate >= 10 ? "#fbbf24" : "#f87171" }]} />
                    </View>
                    <Text style={styles.savingsRatePct}>
                      {Math.round(savingsRate)}%
                    </Text>
                  </View>
                </LinearGradient>
              );
            })()}

            {sortedCats.length > 0 && (
              <View style={styles.catSection}>
                <Text style={styles.catTitle}>Spending Breakdown</Text>
                <View style={styles.catList}>
                  {sortedCats.slice(0, 5).map(([cat, amount]) => {
                    const c = CATS[cat] || CATS["Other"];
                    const pct = expenses > 0 ? (amount / expenses) * 100 : 0;
                    return (
                      <View key={cat} style={styles.catItem}>
                        <View style={[styles.catIcon, { backgroundColor: c.color + "15" }]}>
                          <Ionicons name={c.icon as any} size={16} color={c.color} />
                        </View>
                        <View style={styles.catInfo}>
                          <Text style={styles.catName}>{cat}</Text>
                          <View style={styles.catBarBg}>
                            <View style={[styles.catBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: c.color }]} />
                          </View>
                        </View>
                        <Text style={styles.catAmount}>{fmt(amount)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {goals.length > 0 && (
              <View style={styles.goalsSection}>
                <View style={styles.goalsHeader}>
                  <Text style={styles.catTitle}>Savings Goals</Text>
                  <Pressable onPress={() => router.push("/add-goal")} hitSlop={12}>
                    <Ionicons name="add" size={22} color={Colors.light.budget} />
                  </Pressable>
                </View>
                {goals.map(g => {
                  const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
                  return (
                    <Pressable
                      key={g.id}
                      onLongPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Alert.alert("Delete Goal", `Remove "${g.name}"?`, [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete", style: "destructive", onPress: () => deleteGoal(g.id) },
                        ]);
                      }}
                      style={styles.goalCard}
                    >
                      <View style={styles.goalRow}>
                        <View style={[styles.goalIconW, { backgroundColor: Colors.light.budget + "15" }]}>
                          <Ionicons name={g.icon as any} size={18} color={Colors.light.budget} />
                        </View>
                        <View style={styles.goalInfo}>
                          <Text style={styles.goalName}>{g.name}</Text>
                          <Text style={styles.goalProgress}>{fmt(g.currentAmount)} of {fmt(g.targetAmount)}</Text>
                        </View>
                        <Text style={styles.goalPct}>{Math.round(pct)}%</Text>
                      </View>
                      <View style={styles.goalBarBg}>
                        <View style={[styles.goalBarFill, { width: `${Math.min(pct, 100)}%` }]} />
                      </View>
                      <Pressable onPress={() => handleAddFunds(g.id)} style={({ pressed }) => [styles.addFundsBtn, pressed && { opacity: 0.8 }]}>
                        <Ionicons name="add" size={16} color={Colors.light.white} />
                        <Text style={styles.addFundsText}>Add Funds</Text>
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {goals.length === 0 && (
              <Pressable onPress={() => router.push("/add-goal")} style={styles.addGoalBanner}>
                <Ionicons name="flag-outline" size={20} color={Colors.light.budget} />
                <Text style={styles.addGoalText}>Set a savings goal</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.light.textMuted} />
              </Pressable>
            )}

            <View style={styles.txHeader}>
              <Text style={styles.catTitle}>Transactions</Text>
              <View style={styles.filterRow}>
                {(["all", "income", "expense"] as Filter[]).map(f => (
                  <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filterBtn, filter === f && styles.filterBtnActive]}>
                    <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                      {f === "all" ? "All" : f === "income" ? "In" : "Out"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyTx}>
            <Ionicons name="receipt-outline" size={40} color={Colors.light.gray300} />
            <Text style={styles.emptyTxText}>No transactions yet</Text>
            <Text style={styles.emptyTxSub}>Add your income and expenses to start tracking</Text>
          </View>
        }
        renderItem={({ item }) => <TxItem item={item} onDelete={deleteTransaction} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <Modal visible={goalModalVisible} transparent animationType="fade" onRequestClose={() => setGoalModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setGoalModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Add Funds</Text>
            <TextInput style={styles.modalInput} placeholder="Amount" placeholderTextColor={Colors.light.textMuted} keyboardType="decimal-pad" value={fundAmount} onChangeText={setFundAmount} autoFocus />
            <View style={styles.modalBtns}>
              <Pressable style={styles.modalCancel} onPress={() => setGoalModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalConfirm, (!fundAmount || parseFloat(fundAmount) <= 0) && { opacity: 0.5 }]} onPress={confirmAddFunds} disabled={!fundAmount || parseFloat(fundAmount) <= 0}>
                <Text style={styles.modalConfirmText}>Add</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 16 },
  title: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.light.text },
  summaryRow: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 14 },
  summaryLabel: { fontFamily: "DMSans_500Medium", fontSize: 12, color: Colors.light.textSecondary },
  summaryVal: { fontFamily: "DMSans_700Bold", fontSize: 20, marginTop: 4 },
  catSection: { paddingHorizontal: 20, marginBottom: 20 },
  catTitle: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.light.text, marginBottom: 10 },
  catList: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 14, gap: 14 },
  catItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  catIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  catInfo: { flex: 1, gap: 4 },
  catName: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.text },
  catBarBg: { height: 5, backgroundColor: Colors.light.gray100, borderRadius: 3, overflow: "hidden" },
  catBarFill: { height: 5, borderRadius: 3 },
  catAmount: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: Colors.light.text },
  goalsSection: { paddingHorizontal: 20, marginBottom: 20 },
  goalsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  goalCard: { backgroundColor: Colors.light.card, borderRadius: 14, padding: 14, marginBottom: 8 },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  goalIconW: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  goalInfo: { flex: 1 },
  goalName: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.text },
  goalProgress: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.light.textMuted, marginTop: 2 },
  goalPct: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.light.budget },
  goalBarBg: { height: 6, backgroundColor: Colors.light.gray100, borderRadius: 3, overflow: "hidden" },
  goalBarFill: { height: 6, borderRadius: 3, backgroundColor: Colors.light.budget },
  addFundsBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: Colors.light.budget, paddingVertical: 8, borderRadius: 8, marginTop: 10 },
  addFundsText: { fontFamily: "DMSans_600SemiBold", fontSize: 12, color: Colors.light.white },
  addGoalBanner: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 20, backgroundColor: Colors.light.card, borderRadius: 14, padding: 14, marginBottom: 20 },
  addGoalText: { fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.light.text, flex: 1 },
  txHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 10 },
  filterRow: { flexDirection: "row", gap: 6 },
  filterBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: Colors.light.gray100 },
  filterBtnActive: { backgroundColor: Colors.light.navy },
  filterText: { fontFamily: "DMSans_500Medium", fontSize: 12, color: Colors.light.textSecondary },
  filterTextActive: { color: Colors.light.white },
  txItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  txInfo: { flex: 1 },
  txNote: { fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.light.text },
  txMeta: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.light.textMuted, marginTop: 2 },
  txAmount: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  txDate: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.light.textMuted, marginTop: 2 },
  separator: { height: 1, backgroundColor: Colors.light.gray100, marginLeft: 72 },
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
  savingsRateRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  savingsRateLabel: { fontFamily: "DMSans_500Medium", fontSize: 12, color: "rgba(255,255,255,0.7)" },
  savingsRateBarBg: { flex: 1, height: 8, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 4, overflow: "hidden" as const },
  savingsRateBarFill: { height: 8, borderRadius: 4 },
  savingsRatePct: { fontFamily: "DMSans_700Bold", fontSize: 14, color: "#fff" },
  emptyTx: { alignItems: "center", paddingVertical: 40 },
  emptyTxText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.textSecondary, marginTop: 12 },
  emptyTxSub: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.light.card, borderRadius: 20, padding: 24, width: "85%", maxWidth: 340 },
  modalTitle: { fontFamily: "DMSans_700Bold", fontSize: 20, color: Colors.light.text, marginBottom: 16, textAlign: "center" },
  modalInput: { fontFamily: "DMSans_500Medium", fontSize: 24, color: Colors.light.text, borderBottomWidth: 2, borderBottomColor: Colors.light.budget, paddingVertical: 8, textAlign: "center", marginBottom: 20 },
  modalBtns: { flexDirection: "row", gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.light.gray100, alignItems: "center" },
  modalCancelText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.textSecondary },
  modalConfirm: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.light.budget, alignItems: "center" },
  modalConfirmText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.white },
});
