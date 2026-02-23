import React, { useState, useMemo, useCallback } from "react";
import { StyleSheet, Text, View, FlatList, Pressable, Platform, Alert, Modal, TextInput, ActivityIndicator, Linking, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useFinance, Transaction } from "@/contexts/FinanceContext";
import { useRewards } from "@/contexts/RewardsContext";
import { MessageOverlay } from "@/contexts/AppMessagesContext";
import CoinHeader from '@/components/CoinHeader';
import { useResponsive } from '@/hooks/useResponsive';
import { getApiUrl } from "@/lib/query-client";

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

function fmt(n: number): string { return "$" + Math.abs(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

type Filter = "all" | "income" | "expense";

interface BankAccount {
  id: string;
  name: string;
  accountNo: string;
  balance: number | null;
  availableFunds: number | null;
  currency: string;
  class: { type: string; product: string };
  institution: string;
  status: string;
  lastUpdated: string;
}

interface BankConnection {
  id: string;
  status: string;
  institution: { id: string; type?: string };
  lastUsed: string;
  createdDate: string;
}

function TxItem({ item, onDelete }: { item: Transaction; onDelete: (id: string) => void }) {
  const { fs, is } = useAccessibility();
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
        <Ionicons name={cat.icon as any} size={is(20)} color={cat.color} />
      </View>
      <View style={styles.txInfo}>
        <Text style={[styles.txNote, { fontSize: fs(14) }]} numberOfLines={1}>{item.note || item.category}</Text>
        <Text style={[styles.txMeta, { fontSize: fs(11) }]}>{item.category}{item.owner === "partner" ? " (Partner)" : ""}</Text>
      </View>
      <View style={{ alignItems: "flex-end" as const }}>
        <Text style={[styles.txAmount, { color: item.type === "income" ? Colors.light.income : Colors.light.expense, fontSize: fs(14) }]}>
          {item.type === "income" ? "+" : "-"}{fmt(item.amount)}
        </Text>
        <Text style={[styles.txDate, { fontSize: fs(11) }]}>{new Date(item.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</Text>
      </View>
    </Pressable>
  );
}

function BankAccountCard({ account }: { account: BankAccount }) {
  const { fs, is } = useAccessibility();
  const isCredit = account.class?.type === "credit-card";
  const isLoan = account.class?.type === "loan" || account.class?.type === "mortgage";
  const balance = account.balance || 0;

  const typeIcons: Record<string, string> = {
    "transaction": "card-outline",
    "savings": "wallet-outline",
    "credit-card": "card-outline",
    "loan": "home-outline",
    "mortgage": "home-outline",
    "term-deposit": "time-outline",
    "investment": "trending-up-outline",
  };

  const typeColors: Record<string, string> = {
    "transaction": Colors.light.mortgage,
    "savings": Colors.light.budget,
    "credit-card": Colors.light.insurance,
    "loan": Colors.light.super,
    "mortgage": Colors.light.super,
    "term-deposit": Colors.light.tint,
    "investment": Colors.light.super,
  };

  const icon = typeIcons[account.class?.type] || "card-outline";
  const color = typeColors[account.class?.type] || Colors.light.tint;

  return (
    <View style={styles.bankAccountCard}>
      <View style={styles.bankAccountRow}>
        <View style={[styles.bankAccountIcon, { backgroundColor: color + "15" }]}>
          <Ionicons name={icon as any} size={is(20)} color={color} />
        </View>
        <View style={styles.bankAccountInfo}>
          <Text style={[styles.bankAccountName, { fontSize: fs(14) }]} numberOfLines={1}>{account.name}</Text>
          <Text style={[styles.bankAccountType, { fontSize: fs(12) }]}>
            {account.class?.product || account.class?.type || "Account"}
            {account.accountNo ? ` ···${account.accountNo.slice(-4)}` : ""}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" as const }}>
          <Text style={[styles.bankAccountBalance, { fontSize: fs(16) }, (isCredit || isLoan) && balance < 0 && { color: Colors.light.expense }]}>
            {balance < 0 ? "-" : ""}{fmt(balance)}
          </Text>
          {account.availableFunds != null && (
            <Text style={[styles.bankAccountAvail, { fontSize: fs(11) }]}>{fmt(account.availableFunds)} avail</Text>
          )}
        </View>
      </View>
    </View>
  );
}

export default function BudgetScreen() {
  const { fs, is } = useAccessibility();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 16 : insets.top;
  const queryClient = useQueryClient();
  const { transactions, deleteTransaction, getTotalIncome, getTotalExpenses, getMonthlyTransactions, goals, updateGoalAmount, deleteGoal } = useFinance();
  const { state: rewardsState, missions, completeMission } = useRewards();
  const budgetMission = missions.find(m => m.id === 'add_transaction' && !m.completed);
  const { isMobile, contentWidth, sidePadding } = useResponsive();
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

  const statusQuery = useQuery<{ configured: boolean }>({
    queryKey: ["/api/basiq/status"],
    staleTime: 30000,
  });

  const connectionsQuery = useQuery<{ connections: BankConnection[] }>({
    queryKey: ["/api/basiq/connections"],
    enabled: !!statusQuery.data?.configured,
    staleTime: 15000,
  });

  const accountsQuery = useQuery<{ accounts: BankAccount[] }>({
    queryKey: ["/api/basiq/accounts"],
    enabled: !!statusQuery.data?.configured && (connectionsQuery.data?.connections?.length ?? 0) > 0,
    staleTime: 15000,
  });

  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const url = new URL(`/api/basiq/connections/${connectionId}`, getApiUrl());
      const res = await fetch(url.toString(), { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/basiq/connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/basiq/accounts"] });
    },
  });

  const isBankConfigured = statusQuery.data?.configured;
  const connections = connectionsQuery.data?.connections || [];
  const bankAccounts = accountsQuery.data?.accounts || [];
  const isBankLoading = statusQuery.isLoading || (isBankConfigured && connectionsQuery.isLoading);

  const totalBankBalance = bankAccounts.reduce((sum, a) => {
    const t = a.class?.type;
    if (t === "credit-card" || t === "loan" || t === "mortgage") return sum;
    return sum + (a.balance || 0);
  }, 0);

  const totalBankDebt = bankAccounts.reduce((sum, a) => {
    const t = a.class?.type;
    if (t === "credit-card" || t === "loan" || t === "mortgage") return sum + Math.abs(a.balance || 0);
    return sum;
  }, 0);

  const groupedByType: Record<string, BankAccount[]> = {};
  bankAccounts.forEach(a => {
    const type = a.class?.type || "other";
    if (!groupedByType[type]) groupedByType[type] = [];
    groupedByType[type].push(a);
  });

  const typeLabels: Record<string, string> = {
    transaction: "Transaction Accounts",
    savings: "Savings Accounts",
    "credit-card": "Credit Cards",
    loan: "Loans",
    mortgage: "Mortgages",
    "term-deposit": "Term Deposits",
    investment: "Investment Accounts",
  };

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/basiq/connections"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/basiq/accounts"] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const renderBanksSection = () => (
    <View style={styles.banksSection}>
      <View style={styles.banksSectionHeader}>
        <View style={styles.banksTitleRow}>
          <Ionicons name="business-outline" size={is(20)} color={Colors.light.tint} />
          <Text style={[styles.banksSectionTitle, { fontSize: fs(16) }]}>Connected Banks</Text>
        </View>
        {isBankConfigured && (
          <Pressable onPress={() => router.push("/connect-bank")} hitSlop={12}>
            <Ionicons name="add-circle" size={is(24)} color={Colors.light.tint} />
          </Pressable>
        )}
      </View>

      {isBankLoading && (
        <View style={styles.bankLoadingState}>
          <ActivityIndicator size="small" color={Colors.light.tint} />
          <Text style={[styles.bankLoadingText, { fontSize: fs(13) }]}>Connecting to Basiq...</Text>
        </View>
      )}

      {!isBankLoading && !isBankConfigured && (
        <View style={styles.bankSetupState}>
          <View style={[styles.bankSetupIcon, { backgroundColor: Colors.light.tint + "15" }]}>
            <Ionicons name="business-outline" size={is(32)} color={Colors.light.tint} />
          </View>
          <Text style={[styles.bankSetupTitle, { fontSize: fs(16) }]}>Connect Your Banks</Text>
          <Text style={[styles.bankSetupText, { fontSize: fs(13) }]}>
            Link your Australian bank accounts through Basiq's secure Open Banking platform
          </Text>
          <View style={styles.bankSetupSteps}>
            <View style={styles.bankStepRow}>
              <View style={styles.bankStepNum}><Text style={[styles.bankStepNumText, { fontSize: fs(11) }]}>1</Text></View>
              <Text style={[styles.bankStepText, { fontSize: fs(13) }]}>Get your API key from basiq.io</Text>
            </View>
            <View style={styles.bankStepRow}>
              <View style={styles.bankStepNum}><Text style={[styles.bankStepNumText, { fontSize: fs(11) }]}>2</Text></View>
              <Text style={[styles.bankStepText, { fontSize: fs(13) }]}>Add it as BASIQ_API_KEY in your app secrets</Text>
            </View>
            <View style={styles.bankStepRow}>
              <View style={styles.bankStepNum}><Text style={[styles.bankStepNumText, { fontSize: fs(11) }]}>3</Text></View>
              <Text style={[styles.bankStepText, { fontSize: fs(13) }]}>Connect your bank accounts securely</Text>
            </View>
          </View>
          <Pressable style={({ pressed }) => [styles.bankSetupLink, pressed && { opacity: 0.8 }]} onPress={() => Linking.openURL("https://basiq.io")}>
            <Ionicons name="open-outline" size={is(16)} color={Colors.light.white} />
            <Text style={[styles.bankSetupLinkText, { fontSize: fs(14) }]}>Visit basiq.io</Text>
          </Pressable>
        </View>
      )}

      {!isBankLoading && isBankConfigured && bankAccounts.length > 0 && (
        <View>
          <View style={styles.bankSummaryRow}>
            <View style={[styles.bankSummaryCard, { backgroundColor: Colors.light.budget + "10" }]}>
              <Text style={[styles.bankSummaryLabel, { fontSize: fs(12) }]}>Total Balance</Text>
              <Text style={[styles.bankSummaryVal, { fontSize: fs(20), color: Colors.light.budget }]}>{fmt(totalBankBalance)}</Text>
            </View>
            {totalBankDebt > 0 && (
              <View style={[styles.bankSummaryCard, { backgroundColor: Colors.light.expense + "10" }]}>
                <Text style={[styles.bankSummaryLabel, { fontSize: fs(12) }]}>Total Debt</Text>
                <Text style={[styles.bankSummaryVal, { fontSize: fs(20), color: Colors.light.expense }]}>{fmt(totalBankDebt)}</Text>
              </View>
            )}
          </View>

          {Object.entries(groupedByType).map(([type, accs]) => (
            <View key={type} style={styles.bankAccountGroup}>
              <Text style={[styles.bankGroupTitle, { fontSize: fs(12) }]}>{typeLabels[type] || type}</Text>
              {accs.map(a => <BankAccountCard key={a.id} account={a} />)}
            </View>
          ))}
        </View>
      )}

      {!isBankLoading && isBankConfigured && connections.length === 0 && (
        <View style={styles.bankEmptyConnections}>
          <Ionicons name="link-outline" size={is(32)} color={Colors.light.gray300} />
          <Text style={[styles.bankEmptyText, { fontSize: fs(14) }]}>No banks connected</Text>
          <Text style={[styles.bankEmptySubtext, { fontSize: fs(12) }]}>Connect your bank to see live balances</Text>
          <Pressable
            style={({ pressed }) => [styles.bankConnectBtn, pressed && { opacity: 0.9 }]}
            onPress={() => router.push("/connect-bank")}
          >
            <Ionicons name="add" size={is(18)} color={Colors.light.white} />
            <Text style={[styles.bankConnectBtnText, { fontSize: fs(14) }]}>Connect a Bank</Text>
          </Pressable>
        </View>
      )}

      {!isBankLoading && isBankConfigured && connections.length > 0 && (
        <View style={styles.bankConnectionsSection}>
          <Text style={[styles.bankConnectionsTitle, { fontSize: fs(13) }]}>Connections</Text>
          {connections.map(c => (
            <View key={c.id} style={styles.bankConnectionCard}>
              <View style={[styles.bankConnectionIcon, { backgroundColor: Colors.light.tint + "15" }]}>
                <Ionicons name="business" size={is(18)} color={Colors.light.tint} />
              </View>
              <View style={styles.bankConnectionInfo}>
                <Text style={[styles.bankConnectionName, { fontSize: fs(13) }]}>Bank Connection</Text>
                <Text style={[styles.bankConnectionStatus, { fontSize: fs(11) }, c.status === "active" && { color: Colors.light.income }]}>
                  {c.status === "active" ? "Connected" : c.status}
                </Text>
              </View>
              <Pressable
                onPress={() => Alert.alert("Disconnect", "Remove this bank connection?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Disconnect", style: "destructive", onPress: () => disconnectMutation.mutate(c.id) },
                ])}
                hitSlop={12}
              >
                <Ionicons name="close-circle" size={is(22)} color={Colors.light.expense} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {!isBankLoading && isBankConfigured && (
        <Pressable
          onPress={() => router.push("/bank-transactions")}
          style={({ pressed }) => [styles.bankImportBtn, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="download-outline" size={is(18)} color={Colors.light.tint} />
          <Text style={[styles.bankImportBtnText, { fontSize: fs(13) }]}>View Bank Transactions</Text>
          <Ionicons name="chevron-forward" size={is(16)} color={Colors.light.textMuted} />
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: isMobile ? 100 : 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.tint} />}
        ListHeaderComponent={
          <View>
            <CoinHeader
              title="Budget"
              rightElement={
                <Pressable onPress={() => router.push("/add-transaction")} hitSlop={12}>
                  <Ionicons name="add-circle" size={is(28)} color={Colors.light.tint} />
                </Pressable>
              }
            />

            <View style={{ alignSelf: 'center', width: '100%', maxWidth: contentWidth, paddingHorizontal: sidePadding }}>
            <Text style={[styles.pageDesc, { fontSize: fs(14) }]}>Monitor your income, expenses, and savings goals.</Text>

            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: Colors.light.income + "10" }]}>
                <Text style={[styles.summaryLabel, { fontSize: fs(12) }]}>Income</Text>
                <Text style={[styles.summaryVal, { color: Colors.light.income, fontSize: fs(20) }]}>{fmt(income)}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: Colors.light.expense + "10" }]}>
                <Text style={[styles.summaryLabel, { fontSize: fs(12) }]}>Expenses</Text>
                <Text style={[styles.summaryVal, { color: Colors.light.expense, fontSize: fs(20) }]}>{fmt(expenses)}</Text>
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
                    <Ionicons name="trending-down-outline" size={is(20)} color="#fff" />
                    <Text style={[styles.valueBannerTitle, { fontSize: fs(18) }]}>Your Savings Potential</Text>
                  </View>

                  <Text style={[styles.valueBannerSubtitle, { fontSize: fs(13) }]}>Cutting spending by just 10% would save</Text>
                  <View style={styles.valueBannerRow}>
                    <View style={styles.valueBannerItem}>
                      <Text style={[styles.valueBannerBigNum, { fontSize: fs(26) }]}>{fmt(Math.round(annualSaving10))}</Text>
                      <Text style={[styles.valueBannerSmall, { fontSize: fs(11) }]}>per year</Text>
                    </View>
                    <View style={styles.valueBannerDivider} />
                    <View style={styles.valueBannerItem}>
                      <Text style={[styles.valueBannerBigNum, { fontSize: fs(26) }]}>{fmt(Math.round(investedGrowth))}</Text>
                      <Text style={[styles.valueBannerSmall, { fontSize: fs(11) }]}>over 10yrs invested</Text>
                    </View>
                  </View>

                  {topCat && (
                    <View style={styles.valueBannerPill}>
                      <Ionicons name="bulb-outline" size={is(14)} color="#fff" />
                      <Text style={[styles.valueBannerPillText, { fontSize: fs(12) }]}>
                        Top spend: {topCat[0]} at {fmt(topCat[1])}/mo ({income > 0 ? Math.round((topCat[1] / income) * 100) : 0}% of income)
                      </Text>
                    </View>
                  )}

                  <View style={styles.savingsRateRow}>
                    <Text style={[styles.savingsRateLabel, { fontSize: fs(12) }]}>Savings Rate</Text>
                    <View style={styles.savingsRateBarBg}>
                      <View style={[styles.savingsRateBarFill, { width: `${Math.min(Math.max(savingsRate, 0), 100)}%`, backgroundColor: savingsRate >= 20 ? "#4ade80" : savingsRate >= 10 ? "#fbbf24" : "#f87171" }]} />
                    </View>
                    <Text style={[styles.savingsRatePct, { fontSize: fs(14) }]}>
                      {Math.round(savingsRate)}%
                    </Text>
                  </View>
                </LinearGradient>
              );
            })()}

            {sortedCats.length > 0 && (
              <View style={styles.catSection}>
                <Text style={[styles.catTitle, { fontSize: fs(16) }]}>Spending Breakdown</Text>
                <View style={styles.catList}>
                  {sortedCats.slice(0, 5).map(([cat, amount]) => {
                    const c = CATS[cat] || CATS["Other"];
                    const pct = expenses > 0 ? (amount / expenses) * 100 : 0;
                    return (
                      <View key={cat} style={styles.catItem}>
                        <View style={[styles.catIcon, { backgroundColor: c.color + "15" }]}>
                          <Ionicons name={c.icon as any} size={is(16)} color={c.color} />
                        </View>
                        <View style={styles.catInfo}>
                          <Text style={[styles.catName, { fontSize: fs(13) }]}>{cat}</Text>
                          <View style={styles.catBarBg}>
                            <View style={[styles.catBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: c.color }]} />
                          </View>
                        </View>
                        <Text style={[styles.catAmount, { fontSize: fs(13) }]}>{fmt(amount)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {goals.length > 0 && (
              <View style={styles.goalsSection}>
                <View style={styles.goalsHeader}>
                  <Text style={[styles.catTitle, { fontSize: fs(16) }]}>Savings Goals</Text>
                  <Pressable onPress={() => router.push("/add-goal")} hitSlop={12}>
                    <Ionicons name="add" size={is(22)} color={Colors.light.budget} />
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
                          <Ionicons name={g.icon as any} size={is(18)} color={Colors.light.budget} />
                        </View>
                        <View style={styles.goalInfo}>
                          <Text style={[styles.goalName, { fontSize: fs(14) }]}>{g.name}</Text>
                          <Text style={[styles.goalProgress, { fontSize: fs(11) }]}>{fmt(g.currentAmount)} of {fmt(g.targetAmount)}</Text>
                        </View>
                        <Text style={[styles.goalPct, { fontSize: fs(16) }]}>{Math.round(pct)}%</Text>
                      </View>
                      <View style={styles.goalBarBg}>
                        <View style={[styles.goalBarFill, { width: `${Math.min(pct, 100)}%` }]} />
                      </View>
                      <Pressable onPress={() => handleAddFunds(g.id)} style={({ pressed }) => [styles.addFundsBtn, pressed && { opacity: 0.8 }]}>
                        <Ionicons name="add" size={is(16)} color={Colors.light.white} />
                        <Text style={[styles.addFundsText, { fontSize: fs(12) }]}>Add Funds</Text>
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {goals.length === 0 && (
              <Pressable onPress={() => router.push("/add-goal")} style={styles.addGoalBanner}>
                <Ionicons name="flag-outline" size={is(20)} color={Colors.light.budget} />
                <Text style={[styles.addGoalText, { fontSize: fs(14) }]}>Set a savings goal</Text>
                <Ionicons name="chevron-forward" size={is(18)} color={Colors.light.textMuted} />
              </Pressable>
            )}

            <Pressable onPress={() => router.push("/(tabs)/rewards")} style={({ pressed }) => [pressed && { opacity: 0.95 }]}>
              <View style={styles.missionBanner}>
                <View style={styles.missionBannerTop}>
                  <View style={styles.missionPtsCircle}>
                    <Ionicons name="star" size={is(14)} color="#D4AF37" />
                    <Text style={[styles.missionPtsNum, { fontSize: fs(13) }]}>{rewardsState.points.toLocaleString()}</Text>
                  </View>
                </View>
                {budgetMission && (
                  <Pressable onPress={() => completeMission('add_transaction')} style={({ pressed }) => [styles.missionPrompt, pressed && { opacity: 0.85 }]}>
                    <View style={[styles.missionPromptIcon, { backgroundColor: '#10B98120' }]}>
                      <Ionicons name="receipt-outline" size={is(14)} color="#10B981" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.missionPromptTitle, { fontSize: fs(12) }]}>{budgetMission.title}</Text>
                      <Text style={[styles.missionPromptDesc, { fontSize: fs(10) }]}>{budgetMission.description}</Text>
                    </View>
                    <Text style={[styles.missionPromptPts, { fontSize: fs(13) }]}>+{budgetMission.is2xActive ? budgetMission.basePoints * 2 : budgetMission.basePoints}</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>

            <View style={styles.txHeader}>
              <Text style={[styles.catTitle, { fontSize: fs(16) }]}>Transactions</Text>
              <View style={styles.filterRow}>
                {(["all", "income", "expense"] as Filter[]).map(f => (
                  <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filterBtn, filter === f && styles.filterBtnActive]}>
                    <Text style={[styles.filterText, filter === f && styles.filterTextActive, { fontSize: fs(12) }]}>
                      {f === "all" ? "All" : f === "income" ? "In" : "Out"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyTx}>
            <Ionicons name="receipt-outline" size={is(40)} color={Colors.light.gray300} />
            <Text style={[styles.emptyTxText, { fontSize: fs(15) }]}>No transactions yet</Text>
            <Text style={[styles.emptyTxSub, { fontSize: fs(12) }]}>Add your income and expenses to start tracking</Text>
          </View>
        }
        ListFooterComponent={renderBanksSection}
        renderItem={({ item }) => <TxItem item={item} onDelete={deleteTransaction} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <Modal visible={goalModalVisible} transparent animationType="fade" onRequestClose={() => setGoalModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setGoalModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={[styles.modalTitle, { fontSize: fs(20) }]}>Add Funds</Text>
            <TextInput style={[styles.modalInput, { fontSize: fs(24) }]} placeholder="Amount" placeholderTextColor={Colors.light.textMuted} keyboardType="decimal-pad" value={fundAmount} onChangeText={setFundAmount} autoFocus />
            <View style={styles.modalBtns}>
              <Pressable style={styles.modalCancel} onPress={() => setGoalModalVisible(false)}>
                <Text style={[styles.modalCancelText, { fontSize: fs(14) }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalConfirm, (!fundAmount || parseFloat(fundAmount) <= 0) && { opacity: 0.5 }]} onPress={confirmAddFunds} disabled={!fundAmount || parseFloat(fundAmount) <= 0}>
                <Text style={[styles.modalConfirmText, { fontSize: fs(14) }]}>Add</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <MessageOverlay screen="budget" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  pageDesc: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.light.textSecondary, marginTop: 8, marginBottom: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.light.text },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 14 },
  summaryLabel: { fontFamily: "DMSans_500Medium", fontSize: 12, color: Colors.light.textSecondary },
  summaryVal: { fontFamily: "DMSans_700Bold", fontSize: 20, marginTop: 4 },
  catSection: { marginBottom: 20 },
  catTitle: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.light.text, marginBottom: 10 },
  catList: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 14, gap: 14 },
  catItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  catIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  catInfo: { flex: 1, gap: 4 },
  catName: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.text },
  catBarBg: { height: 5, backgroundColor: Colors.light.gray100, borderRadius: 3, overflow: "hidden" },
  catBarFill: { height: 5, borderRadius: 3 },
  catAmount: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: Colors.light.text },
  goalsSection: { marginBottom: 20 },
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
  addGoalBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.light.card, borderRadius: 14, padding: 14, marginBottom: 20 },
  addGoalText: { fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.light.text, flex: 1 },
  txHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
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
  missionBanner: { marginBottom: 16, backgroundColor: Colors.light.card, borderRadius: 16, padding: 14 },
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

  banksSection: { marginTop: 24, paddingHorizontal: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: Colors.light.gray100 },
  banksSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  banksTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  banksSectionTitle: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.light.text },
  bankLoadingState: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 30 },
  bankLoadingText: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.textMuted },
  bankSetupState: { alignItems: "center", paddingVertical: 10 },
  bankSetupIcon: { width: 70, height: 70, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  bankSetupTitle: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.light.text, marginBottom: 6 },
  bankSetupText: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.light.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 16, paddingHorizontal: 10 },
  bankSetupSteps: { width: "100%", gap: 10, marginBottom: 18 },
  bankStepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bankStepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.light.tint, alignItems: "center", justifyContent: "center" },
  bankStepNumText: { fontFamily: "DMSans_700Bold", fontSize: 11, color: Colors.light.white },
  bankStepText: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.text, flex: 1 },
  bankSetupLink: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.light.tint, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 12 },
  bankSetupLinkText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.white },
  bankSummaryRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  bankSummaryCard: { flex: 1, borderRadius: 14, padding: 14 },
  bankSummaryLabel: { fontFamily: "DMSans_500Medium", fontSize: 12, color: Colors.light.textSecondary },
  bankSummaryVal: { fontFamily: "DMSans_700Bold", fontSize: 20, marginTop: 4 },
  bankAccountGroup: { marginBottom: 16 },
  bankGroupTitle: { fontFamily: "DMSans_700Bold", fontSize: 12, color: Colors.light.textMuted, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  bankAccountCard: { backgroundColor: Colors.light.card, borderRadius: 14, padding: 14, marginBottom: 8 },
  bankAccountRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  bankAccountIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  bankAccountInfo: { flex: 1 },
  bankAccountName: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.text },
  bankAccountType: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 2 },
  bankAccountBalance: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.light.text },
  bankAccountAvail: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.light.textMuted, marginTop: 2 },
  bankEmptyConnections: { alignItems: "center", paddingVertical: 30 },
  bankEmptyText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.textSecondary, marginTop: 12 },
  bankEmptySubtext: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 4, textAlign: "center", marginBottom: 16 },
  bankConnectBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.light.tint, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 12 },
  bankConnectBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.white },
  bankConnectionsSection: { marginTop: 12 },
  bankConnectionsTitle: { fontFamily: "DMSans_700Bold", fontSize: 13, color: Colors.light.textMuted, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  bankConnectionCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.light.card, borderRadius: 14, padding: 12, marginBottom: 8 },
  bankConnectionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  bankConnectionInfo: { flex: 1 },
  bankConnectionName: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: Colors.light.text },
  bankConnectionStatus: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.light.textMuted, marginTop: 2 },
  bankImportBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.light.card, borderRadius: 14, padding: 14, marginTop: 12 },
  bankImportBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: Colors.light.tint, flex: 1 },
});
