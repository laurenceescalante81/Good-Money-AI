import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface Mission {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconBg: string;
  basePoints: number;
  is2xActive: boolean;
  expiresAt: number;
  completed: boolean;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  icon: string;
  pointsCost: number;
  redeemed: boolean;
}

export interface TokenTransaction {
  id: string;
  type: 'convert' | 'reward' | 'bonus';
  amount: number;
  pointsSpent: number;
  date: string;
  description: string;
}

export interface FactFindField {
  id: string;
  label: string;
  section: string;
  coins: number;
}

export interface FactFindSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconBg: string;
  bonusCoins: number;
  fields: FactFindField[];
}

export interface RewardsState {
  points: number;
  totalPointsEarned: number;
  level: number;
  xp: number;
  streak: number;
  lastCheckInDate: string;
  weeklyCheckins: boolean[];
  lastSpinDate: string;
  lastScratchWeek: string;
  scratchRevealed: boolean;
  completedMissionIds: string[];
  unlockedBadgeIds: string[];
  redeemedRewardIds: string[];
  tokenBalance: number;
  totalTokensEarned: number;
  tokenTransactions: TokenTransaction[];
  completedFactFindIds: string[];
}

interface RewardsContextValue {
  state: RewardsState;
  missions: Mission[];
  badges: Badge[];
  rewards: Reward[];
  factFindSections: FactFindSection[];
  checkIn: () => number;
  spinWheel: () => number;
  scratchCard: () => number;
  completeMission: (id: string) => void;
  redeemReward: (id: string) => boolean;
  addPoints: (amount: number) => void;
  convertPointsToTokens: (points: number) => boolean;
  completeFactFind: (fieldId: string) => number;
  completeFactFindSection: (sectionId: string) => number;
  getFactFindProgress: () => { completed: number; total: number; percentage: number };
  canSpin: boolean;
  canScratch: boolean;
  spinResetTime: string;
  xpForLevel: (lvl: number) => number;
  is2xWeekend: boolean;
  TOKEN_RATE: number;
}

const RewardsContext = createContext<RewardsContextValue | null>(null);

const STORAGE_KEY = '@ppau_rewards';

function genId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekKey(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNum}`;
}

function getDayOfWeek(): number {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

function xpForLevel(lvl: number): number {
  return lvl * 2500;
}

const TOKEN_RATE = 100;

const DEFAULT_STATE: RewardsState = {
  points: 0,
  totalPointsEarned: 0,
  level: 1,
  xp: 0,
  streak: 0,
  lastCheckInDate: '',
  weeklyCheckins: [false, false, false, false, false, false, false],
  lastSpinDate: '',
  lastScratchWeek: '',
  scratchRevealed: false,
  completedMissionIds: [],
  unlockedBadgeIds: [],
  redeemedRewardIds: [],
  tokenBalance: 0,
  totalTokensEarned: 0,
  tokenTransactions: [],
  completedFactFindIds: [],
};

const MISSION_TEMPLATES: Omit<Mission, 'completed' | 'expiresAt'>[] = [
  { id: 'review_insurance', title: 'Review Your Insurance', description: 'Open Insurance and inspect one policy in detail', icon: 'shield-checkmark-outline', iconBg: '#3B82F6', basePoints: 150, is2xActive: false },
  { id: 'compare_super', title: 'Compare Super Funds', description: 'Review the fund comparison table on the Super screen', icon: 'bar-chart-outline', iconBg: '#8B5CF6', basePoints: 200, is2xActive: true },
  { id: 'run_valuation', title: 'Run a Property Valuation', description: 'Check your property equity on the Mortgage screen', icon: 'home-outline', iconBg: '#F59E0B', basePoints: 180, is2xActive: true },
  { id: 'add_transaction', title: 'Log a Transaction', description: 'Add an income or expense to your budget', icon: 'receipt-outline', iconBg: '#10B981', basePoints: 50, is2xActive: false },
  { id: 'set_goal', title: 'Set a Savings Goal', description: 'Create a new savings goal in the Budget tab', icon: 'flag-outline', iconBg: '#EC4899', basePoints: 100, is2xActive: false },
  { id: 'check_banks', title: 'Review Bank Accounts', description: 'Open the Banks tab and review your balances', icon: 'business-outline', iconBg: '#0D9488', basePoints: 120, is2xActive: false },
];

const BADGE_TEMPLATES: Omit<Badge, 'unlocked' | 'unlockedAt'>[] = [
  { id: 'first_login', title: 'Welcome', description: 'Check in for the first time', icon: 'hand-left-outline', color: '#10B981' },
  { id: 'streak_7', title: 'Week Warrior', description: '7-day check-in streak', icon: 'flame-outline', color: '#F59E0B' },
  { id: 'streak_14', title: 'Fortnight Force', description: '14-day check-in streak', icon: 'flame', color: '#EF4444' },
  { id: 'streak_30', title: 'Monthly Master', description: '30-day check-in streak', icon: 'trophy-outline', color: '#8B5CF6' },
  { id: 'mortgage_set', title: 'Home Owner', description: 'Set up your mortgage details', icon: 'home', color: '#3B82F6' },
  { id: 'super_set', title: 'Super Saver', description: 'Set up your super details', icon: 'trending-up', color: '#8B5CF6' },
  { id: 'budget_pro', title: 'Budget Pro', description: 'Log 10 transactions', icon: 'wallet', color: '#10B981' },
  { id: 'insured', title: 'Fully Covered', description: 'Add 3 insurance policies', icon: 'shield-checkmark', color: '#F59E0B' },
  { id: 'spinner', title: 'Lucky Spinner', description: 'Spin the wheel 5 times', icon: 'sync-outline', color: '#EC4899' },
  { id: 'points_1000', title: 'Coin Collector', description: 'Earn 1,000 total Good Coins', icon: 'star', color: '#D97706' },
  { id: 'points_5000', title: 'Coin Master', description: 'Earn 5,000 total Good Coins', icon: 'star', color: '#7C3AED' },
  { id: 'level_3', title: 'Platinum Status', description: 'Reach Level 3', icon: 'diamond-outline', color: '#6366F1' },
];

const REWARD_TEMPLATES: Omit<Reward, 'redeemed'>[] = [
  { id: 'cashback_10', title: '$10 Cashback', description: 'Redeem for $10 AUD cashback', icon: 'cash-outline', pointsCost: 1000 },
  { id: 'webjet_20', title: '$20 Webjet Credit', description: 'Travel credit for flights', icon: 'airplane-outline', pointsCost: 2000 },
  { id: 'double_points', title: 'Double Coins - 7 Days', description: 'Earn 2x on all missions', icon: 'flash-outline', pointsCost: 800 },
  { id: 'cashback_25', title: '$25 Woolworths', description: 'Woolworths gift card', icon: 'cart-outline', pointsCost: 2500 },
  { id: 'cashback_50', title: '$50 Coles', description: 'Coles gift card', icon: 'basket-outline', pointsCost: 5000 },
];

const FACT_FIND_SECTIONS: FactFindSection[] = [
  {
    id: 'personal_basics',
    title: 'Personal Details',
    description: 'Name, DOB, gender, marital & residency status',
    icon: 'person-outline',
    iconBg: '#3B82F6',
    bonusCoins: 150,
    fields: [
      { id: 'ff_firstName', label: 'First Name', section: 'personal_basics', coins: 25 },
      { id: 'ff_lastName', label: 'Last Name', section: 'personal_basics', coins: 25 },
      { id: 'ff_dob', label: 'Date of Birth', section: 'personal_basics', coins: 50 },
      { id: 'ff_gender', label: 'Gender', section: 'personal_basics', coins: 15 },
      { id: 'ff_maritalStatus', label: 'Marital Status', section: 'personal_basics', coins: 20 },
      { id: 'ff_residencyStatus', label: 'Residency Status', section: 'personal_basics', coins: 20 },
    ],
  },
  {
    id: 'contact_details',
    title: 'Contact Details',
    description: 'Email, phone, and preferred contact method',
    icon: 'call-outline',
    iconBg: '#10B981',
    bonusCoins: 75,
    fields: [
      { id: 'ff_email', label: 'Email Address', section: 'contact_details', coins: 30 },
      { id: 'ff_phone', label: 'Phone Number', section: 'contact_details', coins: 30 },
      { id: 'ff_preferredContact', label: 'Preferred Contact', section: 'contact_details', coins: 15 },
    ],
  },
  {
    id: 'address',
    title: 'Residential Address',
    description: 'Your current home address',
    icon: 'location-outline',
    iconBg: '#F59E0B',
    bonusCoins: 150,
    fields: [
      { id: 'ff_street', label: 'Street Address', section: 'address', coins: 30 },
      { id: 'ff_suburb', label: 'Suburb', section: 'address', coins: 20 },
      { id: 'ff_state', label: 'State', section: 'address', coins: 20 },
      { id: 'ff_postcode', label: 'Postcode', section: 'address', coins: 30 },
    ],
  },
  {
    id: 'dependents',
    title: 'Dependents',
    description: 'Children and other financial dependents',
    icon: 'people-outline',
    iconBg: '#EC4899',
    bonusCoins: 100,
    fields: [
      { id: 'ff_dependent1', label: 'First Dependent', section: 'dependents', coins: 40 },
      { id: 'ff_dependent2', label: 'Second Dependent', section: 'dependents', coins: 40 },
      { id: 'ff_dependent3', label: 'Third Dependent', section: 'dependents', coins: 40 },
    ],
  },
  {
    id: 'employment',
    title: 'Employment Details',
    description: 'Your current employment and income',
    icon: 'briefcase-outline',
    iconBg: '#6366F1',
    bonusCoins: 200,
    fields: [
      { id: 'ff_empStatus', label: 'Employment Status', section: 'employment', coins: 20 },
      { id: 'ff_employer', label: 'Employer Name', section: 'employment', coins: 20 },
      { id: 'ff_occupation', label: 'Occupation', section: 'employment', coins: 20 },
      { id: 'ff_industry', label: 'Industry', section: 'employment', coins: 15 },
      { id: 'ff_yearsInRole', label: 'Years in Role', section: 'employment', coins: 15 },
      { id: 'ff_baseSalary', label: 'Base Salary', section: 'employment', coins: 40 },
      { id: 'ff_bonus', label: 'Bonus / Commission', section: 'employment', coins: 20 },
      { id: 'ff_overtime', label: 'Overtime', section: 'employment', coins: 15 },
    ],
  },
  {
    id: 'other_income',
    title: 'Other Income',
    description: 'Rental, investment, dividends & government benefits',
    icon: 'cash-outline',
    iconBg: '#10B981',
    bonusCoins: 100,
    fields: [
      { id: 'ff_rentalIncome', label: 'Rental Income', section: 'other_income', coins: 25 },
      { id: 'ff_investmentIncome', label: 'Investment Income', section: 'other_income', coins: 25 },
      { id: 'ff_dividendIncome', label: 'Dividend Income', section: 'other_income', coins: 25 },
      { id: 'ff_govBenefits', label: 'Government Benefits', section: 'other_income', coins: 20 },
      { id: 'ff_otherIncome', label: 'Other Income', section: 'other_income', coins: 15 },
    ],
  },
  {
    id: 'bank_account',
    title: 'Bank Account',
    description: 'BSB and account number for switch requests',
    icon: 'card-outline',
    iconBg: '#8B5CF6',
    bonusCoins: 200,
    fields: [
      { id: 'ff_bankName', label: 'Bank Name', section: 'bank_account', coins: 30 },
      { id: 'ff_bsb', label: 'BSB Number', section: 'bank_account', coins: 75 },
      { id: 'ff_accountNumber', label: 'Account Number', section: 'bank_account', coins: 75 },
    ],
  },
  {
    id: 'tax_details',
    title: 'Tax & TFN',
    description: 'Tax file number and HECS-HELP details',
    icon: 'document-text-outline',
    iconBg: '#EF4444',
    bonusCoins: 150,
    fields: [
      { id: 'ff_tfn', label: 'Tax File Number', section: 'tax_details', coins: 100 },
    ],
  },
  {
    id: 'assets',
    title: 'Assets',
    description: 'Property, investments, shares, term deposits & more',
    icon: 'diamond-outline',
    iconBg: '#D4AF37',
    bonusCoins: 200,
    fields: [
      { id: 'ff_homeValue', label: 'Home Value', section: 'assets', coins: 30 },
      { id: 'ff_investmentProperty', label: 'Investment Property', section: 'assets', coins: 30 },
      { id: 'ff_shares', label: 'Share Portfolio', section: 'assets', coins: 25 },
      { id: 'ff_managedFunds', label: 'Managed Funds', section: 'assets', coins: 25 },
      { id: 'ff_termDeposits', label: 'Term Deposits', section: 'assets', coins: 25 },
      { id: 'ff_crypto', label: 'Crypto Assets', section: 'assets', coins: 20 },
      { id: 'ff_vehicles', label: 'Vehicles', section: 'assets', coins: 20 },
      { id: 'ff_otherAssets', label: 'Other Assets', section: 'assets', coins: 15 },
    ],
  },
  {
    id: 'liabilities',
    title: 'Liabilities',
    description: 'Loans, credit cards, HECS-HELP & other debts',
    icon: 'trending-down-outline',
    iconBg: '#EF4444',
    bonusCoins: 200,
    fields: [
      { id: 'ff_personalLoan', label: 'Personal Loan', section: 'liabilities', coins: 30 },
      { id: 'ff_creditCard', label: 'Credit Cards', section: 'liabilities', coins: 30 },
      { id: 'ff_carLoan', label: 'Car Loan', section: 'liabilities', coins: 25 },
      { id: 'ff_hecsDebt', label: 'HECS-HELP Debt', section: 'liabilities', coins: 30 },
      { id: 'ff_afterpay', label: 'Afterpay / BNPL', section: 'liabilities', coins: 20 },
      { id: 'ff_otherDebt', label: 'Other Debts', section: 'liabilities', coins: 15 },
    ],
  },
  {
    id: 'mortgage_details',
    title: 'Mortgage Details',
    description: 'Home loan details for rate comparison',
    icon: 'home-outline',
    iconBg: '#0D9488',
    bonusCoins: 300,
    fields: [
      { id: 'ff_mortgage_lender', label: 'Lender', section: 'mortgage_details', coins: 30 },
      { id: 'ff_mortgage_amount', label: 'Loan Amount', section: 'mortgage_details', coins: 50 },
      { id: 'ff_mortgage_rate', label: 'Interest Rate', section: 'mortgage_details', coins: 50 },
      { id: 'ff_mortgage_term', label: 'Loan Term', section: 'mortgage_details', coins: 30 },
      { id: 'ff_mortgage_property', label: 'Property Value', section: 'mortgage_details', coins: 40 },
    ],
  },
  {
    id: 'super_details',
    title: 'Superannuation',
    description: 'Fund details, balance & contributions',
    icon: 'trending-up-outline',
    iconBg: '#6366F1',
    bonusCoins: 250,
    fields: [
      { id: 'ff_super_fund', label: 'Super Fund', section: 'super_details', coins: 40 },
      { id: 'ff_super_balance', label: 'Balance', section: 'super_details', coins: 50 },
      { id: 'ff_super_salary', label: 'Salary', section: 'super_details', coins: 40 },
      { id: 'ff_super_employer_rate', label: 'Employer Contribution Rate', section: 'super_details', coins: 30 },
    ],
  },
  {
    id: 'insurance_details',
    title: 'Insurance Policies',
    description: 'Life, TPD, income protection & general insurance',
    icon: 'shield-outline',
    iconBg: '#EC4899',
    bonusCoins: 250,
    fields: [
      { id: 'ff_insurance_policy1', label: 'First Insurance Policy', section: 'insurance_details', coins: 75 },
      { id: 'ff_insurance_policy2', label: 'Second Insurance Policy', section: 'insurance_details', coins: 75 },
      { id: 'ff_insurance_policy3', label: 'Third Insurance Policy', section: 'insurance_details', coins: 75 },
    ],
  },
  {
    id: 'financial_goals',
    title: 'Financial Goals',
    description: 'Your short, medium and long-term financial objectives',
    icon: 'flag-outline',
    iconBg: '#10B981',
    bonusCoins: 200,
    fields: [
      { id: 'ff_goal1_desc', label: 'Goal 1 Description', section: 'financial_goals', coins: 30 },
      { id: 'ff_goal1_date', label: 'Goal 1 Target Date', section: 'financial_goals', coins: 20 },
      { id: 'ff_goal1_amount', label: 'Goal 1 Amount', section: 'financial_goals', coins: 25 },
      { id: 'ff_goal2_desc', label: 'Goal 2 Description', section: 'financial_goals', coins: 30 },
      { id: 'ff_goal2_date', label: 'Goal 2 Target Date', section: 'financial_goals', coins: 20 },
      { id: 'ff_goal2_amount', label: 'Goal 2 Amount', section: 'financial_goals', coins: 25 },
      { id: 'ff_goal3_desc', label: 'Goal 3 Description', section: 'financial_goals', coins: 30 },
      { id: 'ff_goal3_date', label: 'Goal 3 Target Date', section: 'financial_goals', coins: 20 },
      { id: 'ff_goal3_amount', label: 'Goal 3 Amount', section: 'financial_goals', coins: 25 },
    ],
  },
  {
    id: 'risk_profile',
    title: 'Risk Profile',
    description: 'Investment experience and risk tolerance',
    icon: 'speedometer-outline',
    iconBg: '#F59E0B',
    bonusCoins: 150,
    fields: [
      { id: 'ff_investTimeframe', label: 'Investment Timeframe', section: 'risk_profile', coins: 25 },
      { id: 'ff_riskTolerance', label: 'Risk Tolerance', section: 'risk_profile', coins: 30 },
      { id: 'ff_investExperience', label: 'Investment Experience', section: 'risk_profile', coins: 25 },
      { id: 'ff_reactionToLoss', label: 'Reaction to Loss', section: 'risk_profile', coins: 25 },
      { id: 'ff_incomeVsGrowth', label: 'Income vs Growth', section: 'risk_profile', coins: 20 },
    ],
  },
  {
    id: 'retirement',
    title: 'Retirement Planning',
    description: 'Desired retirement age and income goals',
    icon: 'sunny-outline',
    iconBg: '#F97316',
    bonusCoins: 150,
    fields: [
      { id: 'ff_retirementAge', label: 'Desired Retirement Age', section: 'retirement', coins: 30 },
      { id: 'ff_retirementIncome', label: 'Desired Retirement Income', section: 'retirement', coins: 30 },
      { id: 'ff_agedPension', label: 'Aged Pension Eligibility', section: 'retirement', coins: 20 },
      { id: 'ff_downsize', label: 'Downsize Intention', section: 'retirement', coins: 20 },
    ],
  },
  {
    id: 'estate_planning',
    title: 'Estate Planning',
    description: 'Will, power of attorney, beneficiary nominations',
    icon: 'reader-outline',
    iconBg: '#7C3AED',
    bonusCoins: 200,
    fields: [
      { id: 'ff_hasWill', label: 'Has Will', section: 'estate_planning', coins: 25 },
      { id: 'ff_hasPOA', label: 'Power of Attorney', section: 'estate_planning', coins: 25 },
      { id: 'ff_hasGuardian', label: 'Enduring Guardian', section: 'estate_planning', coins: 25 },
      { id: 'ff_hasBDBN', label: 'Binding Death Benefit Nomination', section: 'estate_planning', coins: 30 },
      { id: 'ff_hasTrust', label: 'Testamentary Trust', section: 'estate_planning', coins: 25 },
    ],
  },
  {
    id: 'health',
    title: 'Health & Lifestyle',
    description: 'Health insurance, smoker status & conditions',
    icon: 'heart-outline',
    iconBg: '#EF4444',
    bonusCoins: 100,
    fields: [
      { id: 'ff_smoker', label: 'Smoker Status', section: 'health', coins: 15 },
      { id: 'ff_preExisting', label: 'Pre-existing Conditions', section: 'health', coins: 20 },
      { id: 'ff_privateHealth', label: 'Private Health Insurance', section: 'health', coins: 25 },
      { id: 'ff_healthFund', label: 'Health Fund Name', section: 'health', coins: 20 },
      { id: 'ff_medicareSurcharge', label: 'Medicare Levy Surcharge', section: 'health', coins: 15 },
    ],
  },
  {
    id: 'centrelink',
    title: 'Centrelink & DVA',
    description: 'Government benefits and concession cards',
    icon: 'ribbon-outline',
    iconBg: '#0EA5E9',
    bonusCoins: 75,
    fields: [
      { id: 'ff_receivingBenefits', label: 'Receiving Benefits', section: 'centrelink', coins: 20 },
      { id: 'ff_benefitType', label: 'Benefit Type', section: 'centrelink', coins: 20 },
      { id: 'ff_healthCareCard', label: 'Health Care Card', section: 'centrelink', coins: 15 },
      { id: 'ff_dvaBenefits', label: 'DVA Benefits', section: 'centrelink', coins: 15 },
    ],
  },
];

const ALL_FACT_FIND_FIELDS = FACT_FIND_SECTIONS.flatMap(s => s.fields);

export function RewardsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RewardsState>(DEFAULT_STATE);
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

  const persist = useCallback(async (next: RewardsState) => {
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) { console.error(e); }
  }, []);

  const deviceIdRef = useRef<string>('');
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('@good_money_device_id');
      if (stored) {
        deviceIdRef.current = stored;
      } else {
        const newId = Date.now().toString(36) + Math.random().toString(36).substr(2, 12);
        await AsyncStorage.setItem('@good_money_device_id', newId);
        deviceIdRef.current = newId;
      }
    })();
  }, []);

  const syncToServer = useCallback(async (s: RewardsState) => {
    if (!deviceIdRef.current) return;
    try {
      const baseUrl = Platform.OS === 'web'
        ? (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : 'http://localhost:5000')
        : (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : 'http://localhost:5000');
      const progress = ALL_FACT_FIND_FIELDS.length > 0
        ? Math.round((ALL_FACT_FIND_FIELDS.filter(f => s.completedFactFindIds.includes(f.id)).length / ALL_FACT_FIND_FIELDS.length) * 100)
        : 0;
      await fetch(`${baseUrl}/api/admin/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceIdRef.current,
          rewards_state: {
            points: s.points,
            totalPointsEarned: s.totalPointsEarned,
            level: s.level,
            xp: s.xp,
            streak: s.streak,
            tokenBalance: s.tokenBalance,
            totalTokensEarned: s.totalTokensEarned,
            factFindProgress: progress,
            completedMissionIds: s.completedMissionIds,
            unlockedBadgeIds: s.unlockedBadgeIds,
            redeemedRewardIds: s.redeemedRewardIds,
            completedFactFindIds: s.completedFactFindIds,
          },
        }),
      });
    } catch (e) {
      // silent fail - sync is best-effort
    }
  }, []);

  const updateState = useCallback((updater: (prev: RewardsState) => RewardsState) => {
    setState(prev => {
      const next = updater(prev);
      persist(next);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => syncToServer(next), 5000);
      return next;
    });
  }, [persist, syncToServer]);

  const today = getToday();
  const dayOfWeek = getDayOfWeek();
  const isWeekend = dayOfWeek >= 5;
  const is2xWeekend = isWeekend;

  const canSpin = state.lastSpinDate !== today;
  const canScratch = state.lastScratchWeek !== getWeekKey() || !state.scratchRevealed;

  const spinResetTime = useMemo(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const diff = tomorrow.getTime() - now.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

  const addPoints = useCallback((amount: number) => {
    updateState(prev => {
      const newPoints = prev.points + amount;
      const newTotal = prev.totalPointsEarned + amount;
      let newXp = prev.xp + amount;
      let newLevel = prev.level;
      while (newXp >= xpForLevel(newLevel)) {
        newXp -= xpForLevel(newLevel);
        newLevel++;
      }
      let newBadges = [...prev.unlockedBadgeIds];
      if (newTotal >= 1000 && !newBadges.includes('points_1000')) newBadges.push('points_1000');
      if (newTotal >= 5000 && !newBadges.includes('points_5000')) newBadges.push('points_5000');
      if (newLevel >= 3 && !newBadges.includes('level_3')) newBadges.push('level_3');
      return { ...prev, points: newPoints, totalPointsEarned: newTotal, xp: newXp, level: newLevel, unlockedBadgeIds: newBadges };
    });
  }, [updateState]);

  const checkIn = useCallback((): number => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let earned = 0;
    updateState(prev => {
      if (prev.lastCheckInDate === today) return prev;
      const isConsecutive = prev.lastCheckInDate === yesterdayStr;
      const newStreak = isConsecutive ? prev.streak + 1 : 1;
      const newCheckins = [...prev.weeklyCheckins];
      newCheckins[dayOfWeek] = true;
      const streakPoints = 50;
      earned = streakPoints;
      let newBadges = [...prev.unlockedBadgeIds];
      if (!newBadges.includes('first_login')) newBadges.push('first_login');
      if (newStreak >= 7 && !newBadges.includes('streak_7')) newBadges.push('streak_7');
      if (newStreak >= 14 && !newBadges.includes('streak_14')) newBadges.push('streak_14');
      if (newStreak >= 30 && !newBadges.includes('streak_30')) newBadges.push('streak_30');
      const newPoints = prev.points + earned;
      const newTotal = prev.totalPointsEarned + earned;
      let newXp = prev.xp + earned;
      let newLevel = prev.level;
      while (newXp >= xpForLevel(newLevel)) { newXp -= xpForLevel(newLevel); newLevel++; }
      if (newTotal >= 1000 && !newBadges.includes('points_1000')) newBadges.push('points_1000');
      if (newTotal >= 5000 && !newBadges.includes('points_5000')) newBadges.push('points_5000');
      if (newLevel >= 3 && !newBadges.includes('level_3')) newBadges.push('level_3');
      return { ...prev, streak: newStreak, lastCheckInDate: today, weeklyCheckins: newCheckins, points: newPoints, totalPointsEarned: newTotal, xp: newXp, level: newLevel, unlockedBadgeIds: newBadges };
    });
    return earned;
  }, [today, dayOfWeek, updateState]);

  const SPIN_PRIZES = [10, 25, 50, 10, 25, 50, 10, 25];

  const spinWheel = useCallback((): number => {
    if (!canSpin) return 0;
    const prize = SPIN_PRIZES[Math.floor(Math.random() * SPIN_PRIZES.length)];
    updateState(prev => {
      const newPoints = prev.points + prize;
      const newTotal = prev.totalPointsEarned + prize;
      let newXp = prev.xp + prize;
      let newLevel = prev.level;
      while (newXp >= xpForLevel(newLevel)) { newXp -= xpForLevel(newLevel); newLevel++; }
      let newBadges = [...prev.unlockedBadgeIds];
      if (newTotal >= 1000 && !newBadges.includes('points_1000')) newBadges.push('points_1000');
      if (newTotal >= 5000 && !newBadges.includes('points_5000')) newBadges.push('points_5000');
      if (newLevel >= 3 && !newBadges.includes('level_3')) newBadges.push('level_3');
      return { ...prev, lastSpinDate: today, points: newPoints, totalPointsEarned: newTotal, xp: newXp, level: newLevel, unlockedBadgeIds: newBadges };
    });
    return prize;
  }, [canSpin, today, updateState]);

  const scratchCard = useCallback((): number => {
    const roll = Math.random();
    let prize: number;
    if (roll < 0.5) {
      prize = [10, 15, 20, 25][Math.floor(Math.random() * 4)];
    } else if (roll < 0.85) {
      prize = [30, 40, 50][Math.floor(Math.random() * 3)];
    } else {
      prize = [75, 100][Math.floor(Math.random() * 2)];
    }
    updateState(prev => {
      const newPoints = prev.points + prize;
      const newTotal = prev.totalPointsEarned + prize;
      let newXp = prev.xp + prize;
      let newLevel = prev.level;
      while (newXp >= xpForLevel(newLevel)) { newXp -= xpForLevel(newLevel); newLevel++; }
      let newBadges = [...prev.unlockedBadgeIds];
      if (newTotal >= 1000 && !newBadges.includes('points_1000')) newBadges.push('points_1000');
      if (newTotal >= 5000 && !newBadges.includes('points_5000')) newBadges.push('points_5000');
      if (newLevel >= 3 && !newBadges.includes('level_3')) newBadges.push('level_3');
      return { ...prev, lastScratchWeek: getWeekKey(), scratchRevealed: true, points: newPoints, totalPointsEarned: newTotal, xp: newXp, level: newLevel, unlockedBadgeIds: newBadges };
    });
    return prize;
  }, [updateState]);

  const completeMission = useCallback((id: string) => {
    updateState(prev => {
      if (prev.completedMissionIds.includes(id)) return prev;
      const mission = MISSION_TEMPLATES.find(m => m.id === id);
      if (!mission) return prev;
      const pts = mission.is2xActive ? mission.basePoints * 2 : mission.basePoints;
      const newPoints = prev.points + pts;
      const newTotal = prev.totalPointsEarned + pts;
      let newXp = prev.xp + pts;
      let newLevel = prev.level;
      while (newXp >= xpForLevel(newLevel)) { newXp -= xpForLevel(newLevel); newLevel++; }
      let newBadges = [...prev.unlockedBadgeIds];
      if (newTotal >= 1000 && !newBadges.includes('points_1000')) newBadges.push('points_1000');
      if (newTotal >= 5000 && !newBadges.includes('points_5000')) newBadges.push('points_5000');
      if (newLevel >= 3 && !newBadges.includes('level_3')) newBadges.push('level_3');
      return { ...prev, completedMissionIds: [...prev.completedMissionIds, id], points: newPoints, totalPointsEarned: newTotal, xp: newXp, level: newLevel, unlockedBadgeIds: newBadges };
    });
  }, [updateState]);

  const convertPointsToTokens = useCallback((pointsToConvert: number): boolean => {
    if (pointsToConvert < TOKEN_RATE) return false;
    const tokens = Math.floor(pointsToConvert / TOKEN_RATE);
    const actualPointsSpent = tokens * TOKEN_RATE;
    let success = false;
    updateState(prev => {
      if (prev.points < actualPointsSpent) return prev;
      success = true;
      const txn: TokenTransaction = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: 'convert',
        amount: tokens,
        pointsSpent: actualPointsSpent,
        date: new Date().toISOString(),
        description: `Converted ${actualPointsSpent} coins to ${tokens} Good Coins`,
      };
      return {
        ...prev,
        points: prev.points - actualPointsSpent,
        tokenBalance: prev.tokenBalance + tokens,
        totalTokensEarned: prev.totalTokensEarned + tokens,
        tokenTransactions: [txn, ...prev.tokenTransactions],
      };
    });
    return success;
  }, [updateState]);

  const redeemReward = useCallback((id: string): boolean => {
    const reward = REWARD_TEMPLATES.find(r => r.id === id);
    if (!reward) return false;
    let success = false;
    updateState(prev => {
      if (prev.points < reward.pointsCost) return prev;
      if (prev.redeemedRewardIds.includes(id)) return prev;
      success = true;
      return { ...prev, points: prev.points - reward.pointsCost, redeemedRewardIds: [...prev.redeemedRewardIds, id] };
    });
    return success;
  }, [updateState]);

  const completeFactFind = useCallback((fieldId: string): number => {
    const field = ALL_FACT_FIND_FIELDS.find(f => f.id === fieldId);
    if (!field) return 0;
    let earned = 0;
    updateState(prev => {
      if (prev.completedFactFindIds.includes(fieldId)) return prev;
      earned = field.coins;
      const newPoints = prev.points + earned;
      const newTotal = prev.totalPointsEarned + earned;
      let newXp = prev.xp + earned;
      let newLevel = prev.level;
      while (newXp >= xpForLevel(newLevel)) { newXp -= xpForLevel(newLevel); newLevel++; }
      let newBadges = [...prev.unlockedBadgeIds];
      if (newTotal >= 1000 && !newBadges.includes('points_1000')) newBadges.push('points_1000');
      if (newTotal >= 5000 && !newBadges.includes('points_5000')) newBadges.push('points_5000');
      if (newLevel >= 3 && !newBadges.includes('level_3')) newBadges.push('level_3');
      return { ...prev, completedFactFindIds: [...prev.completedFactFindIds, fieldId], points: newPoints, totalPointsEarned: newTotal, xp: newXp, level: newLevel, unlockedBadgeIds: newBadges };
    });
    return earned;
  }, [updateState]);

  const completeFactFindSection = useCallback((sectionId: string): number => {
    const section = FACT_FIND_SECTIONS.find(s => s.id === sectionId);
    if (!section) return 0;
    const bonusId = `ff_section_${sectionId}`;
    let earned = 0;
    updateState(prev => {
      if (prev.completedFactFindIds.includes(bonusId)) return prev;
      const allFieldsDone = section.fields.every(f => prev.completedFactFindIds.includes(f.id));
      if (!allFieldsDone) return prev;
      earned = section.bonusCoins;
      const newPoints = prev.points + earned;
      const newTotal = prev.totalPointsEarned + earned;
      let newXp = prev.xp + earned;
      let newLevel = prev.level;
      while (newXp >= xpForLevel(newLevel)) { newXp -= xpForLevel(newLevel); newLevel++; }
      let newBadges = [...prev.unlockedBadgeIds];
      if (newTotal >= 1000 && !newBadges.includes('points_1000')) newBadges.push('points_1000');
      if (newTotal >= 5000 && !newBadges.includes('points_5000')) newBadges.push('points_5000');
      if (newLevel >= 3 && !newBadges.includes('level_3')) newBadges.push('level_3');
      return { ...prev, completedFactFindIds: [...prev.completedFactFindIds, bonusId], points: newPoints, totalPointsEarned: newTotal, xp: newXp, level: newLevel, unlockedBadgeIds: newBadges };
    });
    return earned;
  }, [updateState]);

  const getFactFindProgress = useCallback(() => {
    const total = ALL_FACT_FIND_FIELDS.length;
    const completed = ALL_FACT_FIND_FIELDS.filter(f => state.completedFactFindIds.includes(f.id)).length;
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [state.completedFactFindIds]);

  const missions: Mission[] = useMemo(() => {
    const now = Date.now();
    return MISSION_TEMPLATES.map(m => ({
      ...m,
      completed: state.completedMissionIds.includes(m.id),
      expiresAt: now + (m.id === 'review_insurance' ? 2 * 86400000 + 14 * 3600000 : m.id === 'compare_super' ? 6 * 86400000 + 8 * 3600000 : m.id === 'run_valuation' ? 1 * 86400000 + 6 * 3600000 : 3 * 86400000),
    }));
  }, [state.completedMissionIds]);

  const badges: Badge[] = useMemo(() => {
    return BADGE_TEMPLATES.map(b => ({
      ...b,
      unlocked: state.unlockedBadgeIds.includes(b.id),
    }));
  }, [state.unlockedBadgeIds]);

  const rewards: Reward[] = useMemo(() => {
    return REWARD_TEMPLATES.map(r => ({
      ...r,
      redeemed: state.redeemedRewardIds.includes(r.id),
    }));
  }, [state.redeemedRewardIds]);

  const factFindSections = FACT_FIND_SECTIONS;

  const value = useMemo(() => ({
    state, missions, badges, rewards, factFindSections, checkIn, spinWheel, scratchCard, completeMission, redeemReward, addPoints, convertPointsToTokens, completeFactFind, completeFactFindSection, getFactFindProgress, canSpin, canScratch, spinResetTime, xpForLevel, is2xWeekend, TOKEN_RATE,
  }), [state, missions, badges, rewards, checkIn, spinWheel, scratchCard, completeMission, redeemReward, addPoints, convertPointsToTokens, completeFactFind, completeFactFindSection, getFactFindProgress, canSpin, canScratch, spinResetTime, is2xWeekend]);

  return <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>;
}

export function useRewards() {
  const ctx = useContext(RewardsContext);
  if (!ctx) throw new Error('useRewards must be used within RewardsProvider');
  return ctx;
}
