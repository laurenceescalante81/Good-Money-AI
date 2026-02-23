import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useRewards } from '@/contexts/RewardsContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

function goBack() { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); }

const REWARD_CTAS = [
  { icon: 'gift-outline', title: 'Daily Spin', desc: 'Spin the wheel for bonus coins', route: '/(tabs)/index', color: '#F59E0B', gradient: ['#F59E0B', '#FBBF24'] as [string, string] },
  { icon: 'star-outline', title: 'Missions', desc: 'Complete tasks to earn rewards', route: '/(tabs)/index', color: '#8B5CF6', gradient: ['#8B5CF6', '#A78BFA'] as [string, string] },
  { icon: 'trophy-outline', title: 'Badges', desc: 'Collect badges for achievements', route: '/(tabs)/index', color: '#0D9488', gradient: ['#0D9488', '#14B8A6'] as [string, string] },
  { icon: 'cart-outline', title: 'Redeem Store', desc: 'Spend coins on rewards', route: '/(tabs)/index', color: '#EF4444', gradient: ['#EF4444', '#F87171'] as [string, string] },
];

export default function CoinBalancePage() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const { state } = useRewards();
  const { fs, is } = useAccessibility();
  const { isDark, colors: tc } = useTheme();

  const levelXp = state.level * 2500;
  const progress = Math.min(state.xp / levelXp, 1);

  return (
    <View style={[styles.container, { paddingTop: topInset, backgroundColor: tc.background }]}>
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={12}><Ionicons name="close" size={is(26)} color={tc.text} /></Pressable>
        <Text style={[styles.topTitle, { fontSize: fs(17), color: tc.text }]}>Good Coins</Text>
        <View style={{ width: is(26) }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 40 }}>
        <LinearGradient colors={['#D4AF37', '#B8941E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
          <View style={styles.bigCoin}>
            <Text style={styles.bigCoinText}>G</Text>
          </View>
          <Text style={styles.balanceLabel}>Your Balance</Text>
          <Text style={[styles.balanceAmount, { fontSize: fs(42) }]}>{state.points.toLocaleString()}</Text>
          <Text style={styles.balanceSub}>Good Coins</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{state.level}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{state.streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{state.badges.filter(b => b.earned).length}</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </View>
          </View>

          <View style={styles.xpBar}>
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.xpText}>{state.xp} / {levelXp} XP to next level</Text>
          </View>
        </LinearGradient>

        <View style={styles.ctaSection}>
          <Text style={[styles.ctaSectionTitle, { fontSize: fs(16), color: tc.text }]}>Earn More Coins</Text>
          {REWARD_CTAS.map((cta, i) => (
            <Pressable
              key={i}
              style={[styles.ctaCard, { backgroundColor: tc.card, borderColor: tc.border }]}
              onPress={() => router.push(cta.route as any)}
            >
              <LinearGradient colors={cta.gradient} style={styles.ctaIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name={cta.icon as any} size={is(22)} color="#fff" />
              </LinearGradient>
              <View style={styles.ctaTextWrap}>
                <Text style={[styles.ctaTitle, { fontSize: fs(15), color: tc.text }]}>{cta.title}</Text>
                <Text style={[styles.ctaDesc, { fontSize: fs(12), color: tc.textSecondary }]}>{cta.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={is(18)} color={tc.textMuted} />
            </Pressable>
          ))}
        </View>

        <View style={styles.ctaSection}>
          <Text style={[styles.ctaSectionTitle, { fontSize: fs(16), color: tc.text }]}>Recent Activity</Text>
          <View style={[styles.activityCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
            <View style={styles.activityRow}>
              <View style={[styles.activityDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.activityText, { color: tc.textSecondary }]}>Daily check-in</Text>
              <Text style={[styles.activityPts, { color: '#10B981' }]}>+50</Text>
            </View>
            {state.streak > 1 && (
              <View style={styles.activityRow}>
                <View style={[styles.activityDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.activityText, { color: tc.textSecondary }]}>{state.streak}-day streak bonus</Text>
                <Text style={[styles.activityPts, { color: '#F59E0B' }]}>Active</Text>
              </View>
            )}
            {state.missions.filter(m => m.completed).length > 0 && (
              <View style={styles.activityRow}>
                <View style={[styles.activityDot, { backgroundColor: '#8B5CF6' }]} />
                <Text style={[styles.activityText, { color: tc.textSecondary }]}>{state.missions.filter(m => m.completed).length} missions completed</Text>
                <Text style={[styles.activityPts, { color: '#8B5CF6' }]}>Done</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  topTitle: { fontFamily: 'DMSans_600SemiBold', fontSize: 17 },
  balanceCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#B8941E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  bigCoin: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  bigCoinText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 32,
    color: '#fff',
  },
  balanceLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 42,
    color: '#fff',
  },
  balanceSub: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: { alignItems: 'center' },
  statVal: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: '#fff' },
  statLabel: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  xpBar: { width: '100%' },
  xpBarBg: { height: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 4, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  xpText: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 6, textAlign: 'center' },
  ctaSection: { paddingHorizontal: 20, marginTop: 28 },
  ctaSectionTitle: { fontFamily: 'DMSans_700Bold', fontSize: 16, marginBottom: 14 },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    gap: 14,
  },
  ctaIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTextWrap: { flex: 1 },
  ctaTitle: { fontFamily: 'DMSans_600SemiBold', fontSize: 15 },
  ctaDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 2 },
  activityCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
    gap: 10,
  },
  activityDot: { width: 8, height: 8, borderRadius: 4 },
  activityText: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 13 },
  activityPts: { fontFamily: 'DMSans_700Bold', fontSize: 13 },
});
