import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, Platform, Switch, TextInput, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

function goBack() { if (router.canGoBack()) router.back(); else router.replace("/(tabs)"); }
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import { useFinance } from "@/contexts/FinanceContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useTheme } from "@/contexts/ThemeContext";

const SIZE_OPTIONS = [
  { key: 'default' as const, label: 'Default', desc: 'Standard text and icons', icon: 'text-outline' as const, preview: 16 },
  { key: 'large' as const, label: 'Large', desc: 'Bigger text and icons', icon: 'text-outline' as const, preview: 20 },
  { key: 'extra-large' as const, label: 'Extra Large', desc: 'Maximum readability', icon: 'text-outline' as const, preview: 24 },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { profileMode, setProfileMode, partnerName, setPartnerName } = useFinance();
  const { displaySize, setDisplaySize, fs, is } = useAccessibility();
  const { isDark, toggleTheme, colors: tc } = useTheme();

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
    <View style={[styles.container, { paddingTop: topInset, backgroundColor: tc.background }]}>
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={12}><Ionicons name="close" size={is(26)} color={tc.text} /></Pressable>
        <Text style={[styles.topTitle, { fontSize: fs(17), color: tc.text }]}>Settings</Text>
        <View style={{ width: is(26) }} />
      </View>
      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: tc.card }]}>
          <Text style={[styles.cardHeader, { fontSize: fs(12), color: tc.textMuted }]}>APPEARANCE</Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: isDark ? '#6366F1' + '20' : '#6366F1' + '15' }]}>
                <Ionicons name={isDark ? "moon" : "sunny"} size={is(20)} color="#6366F1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { fontSize: fs(15), color: tc.text }]}>Dark Mode</Text>
                <Text style={[styles.rowDesc, { fontSize: fs(12), color: tc.textMuted }]}>Switch to {isDark ? 'light' : 'dark'} theme</Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleTheme(); }}
              trackColor={{ false: tc.gray200, true: Colors.light.tint + "60" }}
              thumbColor={isDark ? Colors.light.tint : tc.gray400}
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: tc.card }]}>
          <Text style={[styles.cardHeader, { fontSize: fs(12), color: tc.textMuted }]}>DISPLAY SIZE</Text>
          <Text style={[styles.sizeDesc, { fontSize: fs(13), color: tc.textSecondary }]}>
            Adjust text and icon sizes for easier reading
          </Text>
          <View style={styles.sizeOptions}>
            {SIZE_OPTIONS.map(opt => {
              const selected = displaySize === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[styles.sizeOption, { backgroundColor: tc.gray50, borderColor: selected ? Colors.light.tint : 'transparent' }, selected && { backgroundColor: Colors.light.tint + '08' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDisplaySize(opt.key);
                  }}
                >
                  <Text style={[styles.sizePreview, { fontSize: opt.preview, color: selected ? Colors.light.tint : tc.text }]}>Aa</Text>
                  <Text style={[styles.sizeLabel, { fontSize: fs(13), color: selected ? Colors.light.tint : tc.text }]}>{opt.label}</Text>
                  <Text style={[styles.sizeOptionDesc, { fontSize: fs(11), color: tc.textMuted }]}>{opt.desc}</Text>
                  {selected && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark-circle" size={is(20)} color={Colors.light.tint} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: tc.card }]}>
          <Text style={[styles.cardHeader, { fontSize: fs(12), color: tc.textMuted }]}>PROFILE</Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: Colors.light.tint + "15" }]}>
                <Ionicons name="people" size={is(20)} color={Colors.light.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { fontSize: fs(15), color: tc.text }]}>Couple Mode</Text>
                <Text style={[styles.rowDesc, { fontSize: fs(12), color: tc.textMuted }]}>Manage shared finances together</Text>
              </View>
            </View>
            <Switch
              value={profileMode === "couple"}
              onValueChange={handleCoupleToggle}
              trackColor={{ false: tc.gray200, true: Colors.light.tint + "60" }}
              thumbColor={profileMode === "couple" ? Colors.light.tint : tc.gray400}
            />
          </View>
          {profileMode === "couple" && (
            <View style={[styles.partnerSection, { borderTopColor: tc.gray100 }]}>
              <Text style={[styles.partnerLabel, { fontSize: fs(13), color: tc.textMuted }]}>Partner's Name</Text>
              {editingName ? (
                <View style={styles.editRow}>
                  <TextInput style={[styles.editInput, { fontSize: fs(16), color: tc.text, backgroundColor: tc.inputBg }]} value={tempName} onChangeText={setTempName} autoFocus placeholder="Name" placeholderTextColor={tc.textMuted} />
                  <Pressable onPress={() => { if (tempName.trim()) setPartnerName(tempName.trim()); setEditingName(false); }}>
                    <Ionicons name="checkmark-circle" size={is(28)} color={Colors.light.tint} />
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => { setTempName(partnerName); setEditingName(true); }} style={styles.partnerDisplay}>
                  <Text style={[styles.partnerName, { fontSize: fs(16), color: tc.text }]}>{partnerName}</Text>
                  <Ionicons name="pencil" size={is(16)} color={tc.textMuted} />
                </Pressable>
              )}
            </View>
          )}
        </View>
        <View style={[styles.card, { backgroundColor: tc.card }]}>
          <Text style={[styles.cardHeader, { fontSize: fs(12), color: tc.textMuted }]}>DATA</Text>
          <Pressable onPress={handleClearData} style={styles.dangerRow}>
            <View style={[styles.rowIcon, { backgroundColor: Colors.light.expense + "15" }]}>
              <Ionicons name="trash" size={is(20)} color={Colors.light.expense} />
            </View>
            <Text style={[styles.dangerText, { fontSize: fs(15) }]}>Clear All Data</Text>
          </Pressable>
        </View>
        <Text style={[styles.version, { fontSize: fs(12), color: tc.textMuted }]}>Good Money v1.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 },
  topTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 17 },
  scrollBody: { flex: 1 },
  body: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  card: { borderRadius: 16, padding: 16, marginBottom: 16 },
  cardHeader: { fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 1, marginBottom: 14 },
  sizeDesc: { fontFamily: "DMSans_400Regular", fontSize: 13, marginBottom: 16, marginTop: -6 },
  sizeOptions: { gap: 10 },
  sizeOption: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: "transparent",
    gap: 12,
  },
  sizePreview: { fontFamily: "DMSans_700Bold", width: 44, textAlign: "center" },
  sizeLabel: { fontFamily: "DMSans_600SemiBold", fontSize: 15 },
  sizeOptionDesc: { fontFamily: "DMSans_400Regular", fontSize: 12, flex: 1 },
  checkBadge: { marginLeft: "auto" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontFamily: "DMSans_600SemiBold", fontSize: 15 },
  rowDesc: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  partnerSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  partnerLabel: { fontFamily: "DMSans_500Medium", fontSize: 13, marginBottom: 8 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  editInput: { flex: 1, fontFamily: "DMSans_500Medium", fontSize: 16, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  partnerDisplay: { flexDirection: "row", alignItems: "center", gap: 8 },
  partnerName: { fontFamily: "DMSans_600SemiBold", fontSize: 16 },
  dangerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dangerText: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: Colors.light.expense },
  version: { fontFamily: "DMSans_400Regular", fontSize: 12, textAlign: "center", marginTop: 24 },
});
