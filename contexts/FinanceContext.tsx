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

export interface Budget {
  id: string;
  category: string;
  limit: number;
  color: string;
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
  budgets: Budget[];
  goals: SavingsGoal[];
  profileMode: ProfileMode;
  partnerName: string;
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  addBudget: (b: Omit<Budget, 'id'>) => void;
  deleteBudget: (id: string) => void;
  addGoal: (g: Omit<SavingsGoal, 'id'>) => void;
  updateGoalAmount: (id: string, amount: number) => void;
  deleteGoal: (id: string) => void;
  setProfileMode: (mode: ProfileMode) => void;
  setPartnerName: (name: string) => void;
  isLoading: boolean;
  getSpentByCategory: (category: string) => number;
  getTotalIncome: (month?: string) => number;
  getTotalExpenses: (month?: string) => number;
  getMonthlyTransactions: (month?: string) => Transaction[];
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

const STORAGE_KEYS = {
  transactions: '@pocketplan_transactions',
  budgets: '@pocketplan_budgets',
  goals: '@pocketplan_goals',
  profileMode: '@pocketplan_profileMode',
  partnerName: '@pocketplan_partnerName',
};

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [profileMode, setProfileModeState] = useState<ProfileMode>('individual');
  const [partnerName, setPartnerNameState] = useState('Partner');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tData, bData, gData, mData, pData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.transactions),
        AsyncStorage.getItem(STORAGE_KEYS.budgets),
        AsyncStorage.getItem(STORAGE_KEYS.goals),
        AsyncStorage.getItem(STORAGE_KEYS.profileMode),
        AsyncStorage.getItem(STORAGE_KEYS.partnerName),
      ]);
      if (tData) setTransactions(JSON.parse(tData));
      if (bData) setBudgets(JSON.parse(bData));
      if (gData) setGoals(JSON.parse(gData));
      if (mData) setProfileModeState(mData as ProfileMode);
      if (pData) setPartnerNameState(pData);
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const persist = useCallback(async (key: string, data: unknown) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to persist', e);
    }
  }, []);

  const addTransaction = useCallback((t: Omit<Transaction, 'id'>) => {
    setTransactions(prev => {
      const next = [{ ...t, id: generateId() }, ...prev];
      persist(STORAGE_KEYS.transactions, next);
      return next;
    });
  }, [persist]);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => {
      const next = prev.filter(t => t.id !== id);
      persist(STORAGE_KEYS.transactions, next);
      return next;
    });
  }, [persist]);

  const addBudget = useCallback((b: Omit<Budget, 'id'>) => {
    setBudgets(prev => {
      const next = [...prev, { ...b, id: generateId() }];
      persist(STORAGE_KEYS.budgets, next);
      return next;
    });
  }, [persist]);

  const deleteBudget = useCallback((id: string) => {
    setBudgets(prev => {
      const next = prev.filter(b => b.id !== id);
      persist(STORAGE_KEYS.budgets, next);
      return next;
    });
  }, [persist]);

  const addGoal = useCallback((g: Omit<SavingsGoal, 'id'>) => {
    setGoals(prev => {
      const next = [...prev, { ...g, id: generateId() }];
      persist(STORAGE_KEYS.goals, next);
      return next;
    });
  }, [persist]);

  const updateGoalAmount = useCallback((id: string, amount: number) => {
    setGoals(prev => {
      const next = prev.map(g => g.id === id ? { ...g, currentAmount: Math.max(0, g.currentAmount + amount) } : g);
      persist(STORAGE_KEYS.goals, next);
      return next;
    });
  }, [persist]);

  const deleteGoal = useCallback((id: string) => {
    setGoals(prev => {
      const next = prev.filter(g => g.id !== id);
      persist(STORAGE_KEYS.goals, next);
      return next;
    });
  }, [persist]);

  const setProfileMode = useCallback((mode: ProfileMode) => {
    setProfileModeState(mode);
    AsyncStorage.setItem(STORAGE_KEYS.profileMode, mode);
  }, []);

  const setPartnerName = useCallback((name: string) => {
    setPartnerNameState(name);
    AsyncStorage.setItem(STORAGE_KEYS.partnerName, name);
  }, []);

  const getMonthlyTransactions = useCallback((month?: string) => {
    const target = month || getCurrentMonth();
    return transactions.filter(t => t.date.startsWith(target));
  }, [transactions]);

  const getTotalIncome = useCallback((month?: string) => {
    return getMonthlyTransactions(month)
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [getMonthlyTransactions]);

  const getTotalExpenses = useCallback((month?: string) => {
    return getMonthlyTransactions(month)
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [getMonthlyTransactions]);

  const getSpentByCategory = useCallback((category: string) => {
    const month = getCurrentMonth();
    return transactions
      .filter(t => t.date.startsWith(month) && t.type === 'expense' && t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const value = useMemo(() => ({
    transactions,
    budgets,
    goals,
    profileMode,
    partnerName,
    addTransaction,
    deleteTransaction,
    addBudget,
    deleteBudget,
    addGoal,
    updateGoalAmount,
    deleteGoal,
    setProfileMode,
    setPartnerName,
    isLoading,
    getSpentByCategory,
    getTotalIncome,
    getTotalExpenses,
    getMonthlyTransactions,
  }), [transactions, budgets, goals, profileMode, partnerName, isLoading,
    addTransaction, deleteTransaction, addBudget, deleteBudget, addGoal,
    updateGoalAmount, deleteGoal, setProfileMode, setPartnerName,
    getSpentByCategory, getTotalIncome, getTotalExpenses, getMonthlyTransactions]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
