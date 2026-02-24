import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRewards } from '@/contexts/RewardsContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useFSV } from '@/contexts/FSVContext';
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
  const { fsvScore } = useFSV();

  const forceDark = darkMode || isDark;
  const textColor = forceDark ? '#fff' : tc.text;
  const subtitleColor = forceDark ? 'rgba(255,255,255,0.5)' : tc.textMuted;
  const bgColor = transparent ? 'transparent' : (isDark ? tc.headerBg : Colors.light.background);
  const settingsBg = forceDark ? 'rgba(255,255,255,0.1)' : tc.gray100;
  const settingsColor = forceDark ? 'rgba(255,255,255,0.6)' : tc.textSecondary;

  const scoreColor = fsvScore < 30 ? '#EF4444' : fsvScore < 60 ? '#F59E0B' : '#10B981';
  const scoreBg = forceDark ? 'rgba(13,148,136,0.15)' : 'rgba(13,148,136,0.08)';
  const scoreBarBg = forceDark ? 'rgba(255,255,255,0.1)' : 'rgba(13,148,136,0.12)';
  const scoreTextColor = forceDark ? 'rgba(255,255,255,0.7)' : '#065F46';
  const scorePct = Math.min((fsvScore / 100) * 100, 100);

  return (
    <View style={[styles.container, { paddingTop: topInset + 8, backgroundColor: bgColor }, transparent && styles.transparent]}>
      <View style={styles.row1}>
        <Pressable onPress={() => router.push('/(tabs)/rewards')} style={styles.leftSection}>
          <Image source={require('@/assets/images/logo.jpeg')} style={{ width: is(34), height: is(34), borderRadius: is(6) }} />
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
          <Pressable onPress={() => router.push('/(tabs)/rewards')} style={styles.coinPill}>
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

      <Pressable onPress={() => router.push('/fsv-missions')} style={[styles.row2, { backgroundColor: scoreBg }]}>
        <View style={styles.scoreLeft}>
          <Ionicons name="shield-checkmark" size={is(16)} color={scoreColor} />
          <Text style={[styles.scoreLabel, { fontSize: fs(13), color: scoreTextColor }]}>Good Score</Text>
        </View>
        <View style={styles.scoreBarSection}>
          <View style={[styles.scoreBarBg, { backgroundColor: scoreBarBg }]}>
            <View style={[styles.scoreBarFill, { width: `${Math.max(scorePct, 2)}%`, backgroundColor: scoreColor }]} />
          </View>
        </View>
        <Text style={[styles.scoreValue, { fontSize: fs(15), color: scoreColor }]}>{fsvScore}</Text>
        <Text style={[styles.scoreMax, { fontSize: fs(11), color: scoreTextColor }]}>/100</Text>
        <Ionicons name="chevron-forward" size={is(14)} color={scoreTextColor} style={{ marginLeft: 2 }} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: Colors.light.background,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
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
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 8,
  },
  scoreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreLabel: {
    fontFamily: 'DMSans_600SemiBold',
  },
  scoreBarSection: {
    flex: 1,
    marginHorizontal: 4,
  },
  scoreBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: 6,
    borderRadius: 3,
  },
  scoreValue: {
    fontFamily: 'DMSans_700Bold',
  },
  scoreMax: {
    fontFamily: 'DMSans_400Regular',
  },
});
