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
  useWindowDimensions,
  Modal,
  Pressable,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useEffect, useState, useCallback } from "react";
import Colors from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const TAB_META: Record<string, { active: string; inactive: string; color: string }> = {
  index: { active: "pie-chart", inactive: "pie-chart-outline", color: "#0D9488" },
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

const VISIBLE_COUNT = 4;

function MoreMenu({
  visible,
  onClose,
  routes,
  descriptors,
  activeIndex,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  routes: any[];
  descriptors: any;
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: !isWeb }),
        Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 50, useNativeDriver: !isWeb }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
    }
  }, [visible]);

  if (!visible) return null;

  const bottomPad = isWeb ? 34 : Math.max(insets.bottom, 16);

  const topPad = isWeb ? 67 : Math.max(insets.top, 20);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.homePage,
            { paddingTop: topPad + 16, paddingBottom: bottomPad + 16, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.homeHeader}>
            <Text style={styles.homeTitle}>Good Money</Text>
            <TouchableOpacity onPress={onClose} style={styles.homeCloseBtn} activeOpacity={0.7}>
              <View style={styles.homeCloseBg}>
                <Ionicons name="close" size={18} color="#666" />
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.iconGrid}>
            {routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const meta = TAB_META[route.name] || { active: "ellipse", inactive: "ellipse-outline", color: "#999" };
              const isFocused = activeIndex === index;
              const label = options.title || route.name;

              return (
                <TouchableOpacity
                  key={route.key}
                  style={styles.gridItem}
                  activeOpacity={0.7}
                  onPress={() => onSelect(index)}
                >
                  <View
                    style={[
                      styles.gridIconCircle,
                      { backgroundColor: meta.color },
                    ]}
                  >
                    <Ionicons
                      name={meta.active as any}
                      size={28}
                      color="#fff"
                    />
                  </View>
                  <Text
                    style={[
                      styles.gridLabel,
                      isFocused && { fontWeight: "700" },
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                  {isFocused && <View style={[styles.activeDot, { backgroundColor: meta.color }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function ScrollableTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { width: screenWidth } = useWindowDimensions();
  const [moreOpen, setMoreOpen] = useState(false);

  const bottomPad = isWeb ? 34 : insets.bottom;
  const barHeight = 52 + bottomPad;

  const totalSlots = VISIBLE_COUNT + 1;
  const tabWidth = screenWidth / totalSlots;

  const visibleRoutes = state.routes.slice(0, VISIBLE_COUNT);
  const overflowRoutes = state.routes.slice(VISIBLE_COUNT);
  const activeInOverflow = state.index >= VISIBLE_COUNT;

  const handleSelect = useCallback(
    (index: number) => {
      setMoreOpen(false);
      const route = state.routes[index];
      if (state.index !== index) {
        navigation.navigate(route.name, route.params);
      }
    },
    [state, navigation],
  );

  return (
    <>
      <View style={[styles.barContainer, { height: barHeight }]}>
        {isIOS ? (
          <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "#000" : "#fff" }]} />
        )}
        <View style={[styles.topBorder, { borderTopColor: isDark ? "#333" : Colors.light.border }]} />

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        >
          {visibleRoutes.map((route, index) => {
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
                style={[styles.tab, { width: tabWidth }]}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, isFocused && { backgroundColor: `${meta.color}18` }]}>
                  <Ionicons
                    name={(isFocused ? meta.active : meta.inactive) as any}
                    size={20}
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
          })}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="More tabs"
            onPress={() => setMoreOpen(true)}
            style={[styles.tab, { width: tabWidth }]}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, activeInOverflow && { backgroundColor: "rgba(13, 148, 136, 0.12)" }]}>
              <Ionicons
                name={activeInOverflow ? "grid" : "grid-outline"}
                size={20}
                color={activeInOverflow ? Colors.light.tint : Colors.light.tabIconDefault}
              />
              {activeInOverflow && <View style={styles.moreDot} />}
            </View>
            <Text
              style={[
                styles.label,
                { color: activeInOverflow ? Colors.light.tint : Colors.light.tabIconDefault, fontWeight: activeInOverflow ? "600" : "500" },
              ]}
              numberOfLines={1}
            >
              More
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <MoreMenu
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        routes={state.routes}
        descriptors={descriptors}
        activeIndex={state.index}
        onSelect={handleSelect}
      />
    </>
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
  moreDot: {
    position: "absolute",
    top: 2,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.tint,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  homePage: {
    flex: 1,
    backgroundColor: "rgba(245, 245, 247, 0.92)",
    paddingHorizontal: 20,
  },
  homeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  homeTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 28,
    color: "#111827",
  },
  homeCloseBtn: {
    padding: 4,
  },
  homeCloseBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 20,
    rowGap: 28,
    paddingHorizontal: 4,
  },
  gridItem: {
    alignItems: "center",
    width: 72,
  },
  gridIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  gridLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: "#374151",
    textAlign: "center",
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
});
