# PocketPlan AU - Australian Financial Planning App

## Overview
PocketPlan AU is a personal financial planning mobile app built specifically for Australians. It focuses on four key pillars: mortgage tracking, superannuation (retirement savings), insurance management, and savings/budgeting. All currency is in AUD and uses Australian-specific financial terminology.

## Architecture
- **Frontend**: Expo Router (file-based routing) with React Native
- **Backend**: Express server on port 5000 (minimal - mostly static serving)
- **State Management**: React Context (FinanceContext) with AsyncStorage persistence
- **Styling**: DM Sans font family, teal/navy professional banking aesthetic

## Key Features
- **Dashboard** (Overview tab): Financial snapshot with cash flow, pillar cards for mortgage/super/insurance/savings, insurance list, goals progress
- **Mortgage Tracker**: Loan details, P&I or interest-only calculations, LVR, equity, extra repayment impact
- **Super Tracker**: Balance, fund info, SG contributions, retirement projections (7% growth, 4% drawdown), milestones
- **Budget & Savings**: Income/expense tracking with Australian categories (groceries, petrol, rent), spending breakdown, savings goals with fund allocation
- **Insurance Tab**: Dedicated tab with annual/monthly cost summary, upcoming renewals banner (90-day window), detailed policy cards with cover amounts, premium tracking, and mission integration
- **Planning Tab**: Net wealth projection line chart (5/10/20/30yr horizons) with property equity, super, and savings breakdown lines; income vs expenses bar chart (6-month history); wealth breakdown summary
- **Banks** (Basiq Open Banking): Connect Australian bank accounts via Basiq API, view live account balances grouped by type (transaction, savings, credit cards, loans), import transactions into budget tracker
- **Couple Mode**: Toggle shared finances, track who made each transaction
- **Settings**: Profile mode, partner name, clear data

## Project Structure
```
app/
  _layout.tsx            # Root layout with providers
  (tabs)/
    _layout.tsx          # Tab layout (liquid glass + classic)
    index.tsx            # Overview/Dashboard
    mortgage.tsx         # Mortgage tracker
    super.tsx            # Superannuation tracker
    budget.tsx           # Budget & savings
    fact-find.tsx        # Fact Find tab: comprehensive Australian financial fact find (18 sections)
  add-transaction.tsx    # Modal: new transaction
  setup-mortgage.tsx     # Modal: mortgage setup/edit
  setup-super.tsx        # Modal: super setup/edit
  add-insurance.tsx      # Modal: insurance policies
  add-goal.tsx           # Modal: savings goals
  settings.tsx           # Modal: settings
  connect-bank.tsx       # Modal: institution picker + auth link
  bank-transactions.tsx  # Modal: view & import bank transactions
  (tabs)/banks.tsx       # Banks tab: connected accounts + balances
server/
  basiq.ts               # Basiq Open Banking API integration
  routes.ts              # Express API routes (Basiq endpoints)
contexts/
  FinanceContext.tsx      # Main state + AsyncStorage persistence
  RewardsContext.tsx      # Rewards/gamification state + AsyncStorage persistence
constants/
  colors.ts              # Design tokens
```

## Australian-Specific Details
- Currency: AUD ($) throughout
- SG Rate: Currently 11.5% (configurable)
- Popular super funds: AustralianSuper, Rest, Sunsuper, UniSuper, Hostplus, HESTA, Cbus
- Insurance types: Home, contents, car, health, life, income protection, travel
- Budget categories: Groceries, rent, petrol, utilities, dining out, transport, health, entertainment
- Mortgage: LVR calculation, P&I vs interest-only, major Australian lenders

## Basiq Open Banking Integration
- Requires BASIQ_API_KEY secret to be configured
- Backend endpoints at /api/basiq/* handle token management, user creation, connections, accounts, transactions
- Auth link flow: User is redirected to Basiq's consent page to securely connect their bank
- Supported: All major Australian banks (CBA, ANZ, NAB, Westpac, Macquarie, etc.)
- Transactions can be imported into the budget tracker with category mapping

## Rewards / Gamification System
- RewardsContext manages all rewards state with AsyncStorage persistence
- Points system: earn via check-ins (+50/day), spin wheel (25-500pts), scratch cards (50-500pts), missions (50-400pts)
- Levels: Bronze through Grand Master, XP-based progression (level * 2500 XP per level)
- Daily Streak: consecutive day tracking with weekly calendar, milestone bonuses at 14 and 30 days
- Daily Spin: animated wheel with 8 segments, resets daily
- Weekly Scratch: one bonus card per week, tap to reveal
- Missions: 6 predefined tasks (review insurance, compare super, log transaction, etc.) with expiry timers, 2x active multipliers
- Badges: 12 collectible badges for milestones (streaks, points thresholds, feature usage)
- Redeem Store: cashback, gift cards, double points boosters (800-5000pts)
- 2x Weekend: automatic double points on weekends

## Recent Changes
- Feb 2026: Added comprehensive rewards/gamification system with points, levels, missions, spin wheel, scratch cards, badges, and redeem store
- Feb 2026: Added Basiq Open Banking integration with Banks tab, connect-bank flow, transaction import
- Complete rebuild focusing on four Australian finance pillars
- Added insurance policy management with renewal tracking
- Added savings goals with funding capability
- Professional banking design with teal/navy palette
