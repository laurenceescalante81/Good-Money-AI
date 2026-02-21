import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import {
  Platform,
  StyleSheet,
  useColorScheme,
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Dimensions,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useEffect } from "react";
import Colors from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  index: { active: "pie-chart", inactive: "pie-chart-outline" },
  mortgage: { active: "home", inactive: "home-outline" },
  super: { active: "trending-up", inactive: "trending-up-outline" },
  budget: { active: "wallet", inactive: "wallet-outline" },
  banks: { active: "business", inactive: "business-outline" },
  rewards: { active: "star", inactive: "star-outline" },
  insurance: { active: "shield-checkmark", inactive: "shield-checkmark-outline" },
  "fact-find": { active: "document-text", inactive: "document-text-outline" },
  planning: { active: "analytics", inactive: "analytics-outline" },
};

function ScrollableTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { width: screenWidth } = useWindowDimensions();

  const tabCount = state.routes.length;
  const minTabWidth = 72;
  const maxVisibleTabs = Math.floor(screenWidth / minTabWidth);
  const tabWidth = tabCount <= maxVisibleTabs ? screenWidth / tabCount : minTabWidth;
  const bottomPad = isWeb ? 34 : insets.bottom;
  const barHeight = 52 + bottomPad;

  useEffect(() => {
    const activeIndex = state.index;
    const scrollX = Math.max(0, activeIndex * tabWidth - screenWidth / 2 + tabWidth / 2);
    scrollRef.current?.scrollTo({ x: scrollX, animated: true });
  }, [state.index]);

  return (
    <View style={[styles.barContainer, { height: barHeight }]}>
      {isIOS ? (
        <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? "#000" : "#fff" },
          ]}
        />
      )}
      <View style={[styles.topBorder, { borderTopColor: isDark ? "#333" : Colors.light.border }]} />
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPad },
        ]}
        bounces
        decelerationRate="fast"
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const routeName = route.name;
          const icons = TAB_ICONS[routeName] || { active: "ellipse", inactive: "ellipse-outline" };
          const label = options.title || routeName;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={[styles.tab, { width: tabWidth }]}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
                <Ionicons
                  name={(isFocused ? icons.active : icons.inactive) as any}
                  size={20}
                  color={isFocused ? Colors.light.tint : Colors.light.tabIconDefault}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color: isFocused ? Colors.light.tint : Colors.light.tabIconDefault,
                    fontWeight: isFocused ? "600" : "500",
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
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
      tabBar={(props) => <ScrollableTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Overview" }} />
      <Tabs.Screen name="mortgage" options={{ title: "Mortgage" }} />
      <Tabs.Screen name="super" options={{ title: "Super" }} />
      <Tabs.Screen name="budget" options={{ title: "Budget" }} />
      <Tabs.Screen name="banks" options={{ title: "Banks" }} />
      <Tabs.Screen name="rewards" options={{ title: "Rewards" }} />
      <Tabs.Screen name="insurance" options={{ title: "Insurance" }} />
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
  iconWrapActive: {
    backgroundColor: "rgba(13, 148, 136, 0.1)",
  },
  label: {
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    textAlign: "center",
  },
});
