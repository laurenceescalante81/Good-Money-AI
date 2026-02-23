import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRewards } from '@/contexts/RewardsContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useTheme } from '@/contexts/ThemeContext';
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
  const topInset = Platform.OS === 'web' ? 16 : Math.max(insets.top, 50);
  const { state } = useRewards();
  const { fs, is } = useAccessibility();
  const { isDark, colors: tc } = useTheme();

  const forceDark = darkMode || isDark;
  const textColor = forceDark ? '#fff' : tc.text;
  const subtitleColor = forceDark ? 'rgba(255,255,255,0.5)' : tc.textMuted;
  const bgColor = transparent ? 'transparent' : (isDark ? tc.headerBg : Colors.light.background);
  const settingsBg = forceDark ? 'rgba(255,255,255,0.1)' : tc.gray100;
  const settingsColor = forceDark ? 'rgba(255,255,255,0.6)' : tc.textSecondary;

  return (
    <View style={[styles.container, { paddingTop: topInset + 8, backgroundColor: bgColor }, transparent && styles.transparent]}>
      <Pressable onPress={() => router.push('/(tabs)/rewards')} style={styles.leftSection}>
        <View style={[styles.goldCoin, { width: is(34), height: is(34), borderRadius: is(17) }]}>
          <Text style={[styles.goldCoinText, { fontSize: fs(16) }]}>G</Text>
        </View>
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
        <Pressable onPress={() => router.push('/coin-balance')} style={styles.coinPill}>
          <View style={[styles.coinIcon, { width: is(20), height: is(20), borderRadius: is(10) }]}>
            <Text style={[styles.coinIconText, { fontSize: fs(10) }]}>G</Text>
          </View>
          <Text style={[styles.coinCount, { fontSize: fs(13) }]}>{state.points.toLocaleString()}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/settings')} hitSlop={12} style={[styles.settingsBtn, { backgroundColor: settingsBg, width: is(34), height: is(34), borderRadius: is(12) }]}>
          <Ionicons name="settings-outline" size={is(18)} color={settingsColor} />
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
  goldCoin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B8941E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#E8C84A',
  },
  goldCoinText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: '#fff',
    marginTop: -1,
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
  coinIconText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 10,
    color: '#fff',
  },
  coinCount: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: '#fff',
  },
  settingsBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
