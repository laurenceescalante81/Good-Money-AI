import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';

const SECTIONS = [
  { route: '/(tabs)/overview', label: 'Overview', icon: 'pie-chart', color: '#0D9488' },
  { route: '/(tabs)/mortgage', label: 'Mortgage', icon: 'home', color: '#3B82F6' },
  { route: '/(tabs)/super', label: 'Super', icon: 'trending-up', color: '#8B5CF6' },
  { route: '/(tabs)/budget', label: 'Budget', icon: 'wallet', color: '#10B981' },
  { route: '/(tabs)/banks', label: 'Banks', icon: 'business', color: '#6366F1' },
  { route: '/(tabs)/index', label: 'Rewards', icon: 'star', color: '#F59E0B' },
  { route: '/(tabs)/insurance', label: 'Insurance', icon: 'shield-checkmark', color: '#EF4444' },
  { route: '/(tabs)/investor', label: 'Investor', icon: 'bar-chart', color: '#D97706' },
  { route: '/(tabs)/fact-find', label: 'Fact Find', icon: 'document-text', color: '#EC4899' },
  { route: '/(tabs)/planning', label: 'Planning', icon: 'analytics', color: '#14B8A6' },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const router = useRouter();

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad + 20, paddingBottom: bottomPad + 110 }]}>
      <Text style={styles.title}>Good Money</Text>
      <Text style={styles.subtitle}>Your Australian Finance Hub</Text>

      <View style={styles.iconGrid}>
        {SECTIONS.map((section) => (
          <TouchableOpacity
            key={section.route}
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => router.push(section.route as any)}
          >
            <View style={[styles.gridIconCircle, { backgroundColor: section.color }]}>
              <Ionicons name={section.icon as any} size={28} color="#fff" />
            </View>
            <Text style={styles.gridLabel} numberOfLines={1}>{section.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 30,
    color: Colors.light.navy,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.light.gray500,
    marginBottom: 36,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 20,
    rowGap: 28,
    paddingHorizontal: 4,
  },
  gridItem: {
    alignItems: 'center',
    width: 72,
  },
  gridIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  gridLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: '#374151',
    textAlign: 'center',
  },
});
