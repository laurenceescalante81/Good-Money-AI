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
  index: { active: "star", inactive: "star-outline", color: "#F59E0B" },
  overview: { active: "pie-chart", inactive: "pie-chart-outline", color: "#0D9488" },
  mortgage: { active: "home", inactive: "home-outline", color: "#3B82F6" },
  super: { active: "trending-up", inactive: "trending-up-outline", color: "#8B5CF6" },
  budget: { active: "wallet", inactive: "wallet-outline", color: "#10B981" },
  banks: { active: "business", inactive: "business-outline", color: "#6366F1" },
  rewards: { active: "apps", inactive: "apps-outline", color: "#0D9488" },
  insurance: { active: "shield-checkmark", inactive: "shield-checkmark-outline", color: "#EF4444" },
  investor: { active: "bar-chart", inactive: "bar-chart-outline", color: "#D97706" },
  "fact-find": { active: "document-text", inactive: "document-text-outline", color: "#EC4899" },
  planning: { active: "analytics", inactive: "analytics-outline", color: "#14B8A6" },
};

const ROW_SIZE = 6;

function TwoRowTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  const insets = useSafeAreaInsets();

  const bottomPad = isWeb ? 34 : insets.bottom;
  const barHeight = 96 + bottomPad;

  const row1 = state.routes.slice(0, ROW_SIZE);
  const row2 = state.routes.slice(ROW_SIZE);

  const renderTab = (route: any, index: number) => {
    const { options } = descriptors[route.key];
    const isFocused = state.index === index;
    const meta = TAB_META[route.name] || { active: "ellipse", inactive: "ellipse-outline", color: "#999" };
    const label = options.title || route.name;

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
        <View style={[styles.iconWrap, isFocused && { backgroundColor: `${meta.color}18` }]}>
          <Ionicons
            name={(isFocused ? meta.active : meta.inactive) as any}
            size={18}
            color={isFocused ? meta.color : Colors.light.tabIconDefault}
          />
        </View>
        <Text
          style={[
            styles.label,
            { color: isFocused ? meta.color : Colors.light.tabIconDefault, fontWeight: isFocused ? "600" : "500" },
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
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "#000" : "#fff" }]} />
      )}
      <View style={[styles.topBorder, { borderTopColor: isDark ? "#333" : Colors.light.border }]} />

      <View style={[styles.rowsWrap, { paddingBottom: bottomPad }]}>
        <View style={styles.tabRow}>
          {row1.map((route, i) => renderTab(route, i))}
        </View>
        {row2.length > 0 && (
          <View style={styles.tabRow}>
            {row2.map((route, i) => renderTab(route, ROW_SIZE + i))}
          </View>
        )}
      </View>
    </View>
  );
}

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "star", selected: "star.fill" }} />
        <Label>Rewards</Label>
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
        <Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} />
        <Label>Home</Label>
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
      tabBar={(props) => <TwoRowTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Rewards" }} />
      <Tabs.Screen name="overview" options={{ title: "Overview" }} />
      <Tabs.Screen name="mortgage" options={{ title: "Mortgage" }} />
      <Tabs.Screen name="super" options={{ title: "Super" }} />
      <Tabs.Screen name="budget" options={{ title: "Budget" }} />
      <Tabs.Screen name="banks" options={{ title: "Banks" }} />
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
