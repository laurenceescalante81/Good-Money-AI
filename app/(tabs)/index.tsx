import React from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useFinance } from "@/contexts/FinanceContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const EXPENSE_CATEGORIES: Record<string, { icon: string; color: string }> = {
  "Food": { icon: "restaurant-outline", color: "#F59E0B" },
  "Transport": { icon: "car-outline", color: "#3B82F6" },
  "Shopping": { icon: "bag-outline", color: "#EC4899" },
  "Bills": { icon: "flash-outline", color: "#EF4444" },
  "Entertainment": { icon: "game-controller-outline", color: "#8B5CF6" },
  "Health": { icon: "heart-outline", color: "#10B981" },
  "Education": { icon: "book-outline", color: "#06B6D4" },
  "Other": { icon: "ellipsis-horizontal-circle-outline", color: "#6B7280" },
};

function formatCurrency(amount: number): string {
  return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CategoryBreakdownItem({ category, amount, total }: { category: string; amount: number; total: number }) {
  const cat = EXPENSE_CATEGORIES[category] || EXPENSE_CATEGORIES["Other"];
  const pct = total > 0 ? (amount / total) * 100 : 0;

  return (
    <View style={styles.catItem}>
      <View style={[styles.catIcon, { backgroundColor: cat.color + "15" }]}>
        <Ionicons name={cat.icon as any} size={18} color={cat.color} />
      </View>
      <View style={styles.catInfo}>
        <Text style={styles.catName}>{category}</Text>
        <View style={styles.catBarBg}>
          <View style={[styles.catBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: cat.color }]} />
        </View>
      </View>
      <Text style={styles.catAmount}>{formatCurrency(amount)}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { transactions, getTotalIncome, getTotalExpenses, getMonthlyTransactions, profileMode, goals } = useFinance();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const income = getTotalIncome();
  const expenses = getTotalExpenses();
  const balance = income - expenses;
  const monthlyTx = getMonthlyTransactions();

  const categoryTotals: Record<string, number> = {};
  monthlyTx.filter(t => t.type === "expense").forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  const totalGoalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalGoalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);

  const monthName = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <View style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <LinearGradient
          colors={[Colors.light.navy, Colors.light.navyMid]}
          style={[styles.heroGradient, { paddingTop: topInset + 16 }]}
        >
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroGreeting}>{monthName}</Text>
              <Text style={styles.heroLabel}>
                {profileMode === "couple" ? "Shared Balance" : "Net Balance"}
              </Text>
            </View>
            <Pressable onPress={() => router.push("/settings")} hitSlop={12}>
              <View style={styles.settingsBtn}>
                <Feather name="settings" size={20} color={Colors.light.white} />
              </View>
            </Pressable>
          </View>

          <Text style={[styles.heroBalance, { color: balance >= 0 ? Colors.light.emeraldLight : Colors.light.coralLight }]}>
            {balance >= 0 ? "+" : ""}{formatCurrency(Math.abs(balance))}
          </Text>

          <View style={styles.heroCards}>
            <View style={[styles.heroCard, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <View style={styles.heroCardRow}>
                <Ionicons name="arrow-down-circle" size={20} color={Colors.light.emeraldLight} />
                <Text style={styles.heroCardLabel}>Income</Text>
              </View>
              <Text style={[styles.heroCardAmount, { color: Colors.light.emeraldLight }]}>{formatCurrency(income)}</Text>
            </View>
            <View style={[styles.heroCard, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
              <View style={styles.heroCardRow}>
                <Ionicons name="arrow-up-circle" size={20} color={Colors.light.coralLight} />
                <Text style={styles.heroCardLabel}>Expenses</Text>
              </View>
              <Text style={[styles.heroCardAmount, { color: Colors.light.coralLight }]}>{formatCurrency(expenses)}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
            onPress={() => router.push("/add-transaction")}
          >
            <Ionicons name="add-circle" size={22} color={Colors.light.white} />
            <Text style={styles.addBtnText}>Add Transaction</Text>
          </Pressable>

          {goals.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Savings Progress</Text>
              <View style={styles.savingsCard}>
                <View style={styles.savingsRow}>
                  <Text style={styles.savingsLabel}>Total Saved</Text>
                  <Text style={styles.savingsAmount}>{formatCurrency(totalGoalSaved)}</Text>
                </View>
                <View style={styles.savingsBarBg}>
                  <View
                    style={[
                      styles.savingsBarFill,
                      { width: `${totalGoalTarget > 0 ? Math.min((totalGoalSaved / totalGoalTarget) * 100, 100) : 0}%` },
                    ]}
                  />
                </View>
                <Text style={styles.savingsTarget}>of {formatCurrency(totalGoalTarget)} target</Text>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spending by Category</Text>
            {sortedCategories.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="analytics-outline" size={40} color={Colors.light.gray300} />
                <Text style={styles.emptyText}>No expenses this month</Text>
                <Text style={styles.emptySubtext}>Add a transaction to see your breakdown</Text>
              </View>
            ) : (
              <View style={styles.catList}>
                {sortedCategories.map(([cat, amount]) => (
                  <CategoryBreakdownItem key={cat} category={cat} amount={amount} total={expenses} />
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="wallet-outline" size={40} color={Colors.light.gray300} />
                <Text style={styles.emptyText}>No transactions yet</Text>
                <Text style={styles.emptySubtext}>Tap the button above to get started</Text>
              </View>
            ) : (
              <View style={styles.recentList}>
                {transactions.slice(0, 5).map(tx => {
                  const cat = EXPENSE_CATEGORIES[tx.category] || EXPENSE_CATEGORIES["Other"];
                  return (
                    <View key={tx.id} style={styles.recentItem}>
                      <View style={[styles.recentIcon, { backgroundColor: cat.color + "15" }]}>
                        <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                      </View>
                      <View style={styles.recentInfo}>
                        <Text style={styles.recentName}>{tx.note || tx.category}</Text>
                        <Text style={styles.recentDate}>
                          {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </Text>
                      </View>
                      <Text style={[styles.recentAmount, { color: tx.type === "income" ? Colors.light.income : Colors.light.expense }]}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                      </Text>
                    </View>
                  );
                })}
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
  heroGradient: { paddingHorizontal: 20, paddingBottom: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroGreeting: { fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.light.gray400, marginBottom: 2 },
  heroLabel: { fontFamily: "DMSans_600SemiBold", fontSize: 16, color: Colors.light.white },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  heroBalance: { fontFamily: "DMSans_700Bold", fontSize: 42, marginTop: 12, marginBottom: 20 },
  heroCards: { flexDirection: "row", gap: 12 },
  heroCard: { flex: 1, borderRadius: 16, padding: 14 },
  heroCardRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  heroCardLabel: { fontFamily: "DMSans_500Medium", fontSize: 13, color: "rgba(255,255,255,0.7)" },
  heroCardAmount: { fontFamily: "DMSans_700Bold", fontSize: 18 },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.light.tint, paddingVertical: 14, borderRadius: 14 },
  addBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.white },
  section: { marginTop: 28 },
  sectionTitle: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.light.text, marginBottom: 14 },
  emptyState: { alignItems: "center", paddingVertical: 32, backgroundColor: Colors.light.card, borderRadius: 16 },
  emptyText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.textSecondary, marginTop: 12 },
  emptySubtext: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.light.textMuted, marginTop: 4 },
  catList: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, gap: 16 },
  catItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  catIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  catInfo: { flex: 1, gap: 6 },
  catName: { fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.light.text },
  catBarBg: { height: 6, backgroundColor: Colors.light.gray100, borderRadius: 3, overflow: "hidden" },
  catBarFill: { height: 6, borderRadius: 3 },
  catAmount: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.text },
  recentList: { backgroundColor: Colors.light.card, borderRadius: 16, overflow: "hidden" },
  recentItem: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.gray100 },
  recentIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  recentInfo: { flex: 1 },
  recentName: { fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.light.text },
  recentDate: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 2 },
  recentAmount: { fontFamily: "DMSans_600SemiBold", fontSize: 15 },
  savingsCard: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 16 },
  savingsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  savingsLabel: { fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.light.textSecondary },
  savingsAmount: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.light.tint },
  savingsBarBg: { height: 8, backgroundColor: Colors.light.gray100, borderRadius: 4, overflow: "hidden" },
  savingsBarFill: { height: 8, borderRadius: 4, backgroundColor: Colors.light.tint },
  savingsTarget: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 6, textAlign: "right" },
});
