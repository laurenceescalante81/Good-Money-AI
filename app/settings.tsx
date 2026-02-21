import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, Platform, Switch, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

function goBack() { if (router.canGoBack()) router.back(); else router.replace("/(tabs)"); }
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import { useFinance } from "@/contexts/FinanceContext";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { profileMode, setProfileMode, partnerName, setPartnerName } = useFinance();

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(partnerName);

  const handleCoupleToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProfileMode(value ? "couple" : "individual");
  };

  const handleClearData = () => {
    Alert.alert("Clear All Data", "This will permanently delete all your financial data. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear Everything",
        style: "destructive",
        onPress: async () => {
          try {
            const keys = await AsyncStorage.getAllKeys();
            const ozKeys = keys.filter(k => k.startsWith("@ozfin_"));
            await AsyncStorage.multiRemove(ozKeys);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            goBack();
          } catch (e) { console.error(e); }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={12}><Ionicons name="close" size={26} color={Colors.light.text} /></Pressable>
        <Text style={styles.topTitle}>Settings</Text>
        <View style={{ width: 26 }} />
      </View>
      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.cardHeader}>PROFILE</Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: Colors.light.tint + "15" }]}>
                <Ionicons name="people" size={20} color={Colors.light.tint} />
              </View>
              <View>
                <Text style={styles.rowLabel}>Couple Mode</Text>
                <Text style={styles.rowDesc}>Manage shared finances together</Text>
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
                <View style={styles.editRow}>
                  <TextInput style={styles.editInput} value={tempName} onChangeText={setTempName} autoFocus placeholder="Name" placeholderTextColor={Colors.light.textMuted} />
                  <Pressable onPress={() => { if (tempName.trim()) setPartnerName(tempName.trim()); setEditingName(false); }}>
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
        <View style={styles.card}>
          <Text style={styles.cardHeader}>DATA</Text>
          <Pressable onPress={handleClearData} style={styles.dangerRow}>
            <View style={[styles.rowIcon, { backgroundColor: Colors.light.expense + "15" }]}>
              <Ionicons name="trash" size={20} color={Colors.light.expense} />
            </View>
            <Text style={styles.dangerText}>Clear All Data</Text>
          </Pressable>
        </View>
        <Text style={styles.version}>Good Money v1.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 },
  topTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 17, color: Colors.light.text },
  body: { paddingHorizontal: 20, paddingTop: 8 },
  card: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, marginBottom: 16 },
  cardHeader: { fontFamily: "DMSans_700Bold", fontSize: 12, color: Colors.light.textMuted, marginBottom: 14, letterSpacing: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.text },
  rowDesc: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, marginTop: 2 },
  partnerSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.light.gray100 },
  partnerLabel: { fontFamily: "DMSans_500Medium", fontSize: 13, color: Colors.light.textMuted, marginBottom: 8 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  editInput: { flex: 1, fontFamily: "DMSans_500Medium", fontSize: 16, color: Colors.light.text, backgroundColor: Colors.light.gray100, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  partnerDisplay: { flexDirection: "row", alignItems: "center", gap: 8 },
  partnerName: { fontFamily: "DMSans_600SemiBold", fontSize: 16, color: Colors.light.text },
  dangerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dangerText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.expense },
  version: { fontFamily: "DMSans_400Regular", fontSize: 12, color: Colors.light.textMuted, textAlign: "center", marginTop: 24 },
});
