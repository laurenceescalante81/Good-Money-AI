import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import pool from './db';

const router = Router();

const sessions = new Map<string, { userId: number; role: string; email: string; name: string; advisorId: number | null; expires: number }>();

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
    sessions.set(token, { userId: user.id, role: user.role, email: user.email, name: user.name, advisorId: user.advisor_id || null, expires: Date.now() + 24 * 60 * 60 * 1000 });
    await pool.query('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [user.id]);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, advisorId: user.advisor_id } });
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

router.get('/quests', requireAuth, async (req: Request, res: Response) => {
  try {
    const segmentId = req.query.segment_id;
    let query = `SELECT q.*, s.name as segment_name FROM quest_configs q LEFT JOIN customer_segments s ON q.segment_id = s.id`;
    const params: any[] = [];
    if (segmentId && segmentId !== 'all') {
      if (segmentId === 'none') {
        query += ` WHERE q.segment_id IS NULL`;
      } else {
        query += ` WHERE q.segment_id = $1`;
        params.push(segmentId);
      }
    }
    query += ` ORDER BY q.sort_order`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quests' });
  }
});

router.post('/quests', requireAuth, async (req: Request, res: Response) => {
  try {
    const { quest_id, title, description, icon, icon_bg, base_points, is_2x_active, category, segment_id } = req.body;
    const maxOrder = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM quest_configs');
    const result = await pool.query(
      `INSERT INTO quest_configs (quest_id, title, description, icon, icon_bg, base_points, is_2x_active, category, segment_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [quest_id, title, description, icon, icon_bg, base_points || 100, is_2x_active || false, category || 'mission', segment_id || null, maxOrder.rows[0].next]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create quest' });
  }
});

router.put('/quests/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, description, icon, icon_bg, base_points, is_2x_active, is_active, category, sort_order, segment_id } = req.body;
    const result = await pool.query(
      `UPDATE quest_configs SET title=$1, description=$2, icon=$3, icon_bg=$4, base_points=$5, is_2x_active=$6, is_active=$7, category=$8, sort_order=$9, segment_id=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [title, description, icon, icon_bg, base_points, is_2x_active, is_active, category, sort_order, segment_id || null, req.params.id]
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
    const { email, password, name, role, advisor_id } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO admin_users (email, password_hash, name, role, advisor_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, advisor_id, created_at`,
      [email, hash, name, role || 'admin', advisor_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

router.put('/admin-users/:id', requireAuth, requireGod, async (req: Request, res: Response) => {
  try {
    const { name, email, role, advisor_id } = req.body;
    const result = await pool.query(
      `UPDATE admin_users SET name=$1, email=$2, role=$3, advisor_id=$4 WHERE id=$5 RETURNING id, email, name, role, advisor_id, created_at, last_login`,
      [name, email, role, advisor_id || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update admin user' });
  }
});

router.put('/admin-users/:id/password', requireAuth, requireGod, async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE admin_users SET password_hash=$1 WHERE id=$2', [hash, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.delete('/admin-users/:id', requireAuth, requireGod, async (req: Request, res: Response) => {
  try {
    const check = await pool.query('SELECT role FROM admin_users WHERE id=$1', [req.params.id]);
    if (check.rows.length > 0 && check.rows[0].role === 'god') {
      const godCount = await pool.query("SELECT COUNT(*) FROM admin_users WHERE role='god'");
      if (parseInt(godCount.rows[0].count) <= 1) return res.status(400).json({ error: 'Cannot delete the last god mode user' });
    }
    await pool.query('DELETE FROM admin_users WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete admin user' });
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

router.get('/ctas', requireAuth, async (req: Request, res: Response) => {
  try {
    const segmentId = req.query.segment_id;
    let query = `SELECT c.*, s.name as segment_name FROM sales_ctas c LEFT JOIN customer_segments s ON c.segment_id = s.id`;
    const params: any[] = [];
    if (segmentId && segmentId !== 'all') {
      if (segmentId === 'none') {
        query += ` WHERE c.segment_id IS NULL`;
      } else {
        query += ` WHERE c.segment_id = $1`;
        params.push(segmentId);
      }
    }
    query += ` ORDER BY c.tab_key, c.sort_order`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch CTAs' });
  }
});

router.put('/ctas/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { cta_text, icon, icon_color, is_active, segment_id } = req.body;
    const result = await pool.query(
      `UPDATE sales_ctas SET cta_text=$1, icon=COALESCE($2, icon), icon_color=COALESCE($3, icon_color), is_active=COALESCE($4, is_active), segment_id=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [cta_text, icon, icon_color, is_active, segment_id || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'CTA not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update CTA' });
  }
});

router.post('/ctas', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tab_key, tab_label, cta_text, icon, icon_color, segment_id } = req.body;
    const maxOrder = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM sales_ctas WHERE tab_key = $1', [tab_key]);
    const result = await pool.query(
      `INSERT INTO sales_ctas (tab_key, tab_label, cta_text, icon, icon_color, segment_id, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [tab_key, tab_label, cta_text, icon, icon_color, segment_id || null, maxOrder.rows[0].next]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create CTA' });
  }
});

router.delete('/ctas/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM sales_ctas WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete CTA' });
  }
});

router.get('/segments', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM sales_ctas WHERE segment_id = s.id) as cta_count,
        (SELECT COUNT(*) FROM quest_configs WHERE segment_id = s.id) as quest_count
      FROM customer_segments s ORDER BY s.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch segments' });
  }
});

router.post('/segments', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, description, color, rules } = req.body;
    const result = await pool.query(
      `INSERT INTO customer_segments (name, description, color, rules) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description, color || '#3B82F6', JSON.stringify(rules || {})]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create segment' });
  }
});

router.put('/segments/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, description, color, rules, is_active } = req.body;
    const result = await pool.query(
      `UPDATE customer_segments SET name=$1, description=$2, color=$3, rules=$4, is_active=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [name, description, color, JSON.stringify(rules || {}), is_active, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update segment' });
  }
});

router.delete('/segments/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('UPDATE sales_ctas SET segment_id = NULL WHERE segment_id = $1', [req.params.id]);
    await pool.query('UPDATE quest_configs SET segment_id = NULL WHERE segment_id = $1', [req.params.id]);
    await pool.query('DELETE FROM customer_segments WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete segment' });
  }
});

router.get('/segments/:id/customers', requireAuth, async (req: Request, res: Response) => {
  try {
    const seg = await pool.query('SELECT rules FROM customer_segments WHERE id = $1', [req.params.id]);
    if (seg.rows.length === 0) return res.status(404).json({ error: 'Segment not found' });
    const rules = seg.rows[0].rules || {};
    let conditions = ['1=1'];
    const params: any[] = [];
    let paramIdx = 1;
    if (rules.min_level) { conditions.push(`level >= $${paramIdx++}`); params.push(rules.min_level); }
    if (rules.max_level) { conditions.push(`level <= $${paramIdx++}`); params.push(rules.max_level); }
    if (rules.min_points) { conditions.push(`total_points_earned >= $${paramIdx++}`); params.push(rules.min_points); }
    if (rules.max_points) { conditions.push(`total_points_earned <= $${paramIdx++}`); params.push(rules.max_points); }
    if (rules.min_streak) { conditions.push(`streak >= $${paramIdx++}`); params.push(rules.min_streak); }
    if (rules.max_streak) { conditions.push(`streak <= $${paramIdx++}`); params.push(rules.max_streak); }
    if (rules.has_advisor === true) { conditions.push(`advisor_id IS NOT NULL`); }
    if (rules.has_advisor === false) { conditions.push(`advisor_id IS NULL`); }
    if (rules.inactive_days) { conditions.push(`last_active < NOW() - INTERVAL '${parseInt(rules.inactive_days)} days'`); }
    if (rules.min_fact_find) { conditions.push(`fact_find_progress >= $${paramIdx++}`); params.push(rules.min_fact_find); }
    if (rules.max_fact_find) { conditions.push(`fact_find_progress <= $${paramIdx++}`); params.push(rules.max_fact_find); }
    const result = await pool.query(`SELECT id, device_id, name, email, level, total_points_earned, streak, fact_find_progress, advisor_id, last_active FROM customers WHERE ${conditions.join(' AND ')} ORDER BY last_active DESC NULLS LAST LIMIT 100`, params);
    res.json({ count: result.rowCount, customers: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch segment customers' });
  }
});

router.get('/messages/active', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT * FROM app_messages
      WHERE is_active = true
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
      ORDER BY priority ASC, sort_order ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch active messages' });
  }
});

router.get('/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const typeFilter = req.query.type as string | undefined;
    let query = `SELECT m.*, cs.name as segment_name FROM app_messages m LEFT JOIN customer_segments cs ON m.segment_id = cs.id`;
    const params: any[] = [];
    if (typeFilter && typeFilter !== 'all') {
      query += ` WHERE m.type = $1`;
      params.push(typeFilter);
    }
    query += ` ORDER BY m.sort_order ASC, m.priority ASC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const { message_id, type, title, body, cta_text, cta_action, target_screen, position, icon, icon_color, bg_color, display_rule, priority, delay_ms, is_active, start_date, end_date, segment_id, sort_order, animation_type } = req.body;
    const result = await pool.query(
      `INSERT INTO app_messages (message_id, type, title, body, cta_text, cta_action, target_screen, position, icon, icon_color, bg_color, display_rule, priority, delay_ms, is_active, start_date, end_date, segment_id, sort_order, animation_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [message_id, type, title, body || null, cta_text || null, cta_action || null, target_screen || 'all', position || 'center', icon || null, icon_color || '#0D9488', bg_color || '#132D46', display_rule || 'once', priority || 5, delay_ms || 500, is_active !== false, start_date || null, end_date || null, segment_id || null, sort_order || 0, animation_type || 'fade']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create message' });
  }
});

router.put('/messages/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { message_id, type, title, body, cta_text, cta_action, target_screen, position, icon, icon_color, bg_color, display_rule, priority, delay_ms, is_active, start_date, end_date, segment_id, sort_order, animation_type } = req.body;
    const result = await pool.query(
      `UPDATE app_messages SET message_id=$1, type=$2, title=$3, body=$4, cta_text=$5, cta_action=$6, target_screen=$7, position=$8, icon=$9, icon_color=$10, bg_color=$11, display_rule=$12, priority=$13, delay_ms=$14, is_active=$15, start_date=$16, end_date=$17, segment_id=$18, sort_order=$19, animation_type=$20, updated_at=NOW()
       WHERE id=$21 RETURNING *`,
      [message_id, type, title, body || null, cta_text || null, cta_action || null, target_screen || 'all', position || 'center', icon || null, icon_color || '#0D9488', bg_color || '#132D46', display_rule || 'once', priority || 5, delay_ms || 500, is_active !== false, start_date || null, end_date || null, segment_id || null, sort_order || 0, animation_type || 'fade', req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update message' });
  }
});

router.delete('/messages/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM app_messages WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

router.post('/events', async (req: Request, res: Response) => {
  try {
    const { content_type, content_id, event_type, screen, device_id, session_id, metadata } = req.body;
    if (!content_type || !content_id || !event_type) {
      return res.status(400).json({ error: 'content_type, content_id, and event_type are required' });
    }
    await pool.query(
      `INSERT INTO content_events (content_type, content_id, event_type, screen, device_id, session_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [content_type, content_id, event_type, screen || null, device_id || null, session_id || null, JSON.stringify(metadata || {})]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record event' });
  }
});

router.post('/events/batch', async (req: Request, res: Response) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array is required' });
    }
    const values: any[] = [];
    const placeholders: string[] = [];
    events.forEach((e: any, i: number) => {
      const offset = i * 7;
      placeholders.push(`($${offset+1},$${offset+2},$${offset+3},$${offset+4},$${offset+5},$${offset+6},$${offset+7})`);
      values.push(e.content_type, e.content_id, e.event_type, e.screen || null, e.device_id || null, e.session_id || null, JSON.stringify(e.metadata || {}));
    });
    await pool.query(
      `INSERT INTO content_events (content_type, content_id, event_type, screen, device_id, session_id, metadata) VALUES ${placeholders.join(',')}`,
      values
    );
    res.json({ ok: true, count: events.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record events' });
  }
});

router.get('/content-reports', requireAuth, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const contentType = req.query.content_type as string || 'all';
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const typeFilter = contentType !== 'all' ? `AND content_type = '${contentType}'` : '';

    const summary = await pool.query(`
      SELECT
        content_type,
        event_type,
        COUNT(*) as count,
        COUNT(DISTINCT device_id) as unique_users
      FROM content_events
      WHERE created_at >= $1 ${typeFilter}
      GROUP BY content_type, event_type
      ORDER BY content_type, event_type
    `, [since]);

    const perContent = await pool.query(`
      SELECT
        content_type,
        content_id,
        event_type,
        COUNT(*) as count,
        COUNT(DISTINCT device_id) as unique_users
      FROM content_events
      WHERE created_at >= $1 ${typeFilter}
      GROUP BY content_type, content_id, event_type
      ORDER BY content_type, content_id, event_type
    `, [since]);

    const daily = await pool.query(`
      SELECT
        DATE(created_at) as date,
        content_type,
        event_type,
        COUNT(*) as count
      FROM content_events
      WHERE created_at >= $1 ${typeFilter}
      GROUP BY DATE(created_at), content_type, event_type
      ORDER BY date DESC
    `, [since]);

    const contentItems: Record<string, any> = {};
    perContent.rows.forEach((row: any) => {
      const key = `${row.content_type}:${row.content_id}`;
      if (!contentItems[key]) {
        contentItems[key] = { content_type: row.content_type, content_id: row.content_id, impressions: 0, clicks: 0, dismissals: 0, cta_clicks: 0, conversions: 0, unique_impressions: 0, unique_clicks: 0 };
      }
      const item = contentItems[key];
      if (row.event_type === 'impression') { item.impressions = parseInt(row.count); item.unique_impressions = parseInt(row.unique_users); }
      if (row.event_type === 'click' || row.event_type === 'cta_click') { item.clicks += parseInt(row.count); item.unique_clicks += parseInt(row.unique_users); item.cta_clicks = parseInt(row.count); }
      if (row.event_type === 'dismiss') { item.dismissals = parseInt(row.count); }
      if (row.event_type === 'conversion') { item.conversions = parseInt(row.count); }
    });
    Object.values(contentItems).forEach((item: any) => {
      item.click_rate = item.impressions > 0 ? ((item.clicks / item.impressions) * 100).toFixed(1) : '0.0';
      item.dismiss_rate = item.impressions > 0 ? ((item.dismissals / item.impressions) * 100).toFixed(1) : '0.0';
      item.conversion_rate = item.clicks > 0 ? ((item.conversions / item.clicks) * 100).toFixed(1) : '0.0';
    });

    const messages = await pool.query(`SELECT id, message_id, type, title, is_active, recommendation_enabled, dynamic_content_enabled FROM app_messages ORDER BY sort_order`);
    const ctas = await pool.query(`SELECT id, tab_key, tab_label, cta_text, is_active, recommendation_enabled, dynamic_content_enabled FROM sales_ctas ORDER BY sort_order`);

    res.json({
      period: { days, since },
      summary: summary.rows,
      content_items: Object.values(contentItems),
      daily_trends: daily.rows,
      messages: messages.rows,
      ctas: ctas.rows
    });
  } catch (err) {
    console.error('Content reports error:', err);
    res.status(500).json({ error: 'Failed to fetch content reports' });
  }
});

router.get('/optimization', requireAuth, async (_req: Request, res: Response) => {
  try {
    const settings = await pool.query('SELECT * FROM optimization_settings ORDER BY setting_key');
    const messages = await pool.query('SELECT id, message_id, type, title, recommendation_enabled, dynamic_content_enabled, is_active FROM app_messages ORDER BY sort_order');
    const ctas = await pool.query('SELECT id, tab_key, tab_label, cta_text, recommendation_enabled, dynamic_content_enabled, is_active FROM sales_ctas ORDER BY sort_order');
    res.json({ settings: settings.rows, messages: messages.rows, ctas: ctas.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch optimization settings' });
  }
});

router.put('/optimization/settings/:key', requireAuth, async (req: Request, res: Response) => {
  try {
    const { value } = req.body;
    const adminUser = (req as any).adminUser;
    const result = await pool.query(
      `INSERT INTO optimization_settings (setting_key, setting_value, updated_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_by = $3, updated_at = NOW()
       RETURNING *`,
      [req.params.key, value, adminUser?.email || 'unknown']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update optimization setting' });
  }
});

router.put('/optimization/message/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { recommendation_enabled, dynamic_content_enabled } = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (recommendation_enabled !== undefined) { updates.push(`recommendation_enabled = $${idx++}`); params.push(recommendation_enabled); }
    if (dynamic_content_enabled !== undefined) { updates.push(`dynamic_content_enabled = $${idx++}`); params.push(dynamic_content_enabled); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    updates.push(`updated_at = NOW()`);
    params.push(req.params.id);
    const result = await pool.query(`UPDATE app_messages SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update message optimization' });
  }
});

// ========== Marketing Campaigns ==========

router.get('/campaigns', requireAuth, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    let query = `SELECT mc.*, cs.name as segment_name,
      (SELECT COUNT(*) FROM campaign_variants WHERE campaign_id = mc.id) as variant_count,
      (SELECT COALESCE(SUM(impressions),0) FROM campaign_variants WHERE campaign_id = mc.id) as total_impressions,
      (SELECT COALESCE(SUM(clicks),0) FROM campaign_variants WHERE campaign_id = mc.id) as total_clicks,
      (SELECT COALESCE(SUM(conversions),0) FROM campaign_variants WHERE campaign_id = mc.id) as total_conversions
      FROM marketing_campaigns mc
      LEFT JOIN customer_segments cs ON mc.target_segment_id = cs.id`;
    const params: any[] = [];
    if (status && status !== 'all') {
      query += ` WHERE mc.status = $1`;
      params.push(status);
    }
    query += ` ORDER BY mc.updated_at DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Campaigns fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

router.get('/campaigns/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const campaign = await pool.query(`SELECT mc.*, cs.name as segment_name FROM marketing_campaigns mc LEFT JOIN customer_segments cs ON mc.target_segment_id = cs.id WHERE mc.id = $1`, [req.params.id]);
    if (campaign.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    const variants = await pool.query(`SELECT * FROM campaign_variants WHERE campaign_id = $1 ORDER BY variant_label`, [req.params.id]);
    const eventSummary = await pool.query(`
      SELECT variant_id, event_type, COUNT(*) as count, COUNT(DISTINCT device_id) as unique_users
      FROM campaign_events WHERE campaign_id = $1
      GROUP BY variant_id, event_type
    `, [req.params.id]);
    const dailyTrends = await pool.query(`
      SELECT DATE(created_at) as date, event_type, COUNT(*) as count
      FROM campaign_events WHERE campaign_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at), event_type ORDER BY date
    `, [req.params.id]);
    res.json({ campaign: campaign.rows[0], variants: variants.rows, event_summary: eventSummary.rows, daily_trends: dailyTrends.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

router.post('/campaigns', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, description, campaign_type, target_segment_id, target_screen, start_date, end_date, budget, goal_type, goal_target, priority, ab_enabled } = req.body;
    const adminUser = (req as any).adminUser;
    const result = await pool.query(
      `INSERT INTO marketing_campaigns (name, description, campaign_type, target_segment_id, target_screen, start_date, end_date, budget, goal_type, goal_target, priority, ab_enabled, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [name, description || null, campaign_type || 'in_app', target_segment_id || null, target_screen || null, start_date || null, end_date || null, budget || 0, goal_type || 'impressions', goal_target || 1000, priority || 5, ab_enabled || false, adminUser?.email || 'unknown']
    );
    const campaign = result.rows[0];
    await pool.query(
      `INSERT INTO campaign_variants (campaign_id, variant_name, variant_label, cta_text, headline, body, traffic_pct)
       VALUES ($1, 'Control', 'A', $2, $3, $4, 100)`,
      [campaign.id, 'Learn More', name, description || '']
    );
    res.json(campaign);
  } catch (err) {
    console.error('Campaign create error:', err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

router.put('/campaigns/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, description, campaign_type, target_segment_id, target_screen, start_date, end_date, budget, goal_type, goal_target, priority, ab_enabled, auto_optimize } = req.body;
    const result = await pool.query(
      `UPDATE marketing_campaigns SET name=$1, description=$2, campaign_type=$3, target_segment_id=$4, target_screen=$5, start_date=$6, end_date=$7, budget=$8, goal_type=$9, goal_target=$10, priority=$11, ab_enabled=$12, auto_optimize=$13, updated_at=NOW()
       WHERE id=$14 RETURNING *`,
      [name, description, campaign_type, target_segment_id || null, target_screen || null, start_date || null, end_date || null, budget || 0, goal_type, goal_target, priority, ab_enabled, auto_optimize || false, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

router.put('/campaigns/:id/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!['draft', 'active', 'paused', 'completed', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const result = await pool.query(
      `UPDATE marketing_campaigns SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update campaign status' });
  }
});

router.post('/campaigns/:id/duplicate', requireAuth, async (req: Request, res: Response) => {
  try {
    const orig = await pool.query('SELECT * FROM marketing_campaigns WHERE id = $1', [req.params.id]);
    if (orig.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    const o = orig.rows[0];
    const adminUser = (req as any).adminUser;
    const result = await pool.query(
      `INSERT INTO marketing_campaigns (name, description, campaign_type, target_segment_id, target_screen, budget, goal_type, goal_target, priority, ab_enabled, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [o.name + ' (Copy)', o.description, o.campaign_type, o.target_segment_id, o.target_screen, o.budget, o.goal_type, o.goal_target, o.priority, o.ab_enabled, adminUser?.email]
    );
    const newId = result.rows[0].id;
    const variants = await pool.query('SELECT * FROM campaign_variants WHERE campaign_id = $1', [req.params.id]);
    for (const v of variants.rows) {
      await pool.query(
        `INSERT INTO campaign_variants (campaign_id, variant_name, variant_label, cta_text, headline, body, icon, icon_color, bg_color, traffic_pct)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [newId, v.variant_name, v.variant_label, v.cta_text, v.headline, v.body, v.icon, v.icon_color, v.bg_color, v.traffic_pct]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to duplicate campaign' });
  }
});

router.delete('/campaigns/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM marketing_campaigns WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// Campaign variants
router.get('/campaigns/:id/variants', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM campaign_variants WHERE campaign_id = $1 ORDER BY variant_label', [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch variants' });
  }
});

router.post('/campaigns/:id/variants', requireAuth, async (req: Request, res: Response) => {
  try {
    const { variant_name, cta_text, headline, body, icon, icon_color, bg_color, traffic_pct } = req.body;
    const existing = await pool.query('SELECT variant_label FROM campaign_variants WHERE campaign_id = $1 ORDER BY variant_label DESC LIMIT 1', [req.params.id]);
    const nextLabel = existing.rows.length > 0 ? String.fromCharCode(existing.rows[0].variant_label.charCodeAt(0) + 1) : 'A';
    const result = await pool.query(
      `INSERT INTO campaign_variants (campaign_id, variant_name, variant_label, cta_text, headline, body, icon, icon_color, bg_color, traffic_pct)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.params.id, variant_name || 'Variant ' + nextLabel, nextLabel, cta_text || 'Learn More', headline || '', body || '', icon || null, icon_color || '#0D9488', bg_color || '#132D46', traffic_pct || 50]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create variant' });
  }
});

router.put('/campaigns/variants/:vid', requireAuth, async (req: Request, res: Response) => {
  try {
    const { variant_name, cta_text, headline, body, icon, icon_color, bg_color, traffic_pct, is_active } = req.body;
    const result = await pool.query(
      `UPDATE campaign_variants SET variant_name=$1, cta_text=$2, headline=$3, body=$4, icon=$5, icon_color=$6, bg_color=$7, traffic_pct=$8, is_active=$9
       WHERE id=$10 RETURNING *`,
      [variant_name, cta_text, headline, body, icon, icon_color, bg_color, traffic_pct, is_active !== false, req.params.vid]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update variant' });
  }
});

router.delete('/campaigns/variants/:vid', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM campaign_variants WHERE id = $1', [req.params.vid]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete variant' });
  }
});

// Campaign events + analytics
router.post('/campaigns/:id/events', async (req: Request, res: Response) => {
  try {
    const { variant_id, event_type, device_id, session_id, screen, metadata } = req.body;
    await pool.query(
      `INSERT INTO campaign_events (campaign_id, variant_id, event_type, device_id, session_id, screen, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [req.params.id, variant_id || null, event_type, device_id || null, session_id || null, screen || null, JSON.stringify(metadata || {})]
    );
    if (variant_id) {
      const field = event_type === 'impression' ? 'impressions' : event_type === 'click' || event_type === 'cta_click' ? 'clicks' : event_type === 'conversion' ? 'conversions' : event_type === 'dismiss' ? 'dismissals' : null;
      if (field) {
        await pool.query(`UPDATE campaign_variants SET ${field} = ${field} + 1 WHERE id = $1`, [variant_id]);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record campaign event' });
  }
});

router.get('/campaigns/:id/analytics', requireAuth, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const variants = await pool.query('SELECT * FROM campaign_variants WHERE campaign_id = $1 ORDER BY variant_label', [req.params.id]);
    const daily = await pool.query(`
      SELECT DATE(created_at) as date, variant_id, event_type, COUNT(*) as count
      FROM campaign_events WHERE campaign_id = $1 AND created_at >= $2
      GROUP BY DATE(created_at), variant_id, event_type ORDER BY date
    `, [req.params.id, since]);
    const hourly = await pool.query(`
      SELECT EXTRACT(HOUR FROM created_at) as hour, event_type, COUNT(*) as count
      FROM campaign_events WHERE campaign_id = $1 AND created_at >= $2
      GROUP BY EXTRACT(HOUR FROM created_at), event_type ORDER BY hour
    `, [req.params.id, since]);
    const devices = await pool.query(`
      SELECT COUNT(DISTINCT device_id) as unique_devices, COUNT(*) as total_events
      FROM campaign_events WHERE campaign_id = $1 AND created_at >= $2
    `, [req.params.id, since]);

    const variantPerf = variants.rows.map((v: any) => {
      const ctr = v.impressions > 0 ? ((v.clicks / v.impressions) * 100).toFixed(2) : '0.00';
      const cvr = v.clicks > 0 ? ((v.conversions / v.clicks) * 100).toFixed(2) : '0.00';
      const dismissRate = v.impressions > 0 ? ((v.dismissals / v.impressions) * 100).toFixed(2) : '0.00';
      return { ...v, ctr, cvr, dismiss_rate: dismissRate };
    });

    res.json({
      variants: variantPerf,
      daily_trends: daily.rows,
      hourly_distribution: hourly.rows,
      reach: devices.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaign analytics' });
  }
});

// CTA Optimizer — dynamic ranking by performance
router.get('/cta-optimizer', requireAuth, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const ctas = await pool.query(`SELECT c.*, s.name as segment_name FROM sales_ctas c LEFT JOIN customer_segments s ON c.segment_id = s.id ORDER BY c.sort_order`);

    const events = await pool.query(`
      SELECT content_id, event_type, COUNT(*) as count, COUNT(DISTINCT device_id) as unique_users
      FROM content_events
      WHERE content_type = 'cta' AND created_at >= $1
      GROUP BY content_id, event_type
    `, [since]);

    const eventMap: Record<string, any> = {};
    events.rows.forEach((e: any) => {
      if (!eventMap[e.content_id]) eventMap[e.content_id] = { impressions: 0, clicks: 0, conversions: 0, dismissals: 0, unique_users: 0 };
      const m = eventMap[e.content_id];
      if (e.event_type === 'impression') { m.impressions = parseInt(e.count); m.unique_users = parseInt(e.unique_users); }
      if (e.event_type === 'click' || e.event_type === 'cta_click') m.clicks += parseInt(e.count);
      if (e.event_type === 'conversion') m.conversions = parseInt(e.count);
      if (e.event_type === 'dismiss') m.dismissals = parseInt(e.count);
    });

    const scored = ctas.rows.map((c: any) => {
      const perf = eventMap[c.tab_key] || { impressions: 0, clicks: 0, conversions: 0, dismissals: 0, unique_users: 0 };
      const ctr = perf.impressions > 0 ? (perf.clicks / perf.impressions) * 100 : 0;
      const cvr = perf.clicks > 0 ? (perf.conversions / perf.clicks) * 100 : 0;
      const dismissRate = perf.impressions > 0 ? (perf.dismissals / perf.impressions) * 100 : 0;
      const score = (ctr * 3) + (cvr * 5) - (dismissRate * 2) + (perf.unique_users * 0.1);
      return {
        ...c,
        performance: perf,
        ctr: ctr.toFixed(2),
        cvr: cvr.toFixed(2),
        dismiss_rate: dismissRate.toFixed(2),
        optimization_score: Math.max(0, score).toFixed(1),
        recommendation: ctr > 5 ? 'high_performer' : ctr > 2 ? 'moderate' : perf.impressions > 50 ? 'needs_improvement' : 'insufficient_data'
      };
    });

    scored.sort((a: any, b: any) => parseFloat(b.optimization_score) - parseFloat(a.optimization_score));

    const autoOptSetting = await pool.query(`SELECT setting_value FROM optimization_settings WHERE setting_key = 'auto_prioritize_cta'`);
    const autoOptEnabled = autoOptSetting.rows.length > 0 && autoOptSetting.rows[0].setting_value === 'true';

    res.json({
      ctas: scored,
      auto_optimize_enabled: autoOptEnabled,
      period_days: days,
    });
  } catch (err) {
    console.error('CTA optimizer error:', err);
    res.status(500).json({ error: 'Failed to fetch CTA optimizer data' });
  }
});

router.post('/cta-optimizer/apply-ranking', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rankings } = req.body;
    if (!Array.isArray(rankings)) return res.status(400).json({ error: 'rankings array required' });
    for (let i = 0; i < rankings.length; i++) {
      await pool.query('UPDATE sales_ctas SET sort_order = $1, updated_at = NOW() WHERE id = $2', [i + 1, rankings[i]]);
    }
    res.json({ ok: true, updated: rankings.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to apply CTA ranking' });
  }
});

// Marketing overview stats
router.get('/marketing/overview', requireAuth, async (req: Request, res: Response) => {
  try {
    const campaigns = await pool.query(`
      SELECT status, COUNT(*) as count FROM marketing_campaigns GROUP BY status
    `);
    const activeCampaigns = await pool.query(`SELECT COUNT(*) as count FROM marketing_campaigns WHERE status = 'active'`);
    const totalImpressions = await pool.query(`SELECT COALESCE(SUM(impressions), 0) as total FROM campaign_variants`);
    const totalClicks = await pool.query(`SELECT COALESCE(SUM(clicks), 0) as total FROM campaign_variants`);
    const totalConversions = await pool.query(`SELECT COALESCE(SUM(conversions), 0) as total FROM campaign_variants`);
    const totalBudget = await pool.query(`SELECT COALESCE(SUM(budget), 0) as total, COALESCE(SUM(spend), 0) as spent FROM marketing_campaigns WHERE status IN ('active', 'completed')`);

    const recentCampaigns = await pool.query(`
      SELECT id, name, status, campaign_type, created_at, updated_at,
        (SELECT COALESCE(SUM(impressions),0) FROM campaign_variants WHERE campaign_id = mc.id) as impressions,
        (SELECT COALESCE(SUM(clicks),0) FROM campaign_variants WHERE campaign_id = mc.id) as clicks
      FROM marketing_campaigns mc ORDER BY updated_at DESC LIMIT 5
    `);

    res.json({
      campaign_counts: campaigns.rows,
      active_campaigns: parseInt(activeCampaigns.rows[0].count),
      total_impressions: parseInt(totalImpressions.rows[0].total),
      total_clicks: parseInt(totalClicks.rows[0].total),
      total_conversions: parseInt(totalConversions.rows[0].total),
      budget: { total: parseFloat(totalBudget.rows[0].total), spent: parseFloat(totalBudget.rows[0].spent) },
      recent_campaigns: recentCampaigns.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch marketing overview' });
  }
});

router.put('/optimization/cta/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { recommendation_enabled, dynamic_content_enabled } = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (recommendation_enabled !== undefined) { updates.push(`recommendation_enabled = $${idx++}`); params.push(recommendation_enabled); }
    if (dynamic_content_enabled !== undefined) { updates.push(`dynamic_content_enabled = $${idx++}`); params.push(dynamic_content_enabled); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    updates.push(`updated_at = NOW()`);
    params.push(req.params.id);
    const result = await pool.query(`UPDATE sales_ctas SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update CTA optimization' });
  }
});

export default router;
