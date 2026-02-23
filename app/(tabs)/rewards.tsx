import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  ScrollView, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import CoinHeader from '@/components/CoinHeader';
import { useResponsive } from '@/hooks/useResponsive';
import { useAccessibility } from '@/contexts/AccessibilityContext';

const SECTIONS = [
  { route: '/(tabs)/overview', label: 'Overview', icon: 'pie-chart', gradient: ['#0D9488', '#14B8A6'] as [string, string] },
  { route: '/(tabs)/mortgage', label: 'Mortgage', icon: 'home', gradient: ['#2563EB', '#60A5FA'] as [string, string] },
  { route: '/(tabs)/super', label: 'Super', icon: 'trending-up', gradient: ['#7C3AED', '#A78BFA'] as [string, string] },
  { route: '/(tabs)/budget', label: 'Budget', icon: 'wallet', gradient: ['#059669', '#34D399'] as [string, string] },
  { route: '/(tabs)/index', label: 'Rewards', icon: 'star', gradient: ['#D97706', '#FBBF24'] as [string, string] },
  { route: '/(tabs)/insurance', label: 'Insurance', icon: 'shield-checkmark', gradient: ['#DC2626', '#F87171'] as [string, string] },
  { route: '/(tabs)/investor', label: 'Investor', icon: 'bar-chart', gradient: ['#B45309', '#F59E0B'] as [string, string] },
  { route: '/(tabs)/fact-find', label: 'Fact Find', icon: 'document-text', gradient: ['#BE185D', '#F472B6'] as [string, string] },
  { route: '/(tabs)/planning', label: 'Planning', icon: 'analytics', gradient: ['#0F766E', '#2DD4BF'] as [string, string] },
];

const COLS = 3;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const router = useRouter();
  const { fs, is } = useAccessibility();
  const { isMobile, contentWidth, sidePadding } = useResponsive();
  const { width: screenWidth } = useWindowDimensions();

  const bottomPad = isWeb ? 34 : insets.bottom;
  const cardHPad = 20;
  const cardInnerPad = 16;
  const cardWidth = screenWidth - cardHPad * 2;
  const itemWidth = (cardWidth - cardInnerPad * 2) / COLS;

  const rows: typeof SECTIONS[] = [];
  for (let i = 0; i < SECTIONS.length; i += COLS) {
    rows.push(SECTIONS.slice(i, i + COLS));
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: isMobile ? (bottomPad + 120) : 60 }}
      >
        <CoinHeader />
        <View style={{ alignSelf: 'center', width: '100%', maxWidth: contentWidth, paddingHorizontal: sidePadding }}>
        <Text style={[styles.subtitle, { fontSize: fs(14) }]}>Your Australian Finance Hub</Text>

        <View style={[styles.cardContainer, { marginHorizontal: cardHPad }]}>
          <View style={[styles.gridWrap, { padding: cardInnerPad }]}>
            {rows.map((row, ri) => (
              <View key={ri} style={[styles.gridRow, ri < rows.length - 1 && { marginBottom: 24 }]}>
                {row.map((section) => (
                  <TouchableOpacity
                    key={section.route}
                    style={[styles.gridItem, { width: itemWidth }]}
                    activeOpacity={0.7}
                    onPress={() => router.push(section.route as any)}
                  >
                    <View style={styles.iconOuter}>
                      <LinearGradient
                        colors={section.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.gridIconCircle, { width: is(68), height: is(68), borderRadius: is(18) }]}
                      >
                        <Ionicons name={section.icon as any} size={is(28)} color="#fff" />
                      </LinearGradient>
                      <View style={[styles.iconShine, { width: is(68), borderRadius: is(18) }]} />
                    </View>
                    <Text style={[styles.gridLabel, { fontSize: fs(13) }]} numberOfLines={1}>{section.label}</Text>
                  </TouchableOpacity>
                ))}
                {row.length < COLS && Array.from({ length: COLS - row.length }).map((_, fi) => (
                  <View key={`filler-${fi}`} style={{ width: itemWidth }} />
                ))}
              </View>
            ))}
          </View>
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 0,
  },
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  gridWrap: {
    paddingVertical: 24,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  gridItem: {
    alignItems: 'center',
  },
  iconOuter: {
    position: 'relative',
    marginBottom: 10,
  },
  gridIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  iconShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 68,
    height: '40%',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  gridLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: Colors.light.text,
    textAlign: 'center',
  },
});
