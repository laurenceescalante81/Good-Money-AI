import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

interface RewardsContextValue {
  state: RewardsState;
  missions: Mission[];
  badges: Badge[];
  rewards: Reward[];
  checkIn: () => number;
  spinWheel: () => number;
  scratchCard: () => number;
  completeMission: (id: string) => void;
  redeemReward: (id: string) => boolean;
  addPoints: (amount: number) => void;
  canSpin: boolean;
  canScratch: boolean;
  spinResetTime: string;
  xpForLevel: (lvl: number) => number;
  is2xWeekend: boolean;
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
  { id: 'points_1000', title: 'Points Collector', description: 'Earn 1,000 total points', icon: 'star', color: '#D97706' },
  { id: 'points_5000', title: 'Points Master', description: 'Earn 5,000 total points', icon: 'star', color: '#7C3AED' },
  { id: 'level_3', title: 'Platinum Status', description: 'Reach Level 3', icon: 'diamond-outline', color: '#6366F1' },
];

const REWARD_TEMPLATES: Omit<Reward, 'redeemed'>[] = [
  { id: 'cashback_10', title: '$10 Cashback', description: 'Redeem for $10 AUD cashback', icon: 'cash-outline', pointsCost: 1000 },
  { id: 'webjet_20', title: '$20 Webjet Credit', description: 'Travel credit for flights', icon: 'airplane-outline', pointsCost: 2000 },
  { id: 'double_points', title: 'Double Points - 7 Days', description: 'Earn 2x on all missions', icon: 'flash-outline', pointsCost: 800 },
  { id: 'cashback_25', title: '$25 Woolworths', description: 'Woolworths gift card', icon: 'cart-outline', pointsCost: 2500 },
  { id: 'cashback_50', title: '$50 Coles', description: 'Coles gift card', icon: 'basket-outline', pointsCost: 5000 },
];

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

  const updateState = useCallback((updater: (prev: RewardsState) => RewardsState) => {
    setState(prev => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, [persist]);

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

  const SPIN_PRIZES = [25, 50, 75, 100, 150, 200, 300, 500];

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
    const prizes = [50, 100, 150, 200, 250, 500];
    const prize = prizes[Math.floor(Math.random() * prizes.length)];
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

  const value = useMemo(() => ({
    state, missions, badges, rewards, checkIn, spinWheel, scratchCard, completeMission, redeemReward, addPoints, canSpin, canScratch, spinResetTime, xpForLevel, is2xWeekend,
  }), [state, missions, badges, rewards, checkIn, spinWheel, scratchCard, completeMission, redeemReward, addPoints, canSpin, canScratch, spinResetTime, is2xWeekend]);

  return <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>;
}

export function useRewards() {
  const ctx = useContext(RewardsContext);
  if (!ctx) throw new Error('useRewards must be used within RewardsProvider');
  return ctx;
}
