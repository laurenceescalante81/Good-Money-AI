import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TransactionType = 'income' | 'expense';
export type ProfileMode = 'individual' | 'couple';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
  owner: 'me' | 'partner';
}

export interface MortgageDetails {
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  repaymentType: 'principal_interest' | 'interest_only';
  extraRepayment: number;
  propertyValue: number;
  startDate: string;
  lender: string;
}

export interface SuperDetails {
  balance: number;
  fund: string;
  employerRate: number;
  salary: number;
  investmentOption: string;
  lastUpdated: string;
}

export interface InsurancePolicy {
  id: string;
  type: 'home' | 'car' | 'health' | 'life' | 'income_protection' | 'contents' | 'travel';
  provider: string;
  policyNumber: string;
  premium: number;
  premiumFrequency: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually';
  renewalDate: string;
  coverAmount: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  icon: string;
}

interface FinanceContextValue {
  transactions: Transaction[];
  mortgage: MortgageDetails | null;
  superDetails: SuperDetails | null;
  insurancePolicies: InsurancePolicy[];
  goals: SavingsGoal[];
  profileMode: ProfileMode;
  partnerName: string;
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  setMortgage: (m: MortgageDetails) => void;
  clearMortgage: () => void;
  setSuperDetails: (s: SuperDetails) => void;
  clearSuper: () => void;
  addInsurance: (p: Omit<InsurancePolicy, 'id'>) => void;
  deleteInsurance: (id: string) => void;
  addGoal: (g: Omit<SavingsGoal, 'id'>) => void;
  updateGoalAmount: (id: string, amount: number) => void;
  deleteGoal: (id: string) => void;
  setProfileMode: (mode: ProfileMode) => void;
  setPartnerName: (name: string) => void;
  isLoading: boolean;
  getTotalIncome: (month?: string) => number;
  getTotalExpenses: (month?: string) => number;
  getMonthlyTransactions: (month?: string) => Transaction[];
  getSpentByCategory: (category: string) => number;
  calculateMortgageRepayment: () => { monthly: number; totalInterest: number; totalPayment: number; yearsRemaining: number };
  calculateSuperProjection: () => { atRetirement: number; yearsToRetirement: number; monthlyInRetirement: number };
  getTotalInsuranceCost: () => number;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

const KEYS = {
  transactions: '@ozfin_transactions',
  mortgage: '@ozfin_mortgage',
  super: '@ozfin_super',
  insurance: '@ozfin_insurance',
  goals: '@ozfin_goals',
  profileMode: '@ozfin_profileMode',
  partnerName: '@ozfin_partnerName',
};

function genId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [mortgage, setMortgageState] = useState<MortgageDetails | null>(null);
  const [superDetails, setSuperState] = useState<SuperDetails | null>(null);
  const [insurancePolicies, setInsurance] = useState<InsurancePolicy[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [profileMode, setProfileModeState] = useState<ProfileMode>('individual');
  const [partnerName, setPartnerNameState] = useState('Partner');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [tData, mData, sData, iData, gData, pmData, pnData] = await Promise.all([
        AsyncStorage.getItem(KEYS.transactions),
        AsyncStorage.getItem(KEYS.mortgage),
        AsyncStorage.getItem(KEYS.super),
        AsyncStorage.getItem(KEYS.insurance),
        AsyncStorage.getItem(KEYS.goals),
        AsyncStorage.getItem(KEYS.profileMode),
        AsyncStorage.getItem(KEYS.partnerName),
      ]);
      if (tData) setTransactions(JSON.parse(tData));
      if (mData) setMortgageState(JSON.parse(mData));
      if (sData) setSuperState(JSON.parse(sData));
      if (iData) setInsurance(JSON.parse(iData));
      if (gData) setGoals(JSON.parse(gData));
      if (pmData) setProfileModeState(pmData as ProfileMode);
      if (pnData) setPartnerNameState(pnData);
    } catch (e) {
      console.error('Load error', e);
    } finally {
      setIsLoading(false);
    }
  };

  const persist = useCallback(async (key: string, data: unknown) => {
    try { await AsyncStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.error(e); }
  }, []);

  const addTransaction = useCallback((t: Omit<Transaction, 'id'>) => {
    setTransactions(prev => { const next = [{ ...t, id: genId() }, ...prev]; persist(KEYS.transactions, next); return next; });
  }, [persist]);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => { const next = prev.filter(t => t.id !== id); persist(KEYS.transactions, next); return next; });
  }, [persist]);

  const setMortgage = useCallback((m: MortgageDetails) => {
    setMortgageState(m); persist(KEYS.mortgage, m);
  }, [persist]);

  const clearMortgage = useCallback(() => {
    setMortgageState(null); AsyncStorage.removeItem(KEYS.mortgage);
  }, []);

  const setSuperDetails = useCallback((s: SuperDetails) => {
    setSuperState(s); persist(KEYS.super, s);
  }, [persist]);

  const clearSuper = useCallback(() => {
    setSuperState(null); AsyncStorage.removeItem(KEYS.super);
  }, []);

  const addInsurance = useCallback((p: Omit<InsurancePolicy, 'id'>) => {
    setInsurance(prev => { const next = [...prev, { ...p, id: genId() }]; persist(KEYS.insurance, next); return next; });
  }, [persist]);

  const deleteInsurance = useCallback((id: string) => {
    setInsurance(prev => { const next = prev.filter(p => p.id !== id); persist(KEYS.insurance, next); return next; });
  }, [persist]);

  const addGoal = useCallback((g: Omit<SavingsGoal, 'id'>) => {
    setGoals(prev => { const next = [...prev, { ...g, id: genId() }]; persist(KEYS.goals, next); return next; });
  }, [persist]);

  const updateGoalAmount = useCallback((id: string, amount: number) => {
    setGoals(prev => { const next = prev.map(g => g.id === id ? { ...g, currentAmount: Math.max(0, g.currentAmount + amount) } : g); persist(KEYS.goals, next); return next; });
  }, [persist]);

  const deleteGoal = useCallback((id: string) => {
    setGoals(prev => { const next = prev.filter(g => g.id !== id); persist(KEYS.goals, next); return next; });
  }, [persist]);

  const setProfileMode = useCallback((mode: ProfileMode) => {
    setProfileModeState(mode); AsyncStorage.setItem(KEYS.profileMode, mode);
  }, []);

  const setPartnerName = useCallback((name: string) => {
    setPartnerNameState(name); AsyncStorage.setItem(KEYS.partnerName, name);
  }, []);

  const getMonthlyTransactions = useCallback((month?: string) => {
    const target = month || getCurrentMonth();
    return transactions.filter(t => t.date.startsWith(target));
  }, [transactions]);

  const getTotalIncome = useCallback((month?: string) => {
    return getMonthlyTransactions(month).filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  }, [getMonthlyTransactions]);

  const getTotalExpenses = useCallback((month?: string) => {
    return getMonthlyTransactions(month).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  }, [getMonthlyTransactions]);

  const getSpentByCategory = useCallback((category: string) => {
    const month = getCurrentMonth();
    return transactions.filter(t => t.date.startsWith(month) && t.type === 'expense' && t.category === category).reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  const calculateMortgageRepayment = useCallback(() => {
    if (!mortgage) return { monthly: 0, totalInterest: 0, totalPayment: 0, yearsRemaining: 0 };
    const P = mortgage.loanAmount;
    const r = mortgage.interestRate / 100 / 12;
    const n = mortgage.loanTermYears * 12;
    let monthly: number;
    if (mortgage.repaymentType === 'interest_only') {
      monthly = P * r;
    } else {
      if (r === 0) { monthly = P / n; }
      else { monthly = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1); }
    }
    monthly += mortgage.extraRepayment;
    const totalPayment = monthly * n;
    const totalInterest = totalPayment - P;
    const startDate = new Date(mortgage.startDate);
    const now = new Date();
    const monthsPassed = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
    const yearsRemaining = Math.max(0, (n - monthsPassed) / 12);
    return { monthly, totalInterest: Math.max(0, totalInterest), totalPayment, yearsRemaining };
  }, [mortgage]);

  const calculateSuperProjection = useCallback(() => {
    if (!superDetails) return { atRetirement: 0, yearsToRetirement: 0, monthlyInRetirement: 0 };
    const currentAge = 30;
    const retirementAge = 67;
    const yearsToRetirement = retirementAge - currentAge;
    const annualContribution = superDetails.salary * (superDetails.employerRate / 100);
    const growthRate = 0.07;
    let balance = superDetails.balance;
    for (let i = 0; i < yearsToRetirement; i++) {
      balance = (balance + annualContribution) * (1 + growthRate);
    }
    const retirementYears = 25;
    const drawdownRate = 0.04;
    const monthlyInRetirement = (balance * drawdownRate) / 12;
    return { atRetirement: balance, yearsToRetirement, monthlyInRetirement };
  }, [superDetails]);

  const getTotalInsuranceCost = useCallback(() => {
    return insurancePolicies.reduce((sum, p) => {
      const multipliers: Record<string, number> = { weekly: 52, fortnightly: 26, monthly: 12, quarterly: 4, annually: 1 };
      return sum + p.premium * (multipliers[p.premiumFrequency] || 12);
    }, 0);
  }, [insurancePolicies]);

  const value = useMemo(() => ({
    transactions, mortgage, superDetails, insurancePolicies, goals, profileMode, partnerName,
    addTransaction, deleteTransaction, setMortgage, clearMortgage, setSuperDetails, clearSuper,
    addInsurance, deleteInsurance, addGoal, updateGoalAmount, deleteGoal,
    setProfileMode, setPartnerName, isLoading,
    getTotalIncome, getTotalExpenses, getMonthlyTransactions, getSpentByCategory,
    calculateMortgageRepayment, calculateSuperProjection, getTotalInsuranceCost,
  }), [transactions, mortgage, superDetails, insurancePolicies, goals, profileMode, partnerName, isLoading,
    addTransaction, deleteTransaction, setMortgage, clearMortgage, setSuperDetails, clearSuper,
    addInsurance, deleteInsurance, addGoal, updateGoalAmount, deleteGoal,
    setProfileMode, setPartnerName,
    getTotalIncome, getTotalExpenses, getMonthlyTransactions, getSpentByCategory,
    calculateMortgageRepayment, calculateSuperProjection, getTotalInsuranceCost]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
