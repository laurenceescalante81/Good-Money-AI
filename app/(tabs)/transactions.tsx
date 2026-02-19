import React, { useState, useMemo } from "react";
import { StyleSheet, Text, View, FlatList, Pressable, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useFinance, Transaction } from "@/contexts/FinanceContext";

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  "Food": { icon: "restaurant-outline", color: "#F59E0B" },
  "Transport": { icon: "car-outline", color: "#3B82F6" },
  "Shopping": { icon: "bag-outline", color: "#EC4899" },
  "Bills": { icon: "flash-outline", color: "#EF4444" },
  "Entertainment": { icon: "game-controller-outline", color: "#8B5CF6" },
  "Health": { icon: "heart-outline", color: "#10B981" },
  "Education": { icon: "book-outline", color: "#06B6D4" },
  "Other": { icon: "ellipsis-horizontal-circle-outline", color: "#6B7280" },
  "Salary": { icon: "cash-outline", color: "#10B981" },
  "Freelance": { icon: "briefcase-outline", color: "#3B82F6" },
  "Investment": { icon: "trending-up-outline", color: "#8B5CF6" },
  "Gift": { icon: "gift-outline", color: "#EC4899" },
};

function formatCurrency(amount: number): string {
  return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type FilterType = "all" | "income" | "expense";

function TransactionItem({ item, onDelete }: { item: Transaction; onDelete: (id: string) => void }) {
  const cat = CATEGORY_ICONS[item.category] || CATEGORY_ICONS["Other"];

  return (
    <Pressable
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert("Delete Transaction", "Remove this transaction?", [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => onDelete(item.id) },
        ]);
      }}
      style={styles.txItem}
    >
      <View style={[styles.txIcon, { backgroundColor: cat.color + "15" }]}>
        <Ionicons name={cat.icon as any} size={20} color={cat.color} />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txNote} numberOfLines={1}>{item.note || item.category}</Text>
        <Text style={styles.txMeta}>
          {item.category} {item.owner === "partner" ? " (Partner)" : ""}
        </Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: item.type === "income" ? Colors.light.income : Colors.light.expense }]}>
          {item.type === "income" ? "+" : "-"}{formatCurrency(item.amount)}
        </Text>
        <Text style={styles.txDate}>
          {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </Text>
      </View>
    </Pressable>
  );
}

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { transactions, deleteTransaction } = useFinance();
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter(t => t.type === filter);
  }, [transactions, filter]);

  const grouped = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filtered.forEach(t => {
      const key = new Date(t.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return Object.entries(groups);
  }, [filtered]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Text style={styles.title}>Activity</Text>
        <Pressable onPress={() => router.push("/add-transaction")} hitSlop={12}>
          <Ionicons name="add-circle" size={28} color={Colors.light.tint} />
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {(["all", "income", "expense"] as FilterType[]).map(f => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === "all" ? "All" : f === "income" ? "Income" : "Expenses"}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={grouped}
        keyExtractor={([date]) => date}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={Colors.light.gray300} />
            <Text style={styles.emptyText}>No transactions</Text>
            <Text style={styles.emptySubtext}>
              {filter !== "all" ? `No ${filter} transactions found` : "Add your first transaction to get started"}
            </Text>
          </View>
        }
        renderItem={({ item: [date, txs] }) => (
          <View style={styles.dateGroup}>
            <Text style={styles.dateLabel}>{date}</Text>
            <View style={styles.dateCard}>
              {txs.map((tx, i) => (
                <React.Fragment key={tx.id}>
                  <TransactionItem item={tx} onDelete={deleteTransaction} />
                  {i < txs.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 16 },
  title: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.light.text },
  filterRow: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: Colors.light.card },
  filterBtnActive: { backgroundColor: Colors.light.navy },
  filterText: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.textSecondary },
  filterTextActive: { color: Colors.light.white },
  dateGroup: { marginBottom: 20 },
  dateLabel: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: Colors.light.textMuted, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  dateCard: { backgroundColor: Colors.light.card, borderRadius: 16, overflow: "hidden" },
  txItem: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  txIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  txInfo: { flex: 1 },
  txNote: { fontFamily: "DMSans_500Medium", fontSize: 15, color: Colors.light.text },
  txMeta: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 2 },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontFamily: "DMSans_600SemiBold", fontSize: 15 },
  txDate: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.light.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.light.gray100, marginLeft: 68 },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyText: { fontFamily: "DMSans_600SemiBold", fontSize: 16, color: Colors.light.textSecondary, marginTop: 16 },
  emptySubtext: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.light.textMuted, marginTop: 4, textAlign: "center" },
});
