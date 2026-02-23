import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useFSV, FSVQuest } from '@/contexts/FSVContext';
import { useResponsive } from '@/hooks/useResponsive';

function QuestCard({ quest, fs, is }: { quest: FSVQuest; fs: (n: number) => number; is: (n: number) => number }) {
  return (
    <View style={[s.questCard, quest.completed && s.questCardDone]}>
      <View style={[s.questIcon, { backgroundColor: quest.iconColor + '18' }]}>
        <Ionicons name={quest.icon as any} size={is(20)} color={quest.iconColor} />
      </View>
      <View style={s.questContent}>
        <Text style={[s.questTitle, { fontSize: fs(13) }]} numberOfLines={1}>{quest.title}</Text>
        <Text style={[s.questDesc, { fontSize: fs(11) }]} numberOfLines={2}>{quest.description}</Text>
        <View style={s.questRewards}>
          <View style={s.questCoinPill}>
            <View style={s.miniCoin}>
              <Text style={s.miniCoinText}>G</Text>
            </View>
            <Text style={[s.questCoinText, { fontSize: fs(11) }]}>+{quest.coinReward}</Text>
          </View>
          {quest.fsvWeight > 0 && (
            <Text style={[s.questFsvText, { fontSize: fs(10) }]}>+{quest.fsvWeight} FSV</Text>
          )}
          {quest.badgeTitle && (
            <View style={s.questBadgePill}>
              <Ionicons name="ribbon-outline" size={is(10)} color="#8B5CF6" />
              <Text style={[s.questBadgeText, { fontSize: fs(9) }]}>{quest.badgeTitle}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={[s.questStatus, quest.completed ? s.questStatusDone : s.questStatusPending]}>
        {quest.completed ? (
          <Ionicons name="checkmark" size={is(14)} color="#fff" />
        ) : (
          <View style={s.questStatusDot} />
        )}
      </View>
    </View>
  );
}

function QuestSection({ title, icon, iconColor, quests, fs, is }: {
  title: string; icon: string; iconColor: string; quests: FSVQuest[]; fs: (n: number) => number; is: (n: number) => number;
}) {
  const completed = quests.filter(q => q.completed).length;
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={[s.sectionIconWrap, { backgroundColor: iconColor + '15' }]}>
          <Ionicons name={icon as any} size={is(16)} color={iconColor} />
        </View>
        <Text style={[s.sectionTitle, { fontSize: fs(14) }]}>{title}</Text>
        <Text style={[s.sectionCount, { fontSize: fs(11) }]}>{completed}/{quests.length}</Text>
      </View>
      {quests.map(q => <QuestCard key={q.id} quest={q} fs={fs} is={is} />)}
    </View>
  );
}

export default function FSVMissionsScreen() {
  const { fs, is } = useAccessibility();
  const { isMobile, contentWidth, sidePadding } = useResponsive();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 16 : insets.top;
  const {
    fsvScore, onboardingQuests, liquidityQuests, debtQuests, riskQuests,
    diversificationQuests, onboardingProgress, fsvBadges, checkAndCompleteQuests,
  } = useFSV();

  useEffect(() => { checkAndCompleteQuests(); }, []);

  const totalBadges = fsvBadges.length;
  const unlockedBadges = fsvBadges.filter(b => b.unlocked).length;

  const scoreColor = fsvScore < 30 ? '#EF4444' : fsvScore < 60 ? '#F59E0B' : '#10B981';
  const scoreLabel = fsvScore === 0 ? 'Not started' : fsvScore < 20 ? 'Just beginning' : fsvScore < 40 ? 'Building foundations' : fsvScore < 60 ? 'Getting stronger' : fsvScore < 80 ? 'Well structured' : 'Financially unshakeable';

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: isMobile ? 100 : 40 }}>
        <View style={[s.topBar, { paddingTop: topInset + 10 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={is(22)} color={Colors.light.text} />
          </Pressable>
          <Text style={[s.topTitle, { fontSize: fs(17) }]}>Financial Stability</Text>
          <View style={{ width: 34 }} />
        </View>

        <View style={[s.body, { maxWidth: contentWidth, alignSelf: 'center', width: '100%', paddingHorizontal: sidePadding }]}>
          <LinearGradient colors={['#0F172A', '#1E293B']} style={s.heroCard}>
            <View style={s.heroTop}>
              <View>
                <Text style={[s.heroLabel, { fontSize: fs(11) }]}>YOUR FSV SCORE</Text>
                <View style={s.heroScoreRow}>
                  <Text style={[s.heroScore, { fontSize: fs(48), color: scoreColor }]}>{Math.round(fsvScore)}</Text>
                  <Text style={[s.heroMax, { fontSize: fs(18) }]}>/ 100</Text>
                </View>
                <Text style={[s.heroStatus, { fontSize: fs(12), color: scoreColor }]}>{scoreLabel}</Text>
              </View>
              <View style={s.heroBadgeCount}>
                <Ionicons name="ribbon" size={is(20)} color="#D4AF37" />
                <Text style={[s.heroBadgeNum, { fontSize: fs(16) }]}>{unlockedBadges}</Text>
                <Text style={[s.heroBadgeMax, { fontSize: fs(11) }]}>/{totalBadges}</Text>
              </View>
            </View>
            <View style={s.heroBarTrack}>
              <LinearGradient
                colors={fsvScore < 30 ? ['#EF4444', '#F97316'] : fsvScore < 60 ? ['#F59E0B', '#EAB308'] : ['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[s.heroBarFill, { width: `${Math.max(fsvScore, 1)}%` as any }]}
              />
            </View>
          </LinearGradient>

          <View style={s.aboutCard}>
            <Text style={[s.aboutTitle, { fontSize: fs(15) }]}>Your Financial Stability Score (FSV)</Text>
            <Text style={[s.aboutText, { fontSize: fs(12) }]}>
              FSV is your financial power rating — from 0 to 100. It measures how resilient your foundations are across:
            </Text>
            <View style={s.aboutList}>
              {['Savings strength', 'Debt pressure', 'Insurance protection', 'Asset balance', 'Financial consistency'].map(item => (
                <View key={item} style={s.aboutItem}>
                  <View style={s.aboutDot} />
                  <Text style={[s.aboutItemText, { fontSize: fs(12) }]}>{item}</Text>
                </View>
              ))}
            </View>
            <Text style={[s.aboutHighlight, { fontSize: fs(12) }]}>This isn't a credit score. It doesn't judge your past.</Text>
            <Text style={[s.aboutHighlight, { fontSize: fs(12) }]}>It shows how stable your future is.</Text>
            <Text style={[s.aboutText, { fontSize: fs(12), marginTop: 8 }]}>
              Complete missions. Strengthen your structure. Every smart move increases your FSV.
            </Text>
            <Text style={[s.aboutGoal, { fontSize: fs(13) }]}>The goal isn't to chase money. It's to become financially unshakeable.</Text>
          </View>

          <QuestSection title="Onboarding" icon="rocket-outline" iconColor="#3B82F6" quests={onboardingQuests} fs={fs} is={is} />
          <QuestSection title="Liquidity Quests" icon="water-outline" iconColor="#06B6D4" quests={liquidityQuests} fs={fs} is={is} />
          <QuestSection title="Debt Quests" icon="trending-down-outline" iconColor="#EF4444" quests={debtQuests} fs={fs} is={is} />
          <QuestSection title="Risk & Protection" icon="shield-checkmark-outline" iconColor="#F59E0B" quests={riskQuests} fs={fs} is={is} />
          <QuestSection title="Diversification" icon="pie-chart-outline" iconColor="#8B5CF6" quests={diversificationQuests} fs={fs} is={is} />

          {unlockedBadges > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <View style={[s.sectionIconWrap, { backgroundColor: '#D4AF3715' }]}>
                  <Ionicons name="ribbon" size={is(16)} color="#D4AF37" />
                </View>
                <Text style={[s.sectionTitle, { fontSize: fs(14) }]}>Earned Badges</Text>
                <Text style={[s.sectionCount, { fontSize: fs(11) }]}>{unlockedBadges}/{totalBadges}</Text>
              </View>
              <View style={s.badgeGrid}>
                {fsvBadges.filter(b => b.unlocked).map(b => (
                  <View key={b.id} style={s.badgeItem}>
                    <View style={[s.badgeCircle, { backgroundColor: b.color + '20', borderColor: b.color }]}>
                      <Ionicons name={b.icon as any} size={is(18)} color={b.color} />
                    </View>
                    <Text style={[s.badgeName, { fontSize: fs(10) }]} numberOfLines={2}>{b.title}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: Colors.light.gray100, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: 'DMSans_700Bold', color: Colors.light.text },
  body: { paddingTop: 8 },
  heroCard: { borderRadius: 20, padding: 20, marginBottom: 16 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  heroLabel: { fontFamily: 'DMSans_600SemiBold', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, marginBottom: 4 },
  heroScoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  heroScore: { fontFamily: 'DMSans_700Bold' },
  heroMax: { fontFamily: 'DMSans_400Regular', color: 'rgba(255,255,255,0.3)' },
  heroStatus: { fontFamily: 'DMSans_600SemiBold', marginTop: 2 },
  heroBadgeCount: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(212,175,55,0.1)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  heroBadgeNum: { fontFamily: 'DMSans_700Bold', color: '#D4AF37' },
  heroBadgeMax: { fontFamily: 'DMSans_400Regular', color: 'rgba(212,175,55,0.5)' },
  heroBarTrack: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' as const },
  heroBarFill: { height: 10, borderRadius: 5 },
  aboutCard: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  aboutTitle: { fontFamily: 'DMSans_700Bold', color: Colors.light.text, marginBottom: 10 },
  aboutText: { fontFamily: 'DMSans_400Regular', color: Colors.light.textMuted, lineHeight: 20, marginBottom: 6 },
  aboutList: { gap: 4, marginVertical: 8 },
  aboutItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aboutDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#0D9488' },
  aboutItemText: { fontFamily: 'DMSans_500Medium', color: Colors.light.text },
  aboutHighlight: { fontFamily: 'DMSans_600SemiBold', color: '#0D9488', lineHeight: 20, marginTop: 4 },
  aboutGoal: { fontFamily: 'DMSans_700Bold', color: Colors.light.text, marginTop: 10, lineHeight: 20 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: 'DMSans_700Bold', color: Colors.light.text, flex: 1 },
  sectionCount: { fontFamily: 'DMSans_600SemiBold', color: Colors.light.textMuted },
  questCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.card, borderRadius: 14, padding: 12, marginBottom: 8, gap: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  questCardDone: { borderColor: '#10B98130', backgroundColor: '#10B98108' },
  questIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  questContent: { flex: 1 },
  questTitle: { fontFamily: 'DMSans_600SemiBold', color: Colors.light.text, marginBottom: 2 },
  questDesc: { fontFamily: 'DMSans_400Regular', color: Colors.light.textMuted, marginBottom: 4 },
  questRewards: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  questCoinPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#D4AF3712', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  miniCoin: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#D4AF37', alignItems: 'center', justifyContent: 'center' },
  miniCoinText: { fontFamily: 'DMSans_700Bold', fontSize: 8, color: '#fff' },
  questCoinText: { fontFamily: 'DMSans_700Bold', color: '#D4AF37' },
  questFsvText: { fontFamily: 'DMSans_600SemiBold', color: '#0D9488', fontSize: 10 },
  questBadgePill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#8B5CF612', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  questBadgeText: { fontFamily: 'DMSans_500Medium', color: '#8B5CF6' },
  questStatus: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  questStatusDone: { backgroundColor: '#10B981' },
  questStatusPending: { backgroundColor: '#E5E7EB' },
  questStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeItem: { alignItems: 'center', width: 70 },
  badgeCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginBottom: 4 },
  badgeName: { fontFamily: 'DMSans_500Medium', color: Colors.light.text, textAlign: 'center' as const },
});
