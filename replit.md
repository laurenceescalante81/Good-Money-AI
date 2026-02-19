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
- **Insurance Hub**: Track home, car, health, life, income protection, contents, travel policies with renewal dates
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
  add-transaction.tsx    # Modal: new transaction
  setup-mortgage.tsx     # Modal: mortgage setup/edit
  setup-super.tsx        # Modal: super setup/edit
  add-insurance.tsx      # Modal: insurance policies
  add-goal.tsx           # Modal: savings goals
  settings.tsx           # Modal: settings
contexts/
  FinanceContext.tsx      # Main state + AsyncStorage persistence
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

## Recent Changes
- Feb 2026: Complete rebuild focusing on four Australian finance pillars
- Added insurance policy management with renewal tracking
- Added savings goals with funding capability
- Professional banking design with teal/navy palette
