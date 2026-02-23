import React, { useState, useMemo } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, ActivityIndicator, Linking, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { useAccessibility } from '@/contexts/AccessibilityContext';

function goBack() {
  if (router.canGoBack()) { router.back(); } else { router.replace("/(tabs)/budget"); }
}

interface Institution {
  id: string;
  name: string;
  shortName: string;
  logo: string | null;
  tier: string;
  status: string;
  country: string;
}

const TIER_LABELS: Record<string, string> = {
  "1": "Major Banks",
  "2": "Banks & Credit Unions",
  "3": "Other Institutions",
  "4": "Additional Providers",
};

function InstitutionRow({ inst, onPress }: { inst: Institution; onPress: () => void }) {
  const { fs, is } = useAccessibility();
  const tierColors: Record<string, string> = {
    "1": Colors.light.tint,
    "2": Colors.light.mortgage,
    "3": Colors.light.super,
    "4": Colors.light.insurance,
  };
  const color = tierColors[inst.tier] || Colors.light.tint;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.instRow, pressed && { opacity: 0.7 }]}>
      <View style={[styles.instIcon, { backgroundColor: color + "15" }]}>
        <Ionicons name="business" size={is(20)} color={color} />
      </View>
      <View style={styles.instInfo}>
        <Text style={[styles.instName, { fontSize: fs(14) }]} numberOfLines={1}>{inst.name}</Text>
        {inst.status && inst.status !== "operational" && (
          <Text style={[styles.instStatus, { color: Colors.light.insurance, fontSize: fs(11) }]}>{inst.status}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={is(18)} color={Colors.light.textMuted} />
    </Pressable>
  );
}

export default function ConnectBankScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 16 : insets.top;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [connecting, setConnecting] = useState(false);
  const { fs, is } = useAccessibility();

  const institutionsQuery = useQuery<{ institutions: Institution[] }>({
    queryKey: ["/api/basiq/institutions"],
    staleTime: 300000,
  });

  const authLinkMutation = useMutation({
    mutationFn: async (institutionId?: string) => {
      const res = await apiRequest("POST", "/api/basiq/auth-link", { institutionId });
      return res.json();
    },
    onSuccess: (data) => {
      setConnecting(false);
      if (data.url) {
        Linking.openURL(data.url);
      }
    },
    onError: () => {
      setConnecting(false);
    },
  });

  const institutions = institutionsQuery.data?.institutions || [];
  const filtered = useMemo(() => {
    if (!search.trim()) return institutions;
    const q = search.toLowerCase();
    return institutions.filter(i => i.name.toLowerCase().includes(q) || (i.shortName || "").toLowerCase().includes(q));
  }, [institutions, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, Institution[]> = {};
    filtered.forEach(i => {
      const tier = i.tier || "4";
      if (!groups[tier]) groups[tier] = [];
      groups[tier].push(i);
    });
    return groups;
  }, [filtered]);

  const handleConnect = (institutionId: string) => {
    setConnecting(true);
    authLinkMutation.mutate(institutionId);
  };

  const handleConnectAll = () => {
    setConnecting(true);
    authLinkMutation.mutate(undefined);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable onPress={goBack} hitSlop={12}>
          <Ionicons name="close" size={is(26)} color={Colors.light.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { fontSize: fs(18) }]}>Connect Bank</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={is(18)} color={Colors.light.textMuted} />
        <TextInput
          style={[styles.searchInput, { fontSize: fs(15) }]}
          placeholder="Search banks..."
          placeholderTextColor={Colors.light.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={is(18)} color={Colors.light.textMuted} />
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={handleConnectAll}
        style={({ pressed }) => [styles.connectAllBtn, pressed && { opacity: 0.9 }]}
        disabled={connecting}
      >
        {connecting ? (
          <ActivityIndicator color={Colors.light.white} />
        ) : (
          <>
            <Ionicons name="link" size={is(20)} color={Colors.light.white} />
            <Text style={[styles.connectAllText, { fontSize: fs(15) }]}>Connect Any Bank</Text>
          </>
        )}
      </Pressable>

      <Text style={[styles.helpText, { fontSize: fs(12) }]}>
        Or select a specific institution below. You'll be redirected to Basiq's secure consent page to authorise access.
      </Text>

      {institutionsQuery.isLoading && (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={[styles.loadingText, { fontSize: fs(13) }]}>Loading institutions...</Text>
        </View>
      )}

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([tier, insts]) => (
          <View key={tier} style={styles.tierGroup}>
            <Text style={[styles.tierTitle, { fontSize: fs(12) }]}>{TIER_LABELS[tier] || `Tier ${tier}`}</Text>
            {insts.map(inst => (
              <InstitutionRow key={inst.id} inst={inst} onPress={() => handleConnect(inst.id)} />
            ))}
          </View>
        ))}

        {!institutionsQuery.isLoading && filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={is(32)} color={Colors.light.gray300} />
            <Text style={[styles.emptyText, { fontSize: fs(14) }]}>No institutions found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 18, color: Colors.light.text },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.light.card, marginHorizontal: 20, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 8, marginBottom: 14 },
  searchInput: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 15, color: Colors.light.text, paddingVertical: 0 },
  connectAllBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: Colors.light.tint, marginHorizontal: 20, paddingVertical: 14, borderRadius: 14, marginBottom: 12 },
  connectAllText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.white },
  helpText: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, paddingHorizontal: 20, lineHeight: 18, marginBottom: 14 },
  list: { flex: 1, paddingHorizontal: 20 },
  tierGroup: { marginBottom: 20 },
  tierTitle: { fontFamily: "DMSans_700Bold", fontSize: 12, color: Colors.light.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  instRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.light.card, borderRadius: 12, padding: 14, marginBottom: 6 },
  instIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  instInfo: { flex: 1 },
  instName: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: Colors.light.text },
  instStatus: { fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 2 },
  loadingState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  loadingText: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.textMuted },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontFamily: "DMSans_500Medium", fontSize: 14, color: Colors.light.textMuted },
});
