import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import {
  Platform,
  StyleSheet,
  useColorScheme,
  View,
  TouchableOpacity,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import Colors from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const TAB_META: Record<string, { active: string; inactive: string; color: string }> = {
  index: { active: "apps", inactive: "apps-outline", color: "#0D9488" },
  overview: { active: "pie-chart", inactive: "pie-chart-outline", color: "#0D9488" },
  mortgage: { active: "home", inactive: "home-outline", color: "#3B82F6" },
  super: { active: "trending-up", inactive: "trending-up-outline", color: "#8B5CF6" },
  budget: { active: "wallet", inactive: "wallet-outline", color: "#10B981" },
  banks: { active: "business", inactive: "business-outline", color: "#6366F1" },
  rewards: { active: "star", inactive: "star-outline", color: "#F59E0B" },
  insurance: { active: "shield-checkmark", inactive: "shield-checkmark-outline", color: "#EF4444" },
  investor: { active: "bar-chart", inactive: "bar-chart-outline", color: "#D97706" },
  "fact-find": { active: "document-text", inactive: "document-text-outline", color: "#EC4899" },
  planning: { active: "analytics", inactive: "analytics-outline", color: "#14B8A6" },
};

function SimpleTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  const insets = useSafeAreaInsets();

  const bottomPad = isWeb ? 34 : insets.bottom;
  const barHeight = 52 + bottomPad;

  const homeRoute = state.routes[0];
  const homeKey = homeRoute?.key;
  const isHomeFocused = state.index === 0;
  const homeMeta = TAB_META["index"];
  const homeOptions = descriptors[homeKey]?.options;
  const homeLabel = homeOptions?.title || "Home";

  return (
    <View style={[styles.barContainer, { height: barHeight }]}>
      {isIOS ? (
        <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "#000" : "#fff" }]} />
      )}
      <View style={[styles.topBorder, { borderTopColor: isDark ? "#333" : Colors.light.border }]} />

      <View style={[styles.singleTabWrap, { paddingBottom: bottomPad }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={isHomeFocused ? { selected: true } : {}}
          onPress={() => {
            const event = navigation.emit({ type: "tabPress", target: homeKey, canPreventDefault: true });
            if (!isHomeFocused && !event.defaultPrevented) navigation.navigate(homeRoute.name, homeRoute.params);
          }}
          style={styles.tab}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrap, isHomeFocused && { backgroundColor: `${homeMeta.color}18` }]}>
            <Ionicons
              name={(isHomeFocused ? homeMeta.active : homeMeta.inactive) as any}
              size={20}
              color={isHomeFocused ? homeMeta.color : Colors.light.tabIconDefault}
            />
          </View>
          <Text
            style={[
              styles.label,
              { color: isHomeFocused ? homeMeta.color : Colors.light.tabIconDefault, fontWeight: isHomeFocused ? "600" : "500" },
            ]}
            numberOfLines={1}
          >
            {homeLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="overview">
        <Icon sf={{ default: "chart.pie", selected: "chart.pie.fill" }} />
        <Label>Overview</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="mortgage">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Mortgage</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="super">
        <Icon sf={{ default: "chart.line.uptrend.xyaxis", selected: "chart.line.uptrend.xyaxis" }} />
        <Label>Super</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="budget">
        <Icon sf={{ default: "dollarsign.circle", selected: "dollarsign.circle.fill" }} />
        <Label>Budget</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="banks">
        <Icon sf={{ default: "building.columns", selected: "building.columns.fill" }} />
        <Label>Banks</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="rewards">
        <Icon sf={{ default: "star", selected: "star.fill" }} />
        <Label>Rewards</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="insurance">
        <Icon sf={{ default: "shield", selected: "shield.fill" }} />
        <Label>Insurance</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="investor">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Investor</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="fact-find">
        <Icon sf={{ default: "doc.text.magnifyingglass", selected: "doc.text.magnifyingglass" }} />
        <Label>Fact Find</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="planning">
        <Icon sf={{ default: "chart.bar.xaxis", selected: "chart.bar.xaxis" }} />
        <Label>Planning</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  return (
    <Tabs
      tabBar={(props) => <SimpleTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="overview" options={{ title: "Overview" }} />
      <Tabs.Screen name="mortgage" options={{ title: "Mortgage" }} />
      <Tabs.Screen name="super" options={{ title: "Super" }} />
      <Tabs.Screen name="budget" options={{ title: "Budget" }} />
      <Tabs.Screen name="banks" options={{ title: "Banks" }} />
      <Tabs.Screen name="rewards" options={{ title: "Rewards" }} />
      <Tabs.Screen name="insurance" options={{ title: "Insurance" }} />
      <Tabs.Screen name="investor" options={{ title: "Investor" }} />
      <Tabs.Screen name="fact-find" options={{ title: "Fact Find" }} />
      <Tabs.Screen name="planning" options={{ title: "Planning" }} />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}

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
  scrollContent: {
    alignItems: "flex-start",
    paddingTop: 6,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
  },
  iconWrap: {
    width: 36,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    marginBottom: 2,
  },
  label: {
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    textAlign: "center",
  },
  singleTabWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: 6,
  },
});
