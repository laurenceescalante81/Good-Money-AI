import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, Platform, Switch, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import { useFinance } from "@/contexts/FinanceContext";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { profileMode, setProfileMode, partnerName, setPartnerName } = useFinance();

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(partnerName);

  const handleCoupleToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProfileMode(value ? "couple" : "individual");
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will permanently delete all your transactions, budgets, and goals. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Everything",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                "@pocketplan_transactions",
                "@pocketplan_budgets",
                "@pocketplan_goals",
                "@pocketplan_profileMode",
                "@pocketplan_partnerName",
              ]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              router.back();
            } catch (e) {
              console.error(e);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.topTitle}>Settings</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Profile</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: Colors.light.tint + "15" }]}>
                <Ionicons name="people" size={20} color={Colors.light.tint} />
              </View>
              <View>
                <Text style={styles.settingLabel}>Couple Mode</Text>
                <Text style={styles.settingDesc}>Track shared finances together</Text>
              </View>
            </View>
            <Switch
              value={profileMode === "couple"}
              onValueChange={handleCoupleToggle}
              trackColor={{ false: Colors.light.gray200, true: Colors.light.tint + "60" }}
              thumbColor={profileMode === "couple" ? Colors.light.tint : Colors.light.gray400}
            />
          </View>

          {profileMode === "couple" && (
            <View style={styles.partnerSection}>
              <Text style={styles.partnerLabel}>Partner's Name</Text>
              {editingName ? (
                <View style={styles.partnerEditRow}>
                  <TextInput
                    style={styles.partnerInput}
                    value={tempName}
                    onChangeText={setTempName}
                    autoFocus
                    placeholder="Enter name"
                    placeholderTextColor={Colors.light.textMuted}
                  />
                  <Pressable
                    onPress={() => {
                      if (tempName.trim()) {
                        setPartnerName(tempName.trim());
                      }
                      setEditingName(false);
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={28} color={Colors.light.tint} />
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => { setTempName(partnerName); setEditingName(true); }} style={styles.partnerDisplay}>
                  <Text style={styles.partnerName}>{partnerName}</Text>
                  <Ionicons name="pencil" size={16} color={Colors.light.textMuted} />
                </Pressable>
              )}
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Data</Text>
          <Pressable onPress={handleClearData} style={styles.dangerRow}>
            <View style={[styles.settingIcon, { backgroundColor: Colors.light.expense + "15" }]}>
              <Ionicons name="trash" size={20} color={Colors.light.expense} />
            </View>
            <Text style={styles.dangerText}>Clear All Data</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>PocketPlan v1.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 },
  topTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 17, color: Colors.light.text },
  body: { paddingHorizontal: 20, paddingTop: 8 },
  sectionCard: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionHeader: { fontFamily: "DMSans_700Bold", fontSize: 15, color: Colors.light.textMuted, marginBottom: 16, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  settingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  settingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  settingLabel: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.text },
  settingDesc: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 2 },
  partnerSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.light.gray100 },
  partnerLabel: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.textMuted, marginBottom: 8 },
  partnerEditRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  partnerInput: { flex: 1, fontFamily: "DMSans_500Medium", fontSize: 16, color: Colors.light.text, backgroundColor: Colors.light.gray100, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  partnerDisplay: { flexDirection: "row", alignItems: "center", gap: 8 },
  partnerName: { fontFamily: "DMSans_600SemiBold", fontSize: 16, color: Colors.light.text },
  dangerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dangerText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.expense },
  version: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, textAlign: "center", marginTop: 24 },
});
