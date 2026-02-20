import React, { useState, useMemo } from "react";
import { StyleSheet, Text, View, FlatList, Pressable, Platform, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useFinance } from "@/contexts/FinanceContext";

function goBack() {
  if (router.canGoBack()) { router.back(); } else { router.replace("/(tabs)/banks"); }
}

function fmt(n: number): string { return "$" + Math.abs(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

interface BankTransaction {
  id: string;
  amount: number;
  description: string;
  postDate: string;
  transactionDate: string;
  status: string;
  direction: string;
  class: { title?: string };
  account: string;
  institution: string;
  category: string;
  enrich?: { merchant?: { businessName?: string }; category?: string; location?: { formattedAddress?: string } };
}

function formatDate(d: string): string {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function TransactionItem({ tx, onImport }: { tx: BankTransaction; onImport: () => void }) {
  const isDebit = tx.direction === "debit" || tx.amount < 0;
  const merchant = tx.enrich?.merchant?.businessName || tx.description;
  const category = tx.enrich?.category || tx.category || "Other";

  const catIcons: Record<string, string> = {
    "Food & Dining": "restaurant-outline",
    "Groceries": "cart-outline",
    "Transport": "car-outline",
    "Shopping": "bag-outline",
    "Entertainment": "film-outline",
    "Health": "fitness-outline",
    "Utilities": "flash-outline",
    "Housing": "home-outline",
    "Transfer": "swap-horizontal-outline",
    "Income": "arrow-down-outline",
  };

  const icon = catIcons[category] || (isDebit ? "arrow-up-outline" : "arrow-down-outline");
  const color = isDebit ? Colors.light.expense : Colors.light.income;

  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: color + "12" }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txMerchant} numberOfLines={1}>{merchant}</Text>
        <Text style={styles.txMeta}>{category} · {formatDate(tx.postDate || tx.transactionDate)}</Text>
      </View>
      <View style={{ alignItems: "flex-end" as const, gap: 4 }}>
        <Text style={[styles.txAmount, { color }]}>
          {isDebit ? "-" : "+"}{fmt(Math.abs(tx.amount))}
        </Text>
        <Pressable onPress={onImport} hitSlop={8}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.light.tint} />
        </Pressable>
      </View>
    </View>
  );
}

export default function BankTransactionsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const queryClient = useQueryClient();
  const { addTransaction } = useFinance();
  const [filter, setFilter] = useState<"all" | "debit" | "credit">("all");
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  const txQuery = useQuery<{ transactions: BankTransaction[]; count: number }>({
    queryKey: ["/api/basiq/transactions"],
    staleTime: 30000,
  });

  const transactions = txQuery.data?.transactions || [];

  const filtered = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter(t => {
      if (filter === "debit") return t.direction === "debit" || t.amount < 0;
      return t.direction === "credit" || t.amount > 0;
    });
  }, [transactions, filter]);

  const totalSpent = transactions.filter(t => t.direction === "debit" || t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalReceived = transactions.filter(t => t.direction === "credit" || t.amount > 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const handleImport = (tx: BankTransaction) => {
    if (importedIds.has(tx.id)) {
      Alert.alert("Already Imported", "This transaction has already been added to your budget.");
      return;
    }

    const isDebit = tx.direction === "debit" || tx.amount < 0;
    const merchant = tx.enrich?.merchant?.businessName || tx.description;
    const category = tx.enrich?.category || tx.category || "Other";

    const catMapping: Record<string, string> = {
      "Food & Dining": "Food",
      "Groceries": "Food",
      "Transport": "Transport",
      "Shopping": "Shopping",
      "Entertainment": "Entertainment",
      "Health": "Health",
      "Utilities": "Utilities",
      "Housing": "Housing",
      "Transfer": "Other",
      "Income": "Income",
    };

    addTransaction({
      note: merchant,
      amount: Math.abs(tx.amount),
      category: catMapping[category] || (isDebit ? "Other" : "Income"),
      type: isDebit ? "expense" : "income",
      date: tx.postDate || tx.transactionDate || new Date().toISOString(),
      owner: "me",
    });

    setImportedIds(prev => new Set(prev).add(tx.id));
  };

  const handleImportAll = () => {
    let count = 0;
    transactions.forEach(tx => {
      if (!importedIds.has(tx.id)) {
        handleImport(tx);
        count++;
      }
    });
    Alert.alert("Imported", `${count} transactions added to your budget tracker.`);
  };

  const [refreshing, setRefreshing] = useState(false);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable onPress={goBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Bank Transactions</Text>
        <Pressable onPress={handleImportAll} hitSlop={12}>
          <Ionicons name="download" size={24} color={Colors.light.tint} />
        </Pressable>
      </View>

      {txQuery.isLoading && (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={styles.loadingText}>Fetching transactions...</Text>
        </View>
      )}

      {!txQuery.isLoading && transactions.length > 0 && (
        <>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: Colors.light.income + "10" }]}>
              <Text style={styles.summaryLabel}>Received</Text>
              <Text style={[styles.summaryVal, { color: Colors.light.income }]}>{fmt(totalReceived)}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: Colors.light.expense + "10" }]}>
              <Text style={styles.summaryLabel}>Spent</Text>
              <Text style={[styles.summaryVal, { color: Colors.light.expense }]}>{fmt(totalSpent)}</Text>
            </View>
          </View>

          <View style={styles.filterRow}>
            {(["all", "credit", "debit"] as const).map(f => (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterChip, filter === f && styles.filterActive]}
              >
                <Text style={[styles.filterText, filter === f && styles.filterActiveText]}>
                  {f === "all" ? "All" : f === "credit" ? "Income" : "Expenses"}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TransactionItem
            tx={item}
            onImport={() => handleImport(item)}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={filtered.length > 0}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await queryClient.invalidateQueries({ queryKey: ["/api/basiq/transactions"] });
              setRefreshing(false);
            }}
            tintColor={Colors.light.tint}
          />
        }
        ListEmptyComponent={
          !txQuery.isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={36} color={Colors.light.gray300} />
              <Text style={styles.emptyText}>No transactions found</Text>
              <Text style={styles.emptySubtext}>Connect a bank account to see your transactions here</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.light.text },
  loadingState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  loadingText: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.textMuted },
  summaryRow: { flexDirection: "row", gap: 12, paddingHorizontal: 20, marginBottom: 14 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12 },
  summaryLabel: { fontFamily: "DMSans_500Medium", fontSize: 12, color: Colors.light.textSecondary },
  summaryVal: { fontFamily: "DMSans_700Bold", fontSize: 18, marginTop: 2 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 14 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Colors.light.card },
  filterActive: { backgroundColor: Colors.light.tint },
  filterText: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.textSecondary },
  filterActiveText: { color: Colors.light.white },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.light.card, borderRadius: 12, padding: 14, marginBottom: 6 },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  txInfo: { flex: 1 },
  txMerchant: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.text },
  txMeta: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.light.textMuted, marginTop: 2 },
  txAmount: { fontFamily: "DMSans_700Bold", fontSize: 14 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.textSecondary },
  emptySubtext: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, textAlign: "center", paddingHorizontal: 40 },
});
