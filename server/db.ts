import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        advisor_id INTEGER REFERENCES advisors(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS advisors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        license_number VARCHAR(100),
        specialization VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        advisor_id INTEGER REFERENCES advisors(id) ON DELETE SET NULL,
        points INTEGER DEFAULT 0,
        total_points_earned INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        token_balance NUMERIC(12,2) DEFAULT 0,
        total_tokens_earned NUMERIC(12,2) DEFAULT 0,
        fact_find_progress INTEGER DEFAULT 0,
        completed_missions TEXT[] DEFAULT '{}',
        unlocked_badges TEXT[] DEFAULT '{}',
        redeemed_rewards TEXT[] DEFAULT '{}',
        completed_fact_find_ids TEXT[] DEFAULT '{}',
        last_active TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        profile_data JSONB DEFAULT '{}',
        finance_data JSONB DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS quest_configs (
        id SERIAL PRIMARY KEY,
        quest_id VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(100),
        icon_bg VARCHAR(20),
        base_points INTEGER DEFAULT 100,
        is_2x_active BOOLEAN DEFAULT false,
        category VARCHAR(50) DEFAULT 'mission',
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS badge_configs (
        id SERIAL PRIMARY KEY,
        badge_id VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(100),
        color VARCHAR(20),
        criteria TEXT,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS reward_configs (
        id SERIAL PRIMARY KEY,
        reward_id VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(100),
        points_cost INTEGER DEFAULT 1000,
        is_active BOOLEAN DEFAULT true,
        stock INTEGER DEFAULT -1,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS fact_find_configs (
        id SERIAL PRIMARY KEY,
        section_id VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(100),
        icon_bg VARCHAR(20),
        bonus_coins INTEGER DEFAULT 100,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        fields JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS gamification_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        details JSONB DEFAULT '{}',
        points_earned INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sales_ctas (
        id SERIAL PRIMARY KEY,
        tab_key VARCHAR(50) NOT NULL,
        tab_label VARCHAR(100) NOT NULL,
        cta_text VARCHAR(255) NOT NULL,
        icon VARCHAR(100),
        icon_color VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        segment_id INTEGER,
        sort_order INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS customer_segments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(20) DEFAULT '#3B82F6',
        rules JSONB NOT NULL DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const adminCount = await client.query('SELECT COUNT(*) FROM admin_users');
    if (parseInt(adminCount.rows[0].count) === 0) {
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('admin123', 10);
      await client.query(
        `INSERT INTO admin_users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)`,
        ['admin@goodmoney.com.au', hash, 'God Mode Admin', 'god']
      );
    }

    const settingsCount = await client.query('SELECT COUNT(*) FROM gamification_settings');
    if (parseInt(settingsCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO gamification_settings (setting_key, setting_value, description) VALUES
        ('token_rate', '100', 'Points to AUD conversion rate (e.g. 100 = 100 points per $1)'),
        ('daily_checkin_points', '50', 'Points earned per daily check-in'),
        ('spin_min_points', '25', 'Minimum points from spin wheel'),
        ('spin_max_points', '500', 'Maximum points from spin wheel'),
        ('scratch_min_points', '50', 'Minimum points from scratch card'),
        ('scratch_max_points', '500', 'Maximum points from scratch card'),
        ('xp_per_level', '2500', 'XP multiplier per level (level * this value)'),
        ('weekend_2x_enabled', 'true', 'Whether 2x weekend bonus is active'),
        ('streak_bonus_14', '200', 'Bonus points for 14-day streak'),
        ('streak_bonus_30', '500', 'Bonus points for 30-day streak')
      `);
    }

    const questCount = await client.query('SELECT COUNT(*) FROM quest_configs');
    if (parseInt(questCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO quest_configs (quest_id, title, description, icon, icon_bg, base_points, is_2x_active, sort_order) VALUES
        ('review_insurance', 'Review Your Insurance', 'Open Insurance and inspect one policy in detail', 'shield-checkmark-outline', '#3B82F6', 150, false, 1),
        ('compare_super', 'Compare Super Funds', 'Review the fund comparison table on the Super screen', 'bar-chart-outline', '#8B5CF6', 200, true, 2),
        ('run_valuation', 'Run a Property Valuation', 'Check your property equity on the Mortgage screen', 'home-outline', '#F59E0B', 180, true, 3),
        ('add_transaction', 'Log a Transaction', 'Add an income or expense to your budget', 'receipt-outline', '#10B981', 50, false, 4),
        ('set_goal', 'Set a Savings Goal', 'Create a new savings goal in the Budget tab', 'flag-outline', '#EC4899', 100, false, 5),
        ('check_banks', 'Review Bank Accounts', 'Open the Banks tab and review your balances', 'business-outline', '#0D9488', 120, false, 6)
      `);
    }

    const badgeCount = await client.query('SELECT COUNT(*) FROM badge_configs');
    if (parseInt(badgeCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO badge_configs (badge_id, title, description, icon, color, criteria, sort_order) VALUES
        ('first_login', 'Welcome', 'Check in for the first time', 'hand-left-outline', '#10B981', 'first_checkin', 1),
        ('streak_7', 'Week Warrior', '7-day check-in streak', 'flame-outline', '#F59E0B', 'streak_7', 2),
        ('streak_14', 'Fortnight Force', '14-day check-in streak', 'flame', '#EF4444', 'streak_14', 3),
        ('streak_30', 'Monthly Master', '30-day check-in streak', 'trophy-outline', '#8B5CF6', 'streak_30', 4),
        ('mortgage_set', 'Home Owner', 'Set up your mortgage details', 'home', '#3B82F6', 'mortgage_setup', 5),
        ('super_set', 'Super Saver', 'Set up your super details', 'trending-up', '#8B5CF6', 'super_setup', 6),
        ('budget_pro', 'Budget Pro', 'Log 10 transactions', 'wallet', '#10B981', 'transactions_10', 7),
        ('insured', 'Fully Covered', 'Add 3 insurance policies', 'shield-checkmark', '#F59E0B', 'insurance_3', 8),
        ('spinner', 'Lucky Spinner', 'Spin the wheel 5 times', 'sync-outline', '#EC4899', 'spins_5', 9),
        ('points_1000', 'Points Collector', 'Earn 1,000 total points', 'star', '#D97706', 'points_1000', 10),
        ('points_5000', 'Points Master', 'Earn 5,000 total points', 'star', '#7C3AED', 'points_5000', 11),
        ('level_3', 'Platinum Status', 'Reach Level 3', 'diamond-outline', '#6366F1', 'level_3', 12)
      `);
    }

    const rewardCount = await client.query('SELECT COUNT(*) FROM reward_configs');
    if (parseInt(rewardCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO reward_configs (reward_id, title, description, icon, points_cost, sort_order) VALUES
        ('cashback_10', '$10 Cashback', 'Redeem for $10 AUD cashback', 'cash-outline', 1000, 1),
        ('webjet_20', '$20 Webjet Credit', 'Travel credit for flights', 'airplane-outline', 2000, 2),
        ('double_points', 'Double Coins - 7 Days', 'Earn 2x on all missions', 'flash-outline', 800, 3),
        ('cashback_25', '$25 Woolworths', 'Woolworths gift card', 'cart-outline', 2500, 4),
        ('cashback_50', '$50 Coles', 'Coles gift card', 'basket-outline', 5000, 5)
      `);
    }

    const ctaCount = await client.query('SELECT COUNT(*) FROM sales_ctas');
    if (parseInt(ctaCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO sales_ctas (tab_key, tab_label, cta_text, icon, icon_color, sort_order) VALUES
        ('mortgage', 'Mortgage', 'Get a free rate review', 'home-outline', '#F97316', 1),
        ('super', 'Super', 'Optimise your super today', 'trending-up-outline', '#8B5CF6', 2),
        ('insurance', 'Insurance', 'Compare & save on premiums', 'shield-checkmark-outline', '#3B82F6', 3),
        ('savings', 'Savings', 'Boost your savings plan', 'flag-outline', '#10B981', 4),
        ('rewards', 'Rewards', 'Earn Good Coins & redeem for cashback', 'gift-outline', '#D4AF37', 5),
        ('banks', 'Banks', 'Link your accounts for real-time insights', 'business-outline', '#0D9488', 6),
        ('budget', 'Budget', 'Take control of your cash flow', 'wallet-outline', '#10B981', 7),
        ('planning', 'Planning', 'See your wealth projection to retirement', 'analytics-outline', '#6366F1', 8),
        ('fact_find', 'Fact Find', 'Complete your profile for tailored advice', 'document-text-outline', '#F59E0B', 9)
      `);
    }

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}
