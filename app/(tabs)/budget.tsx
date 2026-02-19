import React from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useFinance } from "@/contexts/FinanceContext";

function formatCurrency(amount: number): string {
  return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function BudgetCard({ id, category, limit, color, spent, onDelete }: {
  id: string; category: string; limit: number; color: string; spent: number; onDelete: (id: string) => void;
}) {
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  const isOver = pct > 100;
  const remaining = limit - spent;

  return (
    <Pressable
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert("Delete Budget", `Remove "${category}" budget?`, [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => onDelete(id) },
        ]);
      }}
      style={styles.budgetCard}
    >
      <View style={styles.budgetHeader}>
        <View style={[styles.budgetDot, { backgroundColor: color }]} />
        <Text style={styles.budgetCategory}>{category}</Text>
        <Text style={[styles.budgetRemaining, { color: isOver ? Colors.light.expense : Colors.light.textSecondary }]}>
          {isOver ? "Over by " + formatCurrency(Math.abs(remaining)) : formatCurrency(remaining) + " left"}
        </Text>
      </View>
      <View style={styles.budgetBarBg}>
        <View
          style={[
            styles.budgetBarFill,
            {
              width: `${Math.min(pct, 100)}%`,
              backgroundColor: isOver ? Colors.light.expense : color,
            },
          ]}
        />
      </View>
      <View style={styles.budgetFooter}>
        <Text style={styles.budgetSpent}>{formatCurrency(spent)} spent</Text>
        <Text style={styles.budgetLimit}>of {formatCurrency(limit)}</Text>
      </View>
    </Pressable>
  );
}

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { budgets, getSpentByCategory, deleteBudget, getTotalExpenses } = useFinance();

  const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = getTotalExpenses();
  const totalPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <Text style={styles.title}>Budget</Text>
          <Pressable onPress={() => router.push("/add-budget")} hitSlop={12}>
            <Ionicons name="add-circle" size={28} color={Colors.light.tint} />
          </Pressable>
        </View>

        {budgets.length > 0 && (
          <View style={styles.overviewCard}>
            <View style={styles.overviewRow}>
              <Text style={styles.overviewLabel}>Monthly Budget</Text>
              <Text style={[styles.overviewPct, { color: totalPct > 100 ? Colors.light.expense : Colors.light.tint }]}>
                {Math.round(totalPct)}%
              </Text>
            </View>
            <View style={styles.overviewBarBg}>
              <View
                style={[
                  styles.overviewBarFill,
                  {
                    width: `${Math.min(totalPct, 100)}%`,
                    backgroundColor: totalPct > 100 ? Colors.light.expense : Colors.light.tint,
                  },
                ]}
              />
            </View>
            <View style={styles.overviewRow}>
              <Text style={styles.overviewSpent}>{formatCurrency(totalSpent)} spent</Text>
              <Text style={styles.overviewTotal}>of {formatCurrency(totalBudget)}</Text>
            </View>
          </View>
        )}

        <View style={styles.body}>
          {budgets.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={Colors.light.gray300} />
              <Text style={styles.emptyText}>No budgets set</Text>
              <Text style={styles.emptySubtext}>Create a budget to track your spending limits</Text>
              <Pressable
                style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.9 }]}
                onPress={() => router.push("/add-budget")}
              >
                <Text style={styles.emptyBtnText}>Create Budget</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.budgetList}>
              {budgets.map(b => (
                <BudgetCard
                  key={b.id}
                  id={b.id}
                  category={b.category}
                  limit={b.limit}
                  color={b.color}
                  spent={getSpentByCategory(b.category)}
                  onDelete={deleteBudget}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
  title: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.light.text },
  overviewCard: { marginHorizontal: 20, backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, marginBottom: 8 },
  overviewRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  overviewLabel: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.text },
  overviewPct: { fontFamily: "DMSans_700Bold", fontSize: 18 },
  overviewBarBg: { height: 10, backgroundColor: Colors.light.gray100, borderRadius: 5, overflow: "hidden", marginVertical: 12 },
  overviewBarFill: { height: 10, borderRadius: 5 },
  overviewSpent: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.light.textSecondary },
  overviewTotal: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.light.textMuted },
  body: { paddingHorizontal: 20, paddingTop: 12 },
  budgetList: { gap: 12 },
  budgetCard: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 16 },
  budgetHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  budgetDot: { width: 10, height: 10, borderRadius: 5 },
  budgetCategory: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.text, flex: 1 },
  budgetRemaining: { fontFamily: "DMSans_500Medium", fontSize: 13 },
  budgetBarBg: { height: 8, backgroundColor: Colors.light.gray100, borderRadius: 4, overflow: "hidden" },
  budgetBarFill: { height: 8, borderRadius: 4 },
  budgetFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  budgetSpent: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textSecondary },
  budgetLimit: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted },
  emptyState: { alignItems: "center", paddingVertical: 48, backgroundColor: Colors.light.card, borderRadius: 16 },
  emptyText: { fontFamily: "DMSans_600SemiBold", fontSize: 16, color: Colors.light.textSecondary, marginTop: 16 },
  emptySubtext: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.light.textMuted, marginTop: 4, textAlign: "center", paddingHorizontal: 40 },
  emptyBtn: { marginTop: 20, backgroundColor: Colors.light.tint, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  emptyBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.white },
});
