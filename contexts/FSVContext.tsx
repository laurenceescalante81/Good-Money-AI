import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFinance } from '@/contexts/FinanceContext';
import { useRewards } from '@/contexts/RewardsContext';

export type BadgeTierLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'sovereign';

export interface FSVQuest {
  id: string;
  title: string;
  description: string;
  category: 'onboarding' | 'liquidity' | 'debt' | 'risk' | 'diversification' | 'retention' | 'factfind';
  coinReward: number;
  fsvWeight: number;
  badgeId?: string;
  badgeTitle?: string;
  completed: boolean;
  icon: string;
  iconColor: string;
}

export interface FSVBadge {
  id: string;
  title: string;
  icon: string;
  color: string;
  unlocked: boolean;
  unlockedAt?: string;
  tier?: BadgeTierLevel;
}

interface FSVState {
  fsvScore: number;
  completedQuestIds: string[];
  unlockedBadgeIds: string[];
  provisionalBonus: number;
  monthlyScoreGains: number;
  lastScoreMonth: string;
}

interface FSVContextValue {
  fsvScore: number;
  completedQuestIds: string[];
  onboardingQuests: FSVQuest[];
  liquidityQuests: FSVQuest[];
  debtQuests: FSVQuest[];
  riskQuests: FSVQuest[];
  diversificationQuests: FSVQuest[];
  retentionQuests: FSVQuest[];
  factFindQuests: FSVQuest[];
  allQuests: FSVQuest[];
  checkAndCompleteQuests: () => void;
  onboardingProgress: { completed: number; total: number };
  fsvBadges: FSVBadge[];
}

const FSVContext = createContext<FSVContextValue | null>(null);

const STORAGE_KEY = '@gm_fsv';

const DEFAULT_STATE: FSVState = {
  fsvScore: 0,
  completedQuestIds: [],
  unlockedBadgeIds: [],
  provisionalBonus: 0,
  monthlyScoreGains: 0,
  lastScoreMonth: '',
};

interface QuestDef {
  id: string;
  title: string;
  description: string;
  category: 'onboarding' | 'liquidity' | 'debt' | 'risk' | 'diversification' | 'retention' | 'factfind';
  coinReward: number;
  fsvWeight: number;
  badgeId?: string;
  badgeTitle?: string;
  icon: string;
  iconColor: string;
}

const ONBOARDING_QUESTS: QuestDef[] = [
  { id: 'profile_complete', title: 'Profile Complete', description: 'Fill in your personal details, income, dependents, and employment status', category: 'onboarding', coinReward: 50, fsvWeight: 5, badgeId: 'fsv_known_entity', badgeTitle: 'Known Entity', icon: 'person-outline', iconColor: '#3B82F6' },
  { id: 'cashflow_complete', title: 'Cashflow Map Complete', description: 'Log at least 3 expense transactions to map your cashflow', category: 'onboarding', coinReward: 75, fsvWeight: 5, badgeId: 'fsv_cashflow_mapped', badgeTitle: 'Cashflow Mapped', icon: 'swap-horizontal-outline', iconColor: '#10B981' },
  { id: 'assets_liabilities_complete', title: 'Assets & Liabilities Complete', description: 'Set up your mortgage or super and record at least one asset', category: 'onboarding', coinReward: 100, fsvWeight: 10, badgeId: 'fsv_balance_sheet', badgeTitle: 'Balance Sheet Built', icon: 'stats-chart-outline', iconColor: '#F59E0B' },
  { id: 'risk_protection_complete', title: 'Risk & Protection Complete', description: 'Add an insurance policy and indicate your smoker status', category: 'onboarding', coinReward: 150, fsvWeight: 10, badgeId: 'fsv_risk_exposed', badgeTitle: 'Risk Exposed', icon: 'shield-outline', iconColor: '#EF4444' },
  { id: 'goals_investor_complete', title: 'Goals & Investor Profile Complete', description: 'Complete your investor profile or risk tolerance and set at least one goal', category: 'onboarding', coinReward: 100, fsvWeight: 10, badgeId: 'fsv_strategic_planner', badgeTitle: 'Strategic Planner', icon: 'flag-outline', iconColor: '#8B5CF6' },
];

const LIQUIDITY_QUESTS: QuestDef[] = [
  { id: 'buffer_1week', title: 'Build 1-Week Buffer', description: 'Save enough to cover 1 week of expenses', category: 'liquidity', coinReward: 25, fsvWeight: 5, badgeId: 'fsv_buffer_beginner', badgeTitle: 'Buffer Beginner', icon: 'water-outline', iconColor: '#0EA5E9' },
  { id: 'buffer_1month', title: 'Build 1-Month Buffer', description: 'Save enough to cover 1 month of expenses', category: 'liquidity', coinReward: 50, fsvWeight: 5, icon: 'water-outline', iconColor: '#0EA5E9' },
  { id: 'buffer_3month', title: 'Build 3-Month Buffer', description: 'Save enough to cover 3 months of expenses', category: 'liquidity', coinReward: 100, fsvWeight: 5, badgeId: 'fsv_liquidity_builder', badgeTitle: 'Liquidity Builder', icon: 'water-outline', iconColor: '#0EA5E9' },
  { id: 'buffer_6month', title: 'Build 6-Month Buffer', description: 'Save enough to cover 6 months of expenses', category: 'liquidity', coinReward: 200, fsvWeight: 5, badgeId: 'fsv_resilience_core', badgeTitle: 'Resilience Core', icon: 'water-outline', iconColor: '#0EA5E9' },
];

const DEBT_QUESTS: QuestDef[] = [
  { id: 'cc_below_50', title: 'Credit Card Under 50%', description: 'Reduce your credit card utilisation below 50%', category: 'debt', coinReward: 50, fsvWeight: 4, badgeId: 'fsv_debt_tamer', badgeTitle: 'Debt Tamer', icon: 'card-outline', iconColor: '#F97316' },
  { id: 'cc_below_30', title: 'Credit Card Under 30%', description: 'Reduce your credit card utilisation below 30%', category: 'debt', coinReward: 75, fsvWeight: 4, icon: 'card-outline', iconColor: '#F97316' },
  { id: 'no_consumer_debt', title: 'Eliminate Consumer Debt', description: 'Pay off all personal loans, credit cards, and afterpay', category: 'debt', coinReward: 150, fsvWeight: 4, icon: 'checkmark-done-outline', iconColor: '#10B981' },
  { id: 'lvr_below_80', title: 'LVR Below 80%', description: 'Reduce your loan-to-value ratio below 80%', category: 'debt', coinReward: 100, fsvWeight: 4, badgeId: 'fsv_equity_builder', badgeTitle: 'Equity Builder', icon: 'home-outline', iconColor: '#6366F1' },
  { id: 'lvr_below_70', title: 'LVR Below 70%', description: 'Reduce your loan-to-value ratio below 70%', category: 'debt', coinReward: 150, fsvWeight: 4, badgeId: 'fsv_low_leverage', badgeTitle: 'Low-Leverage Household', icon: 'home-outline', iconColor: '#6366F1' },
];

const RISK_QUESTS: QuestDef[] = [
  { id: 'insurance_25', title: 'Close 25% Insurance Gap', description: 'Add at least 1 insurance policy', category: 'risk', coinReward: 75, fsvWeight: 3, badgeId: 'fsv_protected_earner', badgeTitle: 'Protected Earner', icon: 'shield-checkmark-outline', iconColor: '#3B82F6' },
  { id: 'insurance_50', title: 'Close 50% Insurance Gap', description: 'Add at least 3 insurance policies', category: 'risk', coinReward: 100, fsvWeight: 3, icon: 'shield-checkmark-outline', iconColor: '#3B82F6' },
  { id: 'income_protected', title: 'Fully Protect Income', description: 'Add an income protection insurance policy', category: 'risk', coinReward: 150, fsvWeight: 3, badgeId: 'fsv_family_guardian', badgeTitle: 'Family Guardian', icon: 'umbrella-outline', iconColor: '#EC4899' },
  { id: 'estate_planned', title: 'Estate Planning Documented', description: 'Confirm you have a valid will in place', category: 'risk', coinReward: 100, fsvWeight: 3, icon: 'document-text-outline', iconColor: '#7C3AED' },
];

const DIVERSIFICATION_QUESTS: QuestDef[] = [
  { id: 'first_investment', title: 'First Non-Property Investment', description: 'Record shares or managed funds in your asset register', category: 'diversification', coinReward: 75, fsvWeight: 3, badgeId: 'fsv_diversified_investor', badgeTitle: 'Diversified Investor', icon: 'pie-chart-outline', iconColor: '#0D9488' },
  { id: 'super_review', title: 'Super Allocation Review', description: 'Set up your super details including investment option', category: 'diversification', coinReward: 50, fsvWeight: 3, icon: 'trending-up-outline', iconColor: '#6366F1' },
  { id: 'reduce_concentration', title: 'Reduce Concentration Risk', description: 'Hold 2 or more different asset types for better diversification', category: 'diversification', coinReward: 100, fsvWeight: 2, badgeId: 'fsv_balanced_strategist', badgeTitle: 'Balanced Strategist', icon: 'apps-outline', iconColor: '#D97706' },
];

const RETENTION_QUESTS: QuestDef[] = [
  { id: 'weekly_stability', title: 'Weekly Stability Check', description: 'Open the app and review your finances each week', category: 'retention', coinReward: 15, fsvWeight: 0, icon: 'calendar-outline', iconColor: '#06B6D4' },
  { id: 'monthly_review', title: 'Monthly Good Score Review', description: 'Check your Good Score progress monthly', category: 'retention', coinReward: 25, fsvWeight: 0, icon: 'analytics-outline', iconColor: '#8B5CF6' },
  { id: 'mortgage_rate_recheck', title: 'Mortgage Rate Recheck', description: 'Review your mortgage rate against current market', category: 'retention', coinReward: 20, fsvWeight: 0, icon: 'home-outline', iconColor: '#3B82F6' },
  { id: 'insurance_review_confirm', title: 'Insurance Review Confirmation', description: 'Confirm your insurance policies are up to date', category: 'retention', coinReward: 20, fsvWeight: 0, icon: 'shield-checkmark-outline', iconColor: '#F59E0B' },
];

const FACT_FIND_QUESTS: QuestDef[] = [
  { id: 'ff_profile', title: 'Complete Profile', description: 'Fill in your personal details in the Fact Find', category: 'factfind', coinReward: 50, fsvWeight: 3, badgeId: 'fsv_ff_known_entity', badgeTitle: 'Known Entity', icon: 'person-circle-outline', iconColor: '#3B82F6' },
  { id: 'ff_expenses', title: 'Complete Expense Breakdown', description: 'Map all your regular expenses in the Fact Find', category: 'factfind', coinReward: 75, fsvWeight: 4, badgeId: 'fsv_ff_cashflow_mapped', badgeTitle: 'Cashflow Mapped', icon: 'cash-outline', iconColor: '#10B981' },
  { id: 'ff_assets_debts', title: 'Add All Assets & Debts', description: 'Complete the assets and liabilities sections', category: 'factfind', coinReward: 100, fsvWeight: 5, badgeId: 'fsv_ff_balance_sheet', badgeTitle: 'Balance Sheet Built', icon: 'stats-chart-outline', iconColor: '#F59E0B' },
  { id: 'ff_insurance_health', title: 'Add Insurance & Health', description: 'Complete insurance and health sections in Fact Find', category: 'factfind', coinReward: 150, fsvWeight: 5, badgeId: 'fsv_ff_risk_exposed', badgeTitle: 'Risk Exposed', icon: 'medkit-outline', iconColor: '#EF4444' },
  { id: 'ff_goals_risk', title: 'Complete Goals & Risk Profile', description: 'Set your financial goals and risk tolerance', category: 'factfind', coinReward: 100, fsvWeight: 5, badgeId: 'fsv_ff_strategic_planner', badgeTitle: 'Strategic Planner', icon: 'flag-outline', iconColor: '#8B5CF6' },
];

const ALL_QUEST_DEFS: QuestDef[] = [
  ...ONBOARDING_QUESTS,
  ...LIQUIDITY_QUESTS,
  ...DEBT_QUESTS,
  ...RISK_QUESTS,
  ...DIVERSIFICATION_QUESTS,
  ...RETENTION_QUESTS,
  ...FACT_FIND_QUESTS,
];

const ALL_BADGE_DEFS = ALL_QUEST_DEFS
  .filter(q => q.badgeId && q.badgeTitle)
  .map(q => ({
    id: q.badgeId!,
    title: q.badgeTitle!,
    icon: q.icon,
    color: q.iconColor,
  }));

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function FSVProvider({ children }: { children: ReactNode }) {
  const finance = useFinance();
  const { addPoints } = useRewards();
  const [state, setState] = useState<FSVState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (data) setState(JSON.parse(data));
      } catch (e) { console.error(e); }
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback(async (next: FSVState) => {
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) { console.error(e); }
  }, []);

  const updateState = useCallback((updater: (prev: FSVState) => FSVState) => {
    setState(prev => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, [persist]);

  const isQuestMet = useCallback((questId: string): boolean => {
    const { personalDetails, transactions, mortgage, superDetails, insurancePolicies, goals, investorProfile } = finance;
    const pd = personalDetails;
    const assets = pd.assets;
    const liabilities = pd.liabilities;

    switch (questId) {
      case 'profile_complete':
        return pd.firstName !== '' && pd.lastName !== '' && pd.dob !== '' && pd.employment.baseSalary !== '' && pd.employment.status !== '';

      case 'cashflow_complete':
        return transactions.filter(t => t.type === 'expense').length >= 3;

      case 'assets_liabilities_complete': {
        const hasMortgageOrSuper = mortgage !== null || superDetails !== null;
        const hasAssetField = Object.entries(assets).some(([k, v]) => k !== 'otherAssetsDescription' && k !== 'investmentPropertyAddress' && v !== '' && v !== '0');
        return hasMortgageOrSuper && hasAssetField;
      }

      case 'risk_protection_complete':
        return insurancePolicies.length >= 1 && pd.health.smoker !== '';

      case 'goals_investor_complete': {
        const hasProfile = investorProfile.completedAt !== '' || pd.riskProfile.riskTolerance !== '';
        return hasProfile && goals.length >= 1;
      }

      case 'buffer_1week': {
        const monthlyExpenses = finance.getTotalExpenses();
        const weeklyExpenses = monthlyExpenses / 4;
        const savings = parseFloat(assets.termDepositsValue || '0') + parseFloat(assets.managedFundsValue || '0');
        return weeklyExpenses > 0 && savings >= weeklyExpenses;
      }

      case 'buffer_1month': {
        const monthlyExp = finance.getTotalExpenses();
        const sav = parseFloat(assets.termDepositsValue || '0') + parseFloat(assets.managedFundsValue || '0');
        return monthlyExp > 0 && sav >= monthlyExp;
      }

      case 'buffer_3month': {
        const monthlyExp3 = finance.getTotalExpenses();
        const sav3 = parseFloat(assets.termDepositsValue || '0') + parseFloat(assets.managedFundsValue || '0');
        return monthlyExp3 > 0 && sav3 >= monthlyExp3 * 3;
      }

      case 'buffer_6month': {
        const monthlyExp6 = finance.getTotalExpenses();
        const sav6 = parseFloat(assets.termDepositsValue || '0') + parseFloat(assets.managedFundsValue || '0');
        return monthlyExp6 > 0 && sav6 >= monthlyExp6 * 6;
      }

      case 'cc_below_50': {
        const bal = parseFloat(liabilities.creditCardBalance || '0');
        const lim = parseFloat(liabilities.creditCardLimit || '0');
        return lim > 0 && (bal / lim) < 0.5;
      }

      case 'cc_below_30': {
        const bal30 = parseFloat(liabilities.creditCardBalance || '0');
        const lim30 = parseFloat(liabilities.creditCardLimit || '0');
        return lim30 > 0 && (bal30 / lim30) < 0.3;
      }

      case 'no_consumer_debt': {
        const plBal = parseFloat(liabilities.personalLoanBalance || '0');
        const ccBal = parseFloat(liabilities.creditCardBalance || '0');
        const apBal = parseFloat(liabilities.afterpayBalance || '0');
        return plBal === 0 && ccBal === 0 && apBal === 0;
      }

      case 'lvr_below_80': {
        if (!mortgage || mortgage.propertyValue <= 0) return false;
        return (mortgage.loanAmount / mortgage.propertyValue) < 0.8;
      }

      case 'lvr_below_70': {
        if (!mortgage || mortgage.propertyValue <= 0) return false;
        return (mortgage.loanAmount / mortgage.propertyValue) < 0.7;
      }

      case 'insurance_25':
        return insurancePolicies.length >= 1;

      case 'insurance_50':
        return insurancePolicies.length >= 3;

      case 'income_protected':
        return insurancePolicies.some(p => p.type === 'income_protection');

      case 'estate_planned':
        return pd.estatePlanning.hasWill === 'yes';

      case 'first_investment': {
        const shares = parseFloat(assets.sharePortfolioValue || '0');
        const managed = parseFloat(assets.managedFundsValue || '0');
        return shares > 0 || managed > 0;
      }

      case 'super_review':
        return superDetails !== null && superDetails.investmentOption !== '';

      case 'reduce_concentration': {
        let assetTypeCount = 0;
        if (parseFloat(assets.homeValue || '0') > 0 || parseFloat(assets.investmentPropertyValue || '0') > 0) assetTypeCount++;
        if (parseFloat(assets.sharePortfolioValue || '0') > 0) assetTypeCount++;
        if (parseFloat(assets.managedFundsValue || '0') > 0) assetTypeCount++;
        if (parseFloat(assets.termDepositsValue || '0') > 0) assetTypeCount++;
        if (parseFloat(assets.cryptoValue || '0') > 0) assetTypeCount++;
        if (superDetails && superDetails.balance > 0) assetTypeCount++;
        return assetTypeCount >= 2;
      }

      case 'weekly_stability':
      case 'monthly_review':
      case 'mortgage_rate_recheck':
      case 'insurance_review_confirm':
        return false;

      case 'ff_profile':
        return pd.firstName !== '' && pd.lastName !== '' && pd.dob !== '';

      case 'ff_expenses':
        return transactions.filter(t => t.type === 'expense').length >= 5;

      case 'ff_assets_debts': {
        const hasAnyAsset = Object.entries(assets).some(([k, v]) => k !== 'otherAssetsDescription' && k !== 'investmentPropertyAddress' && v !== '' && v !== '0' && parseFloat(v as string) > 0);
        const hasAnyLiability = Object.entries(liabilities).some(([_k, v]) => v !== '' && v !== '0');
        return hasAnyAsset && hasAnyLiability;
      }

      case 'ff_insurance_health':
        return insurancePolicies.length >= 1 && pd.health.smoker !== '';

      case 'ff_goals_risk': {
        const hasProfileFF = investorProfile.completedAt !== '' || pd.riskProfile.riskTolerance !== '';
        return goals.length >= 1 && hasProfileFF;
      }

      default:
        return false;
    }
  }, [finance]);

  const calculateFSV = useCallback((completedIds: string[], bonus: number, prevState: FSVState): { score: number; monthlyScoreGains: number; lastScoreMonth: string } => {
    let score = 0;
    for (const def of ALL_QUEST_DEFS) {
      if (completedIds.includes(def.id)) {
        score += def.fsvWeight;
      }
    }
    score += bonus;
    score = Math.min(100, Math.max(0, score));

    const currentMonth = getCurrentMonth();
    let monthlyGains = prevState.lastScoreMonth === currentMonth ? prevState.monthlyScoreGains : 0;
    const prevScore = prevState.fsvScore;
    const gain = score - prevScore;

    if (gain > 0) {
      const allowedGain = Math.max(0, 20 - monthlyGains);
      const cappedGain = Math.min(gain, allowedGain);
      score = prevScore + cappedGain;
      monthlyGains += cappedGain;
    }

    return { score, monthlyScoreGains: monthlyGains, lastScoreMonth: currentMonth };
  }, []);

  const checkAndCompleteQuests = useCallback(() => {
    updateState(prev => {
      const newCompleted = [...prev.completedQuestIds];
      const newBadges = [...prev.unlockedBadgeIds];
      let coinsToAward = 0;

      for (const def of ALL_QUEST_DEFS) {
        if (newCompleted.includes(def.id)) continue;
        if (isQuestMet(def.id)) {
          newCompleted.push(def.id);
          coinsToAward += def.coinReward;
          if (def.badgeId && !newBadges.includes(def.badgeId)) {
            newBadges.push(def.badgeId);
          }
        }
      }

      if (coinsToAward > 0) {
        addPoints(coinsToAward);
      }

      const { score: newScore, monthlyScoreGains, lastScoreMonth } = calculateFSV(newCompleted, prev.provisionalBonus, prev);

      return {
        ...prev,
        completedQuestIds: newCompleted,
        unlockedBadgeIds: newBadges,
        fsvScore: newScore,
        monthlyScoreGains,
        lastScoreMonth,
      };
    });
  }, [updateState, isQuestMet, calculateFSV, addPoints]);

  const buildQuests = useCallback((defs: QuestDef[], completedIds: string[]): FSVQuest[] => {
    return defs.map(def => ({
      id: def.id,
      title: def.title,
      description: def.description,
      category: def.category,
      coinReward: def.coinReward,
      fsvWeight: def.fsvWeight,
      badgeId: def.badgeId,
      badgeTitle: def.badgeTitle,
      completed: completedIds.includes(def.id),
      icon: def.icon,
      iconColor: def.iconColor,
    }));
  }, []);

  const onboardingQuests = useMemo(() => buildQuests(ONBOARDING_QUESTS, state.completedQuestIds), [buildQuests, state.completedQuestIds]);
  const liquidityQuests = useMemo(() => buildQuests(LIQUIDITY_QUESTS, state.completedQuestIds), [buildQuests, state.completedQuestIds]);
  const debtQuests = useMemo(() => buildQuests(DEBT_QUESTS, state.completedQuestIds), [buildQuests, state.completedQuestIds]);
  const riskQuests = useMemo(() => buildQuests(RISK_QUESTS, state.completedQuestIds), [buildQuests, state.completedQuestIds]);
  const diversificationQuests = useMemo(() => buildQuests(DIVERSIFICATION_QUESTS, state.completedQuestIds), [buildQuests, state.completedQuestIds]);
  const retentionQuests = useMemo(() => buildQuests(RETENTION_QUESTS, state.completedQuestIds), [buildQuests, state.completedQuestIds]);
  const factFindQuests = useMemo(() => buildQuests(FACT_FIND_QUESTS, state.completedQuestIds), [buildQuests, state.completedQuestIds]);

  const allQuests = useMemo(() => [
    ...onboardingQuests,
    ...liquidityQuests,
    ...debtQuests,
    ...riskQuests,
    ...diversificationQuests,
    ...retentionQuests,
    ...factFindQuests,
  ], [onboardingQuests, liquidityQuests, debtQuests, riskQuests, diversificationQuests, retentionQuests, factFindQuests]);

  const onboardingProgress = useMemo(() => {
    const completed = onboardingQuests.filter(q => q.completed).length;
    return { completed, total: onboardingQuests.length };
  }, [onboardingQuests]);

  const fsvBadges = useMemo((): FSVBadge[] => {
    return ALL_BADGE_DEFS.map(def => ({
      id: def.id,
      title: def.title,
      icon: def.icon,
      color: def.color,
      unlocked: state.unlockedBadgeIds.includes(def.id),
      unlockedAt: state.unlockedBadgeIds.includes(def.id) ? new Date().toISOString() : undefined,
      tier: 'bronze' as BadgeTierLevel,
    }));
  }, [state.unlockedBadgeIds]);

  const value = useMemo((): FSVContextValue => ({
    fsvScore: state.fsvScore,
    completedQuestIds: state.completedQuestIds,
    onboardingQuests,
    liquidityQuests,
    debtQuests,
    riskQuests,
    diversificationQuests,
    retentionQuests,
    factFindQuests,
    allQuests,
    checkAndCompleteQuests,
    onboardingProgress,
    fsvBadges,
  }), [state.fsvScore, state.completedQuestIds, onboardingQuests, liquidityQuests, debtQuests, riskQuests, diversificationQuests, retentionQuests, factFindQuests, allQuests, checkAndCompleteQuests, onboardingProgress, fsvBadges]);

  return <FSVContext.Provider value={value}>{children}</FSVContext.Provider>;
}

export function useFSV() {
  const ctx = useContext(FSVContext);
  if (!ctx) throw new Error('useFSV must be used within FSVProvider');
  return ctx;
}
