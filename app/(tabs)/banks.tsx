import React, { useState, useCallback, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, ActivityIndicator, Linking, Alert, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import CoinHeader from '@/components/CoinHeader';

function fmt(n: number): string { return "$" + Math.abs(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

interface Account {
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

interface Connection {
  id: string;
  status: string;
  institution: { id: string; type?: string };
  lastUsed: string;
  createdDate: string;
}

function AccountCard({ account }: { account: Account }) {
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
    <View style={styles.accountCard}>
      <View style={styles.accountRow}>
        <View style={[styles.accountIcon, { backgroundColor: color + "15" }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
          <Text style={styles.accountType}>
            {account.class?.product || account.class?.type || "Account"}
            {account.accountNo ? ` ···${account.accountNo.slice(-4)}` : ""}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" as const }}>
          <Text style={[styles.accountBalance, (isCredit || isLoan) && balance < 0 && { color: Colors.light.expense }]}>
            {balance < 0 ? "-" : ""}{fmt(balance)}
          </Text>
          {account.availableFunds != null && (
            <Text style={styles.accountAvail}>{fmt(account.availableFunds)} avail</Text>
          )}
        </View>
      </View>
    </View>
  );
}

export default function BanksScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const queryClient = useQueryClient();

  const statusQuery = useQuery<{ configured: boolean }>({
    queryKey: ["/api/basiq/status"],
    staleTime: 30000,
  });

  const connectionsQuery = useQuery<{ connections: Connection[] }>({
    queryKey: ["/api/basiq/connections"],
    enabled: !!statusQuery.data?.configured,
    staleTime: 15000,
  });

  const accountsQuery = useQuery<{ accounts: Account[] }>({
    queryKey: ["/api/basiq/accounts"],
    enabled: !!statusQuery.data?.configured && (connectionsQuery.data?.connections?.length ?? 0) > 0,
    staleTime: 15000,
  });

  const authLinkMutation = useMutation({
    mutationFn: async (institutionId?: string) => {
      const url = new URL("/api/basiq/auth-link", getApiUrl());
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId }),
      });
      if (!res.ok) throw new Error("Failed to create auth link");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) Linking.openURL(data.url);
    },
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

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/basiq/connections"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/basiq/accounts"] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const isConfigured = statusQuery.data?.configured;
  const connections = connectionsQuery.data?.connections || [];
  const accounts = accountsQuery.data?.accounts || [];
  const isLoading = statusQuery.isLoading || (isConfigured && connectionsQuery.isLoading);

  const totalBalance = accounts.reduce((sum, a) => {
    const t = a.class?.type;
    if (t === "credit-card" || t === "loan" || t === "mortgage") return sum;
    return sum + (a.balance || 0);
  }, 0);

  const totalDebt = accounts.reduce((sum, a) => {
    const t = a.class?.type;
    if (t === "credit-card" || t === "loan" || t === "mortgage") return sum + Math.abs(a.balance || 0);
    return sum;
  }, 0);

  const groupedByType: Record<string, Account[]> = {};
  accounts.forEach(a => {
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

  return (
    <View style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.tint} />}
      >
        <CoinHeader
          title="Banks"
          rightElement={isConfigured ? (
            <Pressable onPress={() => router.push("/connect-bank")} hitSlop={12}>
              <Ionicons name="add-circle" size={28} color={Colors.light.tint} />
            </Pressable>
          ) : undefined}
        />

        <Text style={styles.pageDesc}>Connect your Australian bank accounts via Open Banking.</Text>

        {isLoading && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={Colors.light.tint} />
            <Text style={styles.loadingText}>Connecting to Basiq...</Text>
          </View>
        )}

        {!isLoading && !isConfigured && (
          <View style={styles.setupState}>
            <View style={[styles.setupIcon, { backgroundColor: Colors.light.tint + "15" }]}>
              <Ionicons name="business-outline" size={48} color={Colors.light.tint} />
            </View>
            <Text style={styles.setupTitle}>Connect Your Banks</Text>
            <Text style={styles.setupText}>
              Link your Australian bank accounts through Basiq's secure Open Banking platform to see real-time balances and transactions
            </Text>
            <View style={styles.setupSteps}>
              <View style={styles.stepRow}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
                <Text style={styles.stepText}>Get your API key from basiq.io</Text>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
                <Text style={styles.stepText}>Add it as BASIQ_API_KEY in your app secrets</Text>
              </View>
              <View style={styles.stepRow}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
                <Text style={styles.stepText}>Connect your bank accounts securely</Text>
              </View>
            </View>
            <Pressable style={({ pressed }) => [styles.setupLink, pressed && { opacity: 0.8 }]} onPress={() => Linking.openURL("https://basiq.io")}>
              <Ionicons name="open-outline" size={18} color={Colors.light.white} />
              <Text style={styles.setupLinkText}>Visit basiq.io</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && isConfigured && accounts.length > 0 && (
          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: Colors.light.budget + "10" }]}>
                <Text style={styles.summaryLabel}>Total Balance</Text>
                <Text style={[styles.summaryVal, { color: Colors.light.budget }]}>{fmt(totalBalance)}</Text>
              </View>
              {totalDebt > 0 && (
                <View style={[styles.summaryCard, { backgroundColor: Colors.light.expense + "10" }]}>
                  <Text style={styles.summaryLabel}>Total Debt</Text>
                  <Text style={[styles.summaryVal, { color: Colors.light.expense }]}>{fmt(totalDebt)}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {!isLoading && isConfigured && accounts.length > 0 && (
          <View style={styles.accountsSection}>
            {Object.entries(groupedByType).map(([type, accs]) => (
              <View key={type} style={styles.accountGroup}>
                <Text style={styles.groupTitle}>{typeLabels[type] || type}</Text>
                {accs.map(a => <AccountCard key={a.id} account={a} />)}
              </View>
            ))}
          </View>
        )}

        {!isLoading && isConfigured && connections.length === 0 && (
          <View style={styles.emptyConnections}>
            <Ionicons name="link-outline" size={40} color={Colors.light.gray300} />
            <Text style={styles.emptyText}>No banks connected</Text>
            <Text style={styles.emptySubtext}>Connect your bank to see live balances and transactions</Text>
            <Pressable
              style={({ pressed }) => [styles.connectBtn, pressed && { opacity: 0.9 }]}
              onPress={() => router.push("/connect-bank")}
            >
              <Ionicons name="add" size={20} color={Colors.light.white} />
              <Text style={styles.connectBtnText}>Connect a Bank</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && isConfigured && connections.length > 0 && (
          <View style={styles.connectionsSection}>
            <Text style={styles.sectionTitle}>Connected Banks</Text>
            {connections.map(c => (
              <View key={c.id} style={styles.connectionCard}>
                <View style={[styles.connectionIcon, { backgroundColor: Colors.light.tint + "15" }]}>
                  <Ionicons name="business" size={20} color={Colors.light.tint} />
                </View>
                <View style={styles.connectionInfo}>
                  <Text style={styles.connectionName}>Bank Connection</Text>
                  <Text style={[styles.connectionStatus, c.status === "active" && { color: Colors.light.income }]}>
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
                  <Ionicons name="close-circle" size={24} color={Colors.light.expense} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {!isLoading && isConfigured && (
          <View style={styles.importSection}>
            <Pressable
              onPress={() => router.push("/bank-transactions")}
              style={({ pressed }) => [styles.importBtn, pressed && { opacity: 0.9 }]}
            >
              <Ionicons name="download-outline" size={20} color={Colors.light.tint} />
              <Text style={styles.importBtnText}>View Bank Transactions</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.light.textMuted} />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  pageDesc: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.light.textSecondary, paddingHorizontal: 20, marginBottom: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
  title: { fontFamily: "DMSans_700Bold", fontSize: 28, color: Colors.light.text },
  loadingState: { alignItems: "center", paddingVertical: 80, gap: 16 },
  loadingText: { fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.light.textMuted },
  setupState: { alignItems: "center", paddingHorizontal: 30, paddingTop: 20 },
  setupIcon: { width: 100, height: 100, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  setupTitle: { fontFamily: "DMSans_700Bold", fontSize: 22, color: Colors.light.text, marginBottom: 8 },
  setupText: { fontFamily: "DMSans_400Regular", fontSize: 14, color: Colors.light.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  setupSteps: { width: "100%", gap: 14, marginBottom: 28 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.light.tint, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontFamily: "DMSans_700Bold", fontSize: 13, color: Colors.light.white },
  stepText: { fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.light.text, flex: 1 },
  setupLink: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.light.tint, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 },
  setupLinkText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.white },
  summarySection: { paddingHorizontal: 20, marginBottom: 20 },
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 14 },
  summaryLabel: { fontFamily: "DMSans_500Medium", fontSize: 12, color: Colors.light.textSecondary },
  summaryVal: { fontFamily: "DMSans_700Bold", fontSize: 22, marginTop: 4 },
  accountsSection: { paddingHorizontal: 20 },
  accountGroup: { marginBottom: 20 },
  groupTitle: { fontFamily: "DMSans_700Bold", fontSize: 12, color: Colors.light.textMuted, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  accountCard: { backgroundColor: Colors.light.card, borderRadius: 14, padding: 14, marginBottom: 8 },
  accountRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  accountIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  accountInfo: { flex: 1 },
  accountName: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.text },
  accountType: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 2 },
  accountBalance: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.light.text },
  accountAvail: { fontFamily: "DMSans_400Regular", fontSize: 11, color: Colors.light.textMuted, marginTop: 2 },
  emptyConnections: { alignItems: "center", paddingVertical: 50 },
  emptyText: { fontFamily: "DMSans_600SemiBold", fontSize: 16, color: Colors.light.textSecondary, marginTop: 16 },
  emptySubtext: { fontFamily: "DMSans_400Regular", fontSize: 13, color: Colors.light.textMuted, marginTop: 4, textAlign: "center", paddingHorizontal: 40, marginBottom: 20 },
  connectBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.light.tint, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 },
  connectBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.white },
  connectionsSection: { paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: { fontFamily: "DMSans_700Bold", fontSize: 16, color: Colors.light.text, marginBottom: 10 },
  connectionCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.light.card, borderRadius: 14, padding: 14, marginBottom: 8 },
  connectionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  connectionInfo: { flex: 1 },
  connectionName: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.text },
  connectionStatus: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 2 },
  importSection: { paddingHorizontal: 20, marginTop: 16 },
  importBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.light.card, borderRadius: 14, padding: 16 },
  importBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.tint, flex: 1 },
});
