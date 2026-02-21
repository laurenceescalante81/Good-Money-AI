import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import pool from './db';

const router = Router();

const sessions = new Map<string, { userId: number; role: string; email: string; name: string; expires: number }>();

function generateToken(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 16) + Math.random().toString(36).substr(2, 16);
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-admin-token'] as string;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expired' });
  }
  (req as any).adminUser = session;
  next();
}

function requireGod(req: Request, res: Response, next: NextFunction) {
  if ((req as any).adminUser?.role !== 'god') {
    return res.status(403).json({ error: 'God mode access required' });
  }
  next();
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken();
    sessions.set(token, { userId: user.id, role: user.role, email: user.email, name: user.name, expires: Date.now() + 24 * 60 * 60 * 1000 });
    await pool.query('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [user.id]);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: (req as any).adminUser });
});

router.post('/logout', requireAuth, (req: Request, res: Response) => {
  const token = req.headers['x-admin-token'] as string;
  sessions.delete(token);
  res.json({ ok: true });
});

router.get('/quests', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM quest_configs ORDER BY sort_order');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quests' });
  }
});

router.post('/quests', requireAuth, async (req: Request, res: Response) => {
  try {
    const { quest_id, title, description, icon, icon_bg, base_points, is_2x_active, category } = req.body;
    const maxOrder = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM quest_configs');
    const result = await pool.query(
      `INSERT INTO quest_configs (quest_id, title, description, icon, icon_bg, base_points, is_2x_active, category, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [quest_id, title, description, icon, icon_bg, base_points || 100, is_2x_active || false, category || 'mission', maxOrder.rows[0].next]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create quest' });
  }
});

router.put('/quests/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, description, icon, icon_bg, base_points, is_2x_active, is_active, category, sort_order } = req.body;
    const result = await pool.query(
      `UPDATE quest_configs SET title=$1, description=$2, icon=$3, icon_bg=$4, base_points=$5, is_2x_active=$6, is_active=$7, category=$8, sort_order=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [title, description, icon, icon_bg, base_points, is_2x_active, is_active, category, sort_order, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update quest' });
  }
});

router.delete('/quests/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM quest_configs WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete quest' });
  }
});

router.get('/badges', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM badge_configs ORDER BY sort_order');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

router.post('/badges', requireAuth, async (req: Request, res: Response) => {
  try {
    const { badge_id, title, description, icon, color, criteria } = req.body;
    const maxOrder = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM badge_configs');
    const result = await pool.query(
      `INSERT INTO badge_configs (badge_id, title, description, icon, color, criteria, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [badge_id, title, description, icon, color, criteria, maxOrder.rows[0].next]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create badge' });
  }
});

router.put('/badges/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, description, icon, color, criteria, is_active, sort_order } = req.body;
    const result = await pool.query(
      `UPDATE badge_configs SET title=$1, description=$2, icon=$3, color=$4, criteria=$5, is_active=$6, sort_order=$7
       WHERE id=$8 RETURNING *`,
      [title, description, icon, color, criteria, is_active, sort_order, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update badge' });
  }
});

router.delete('/badges/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM badge_configs WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete badge' });
  }
});

router.get('/rewards', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM reward_configs ORDER BY sort_order');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});

router.post('/rewards', requireAuth, async (req: Request, res: Response) => {
  try {
    const { reward_id, title, description, icon, points_cost, stock } = req.body;
    const maxOrder = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM reward_configs');
    const result = await pool.query(
      `INSERT INTO reward_configs (reward_id, title, description, icon, points_cost, stock, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [reward_id, title, description, icon, points_cost || 1000, stock || -1, maxOrder.rows[0].next]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create reward' });
  }
});

router.put('/rewards/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, description, icon, points_cost, is_active, stock, sort_order } = req.body;
    const result = await pool.query(
      `UPDATE reward_configs SET title=$1, description=$2, icon=$3, points_cost=$4, is_active=$5, stock=$6, sort_order=$7
       WHERE id=$8 RETURNING *`,
      [title, description, icon, points_cost, is_active, stock, sort_order, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update reward' });
  }
});

router.delete('/rewards/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM reward_configs WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete reward' });
  }
});

router.get('/settings', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM gamification_settings ORDER BY setting_key');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings/:key', requireAuth, async (req: Request, res: Response) => {
  try {
    const { value, description } = req.body;
    const result = await pool.query(
      `UPDATE gamification_settings SET setting_value=$1, description=COALESCE($2, description), updated_at=NOW() WHERE setting_key=$3 RETURNING *`,
      [value, description, req.params.key]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

router.get('/advisors', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT a.*, COUNT(c.id) as customer_count,
        COALESCE(SUM(c.total_points_earned), 0) as total_customer_points,
        COALESCE(AVG(c.fact_find_progress), 0) as avg_fact_find_progress
      FROM advisors a
      LEFT JOIN customers c ON c.advisor_id = a.id
      GROUP BY a.id
      ORDER BY a.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch advisors' });
  }
});

router.post('/advisors', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, email, phone, license_number, specialization, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO advisors (name, email, phone, license_number, specialization, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, email, phone, license_number, specialization, notes]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create advisor' });
  }
});

router.put('/advisors/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, email, phone, license_number, specialization, status, notes } = req.body;
    const result = await pool.query(
      `UPDATE advisors SET name=$1, email=$2, phone=$3, license_number=$4, specialization=$5, status=$6, notes=$7 WHERE id=$8 RETURNING *`,
      [name, email, phone, license_number, specialization, status, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update advisor' });
  }
});

router.delete('/advisors/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('UPDATE customers SET advisor_id = NULL WHERE advisor_id = $1', [req.params.id]);
    await pool.query('DELETE FROM advisors WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete advisor' });
  }
});

router.get('/customers', requireAuth, async (req: Request, res: Response) => {
  try {
    const advisorId = req.query.advisor_id;
    let query = `
      SELECT c.*, a.name as advisor_name
      FROM customers c
      LEFT JOIN advisors a ON c.advisor_id = a.id
    `;
    const params: any[] = [];
    if (advisorId) {
      query += ' WHERE c.advisor_id = $1';
      params.push(advisorId);
    }
    query += ' ORDER BY c.last_active DESC NULLS LAST, c.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/customers/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT c.*, a.name as advisor_name
      FROM customers c
      LEFT JOIN advisors a ON c.advisor_id = a.id
      WHERE c.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    const activities = await pool.query(
      'SELECT * FROM activity_log WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.params.id]
    );
    res.json({ ...result.rows[0], recent_activities: activities.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

router.put('/customers/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { advisor_id, name, email, phone } = req.body;
    const result = await pool.query(
      `UPDATE customers SET advisor_id=$1, name=COALESCE($2, name), email=COALESCE($3, email), phone=COALESCE($4, phone) WHERE id=$5 RETURNING *`,
      [advisor_id, name, email, phone, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { device_id, rewards_state, finance_summary, profile } = req.body;
    if (!device_id) return res.status(400).json({ error: 'device_id required' });

    const existing = await pool.query('SELECT id FROM customers WHERE device_id = $1', [device_id]);
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE customers SET
          name=COALESCE($1, name), email=COALESCE($2, email), phone=COALESCE($3, phone),
          points=$4, total_points_earned=$5, level=$6, xp=$7, streak=$8,
          token_balance=$9, total_tokens_earned=$10, fact_find_progress=$11,
          completed_missions=$12, unlocked_badges=$13, redeemed_rewards=$14,
          completed_fact_find_ids=$15, last_active=NOW(),
          profile_data=$16, finance_data=$17
        WHERE device_id=$18`,
        [
          profile?.name, profile?.email, profile?.phone,
          rewards_state?.points || 0, rewards_state?.totalPointsEarned || 0,
          rewards_state?.level || 1, rewards_state?.xp || 0, rewards_state?.streak || 0,
          rewards_state?.tokenBalance || 0, rewards_state?.totalTokensEarned || 0,
          rewards_state?.factFindProgress || 0,
          rewards_state?.completedMissionIds || [], rewards_state?.unlockedBadgeIds || [],
          rewards_state?.redeemedRewardIds || [], rewards_state?.completedFactFindIds || [],
          JSON.stringify(profile || {}), JSON.stringify(finance_summary || {}),
          device_id
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO customers (device_id, name, email, phone, points, total_points_earned, level, xp, streak,
          token_balance, total_tokens_earned, fact_find_progress, completed_missions, unlocked_badges,
          redeemed_rewards, completed_fact_find_ids, last_active, profile_data, finance_data)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),$17,$18)`,
        [
          device_id, profile?.name, profile?.email, profile?.phone,
          rewards_state?.points || 0, rewards_state?.totalPointsEarned || 0,
          rewards_state?.level || 1, rewards_state?.xp || 0, rewards_state?.streak || 0,
          rewards_state?.tokenBalance || 0, rewards_state?.totalTokensEarned || 0,
          rewards_state?.factFindProgress || 0,
          rewards_state?.completedMissionIds || [], rewards_state?.unlockedBadgeIds || [],
          rewards_state?.redeemedRewardIds || [], rewards_state?.completedFactFindIds || [],
          JSON.stringify(profile || {}), JSON.stringify(finance_summary || {})
        ]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

router.get('/analytics/overview', requireAuth, async (_req: Request, res: Response) => {
  try {
    const totals = await pool.query(`
      SELECT
        COUNT(*) as total_customers,
        COUNT(CASE WHEN last_active > NOW() - INTERVAL '7 days' THEN 1 END) as active_7d,
        COUNT(CASE WHEN last_active > NOW() - INTERVAL '30 days' THEN 1 END) as active_30d,
        COALESCE(AVG(fact_find_progress), 0) as avg_fact_find,
        COALESCE(SUM(total_points_earned), 0) as total_points_issued,
        COALESCE(AVG(level), 1) as avg_level,
        COALESCE(AVG(streak), 0) as avg_streak,
        COALESCE(SUM(total_tokens_earned), 0) as total_tokens_issued
      FROM customers
    `);

    const byAdvisor = await pool.query(`
      SELECT a.id, a.name, a.email, a.status,
        COUNT(c.id) as customer_count,
        COUNT(CASE WHEN c.last_active > NOW() - INTERVAL '7 days' THEN 1 END) as active_7d,
        COALESCE(AVG(c.fact_find_progress), 0) as avg_fact_find,
        COALESCE(SUM(c.total_points_earned), 0) as total_points,
        COALESCE(AVG(c.level), 1) as avg_level,
        COALESCE(AVG(c.streak), 0) as avg_streak,
        COALESCE(SUM(c.total_tokens_earned), 0) as total_tokens
      FROM advisors a
      LEFT JOIN customers c ON c.advisor_id = a.id
      GROUP BY a.id, a.name, a.email, a.status
      ORDER BY customer_count DESC
    `);

    const unassigned = await pool.query(`
      SELECT COUNT(*) as count FROM customers WHERE advisor_id IS NULL
    `);

    const levelDist = await pool.query(`
      SELECT level, COUNT(*) as count FROM customers GROUP BY level ORDER BY level
    `);

    const recentActivity = await pool.query(`
      SELECT al.*, c.name as customer_name
      FROM activity_log al
      LEFT JOIN customers c ON al.customer_id = c.id
      ORDER BY al.created_at DESC LIMIT 20
    `);

    res.json({
      overview: totals.rows[0],
      by_advisor: byAdvisor.rows,
      unassigned_customers: parseInt(unassigned.rows[0].count),
      level_distribution: levelDist.rows,
      recent_activity: recentActivity.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/analytics/advisor/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const advisor = await pool.query('SELECT * FROM advisors WHERE id = $1', [req.params.id]);
    if (advisor.rows.length === 0) return res.status(404).json({ error: 'Advisor not found' });

    const customers = await pool.query(`
      SELECT id, name, email, phone, points, total_points_earned, level, xp, streak,
        token_balance, total_tokens_earned, fact_find_progress, last_active, created_at
      FROM customers WHERE advisor_id = $1
      ORDER BY last_active DESC NULLS LAST
    `, [req.params.id]);

    const stats = await pool.query(`
      SELECT
        COUNT(*) as total_customers,
        COUNT(CASE WHEN last_active > NOW() - INTERVAL '7 days' THEN 1 END) as active_7d,
        COALESCE(AVG(fact_find_progress), 0) as avg_fact_find,
        COALESCE(SUM(total_points_earned), 0) as total_points,
        COALESCE(AVG(level), 1) as avg_level,
        COALESCE(AVG(streak), 0) as avg_streak
      FROM customers WHERE advisor_id = $1
    `, [req.params.id]);

    res.json({
      advisor: advisor.rows[0],
      customers: customers.rows,
      stats: stats.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch advisor analytics' });
  }
});

router.get('/admin-users', requireAuth, requireGod, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, email, name, role, created_at, last_login FROM admin_users ORDER BY created_at');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

router.post('/admin-users', requireAuth, requireGod, async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO admin_users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at`,
      [email, hash, name, role || 'admin']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

router.get('/fact-find-configs', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM fact_find_configs ORDER BY sort_order');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fact find configs' });
  }
});

router.put('/fact-find-configs/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, description, icon, icon_bg, bonus_coins, is_active, fields, sort_order } = req.body;
    const result = await pool.query(
      `UPDATE fact_find_configs SET title=$1, description=$2, icon=$3, icon_bg=$4, bonus_coins=$5, is_active=$6, fields=$7, sort_order=$8
       WHERE id=$9 RETURNING *`,
      [title, description, icon, icon_bg, bonus_coins, is_active, JSON.stringify(fields), sort_order, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update fact find config' });
  }
});

router.get('/ctas', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM sales_ctas ORDER BY sort_order');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch CTAs' });
  }
});

router.put('/ctas/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { cta_text, icon, icon_color, is_active } = req.body;
    const result = await pool.query(
      `UPDATE sales_ctas SET cta_text=$1, icon=COALESCE($2, icon), icon_color=COALESCE($3, icon_color), is_active=COALESCE($4, is_active), updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [cta_text, icon, icon_color, is_active, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'CTA not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update CTA' });
  }
});

export default router;
