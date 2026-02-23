import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import CoinHeader from '@/components/CoinHeader';
import { useAccessibility } from '@/contexts/AccessibilityContext';

const SECTIONS = [
  { route: '/(tabs)/overview', label: 'Overview', icon: 'pie-chart', gradient: ['#0D9488', '#14B8A6'] as [string, string], accent: '#0D9488' },
  { route: '/(tabs)/mortgage', label: 'Mortgage', icon: 'home', gradient: ['#2563EB', '#60A5FA'] as [string, string], accent: '#3B82F6' },
  { route: '/(tabs)/super', label: 'Super', icon: 'trending-up', gradient: ['#7C3AED', '#A78BFA'] as [string, string], accent: '#8B5CF6' },
  { route: '/(tabs)/budget', label: 'Budget', icon: 'wallet', gradient: ['#059669', '#34D399'] as [string, string], accent: '#10B981' },
  { route: '/(tabs)/index', label: 'Rewards', icon: 'star', gradient: ['#D97706', '#FBBF24'] as [string, string], accent: '#F59E0B' },
  { route: '/(tabs)/insurance', label: 'Insurance', icon: 'shield-checkmark', gradient: ['#DC2626', '#F87171'] as [string, string], accent: '#EF4444' },
  { route: '/(tabs)/investor', label: 'Investor', icon: 'bar-chart', gradient: ['#B45309', '#F59E0B'] as [string, string], accent: '#D97706' },
  { route: '/(tabs)/fact-find', label: 'Fact Find', icon: 'document-text', gradient: ['#BE185D', '#F472B6'] as [string, string], accent: '#EC4899' },
  { route: '/(tabs)/planning', label: 'Planning', icon: 'analytics', gradient: ['#0F766E', '#2DD4BF'] as [string, string], accent: '#14B8A6' },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const router = useRouter();
  const { fs, is } = useAccessibility();

  const bottomPad = isWeb ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 120 }}
      >
        <CoinHeader />
        <Text style={[styles.subtitle, { fontSize: fs(14) }]}>Your Australian Finance Hub</Text>

        <View style={styles.iconGrid}>
          {SECTIONS.map((section) => (
            <TouchableOpacity
              key={section.route}
              style={styles.gridItem}
              activeOpacity={0.7}
              onPress={() => router.push(section.route as any)}
            >
              <View style={styles.iconOuter}>
                <LinearGradient
                  colors={section.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.gridIconCircle, { width: is(62), height: is(62), borderRadius: is(20) }]}
                >
                  <View style={[styles.iconInner, { width: is(36), height: is(36), borderRadius: is(12) }]}>
                    <Ionicons name={section.icon as any} size={is(22)} color="#fff" />
                  </View>
                </LinearGradient>
                <View style={[styles.iconShine, { width: is(62), borderRadius: is(20) }]} />
              </View>
              <Text style={[styles.gridLabel, { fontSize: fs(11) }]} numberOfLines={1}>{section.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 28,
    paddingHorizontal: 24,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 16,
    rowGap: 24,
    paddingHorizontal: 24,
  },
  gridItem: {
    alignItems: 'center',
    width: 80,
  },
  iconOuter: {
    position: 'relative',
    marginBottom: 8,
  },
  gridIconCircle: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  iconInner: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 62,
    height: '45%',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  gridLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: Colors.light.text,
    textAlign: 'center',
  },
});
