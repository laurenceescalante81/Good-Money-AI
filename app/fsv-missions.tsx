import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useFSV, FSVQuest, BadgeTierLevel } from '@/contexts/FSVContext';
import { useResponsive } from '@/hooks/useResponsive';

const TIER_COLORS: Record<BadgeTierLevel, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#D4AF37',
  platinum: '#B0C4DE',
  sovereign: '#7B2D8E',
};

const TIER_LABELS: Record<BadgeTierLevel, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  sovereign: 'Sovereign',
};

function QuestCard({ quest, fs, is }: { quest: FSVQuest; fs: (n: number) => number; is: (n: number) => number }) {
  return (
    <View style={[st.questCard, quest.completed && st.questCardDone]}>
      <View style={[st.questIcon, { backgroundColor: quest.iconColor + '18' }]}>
        <Ionicons name={quest.icon as any} size={is(20)} color={quest.iconColor} />
      </View>
      <View style={st.questContent}>
        <Text style={[st.questTitle, { fontSize: fs(13) }]} numberOfLines={1}>{quest.title}</Text>
        <Text style={[st.questDesc, { fontSize: fs(11) }]} numberOfLines={2}>{quest.description}</Text>
        <View style={st.questRewards}>
          <View style={st.questCoinPill}>
            <View style={st.miniCoin}><Text style={st.miniCoinText}>G</Text></View>
            <Text style={[st.questCoinText, { fontSize: fs(11) }]}>+{quest.coinReward}</Text>
          </View>
          {quest.fsvWeight > 0 && (
            <Text style={[st.questFsvText, { fontSize: fs(10) }]}>+{quest.fsvWeight} Score</Text>
          )}
          {quest.badgeTitle && (
            <View style={st.questBadgePill}>
              <Ionicons name="ribbon-outline" size={is(10)} color="#8B5CF6" />
              <Text style={[st.questBadgeText, { fontSize: fs(9) }]}>{quest.badgeTitle}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={[st.questStatus, quest.completed ? st.questStatusDone : st.questStatusPending]}>
        {quest.completed ? (
          <Ionicons name="checkmark" size={is(14)} color="#fff" />
        ) : (
          <View style={st.questStatusDot} />
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
    <View style={st.section}>
      <View style={st.sectionHeader}>
        <View style={[st.sectionIconWrap, { backgroundColor: iconColor + '15' }]}>
          <Ionicons name={icon as any} size={is(16)} color={iconColor} />
        </View>
        <Text style={[st.sectionTitle, { fontSize: fs(14) }]}>{title}</Text>
        <Text style={[st.sectionCount, { fontSize: fs(11) }]}>{completed}/{quests.length}</Text>
      </View>
      {quests.map(q => <QuestCard key={q.id} quest={q} fs={fs} is={is} />)}
    </View>
  );
}

export default function GoodScoreScreen() {
  const { fs, is } = useAccessibility();
  const { isMobile, contentWidth, sidePadding } = useResponsive();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 16 : insets.top;
  const {
    fsvScore, onboardingQuests, liquidityQuests, debtQuests, riskQuests,
    diversificationQuests, retentionQuests, factFindQuests,
    fsvBadges, checkAndCompleteQuests,
  } = useFSV();

  useEffect(() => { checkAndCompleteQuests(); }, []);

  const totalBadges = fsvBadges.length;
  const unlockedBadges = fsvBadges.filter(b => b.unlocked).length;

  const scoreColor = fsvScore < 30 ? '#EF4444' : fsvScore < 60 ? '#F59E0B' : '#10B981';
  const scoreLabel = fsvScore === 0 ? 'Not started' : fsvScore < 20 ? 'Just beginning' : fsvScore < 40 ? 'Building foundations' : fsvScore < 60 ? 'Getting stronger' : fsvScore < 80 ? 'Well structured' : 'Financially unshakeable';

  const tierLevel: BadgeTierLevel = fsvScore < 20 ? 'bronze' : fsvScore < 40 ? 'silver' : fsvScore < 60 ? 'gold' : fsvScore < 80 ? 'platinum' : 'sovereign';

  return (
    <View style={st.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: isMobile ? 100 : 40 }}>
        <View style={[st.topBar, { paddingTop: topInset + 10 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={st.backBtn}>
            <Ionicons name="chevron-back" size={is(22)} color={Colors.light.text} />
          </Pressable>
          <Text style={[st.topTitle, { fontSize: fs(17) }]}>Good Score</Text>
          <View style={{ width: 34 }} />
        </View>

        <View style={[st.body, { maxWidth: contentWidth, alignSelf: 'center', width: '100%', paddingHorizontal: sidePadding }]}>
          <LinearGradient colors={['#0F172A', '#1E293B']} style={st.heroCard}>
            <View style={st.heroTop}>
              <View>
                <Text style={[st.heroLabel, { fontSize: fs(11) }]}>YOUR GOOD SCORE</Text>
                <View style={st.heroScoreRow}>
                  <Text style={[st.heroScore, { fontSize: fs(48), color: scoreColor }]}>{Math.round(fsvScore)}</Text>
                  <Text style={[st.heroMax, { fontSize: fs(18) }]}>/ 100</Text>
                </View>
                <Text style={[st.heroStatus, { fontSize: fs(12), color: scoreColor }]}>{scoreLabel}</Text>
              </View>
              <View style={st.heroRightCol}>
                <View style={[st.tierBadge, { borderColor: TIER_COLORS[tierLevel] }]}>
                  <Ionicons name="diamond" size={is(16)} color={TIER_COLORS[tierLevel]} />
                  <Text style={[st.tierText, { fontSize: fs(10), color: TIER_COLORS[tierLevel] }]}>{TIER_LABELS[tierLevel]}</Text>
                </View>
                <View style={st.heroBadgeCount}>
                  <Ionicons name="ribbon" size={is(16)} color="#D4AF37" />
                  <Text style={[st.heroBadgeNum, { fontSize: fs(14) }]}>{unlockedBadges}</Text>
                  <Text style={[st.heroBadgeMax, { fontSize: fs(10) }]}>/{totalBadges}</Text>
                </View>
              </View>
            </View>
            <View style={st.heroBarTrack}>
              <LinearGradient
                colors={fsvScore < 30 ? ['#EF4444', '#F97316'] : fsvScore < 60 ? ['#F59E0B', '#EAB308'] : ['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[st.heroBarFill, { width: `${Math.max(fsvScore, 1)}%` as any }]}
              />
            </View>
            <View style={st.tierScaleRow}>
              {(['bronze', 'silver', 'gold', 'platinum', 'sovereign'] as BadgeTierLevel[]).map(t => (
                <View key={t} style={[st.tierScaleItem, tierLevel === t && st.tierScaleActive]}>
                  <View style={[st.tierScaleDot, { backgroundColor: TIER_COLORS[t] }, tierLevel === t && { width: 10, height: 10, borderRadius: 5 }]} />
                  <Text style={[st.tierScaleLabel, { fontSize: fs(8), color: tierLevel === t ? TIER_COLORS[t] : 'rgba(255,255,255,0.25)' }]}>{TIER_LABELS[t]}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          <View style={st.aboutCard}>
            <Text style={[st.aboutTitle, { fontSize: fs(16) }]}>Your Good Score</Text>
            <Text style={[st.aboutText, { fontSize: fs(13) }]}>
              Your Good Score is your financial power rating — from 0 to 100.
            </Text>
            <Text style={[st.aboutText, { fontSize: fs(13) }]}>
              Behind the scenes, it's calculated using Financial Stability Value (FSV) — a measure of how strong and resilient your financial foundations really are.
            </Text>
            <Text style={[st.aboutSubtitle, { fontSize: fs(13) }]}>It reflects:</Text>
            <View style={st.aboutList}>
              {['Savings strength', 'Debt pressure', 'Insurance protection', 'Asset balance', 'Financial consistency'].map(item => (
                <View key={item} style={st.aboutItem}>
                  <View style={st.aboutDot} />
                  <Text style={[st.aboutItemText, { fontSize: fs(13) }]}>{item}</Text>
                </View>
              ))}
            </View>
            <Text style={[st.aboutHighlight, { fontSize: fs(13) }]}>This isn't a credit score. It doesn't judge your past.</Text>
            <Text style={[st.aboutHighlight, { fontSize: fs(13) }]}>It shows how stable your future is.</Text>
            <Text style={[st.aboutText, { fontSize: fs(13), marginTop: 10 }]}>
              Complete missions. Strengthen your structure.{'\n'}Every smart move increases your Good Score.
            </Text>
            <Text style={[st.aboutGoalLine, { fontSize: fs(14) }]}>The goal isn't just wealth.</Text>
            <Text style={[st.aboutGoalLine, { fontSize: fs(14) }]}>It's becoming financially unshakeable.</Text>
            <LinearGradient colors={['#0D9488', '#065F46']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.goodMoneyTagline}>
              <Text style={[st.goodMoneyText, { fontSize: fs(15) }]}>That's Good Money.</Text>
            </LinearGradient>
          </View>

          <View style={st.tierCard}>
            <Text style={[st.tierCardTitle, { fontSize: fs(14) }]}>Badge Tier Levels</Text>
            <View style={st.tierList}>
              {(['bronze', 'silver', 'gold', 'platinum', 'sovereign'] as BadgeTierLevel[]).map((t, i) => {
                const thresholds = [0, 20, 40, 60, 80];
                const reqs = ['Start your journey', 'Score 20+', 'Score 40+', 'Score 60+', '6+ month buffer, low debt, <10% insurance gap, diversified'];
                return (
                  <View key={t} style={[st.tierRow, tierLevel === t && { backgroundColor: TIER_COLORS[t] + '12', borderColor: TIER_COLORS[t] + '40' }]}>
                    <View style={[st.tierRowDot, { backgroundColor: TIER_COLORS[t] }]} />
                    <View style={st.tierRowContent}>
                      <Text style={[st.tierRowName, { fontSize: fs(12), color: TIER_COLORS[t] }]}>{TIER_LABELS[t]}</Text>
                      <Text style={[st.tierRowReq, { fontSize: fs(10) }]}>{reqs[i]}</Text>
                    </View>
                    {tierLevel === t && <Ionicons name="checkmark-circle" size={is(16)} color={TIER_COLORS[t]} />}
                  </View>
                );
              })}
            </View>
          </View>

          <QuestSection title="Fact Find Missions" icon="document-text-outline" iconColor="#3B82F6" quests={factFindQuests} fs={fs} is={is} />
          <QuestSection title="Liquidity" icon="water-outline" iconColor="#06B6D4" quests={liquidityQuests} fs={fs} is={is} />
          <QuestSection title="Debt" icon="trending-down-outline" iconColor="#EF4444" quests={debtQuests} fs={fs} is={is} />
          <QuestSection title="Risk & Protection" icon="shield-checkmark-outline" iconColor="#F59E0B" quests={riskQuests} fs={fs} is={is} />
          <QuestSection title="Diversification" icon="pie-chart-outline" iconColor="#8B5CF6" quests={diversificationQuests} fs={fs} is={is} />
          <QuestSection title="Retention" icon="refresh-outline" iconColor="#06B6D4" quests={retentionQuests} fs={fs} is={is} />

          {unlockedBadges > 0 && (
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <View style={[st.sectionIconWrap, { backgroundColor: '#D4AF3715' }]}>
                  <Ionicons name="ribbon" size={is(16)} color="#D4AF37" />
                </View>
                <Text style={[st.sectionTitle, { fontSize: fs(14) }]}>Earned Badges</Text>
                <Text style={[st.sectionCount, { fontSize: fs(11) }]}>{unlockedBadges}/{totalBadges}</Text>
              </View>
              <View style={st.badgeGrid}>
                {fsvBadges.filter(b => b.unlocked).map(b => (
                  <View key={b.id} style={st.badgeItem}>
                    <View style={[st.badgeCircle, { backgroundColor: (b.tier ? TIER_COLORS[b.tier] : b.color) + '20', borderColor: b.tier ? TIER_COLORS[b.tier] : b.color }]}>
                      <Ionicons name={b.icon as any} size={is(18)} color={b.tier ? TIER_COLORS[b.tier] : b.color} />
                    </View>
                    <Text style={[st.badgeName, { fontSize: fs(10) }]} numberOfLines={2}>{b.title}</Text>
                    {b.tier && (
                      <Text style={[st.badgeTier, { fontSize: fs(8), color: TIER_COLORS[b.tier] }]}>{TIER_LABELS[b.tier]}</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={st.rulesCard}>
            <Text style={[st.rulesTitle, { fontSize: fs(13) }]}>How Rewards Work</Text>
            <View style={st.ruleRow}>
              <View style={[st.ruleIcon, { backgroundColor: '#D4AF3715' }]}>
                <View style={st.miniCoin}><Text style={st.miniCoinText}>G</Text></View>
              </View>
              <View style={st.ruleContent}>
                <Text style={[st.ruleName, { fontSize: fs(12) }]}>Good Coins</Text>
                <Text style={[st.ruleDesc, { fontSize: fs(10) }]}>Engagement currency — earned through actions and daily use</Text>
              </View>
            </View>
            <View style={st.ruleRow}>
              <View style={[st.ruleIcon, { backgroundColor: '#10B98115' }]}>
                <Ionicons name="logo-usd" size={is(14)} color="#10B981" />
              </View>
              <View style={st.ruleContent}>
                <Text style={[st.ruleName, { fontSize: fs(12) }]}>Stablecoin</Text>
                <Text style={[st.ruleDesc, { fontSize: fs(10) }]}>Only for verified structural improvements and major milestones</Text>
              </View>
            </View>
            <View style={st.ruleRow}>
              <View style={[st.ruleIcon, { backgroundColor: '#0D948815' }]}>
                <Ionicons name="shield-checkmark" size={is(14)} color="#0D9488" />
              </View>
              <View style={st.ruleContent}>
                <Text style={[st.ruleName, { fontSize: fs(12) }]}>Good Score (FSV)</Text>
                <Text style={[st.ruleDesc, { fontSize: fs(10) }]}>Your primary prestige metric — capped monthly to prevent gaming</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
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
  heroRightCol: { alignItems: 'flex-end', gap: 8 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  tierText: { fontFamily: 'DMSans_700Bold', letterSpacing: 0.5 },
  heroBadgeCount: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(212,175,55,0.1)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  heroBadgeNum: { fontFamily: 'DMSans_700Bold', color: '#D4AF37' },
  heroBadgeMax: { fontFamily: 'DMSans_400Regular', color: 'rgba(212,175,55,0.5)' },
  heroBarTrack: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' as const },
  heroBarFill: { height: 10, borderRadius: 5 },
  tierScaleRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 4 },
  tierScaleItem: { alignItems: 'center', gap: 3 },
  tierScaleActive: {},
  tierScaleDot: { width: 6, height: 6, borderRadius: 3 },
  tierScaleLabel: { fontFamily: 'DMSans_500Medium' },
  aboutCard: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  aboutTitle: { fontFamily: 'DMSans_700Bold', color: Colors.light.text, marginBottom: 12 },
  aboutSubtitle: { fontFamily: 'DMSans_600SemiBold', color: Colors.light.text, marginTop: 8, marginBottom: 4 },
  aboutText: { fontFamily: 'DMSans_400Regular', color: Colors.light.textMuted, lineHeight: 22, marginBottom: 6 },
  aboutList: { gap: 6, marginVertical: 8 },
  aboutItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aboutDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0D9488' },
  aboutItemText: { fontFamily: 'DMSans_500Medium', color: Colors.light.text },
  aboutHighlight: { fontFamily: 'DMSans_600SemiBold', color: '#0D9488', lineHeight: 22, marginTop: 6 },
  aboutGoalLine: { fontFamily: 'DMSans_700Bold', color: Colors.light.text, marginTop: 8, lineHeight: 22 },
  goodMoneyTagline: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, marginTop: 14, alignItems: 'center' },
  goodMoneyText: { fontFamily: 'DMSans_700Bold', color: '#fff', letterSpacing: 0.5 },
  tierCard: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  tierCardTitle: { fontFamily: 'DMSans_700Bold', color: Colors.light.text, marginBottom: 12 },
  tierList: { gap: 6 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  tierRowDot: { width: 10, height: 10, borderRadius: 5 },
  tierRowContent: { flex: 1 },
  tierRowName: { fontFamily: 'DMSans_700Bold' },
  tierRowReq: { fontFamily: 'DMSans_400Regular', color: Colors.light.textMuted, marginTop: 1 },
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
  badgeTier: { fontFamily: 'DMSans_600SemiBold', marginTop: 1 },
  rulesCard: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  rulesTitle: { fontFamily: 'DMSans_700Bold', color: Colors.light.text, marginBottom: 12 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  ruleIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  ruleContent: { flex: 1 },
  ruleName: { fontFamily: 'DMSans_600SemiBold', color: Colors.light.text },
  ruleDesc: { fontFamily: 'DMSans_400Regular', color: Colors.light.textMuted, marginTop: 1 },
});
