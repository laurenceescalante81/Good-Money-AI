import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import CoinHeader from '@/components/CoinHeader';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useResponsive } from '@/hooks/useResponsive';
import { useFinance } from '@/contexts/FinanceContext';
import { useRewards } from '@/contexts/RewardsContext';
import { useFSV } from '@/contexts/FSVContext';
import { MessageOverlay } from '@/contexts/AppMessagesContext';

const fmt = (n: number) => '$' + n.toLocaleString('en-AU', { maximumFractionDigits: 0 });

function SetupWithCoin({ fontSize }: { fontSize: number }) {
  const coinSize = Math.round(fontSize * 0.85);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Text style={{ fontFamily: 'DMSans_700Bold', fontSize, color: Colors.light.tint }}>Setup</Text>
      <View style={{ width: coinSize, height: coinSize, borderRadius: coinSize / 2, backgroundColor: '#D4AF37', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E8C84A' }}>
        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: coinSize * 0.55, color: '#fff', marginTop: -0.5 }}>G</Text>
      </View>
    </View>
  );
}

const PILLARS = [
  { key: 'mortgage', title: 'Mortgage', icon: 'home-outline', color: Colors.light.mortgage },
  { key: 'super', title: 'Super', icon: 'trending-up-outline', color: Colors.light.super },
  { key: 'insurance', title: 'Insurance', icon: 'shield-checkmark-outline', color: Colors.light.insurance },
  { key: 'savings', title: 'Savings', icon: 'flag-outline', color: Colors.light.budget },
  { key: 'budget', title: 'Budget', icon: 'wallet-outline', color: '#6366F1' },
] as const;

const QUICK_ACTIONS = [
  { label: 'Mortgage', icon: 'home-outline', color: Colors.light.mortgage, route: '/(tabs)/mortgage' },
  { label: 'Super', icon: 'trending-up-outline', color: Colors.light.super, route: '/(tabs)/super' },
  { label: 'Budget', icon: 'wallet-outline', color: '#6366F1', route: '/(tabs)/budget' },
  { label: 'Fact Find', icon: 'document-text-outline', color: '#EC4899', route: '/(tabs)/fact-find' },
  { label: 'Investor', icon: 'bar-chart-outline', color: '#D97706', route: '/(tabs)/investor' },
  { label: 'Planning', icon: 'analytics-outline', color: '#0D9488', route: '/(tabs)/planning' },
] as const;

export default function HomeScreen() {
  const { fs, is } = useAccessibility();
  const { isMobile, contentWidth, sidePadding } = useResponsive();
  const { fsvScore } = useFSV();
  const {
    mortgage, superDetails, insurancePolicies, goals,
    getTotalIncome, getTotalExpenses,
    calculateMortgageRepayment, calculateSuperProjection, getTotalInsuranceCost,
  } = useFinance();
  const { state: rewardsState, missions, xpForLevel: xpForLevelFn } = useRewards();

  const income = getTotalIncome();
  const expenses = getTotalExpenses();
  const balance = income - expenses;
  const mortgageCalc = calculateMortgageRepayment();
  const superProj = calculateSuperProjection();
  const insuranceCost = getTotalInsuranceCost();
  const totalGoalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);

  const levelNames = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Elite', 'Legend', 'Mythic', 'Champion', 'Grand Master'];
  const levelName = levelNames[Math.min(rewardsState.level - 1, levelNames.length - 1)];
  const activeMissions = missions.filter(m => !m.completed).length;

  const scorePct = Math.min((fsvScore / 100) * 100, 100);

  const getPillarValue = (key: string): { value: string; isSetup: boolean } => {
    switch (key) {
      case 'mortgage':
        return mortgage
          ? { value: fmt(mortgageCalc.monthly) + '/mo', isSetup: false }
          : { value: '', isSetup: true };
      case 'super':
        return superDetails
          ? { value: fmt(superDetails.balance), isSetup: false }
          : { value: '', isSetup: true };
      case 'insurance':
        return insurancePolicies.length > 0
          ? { value: fmt(insuranceCost) + '/yr', isSetup: false }
          : { value: '', isSetup: true };
      case 'savings':
        return goals.length > 0
          ? { value: fmt(totalGoalSaved), isSetup: false }
          : { value: '', isSetup: true };
      case 'budget':
        return (income > 0 || expenses > 0)
          ? { value: (balance >= 0 ? '+' : '') + fmt(balance) + '/mo', isSetup: false }
          : { value: '', isSetup: true };
      default:
        return { value: '', isSetup: true };
    }
  };

  const handlePillarPress = (key: string) => {
    switch (key) {
      case 'mortgage': router.push(mortgage ? '/(tabs)/mortgage' : '/setup-mortgage' as any); break;
      case 'super': router.push(superDetails ? '/(tabs)/super' : '/setup-super' as any); break;
      case 'insurance': router.push('/add-insurance' as any); break;
      case 'savings': router.push('/add-goal' as any); break;
      case 'budget': router.push('/(tabs)/budget' as any); break;
    }
  };

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 60 : 120 }}>
        <CoinHeader />

        <View style={[s.body, { alignSelf: 'center', width: '100%', maxWidth: contentWidth, paddingHorizontal: sidePadding }]}>

          <Pressable onPress={() => router.push('/fsv-missions' as any)} style={({ pressed }) => [pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] }]}>
            <LinearGradient colors={['#0D9488', '#0F766E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.scoreCard}>
              <View style={s.scoreHeaderRow}>
                <View style={s.scoreTitleRow}>
                  <View style={s.scoreIconWrap}>
                    <Ionicons name="shield-checkmark" size={is(18)} color="#fff" />
                  </View>
                  <Text style={[s.scoreLabel, { fontSize: fs(12) }]}>GOOD SCORE</Text>
                </View>
                <Ionicons name="chevron-forward" size={is(18)} color="rgba(255,255,255,0.6)" />
              </View>
              <View style={s.scoreValueRow}>
                <Text style={[s.scoreValue, { fontSize: fs(42) }]}>{fsvScore}</Text>
                <Text style={[s.scoreMax, { fontSize: fs(18) }]}> / 100</Text>
              </View>
              <View style={s.scoreBarBg}>
                <LinearGradient
                  colors={['#2DD4BF', '#99F6E4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[s.scoreBarFill, { width: `${Math.max(scorePct, 2)}%` }]}
                />
              </View>
              <Text style={[s.scoreHint, { fontSize: fs(12) }]}>Complete missions to improve your financial health</Text>
            </LinearGradient>
          </Pressable>

          <Text style={[s.sectionTitle, { fontSize: fs(17) }]}>Financial Snapshot</Text>
          <View style={s.pillarGrid}>
            {PILLARS.map(pillar => {
              const { value, isSetup } = getPillarValue(pillar.key);
              return (
                <Pressable
                  key={pillar.key}
                  onPress={() => handlePillarPress(pillar.key)}
                  style={({ pressed }) => [s.pillarCard, pressed && { opacity: 0.95, transform: [{ scale: 0.97 }] }]}
                >
                  <View style={[s.pillarIcon, { backgroundColor: pillar.color + '15' }]}>
                    <Ionicons name={pillar.icon as any} size={is(20)} color={pillar.color} />
                  </View>
                  <Text style={[s.pillarTitle, { fontSize: fs(12) }]}>{pillar.title}</Text>
                  {isSetup ? (
                    <SetupWithCoin fontSize={fs(15)} />
                  ) : (
                    <Text style={[s.pillarValue, { fontSize: fs(15), color: pillar.color }]} numberOfLines={1}>{value}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={() => router.push('/(tabs)/rewards' as any)} style={({ pressed }) => [pressed && { opacity: 0.95 }]}>
            <LinearGradient colors={[Colors.light.navy, Colors.light.navyMid]} style={s.rewardsCard}>
              <View style={s.rewardsHeaderRow}>
                <View style={s.rewardsTitleRow}>
                  <Ionicons name="star" size={is(16)} color="#D4AF37" />
                  <Text style={[s.rewardsTitle, { fontSize: fs(16) }]}>Rewards</Text>
                </View>
                <Ionicons name="chevron-forward" size={is(16)} color="rgba(255,255,255,0.5)" />
              </View>

              <View style={s.rewardsStatsRow}>
                <View style={s.rewardsStat}>
                  <View style={s.rewardsCoinIcon}>
                    <Text style={[s.rewardsCoinText, { fontSize: fs(8) }]}>G</Text>
                  </View>
                  <Text style={[s.rewardsStatValue, { fontSize: fs(20) }]}>{rewardsState.points.toLocaleString()}</Text>
                  <Text style={[s.rewardsStatLabel, { fontSize: fs(10) }]}>coins</Text>
                </View>
                <View style={s.rewardsStatDivider} />
                <View style={s.rewardsStat}>
                  <Ionicons name="trophy" size={is(14)} color="#8B5CF6" />
                  <Text style={[s.rewardsStatValue, { fontSize: fs(20) }]}>{rewardsState.level}</Text>
                  <Text style={[s.rewardsStatLabel, { fontSize: fs(10) }]}>{levelName}</Text>
                </View>
                <View style={s.rewardsStatDivider} />
                <View style={s.rewardsStat}>
                  <Ionicons name="flame" size={is(14)} color="#F59E0B" />
                  <Text style={[s.rewardsStatValue, { fontSize: fs(20) }]}>{rewardsState.streak}</Text>
                  <Text style={[s.rewardsStatLabel, { fontSize: fs(10) }]}>day streak</Text>
                </View>
                <View style={s.rewardsStatDivider} />
                <View style={s.rewardsStat}>
                  <Ionicons name="flag" size={is(14)} color="#4ade80" />
                  <Text style={[s.rewardsStatValue, { fontSize: fs(20) }]}>{activeMissions}</Text>
                  <Text style={[s.rewardsStatLabel, { fontSize: fs(10) }]}>missions</Text>
                </View>
              </View>

              <View style={s.viewRewardsBtn}>
                <Text style={[s.viewRewardsBtnText, { fontSize: fs(13) }]}>View Rewards</Text>
                <Ionicons name="arrow-forward" size={is(14)} color="#D4AF37" />
              </View>
            </LinearGradient>
          </Pressable>

          <Text style={[s.sectionTitle, { fontSize: fs(17) }]}>Quick Actions</Text>
          <View style={s.quickGrid}>
            {QUICK_ACTIONS.map(action => (
              <Pressable
                key={action.label}
                onPress={() => router.push(action.route as any)}
                style={({ pressed }) => [s.quickItem, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
              >
                <View style={[s.quickCircle, { backgroundColor: action.color + '15' }]}>
                  <Ionicons name={action.icon as any} size={is(22)} color={action.color} />
                </View>
                <Text style={[s.quickLabel, { fontSize: fs(11) }]} numberOfLines={1}>{action.label}</Text>
              </Pressable>
            ))}
          </View>

        </View>
      </ScrollView>
      <MessageOverlay screen="home" />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  body: {
    paddingTop: 12,
  },
  scoreCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  scoreHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreLabel: {
    fontFamily: 'DMSans_700Bold',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
  },
  scoreValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  scoreValue: {
    fontFamily: 'DMSans_700Bold',
    color: '#fff',
  },
  scoreMax: {
    fontFamily: 'DMSans_500Medium',
    color: 'rgba(255,255,255,0.5)',
  },
  scoreBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  scoreBarFill: {
    height: 8,
    borderRadius: 4,
  },
  scoreHint: {
    fontFamily: 'DMSans_400Regular',
    color: 'rgba(255,255,255,0.6)',
  },
  sectionTitle: {
    fontFamily: 'DMSans_700Bold',
    color: Colors.light.text,
    marginBottom: 14,
  },
  pillarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  pillarCard: {
    width: '31%',
    flexGrow: 1,
    flexBasis: '29%',
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  pillarIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pillarTitle: {
    fontFamily: 'DMSans_500Medium',
    color: Colors.light.textMuted,
    marginBottom: 4,
  },
  pillarValue: {
    fontFamily: 'DMSans_700Bold',
    textAlign: 'center',
  },
  rewardsCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },
  rewardsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rewardsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardsTitle: {
    fontFamily: 'DMSans_700Bold',
    color: '#fff',
  },
  rewardsStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  rewardsStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  rewardsCoinIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardsCoinText: {
    fontFamily: 'DMSans_700Bold',
    color: '#fff',
  },
  rewardsStatValue: {
    fontFamily: 'DMSans_700Bold',
    color: '#fff',
  },
  rewardsStatLabel: {
    fontFamily: 'DMSans_400Regular',
    color: 'rgba(255,255,255,0.5)',
  },
  rewardsStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  viewRewardsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderRadius: 12,
    paddingVertical: 10,
  },
  viewRewardsBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    color: '#D4AF37',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickLabel: {
    fontFamily: 'DMSans_500Medium',
    color: Colors.light.text,
    textAlign: 'center',
  },
});
