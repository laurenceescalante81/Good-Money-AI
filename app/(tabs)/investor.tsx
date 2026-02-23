import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Animated,
  Dimensions, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useFinance, InvestorProfile } from '@/contexts/FinanceContext';
import CoinHeader from '@/components/CoinHeader';

interface QuestionOption {
  value: string;
  label: string;
  score: number;
}

interface Question {
  id: string;
  category: string;
  question: string;
  description?: string;
  options: QuestionOption[];
}

const CATEGORIES = [
  { key: 'goals', label: 'Goals & Timeframe', icon: 'flag-outline' as const, color: '#3B82F6' },
  { key: 'knowledge', label: 'Knowledge & Experience', icon: 'school-outline' as const, color: '#8B5CF6' },
  { key: 'risk', label: 'Risk Tolerance', icon: 'pulse-outline' as const, color: '#EF4444' },
  { key: 'financial', label: 'Financial Situation', icon: 'cash-outline' as const, color: '#10B981' },
  { key: 'behaviour', label: 'Investment Behaviour', icon: 'trending-up-outline' as const, color: '#F59E0B' },
];

const QUESTIONS: Question[] = [
  {
    id: 'q1', category: 'goals',
    question: 'What is the primary purpose of your investments?',
    description: 'Understanding your main goal helps determine the right strategy.',
    options: [
      { value: 'preserve', label: 'Preserve capital and protect against loss', score: 1 },
      { value: 'income', label: 'Generate a regular income stream', score: 2 },
      { value: 'balanced', label: 'Balance between income and growth', score: 3 },
      { value: 'growth', label: 'Grow my wealth over the medium to long term', score: 4 },
      { value: 'max_growth', label: 'Maximise long-term capital growth', score: 5 },
    ],
  },
  {
    id: 'q2', category: 'goals',
    question: 'When do you expect to start drawing on your investments?',
    description: 'Your investment timeframe affects how much risk you can take.',
    options: [
      { value: 'less_1', label: 'Less than 1 year', score: 1 },
      { value: '1_3', label: '1 to 3 years', score: 2 },
      { value: '3_5', label: '3 to 5 years', score: 3 },
      { value: '5_10', label: '5 to 10 years', score: 4 },
      { value: 'more_10', label: 'More than 10 years', score: 5 },
    ],
  },
  {
    id: 'q3', category: 'goals',
    question: 'Once you start drawing on your investments, how long do you expect them to last?',
    options: [
      { value: 'less_2', label: 'Less than 2 years (lump sum withdrawal)', score: 1 },
      { value: '2_5', label: '2 to 5 years', score: 2 },
      { value: '5_10', label: '5 to 10 years', score: 3 },
      { value: '10_20', label: '10 to 20 years', score: 4 },
      { value: 'more_20', label: 'More than 20 years (e.g. retirement income)', score: 5 },
    ],
  },
  {
    id: 'q4', category: 'knowledge',
    question: 'How would you describe your understanding of financial products and markets?',
    options: [
      { value: 'none', label: 'Very limited — I know little about investing', score: 1 },
      { value: 'basic', label: 'Basic — I understand savings accounts and term deposits', score: 2 },
      { value: 'moderate', label: 'Moderate — I understand shares, bonds and managed funds', score: 3 },
      { value: 'good', label: 'Good — I understand asset allocation, diversification and risk', score: 4 },
      { value: 'advanced', label: 'Advanced — I understand derivatives, gearing and alternative assets', score: 5 },
    ],
  },
  {
    id: 'q5', category: 'knowledge',
    question: 'Which types of investments have you personally held?',
    description: 'Select the most complex product you have experience with.',
    options: [
      { value: 'none', label: 'None — only bank accounts', score: 1 },
      { value: 'td', label: 'Term deposits or bonds', score: 2 },
      { value: 'managed', label: 'Managed funds, ETFs or super investment choice', score: 3 },
      { value: 'shares', label: 'Direct shares (ASX or international)', score: 4 },
      { value: 'complex', label: 'Options, futures, margin lending or property trusts', score: 5 },
    ],
  },
  {
    id: 'q6', category: 'knowledge',
    question: 'How many years have you been actively investing (beyond a savings account)?',
    options: [
      { value: 'never', label: 'I have never invested', score: 1 },
      { value: 'less_2', label: 'Less than 2 years', score: 2 },
      { value: '2_5', label: '2 to 5 years', score: 3 },
      { value: '5_10', label: '5 to 10 years', score: 4 },
      { value: 'more_10', label: 'More than 10 years', score: 5 },
    ],
  },
  {
    id: 'q7', category: 'risk',
    question: 'Imagine your portfolio dropped 20% in a single quarter. What would you do?',
    description: 'Market downturns are normal. Your reaction reveals your true risk tolerance.',
    options: [
      { value: 'sell_all', label: 'Sell everything immediately to stop further losses', score: 1 },
      { value: 'sell_some', label: 'Sell some holdings to reduce exposure', score: 2 },
      { value: 'hold', label: 'Hold steady and wait for recovery', score: 3 },
      { value: 'rebalance', label: 'Rebalance back to my target allocation', score: 4 },
      { value: 'buy_more', label: 'Invest more to take advantage of lower prices', score: 5 },
    ],
  },
  {
    id: 'q8', category: 'risk',
    question: 'Which statement best describes your attitude toward investment risk?',
    options: [
      { value: 'no_loss', label: 'I cannot accept any loss of capital', score: 1 },
      { value: 'small_loss', label: 'I can accept small, occasional losses for slightly higher returns', score: 2 },
      { value: 'moderate_loss', label: 'I can accept moderate losses for moderate long-term growth', score: 3 },
      { value: 'significant_loss', label: 'I can accept significant short-term losses for higher long-term growth', score: 4 },
      { value: 'large_loss', label: 'I understand large losses are possible and I am focused on maximum growth', score: 5 },
    ],
  },
  {
    id: 'q9', category: 'risk',
    question: 'In a year, what is the maximum portfolio loss you could tolerate before changing strategy?',
    options: [
      { value: '0', label: '0% — I cannot afford any loss', score: 1 },
      { value: '5', label: 'Up to 5%', score: 2 },
      { value: '15', label: 'Up to 15%', score: 3 },
      { value: '25', label: 'Up to 25%', score: 4 },
      { value: '35', label: 'More than 25% — I accept high volatility', score: 5 },
    ],
  },
  {
    id: 'q10', category: 'risk',
    question: 'How do you feel when the value of your investments fluctuates?',
    options: [
      { value: 'very_uncomfortable', label: 'Very uncomfortable — I check constantly and lose sleep', score: 1 },
      { value: 'uncomfortable', label: 'Uncomfortable — I worry but try not to react', score: 2 },
      { value: 'neutral', label: 'Neutral — I understand it\'s part of investing', score: 3 },
      { value: 'comfortable', label: 'Comfortable — I rarely think about short-term moves', score: 4 },
      { value: 'very_comfortable', label: 'Very comfortable — I see dips as buying opportunities', score: 5 },
    ],
  },
  {
    id: 'q11', category: 'financial',
    question: 'How would you describe your current financial situation?',
    description: 'Your capacity to absorb losses depends on your overall position.',
    options: [
      { value: 'tight', label: 'Living pay-to-pay with no spare savings', score: 1 },
      { value: 'stable', label: 'Stable income but limited savings buffer', score: 2 },
      { value: 'comfortable', label: 'Comfortable with 3-6 months emergency savings', score: 3 },
      { value: 'strong', label: 'Strong — diversified income and significant savings', score: 4 },
      { value: 'wealthy', label: 'Financially independent with multiple income streams', score: 5 },
    ],
  },
  {
    id: 'q12', category: 'financial',
    question: 'What percentage of your total wealth does this investment portfolio represent?',
    options: [
      { value: 'most', label: 'More than 75% — this is nearly everything I have', score: 1 },
      { value: 'majority', label: '50% to 75%', score: 2 },
      { value: 'significant', label: '25% to 50%', score: 3 },
      { value: 'portion', label: '10% to 25%', score: 4 },
      { value: 'small', label: 'Less than 10% — I have substantial other assets', score: 5 },
    ],
  },
  {
    id: 'q13', category: 'financial',
    question: 'How stable and reliable is your current income?',
    options: [
      { value: 'no_income', label: 'No regular income (retired, unemployed)', score: 1 },
      { value: 'variable', label: 'Highly variable (casual, commission, self-employed)', score: 2 },
      { value: 'moderate', label: 'Moderately stable (contract or part-time)', score: 3 },
      { value: 'stable', label: 'Stable (permanent full-time employment)', score: 4 },
      { value: 'very_stable', label: 'Very stable with multiple income sources', score: 5 },
    ],
  },
  {
    id: 'q14', category: 'financial',
    question: 'Do you have significant debts (excluding your home mortgage)?',
    options: [
      { value: 'large', label: 'Yes, large debts that are hard to manage', score: 1 },
      { value: 'moderate', label: 'Moderate debts (car loan, credit cards)', score: 2 },
      { value: 'small', label: 'Small manageable debts', score: 3 },
      { value: 'mortgage_only', label: 'Only a home mortgage', score: 4 },
      { value: 'none', label: 'No debts at all', score: 5 },
    ],
  },
  {
    id: 'q15', category: 'behaviour',
    question: 'Consider two hypothetical portfolios over 1 year. Which do you prefer?',
    description: 'Higher potential returns always come with higher potential losses.',
    options: [
      { value: 'a', label: 'Portfolio A: Returns between +2% and +4%', score: 1 },
      { value: 'b', label: 'Portfolio B: Returns between -3% and +10%', score: 2 },
      { value: 'c', label: 'Portfolio C: Returns between -10% and +18%', score: 3 },
      { value: 'd', label: 'Portfolio D: Returns between -20% and +30%', score: 4 },
      { value: 'e', label: 'Portfolio E: Returns between -35% and +50%', score: 5 },
    ],
  },
  {
    id: 'q16', category: 'behaviour',
    question: 'How important is it that your investment returns beat inflation (currently ~3-4% p.a.)?',
    options: [
      { value: 'not', label: 'Not important — capital preservation is my priority', score: 1 },
      { value: 'somewhat', label: 'Somewhat — I\'d like to keep up with inflation', score: 2 },
      { value: 'important', label: 'Important — I want to grow my real purchasing power', score: 3 },
      { value: 'very', label: 'Very important — I aim to significantly outperform inflation', score: 4 },
      { value: 'critical', label: 'Critical — I want maximum real growth over time', score: 5 },
    ],
  },
  {
    id: 'q17', category: 'behaviour',
    question: 'Which best describes your preferred asset mix?',
    options: [
      { value: 'all_defensive', label: 'Mostly cash and fixed interest (90%+ defensive)', score: 1 },
      { value: 'mostly_defensive', label: '70% defensive (cash/bonds), 30% growth (shares/property)', score: 2 },
      { value: 'balanced', label: '50% defensive, 50% growth', score: 3 },
      { value: 'mostly_growth', label: '30% defensive, 70% growth', score: 4 },
      { value: 'all_growth', label: 'Mostly shares and property (90%+ growth assets)', score: 5 },
    ],
  },
  {
    id: 'q18', category: 'behaviour',
    question: 'During the GFC (2008-09), Australian shares fell ~55%. If your portfolio dropped similarly, how long would you wait for recovery?',
    options: [
      { value: 'immediately', label: 'I would have sold immediately', score: 1 },
      { value: 'months', label: 'I would wait 3-6 months then sell if not recovering', score: 2 },
      { value: 'year', label: 'I would wait 1-2 years', score: 3 },
      { value: 'years', label: 'I would wait 3-5 years for full recovery', score: 4 },
      { value: 'indefinitely', label: 'I would hold indefinitely — markets always recover eventually', score: 5 },
    ],
  },
  {
    id: 'q19', category: 'behaviour',
    question: 'How often do you want to review and potentially adjust your investment portfolio?',
    options: [
      { value: 'daily', label: 'Daily or weekly — I want to be hands-on', score: 5 },
      { value: 'monthly', label: 'Monthly', score: 4 },
      { value: 'quarterly', label: 'Quarterly', score: 3 },
      { value: 'annually', label: 'Annually — set and forget', score: 2 },
      { value: 'never', label: 'Rarely — I prefer a managed approach', score: 1 },
    ],
  },
  {
    id: 'q20', category: 'goals',
    question: 'How important is receiving regular income (dividends/interest) from your investments?',
    options: [
      { value: 'essential', label: 'Essential — I depend on it for living expenses', score: 1 },
      { value: 'very', label: 'Very important — I reinvest some but need regular income', score: 2 },
      { value: 'moderate', label: 'Moderately important — nice to have but not critical', score: 3 },
      { value: 'low', label: 'Low importance — I prefer capital growth', score: 4 },
      { value: 'none', label: 'Not important — I want all returns reinvested for growth', score: 5 },
    ],
  },
];

type ProfileType = 'defensive' | 'conservative' | 'moderate' | 'balanced' | 'growth' | 'high_growth';

const PROFILES: Record<ProfileType, { label: string; color: string; icon: string; range: string; description: string; allocation: { growth: number; defensive: number } }> = {
  defensive: {
    label: 'Defensive', color: '#3B82F6', icon: 'shield-checkmark', range: '20-35',
    description: 'You prioritise stability and capital preservation. Your portfolio should focus heavily on cash and fixed interest with minimal exposure to shares.',
    allocation: { growth: 10, defensive: 90 },
  },
  conservative: {
    label: 'Conservative', color: '#06B6D4', icon: 'umbrella', range: '36-50',
    description: 'You prefer low risk with some potential for modest growth. A portfolio weighted toward bonds and cash with a small shares allocation suits you.',
    allocation: { growth: 30, defensive: 70 },
  },
  moderate: {
    label: 'Moderate', color: '#10B981', icon: 'leaf', range: '51-60',
    description: 'You seek a balance between stability and growth, accepting some short-term volatility for better medium-term returns.',
    allocation: { growth: 50, defensive: 50 },
  },
  balanced: {
    label: 'Balanced', color: '#F59E0B', icon: 'scale', range: '61-72',
    description: 'You are comfortable with moderate risk and understand that higher returns require accepting periods of negative performance.',
    allocation: { growth: 60, defensive: 40 },
  },
  growth: {
    label: 'Growth', color: '#EF4444', icon: 'rocket', range: '73-85',
    description: 'You focus on long-term capital growth and can tolerate significant short-term losses. Your portfolio should be heavily weighted to shares and property.',
    allocation: { growth: 80, defensive: 20 },
  },
  high_growth: {
    label: 'High Growth', color: '#7C3AED', icon: 'flame', range: '86-100',
    description: 'You seek maximum long-term growth and can withstand large short-term losses. Your portfolio should be almost entirely growth assets.',
    allocation: { growth: 95, defensive: 5 },
  },
};

function getProfile(score: number): ProfileType {
  const pct = (score / (QUESTIONS.length * 5)) * 100;
  if (pct <= 35) return 'defensive';
  if (pct <= 50) return 'conservative';
  if (pct <= 60) return 'moderate';
  if (pct <= 72) return 'balanced';
  if (pct <= 85) return 'growth';
  return 'high_growth';
}

export default function InvestorScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const { investorProfile, updateInvestorProfile } = useFinance();
  const { width: screenWidth } = useWindowDimensions();

  const [answers, setAnswers] = useState<Record<string, string>>(investorProfile.answers || {});
  const [currentQ, setCurrentQ] = useState(0);
  const [showResult, setShowResult] = useState(!!investorProfile.profile);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const answeredCount = Object.keys(answers).length;
  const totalQ = QUESTIONS.length;
  const allAnswered = answeredCount === totalQ;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: answeredCount / totalQ,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [answeredCount]);

  const handleAnswer = useCallback((questionId: string, value: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }, []);

  const handleComplete = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    let totalScore = 0;
    QUESTIONS.forEach(q => {
      const selected = answers[q.id];
      const opt = q.options.find(o => o.value === selected);
      if (opt) totalScore += opt.score;
    });
    const profile = getProfile(totalScore);
    const ip: InvestorProfile = {
      answers,
      completedAt: new Date().toISOString(),
      score: totalScore,
      profile,
    };
    updateInvestorProfile(ip);
    setShowResult(true);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [answers, updateInvestorProfile]);

  const handleRetake = useCallback(() => {
    setAnswers({});
    setShowResult(false);
    setActiveCat(null);
    updateInvestorProfile({ answers: {}, completedAt: '', score: 0, profile: '' });
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [updateInvestorProfile]);

  const score = investorProfile.score || 0;
  const profileKey = (investorProfile.profile || 'moderate') as ProfileType;
  const profileData = PROFILES[profileKey] || PROFILES.moderate;

  const topInset = isWeb ? 67 : insets.top;
  const bottomInset = isWeb ? 34 : insets.bottom;

  if (showResult && investorProfile.profile) {
    return (
      <View style={[styles.container, { paddingTop: 0 }]}>
        <CoinHeader title="Investor Profile" subtitle="Results" />
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: bottomInset + 100 }}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[profileData.color, `${profileData.color}CC`, '#0C1B2A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.resultHero}
          >
            <View style={styles.resultIconCircle}>
              <Ionicons name={profileData.icon as any} size={40} color="#fff" />
            </View>
            <Text style={styles.resultTitle}>Your Investor Profile</Text>
            <Text style={styles.resultProfile}>{profileData.label}</Text>
            <Text style={styles.resultScore}>Score: {score} / {totalQ * 5}</Text>
          </LinearGradient>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Summary</Text>
            <View style={styles.card}>
              <Text style={styles.cardText}>{profileData.description}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suggested Asset Allocation</Text>
            <View style={styles.card}>
              <View style={styles.allocBar}>
                <View style={[styles.allocGrowth, { flex: profileData.allocation.growth }]}>
                  <Text style={styles.allocLabel}>{profileData.allocation.growth}%</Text>
                  <Text style={styles.allocSub}>Growth</Text>
                </View>
                <View style={[styles.allocDefensive, { flex: profileData.allocation.defensive }]}>
                  <Text style={styles.allocLabel}>{profileData.allocation.defensive}%</Text>
                  <Text style={styles.allocSub}>Defensive</Text>
                </View>
              </View>
              <View style={styles.allocLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.legendText}>Growth (Shares, Property, Alternatives)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                  <Text style={styles.legendText}>Defensive (Cash, Fixed Interest, Bonds)</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Profiles</Text>
            {(Object.entries(PROFILES) as [ProfileType, typeof profileData][]).map(([key, p]) => {
              const isActive = key === profileKey;
              return (
                <View key={key} style={[styles.profileCard, isActive && { borderColor: p.color, borderWidth: 2 }]}>
                  <View style={[styles.profileDot, { backgroundColor: p.color }]}>
                    <Ionicons name={p.icon as any} size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.profileName}>{p.label}</Text>
                      {isActive && (
                        <View style={[styles.youBadge, { backgroundColor: p.color }]}>
                          <Text style={styles.youBadgeText}>You</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.profileRange}>Score range: {p.range}%</Text>
                    <Text style={styles.profileAlloc}>{p.allocation.growth}% Growth / {p.allocation.defensive}% Defensive</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Answers</Text>
            {CATEGORIES.map(cat => {
              const catQs = QUESTIONS.filter(q => q.category === cat.key);
              return (
                <View key={cat.key} style={styles.answerCat}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Ionicons name={cat.icon as any} size={16} color={cat.color} />
                    <Text style={[styles.answerCatTitle, { color: cat.color }]}>{cat.label}</Text>
                  </View>
                  {catQs.map(q => {
                    const selectedVal = answers[q.id];
                    const selectedOpt = q.options.find(o => o.value === selectedVal);
                    return (
                      <View key={q.id} style={styles.answerRow}>
                        <Text style={styles.answerQ} numberOfLines={2}>{q.question}</Text>
                        <Text style={styles.answerA}>{selectedOpt?.label || 'Not answered'}</Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={styles.retakeBtnText}>Retake Questionnaire</Text>
          </TouchableOpacity>

          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.light.gray400} />
            <Text style={styles.disclaimerText}>
              This is a general guide only and does not constitute personal financial advice. Consult a licensed financial adviser before making investment decisions.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  const catFilter = activeCat
    ? QUESTIONS.filter(q => q.category === activeCat)
    : QUESTIONS;

  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      <CoinHeader title="Investor Profile" />
      <Text style={styles.pageDesc}>Discover your risk profile and ideal investment strategy.</Text>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Investor Profile</Text>
        <Text style={styles.headerSub}>Answer {totalQ} questions to discover your risk profile</Text>
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{answeredCount}/{totalQ}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catBar}
        style={{ flexGrow: 0 }}
      >
        <TouchableOpacity
          style={[styles.catChip, !activeCat && styles.catChipActive]}
          onPress={() => setActiveCat(null)}
        >
          <Text style={[styles.catChipText, !activeCat && styles.catChipTextActive]}>All</Text>
        </TouchableOpacity>
        {CATEGORIES.map(cat => {
          const catQs = QUESTIONS.filter(q => q.category === cat.key);
          const catAnswered = catQs.filter(q => answers[q.id]).length;
          const isActive = activeCat === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.catChip, isActive && { backgroundColor: cat.color }]}
              onPress={() => setActiveCat(cat.key)}
            >
              <Ionicons name={cat.icon as any} size={14} color={isActive ? '#fff' : cat.color} />
              <Text style={[styles.catChipText, isActive && styles.catChipTextActive]}>{cat.label}</Text>
              <View style={[styles.catCount, { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : `${cat.color}20` }]}>
                <Text style={[styles.catCountText, { color: isActive ? '#fff' : cat.color }]}>{catAnswered}/{catQs.length}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomInset + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {catFilter.map((q, idx) => {
          const catMeta = CATEGORIES.find(c => c.key === q.category);
          const selected = answers[q.id];
          const globalIdx = QUESTIONS.indexOf(q);
          return (
            <View key={q.id} style={styles.qCard}>
              <View style={styles.qHeader}>
                <View style={[styles.qNum, { backgroundColor: `${catMeta?.color || '#999'}20` }]}>
                  <Text style={[styles.qNumText, { color: catMeta?.color }]}>{globalIdx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.qText}>{q.question}</Text>
                  {q.description && <Text style={styles.qDesc}>{q.description}</Text>}
                </View>
                {selected && (
                  <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                )}
              </View>
              <View style={styles.optionsList}>
                {q.options.map(opt => {
                  const isSelected = selected === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.optionBtn, isSelected && { backgroundColor: `${catMeta?.color || '#0D9488'}12`, borderColor: catMeta?.color || '#0D9488' }]}
                      activeOpacity={0.7}
                      onPress={() => handleAnswer(q.id, opt.value)}
                    >
                      <View style={[styles.optionRadio, isSelected && { borderColor: catMeta?.color || '#0D9488' }]}>
                        {isSelected && <View style={[styles.optionRadioFill, { backgroundColor: catMeta?.color || '#0D9488' }]} />}
                      </View>
                      <Text style={[styles.optionText, isSelected && { color: '#111827', fontWeight: '600' }]} numberOfLines={2}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {allAnswered && (
          <TouchableOpacity style={styles.submitBtn} onPress={handleComplete} activeOpacity={0.8}>
            <LinearGradient colors={['#0D9488', '#0F766E']} style={styles.submitGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="checkmark-done" size={20} color="#fff" />
              <Text style={styles.submitText}>View My Investor Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {!allAnswered && (
          <View style={styles.incompleteHint}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.light.gray400} />
            <Text style={styles.incompleteText}>
              Answer all {totalQ} questions to see your investor risk profile. {totalQ - answeredCount} remaining.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  pageDesc: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.light.textSecondary, paddingHorizontal: 20, marginBottom: 4 },
  scroll: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: 'DMSans_700Bold', fontSize: 26, color: Colors.light.navy },
  headerSub: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.light.gray500, marginTop: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.light.gray200 },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: Colors.light.tint },
  progressText: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: Colors.light.tint },
  catBar: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.light.white, borderWidth: 1, borderColor: Colors.light.gray200,
  },
  catChipActive: { backgroundColor: Colors.light.tint, borderColor: Colors.light.tint },
  catChipText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.light.gray600 },
  catChipTextActive: { color: '#fff' },
  catCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  catCountText: { fontFamily: 'DMSans_600SemiBold', fontSize: 10 },
  qCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: Colors.light.white, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.light.gray200,
  },
  qHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  qNum: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  qNumText: { fontFamily: 'DMSans_700Bold', fontSize: 14 },
  qText: { fontFamily: 'DMSans_600SemiBold', fontSize: 15, color: '#111827', lineHeight: 21 },
  qDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.light.gray500, marginTop: 4, lineHeight: 17 },
  optionsList: { gap: 8 },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.light.gray200,
    backgroundColor: Colors.light.gray50,
  },
  optionRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.light.gray300,
    alignItems: 'center', justifyContent: 'center',
  },
  optionRadioFill: { width: 10, height: 10, borderRadius: 5 },
  optionText: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.light.gray600, lineHeight: 20 },
  submitBtn: { marginHorizontal: 16, marginTop: 8, marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  submitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  submitText: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: '#fff' },
  incompleteHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 8, padding: 14,
    backgroundColor: Colors.light.gray100, borderRadius: 12,
  },
  incompleteText: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.light.gray500 },
  resultHero: {
    alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24,
    marginHorizontal: 16, marginTop: 8, borderRadius: 24,
  },
  resultIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  resultTitle: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  resultProfile: { fontFamily: 'DMSans_700Bold', fontSize: 28, color: '#fff', marginBottom: 8 },
  resultScore: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.light.navy, marginBottom: 12 },
  card: { backgroundColor: Colors.light.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.light.gray200 },
  cardText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.light.gray600, lineHeight: 22 },
  allocBar: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', height: 56, marginBottom: 16 },
  allocGrowth: { backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  allocDefensive: { backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  allocLabel: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: '#fff' },
  allocSub: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  allocLegend: { gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.light.gray500 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.light.white, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.light.gray200,
  },
  profileDot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  profileName: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#111827' },
  profileRange: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.light.gray500, marginTop: 2 },
  profileAlloc: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.light.gray400, marginTop: 2 },
  youBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  youBadgeText: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: '#fff' },
  answerCat: { marginBottom: 20 },
  answerCatTitle: { fontFamily: 'DMSans_700Bold', fontSize: 14 },
  answerRow: {
    backgroundColor: Colors.light.white, borderRadius: 10, padding: 12,
    marginBottom: 6, borderWidth: 1, borderColor: Colors.light.gray100,
  },
  answerQ: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#111827', marginBottom: 4 },
  answerA: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.light.tint },
  retakeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 24, paddingVertical: 16,
    backgroundColor: Colors.light.navy, borderRadius: 14,
  },
  retakeBtnText: { fontFamily: 'DMSans_600SemiBold', fontSize: 15, color: '#fff' },
  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 16, marginTop: 20, marginBottom: 20,
    padding: 14, backgroundColor: Colors.light.gray100, borderRadius: 12,
  },
  disclaimerText: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.light.gray400, lineHeight: 16 },
});
