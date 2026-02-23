import React from 'react';
import { View, Text, StyleSheet, Image, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRewards } from '@/contexts/RewardsContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { router } from 'expo-router';
import Colors from '@/constants/colors';

interface CoinHeaderProps {
  title?: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  transparent?: boolean;
  darkMode?: boolean;
}

export default function CoinHeader({ title, subtitle, rightElement, transparent, darkMode }: CoinHeaderProps) {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : Math.max(insets.top, 50);
  const { state } = useRewards();
  const { fs, is } = useAccessibility();

  const textColor = darkMode ? '#fff' : Colors.light.text;
  const subtitleColor = darkMode ? 'rgba(255,255,255,0.5)' : Colors.light.textMuted;

  return (
    <View style={[styles.container, { paddingTop: topInset + 8 }, transparent && styles.transparent]}>
      <Pressable onPress={() => router.push('/(tabs)/index')} style={styles.leftSection}>
        <Image source={require('@/assets/images/logo.jpeg')} style={[styles.logo, { width: is(34), height: is(34) }]} />
        {title ? (
          <View style={styles.titleWrap}>
            <Text style={[styles.title, { fontSize: fs(17), color: textColor }]} numberOfLines={1}>{title}</Text>
            {subtitle && <Text style={[styles.subtitle, { fontSize: fs(11), color: subtitleColor }]} numberOfLines={1}>{subtitle}</Text>}
          </View>
        ) : (
          <Text style={[styles.brandName, { fontSize: fs(18), color: textColor }]}>Good Money</Text>
        )}
      </Pressable>

      <View style={styles.rightSection}>
        <Pressable onPress={() => router.push('/(tabs)/index')} style={styles.coinPill}>
          <View style={[styles.coinIcon, { width: is(20), height: is(20), borderRadius: is(10) }]}>
            <Ionicons name="star" size={is(12)} color="#fff" />
          </View>
          <Text style={[styles.coinCount, { fontSize: fs(13) }]}>{state.points.toLocaleString()}</Text>
        </Pressable>
        {rightElement}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: Colors.light.background,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  brandName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    color: Colors.light.text,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
    color: Colors.light.text,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4AF37',
    borderRadius: 20,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 5,
    gap: 5,
  },
  coinIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#B8941E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinCount: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: '#fff',
  },
});
