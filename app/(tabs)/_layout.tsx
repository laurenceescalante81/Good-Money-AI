import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import {
  Platform,
  StyleSheet,
  useColorScheme,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import Colors from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useTheme } from "@/contexts/ThemeContext";

const TAB_META: Record<string, { active: string; inactive: string; color: string; label: string }> = {
  index: { active: "star", inactive: "star-outline", color: "#F59E0B", label: "Rewards" },
  overview: { active: "pie-chart", inactive: "pie-chart-outline", color: "#0D9488", label: "Overview" },
  mortgage: { active: "home", inactive: "home-outline", color: "#3B82F6", label: "Mortgage" },
  super: { active: "trending-up", inactive: "trending-up-outline", color: "#8B5CF6", label: "Super" },
  budget: { active: "wallet", inactive: "wallet-outline", color: "#10B981", label: "Budget" },
  rewards: { active: "apps", inactive: "apps-outline", color: "#0D9488", label: "Home" },
  insurance: { active: "shield-checkmark", inactive: "shield-checkmark-outline", color: "#EF4444", label: "Insurance" },
  investor: { active: "bar-chart", inactive: "bar-chart-outline", color: "#D97706", label: "Investor" },
  "fact-find": { active: "document-text", inactive: "document-text-outline", color: "#EC4899", label: "Fact Find" },
  planning: { active: "analytics", inactive: "analytics-outline", color: "#14B8A6", label: "Planning" },
};

const ROW_SIZE = 5;
const DESKTOP_BP = 768;
const SIDEBAR_WIDTH = 220;

function useScreenWidth() {
  const [w, setW] = useState(() => Dimensions.get('window').width);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setW(window.width));
    return () => sub?.remove();
  }, []);
  return w;
}

function DesktopSidebar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { fs, is } = useAccessibility();
  const { isDark, colors: tc } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[dStyles.sidebar, { backgroundColor: tc.card, borderRightColor: tc.border, paddingTop: topInset }]}>
      <View style={dStyles.sidebarLogo}>
        <View style={dStyles.logoCircle}>
          <Text style={dStyles.logoText}>G</Text>
        </View>
        <Text style={[dStyles.logoName, { color: tc.text }]}>Good Money</Text>
      </View>
      <ScrollView style={dStyles.sidebarScroll} showsVerticalScrollIndicator={false}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const meta = TAB_META[route.name] || { active: "ellipse", inactive: "ellipse-outline", color: "#999", label: route.name };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
              style={[dStyles.sidebarItem, isFocused && { backgroundColor: meta.color + '12' }]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={(isFocused ? meta.active : meta.inactive) as any}
                size={is(20)}
                color={isFocused ? meta.color : tc.textMuted}
              />
              <Text
                style={[
                  dStyles.sidebarLabel,
                  { fontSize: fs(14), color: isFocused ? meta.color : tc.textSecondary },
                  isFocused && { fontFamily: 'DMSans_600SemiBold' },
                ]}
                numberOfLines={1}
              >
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function MobileTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const { isDark, colors: tc } = useTheme();
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  const insets = useSafeAreaInsets();
  const { fs, is, spacingScale } = useAccessibility();

  const bottomPad = isWeb ? 34 : insets.bottom;
  const rowH = Math.round(44 * spacingScale);
  const barHeight = (rowH * 2) + 8 + bottomPad;

  const row1 = state.routes.slice(0, ROW_SIZE);
  const row2 = state.routes.slice(ROW_SIZE);

  const renderTab = (route: any, index: number) => {
    const isFocused = state.index === index;
    const meta = TAB_META[route.name] || { active: "ellipse", inactive: "ellipse-outline", color: "#999", label: route.name };
    const label = meta.label;

    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        onPress={() => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }}
        style={styles.tab}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { width: is(32), height: is(24) }, isFocused && { backgroundColor: `${meta.color}18` }]}>
          <Ionicons
            name={(isFocused ? meta.active : meta.inactive) as any}
            size={is(18)}
            color={isFocused ? meta.color : Colors.light.tabIconDefault}
          />
        </View>
        <Text
          style={[
            styles.label,
            { fontSize: fs(9), color: isFocused ? meta.color : Colors.light.tabIconDefault, fontWeight: isFocused ? "600" : "500" },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.barContainer, { height: barHeight }]}>
      {isIOS ? (
        <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? tc.tabBar : "#fff" }]} />
      )}
      <View style={[styles.topBorder, { borderTopColor: isDark ? tc.tabBarBorder : Colors.light.border }]} />

      <View style={[styles.rowsWrap, { paddingBottom: bottomPad }]}>
        <View style={[styles.tabRow, { height: rowH }]}>
          {row1.map((route, i) => renderTab(route, i))}
        </View>
        {row2.length > 0 && (
          <View style={[styles.tabRow, { height: rowH }]}>
            {row2.map((route, i) => renderTab(route, ROW_SIZE + i))}
          </View>
        )}
      </View>
    </View>
  );
}

function ResponsiveTabBar(props: BottomTabBarProps) {
  const screenW = useScreenWidth();
  const isDesktop = screenW >= DESKTOP_BP;

  if (isDesktop) {
    return <DesktopSidebar {...props} />;
  }
  return <MobileTabBar {...props} />;
}

function ClassicTabLayout() {
  return (
    <Tabs
      tabBar={(props) => <ResponsiveTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Rewards" }} />
      <Tabs.Screen name="overview" options={{ title: "Overview" }} />
      <Tabs.Screen name="mortgage" options={{ title: "Mortgage" }} />
      <Tabs.Screen name="super" options={{ title: "Super" }} />
      <Tabs.Screen name="budget" options={{ title: "Budget" }} />
      <Tabs.Screen name="rewards" options={{ title: "Home" }} />
      <Tabs.Screen name="insurance" options={{ title: "Insurance" }} />
      <Tabs.Screen name="investor" options={{ title: "Investor" }} />
      <Tabs.Screen name="fact-find" options={{ title: "Fact Find" }} />
      <Tabs.Screen name="planning" options={{ title: "Planning" }} />
    </Tabs>
  );
}

export default function TabLayout() {
  return <ClassicTabLayout />;
}

const dStyles = StyleSheet.create({
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    zIndex: 10,
  },
  sidebarLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E8C84A',
  },
  logoText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: '#fff',
  },
  logoName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
  },
  sidebarScroll: {
    flex: 1,
    paddingHorizontal: 10,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 2,
  },
  sidebarLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
  },
});

const styles = StyleSheet.create({
  barContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  topBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowsWrap: {
    flex: 1,
    paddingTop: 4,
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    height: 44,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
  },
  iconWrap: {
    width: 32,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    marginBottom: 1,
  },
  label: {
    fontFamily: "DMSans_500Medium",
    fontSize: 9,
    textAlign: "center",
  },
});
