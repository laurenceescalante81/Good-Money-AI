# Good Money - Australian Financial Planning App

## Overview
Good Money is a personal financial planning mobile app built specifically for Australians. It focuses on four key pillars: mortgage tracking, superannuation (retirement savings), insurance management, and savings/budgeting. All currency is in AUD and uses Australian-specific financial terminology.

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
- **Investor Tab**: Comprehensive 20-question risk profile questionnaire based on 10+ real Australian fact find questionnaires. 5 categories (Goals & Timeframe, Knowledge & Experience, Risk Tolerance, Financial Situation, Investment Behaviour). Scores to 6 profiles: Defensive, Conservative, Moderate, Balanced, Growth, High Growth. Results show suggested asset allocation, all profiles comparison, and full answer review.
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
    budget.tsx           # Budget, savings & connected banks (includes Basiq Open Banking section)
    investor.tsx         # Investor tab: 20-question scored risk profile questionnaire
    fact-find.tsx        # Fact Find tab: comprehensive Australian financial fact find (19 sections incl. Financial Goals)
  add-transaction.tsx    # Modal: new transaction
  setup-mortgage.tsx     # Modal: mortgage setup/edit
  setup-super.tsx        # Modal: super setup/edit
  add-insurance.tsx      # Modal: insurance policies
  add-goal.tsx           # Modal: savings goals
  settings.tsx           # Modal: settings
  connect-bank.tsx       # Modal: institution picker + auth link
  bank-transactions.tsx  # Modal: view & import bank transactions
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

## Good Money Adviser Portal
- Separate web app at `/adviser` (port 5000) for financial advisers and god mode admins
- **Login**: Uses admin_users table with email/password, bcrypt hashed passwords
- **Roles**: `adviser` (sees only their clients), `god`/`admin` (sees all advisers and clients)
- **Database**: admin_users has `advisor_id` field linking to advisors table for scoped access
- **Pages**: Dashboard (KPIs), Clients list (search/sort/filter), Client Profile (detail + edit), Reports (engagement/fact-find/points charts), Advisers management (god only), Settings (god only)
- **Default login**: admin@goodmoney.com.au / admin123 (god mode)
- **Creating adviser logins**: God mode can create admin_users with role='adviser' linked to an advisor_id
- Served as self-contained HTML SPA from `server/templates/adviser.html`

## In-App Messaging System
- **Database**: `app_messages` table stores tooltips, popups, and FTUE coach marks
- **Types**: `tooltip` (contextual hints), `popup` (modal messages), `ftue` (first-time user experience coach marks)
- **Display Rules**: `first_time_only`, `once`, `every_session`, `every_time`
- **Targeting**: Screen-specific (overview, mortgage, super, budget, etc.) or `all` screens, optional segment targeting
- **Scheduling**: Optional start_date/end_date for time-limited campaigns
- **Back Office**: Messages management page in adviser portal (god mode), full CRUD with type filtering
- **Mobile**: AppMessagesContext fetches active messages, tracks seen/dismissed state in AsyncStorage, MessageOverlay renders in each tab
- **Public API**: GET /api/admin/messages/active (no auth) returns active messages for the mobile app

## Content Analytics & Optimization
- **Event Tracking**: Mobile app automatically records impression, cta_click, dismiss events for tooltips, popups, and FTUE messages via POST /api/admin/events
- **Database**: `content_events` table stores all interaction events with content_type, content_id, event_type, device_id, session_id
- **Optimization Settings**: `optimization_settings` table stores global toggles (dynamic content, auto-prioritize CTAs/FTUE, recommendation engine)
- **Per-Element Controls**: `app_messages` and `sales_ctas` have `recommendation_enabled` and `dynamic_content_enabled` boolean columns
- **Content Reports Page**: Adviser portal page accessible to both god mode and adviser users — shows impressions, clicks, dismissals, conversion metrics with type/period filters, per-element breakdown table, daily trend chart, recommendation status overview
- **Optimization Page**: Adviser portal page for controlling global optimization settings and per-message/CTA recommendation and dynamic content toggles
- **API Endpoints**: POST /api/admin/events (no auth), GET /api/admin/content-reports (auth), GET/PUT /api/admin/optimization (auth), PUT /api/admin/optimization/message/:id and /cta/:id (auth)

## App Marketing Platform
- **Database**: `marketing_campaigns` (name, type, status, targeting, dates, budget, goals, A/B config), `campaign_variants` (variant content, traffic split, performance metrics), `campaign_events` (event tracking with device/session data)
- **Campaign Management**: Full CRUD, status workflow (draft→active→paused→completed→archived), campaign duplication, variant management with A/B testing
- **Campaign Analytics**: Variant performance comparison (CTR, CVR, dismiss rates), daily/hourly trend analysis, reach metrics, budget tracking
- **CTA Optimizer**: Performance-based scoring engine (CTR×3 + CVR×5 - dismiss_rate×2 + unique_users×0.1), auto-ranking system, recommendations (high_performer/moderate/needs_improvement/insufficient_data)
- **Adviser Portal Pages**: Campaigns list (filterable by status), Campaign Detail (variant editor, settings, performance chart), Campaign Analytics dashboard (KPIs, comparison table, A/B charts, hourly distribution), CTA Optimizer (ranking table, score visualization, formula display)
- **API Endpoints**: GET/POST /api/admin/campaigns, GET/PUT/DELETE /api/admin/campaigns/:id, PUT /api/admin/campaigns/:id/status, POST /api/admin/campaigns/:id/duplicate, GET/POST /api/admin/campaigns/:id/variants, PUT/DELETE /api/admin/campaigns/variants/:vid, POST /api/admin/campaigns/:id/events (no auth), GET /api/admin/campaigns/:id/analytics, GET /api/admin/cta-optimizer, POST /api/admin/cta-optimizer/apply-ranking, GET /api/admin/marketing/overview

## Accessibility System
- **AccessibilityContext**: Manages display size preference with AsyncStorage persistence
- **Display Sizes**: `default` (1.15x font, 1.05x icons), `large` (1.35x font, 1.2x icons), `extra-large` (1.55x font, 1.35x icons)
- **Settings**: Display Size picker in Settings modal with live preview ("Aa" samples)
- **Usage**: `const { fs, is } = useAccessibility()` — `fs(baseFontSize)` scales fonts, `is(baseIconSize)` scales icons
- **Coverage**: Applied to CoinHeader, tab bar, all 10 tab screens, and all 7 modal screens
- **Default baseline**: Already 15% larger than original sizes for better readability out of the box

## Recent Changes
- Feb 2026: Added complete app marketing platform with campaign management, A/B testing, performance analytics, and dynamic CTA optimization engine
- Feb 2026: Added content analytics, testing & optimization system with event tracking, reports dashboard, and per-element recommendation controls
- Feb 2026: Added customizable tooltips, marketing popups, and FTUE system with back office management
- Feb 2026: Built Good Money Adviser portal — separate web app for advisers with client profiles, reports, role-based access
- Feb 2026: Added comprehensive rewards/gamification system with points, levels, missions, spin wheel, scratch cards, badges, and redeem store
- Feb 2026: Merged Banks content into Budget tab, removed standalone Banks tab (now 10 tabs, 5 per row)
- Feb 2026: Added Basiq Open Banking integration with connect-bank flow, transaction import
- Complete rebuild focusing on four Australian finance pillars
- Added insurance policy management with renewal tracking
- Added savings goals with funding capability
- Professional banking design with teal/navy palette
