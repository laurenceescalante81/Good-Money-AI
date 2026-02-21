import type { Express } from "express";
import { createServer, type Server } from "node:http";
import {
  checkApiKey,
  getInstitutions,
  createAuthLink,
  getConnections,
  deleteConnection,
  getAccounts,
  getTransactions,
  refreshConnection,
  getJobStatus,
} from "./basiq";
import { initDatabase } from "./db";
import pool from "./db";
import adminRoutes from "./admin-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  await initDatabase();

  app.get("/api/basiq/status", checkApiKey);
  app.get("/api/basiq/institutions", getInstitutions);
  app.post("/api/basiq/auth-link", createAuthLink);
  app.get("/api/basiq/connections", getConnections);
  app.delete("/api/basiq/connections/:connectionId", deleteConnection);
  app.post("/api/basiq/connections/:connectionId/refresh", refreshConnection);
  app.get("/api/basiq/accounts", getAccounts);
  app.get("/api/basiq/transactions", getTransactions);
  app.get("/api/basiq/jobs/:jobId", getJobStatus);

  app.get("/api/ctas", async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT c.tab_key, c.cta_text, c.icon, c.icon_color, c.is_active, c.segment_id,
               s.name as segment_name, s.rules as segment_rules
        FROM sales_ctas c
        LEFT JOIN customer_segments s ON c.segment_id = s.id
        WHERE c.is_active = true
        ORDER BY c.segment_id NULLS LAST, c.sort_order
      `);
      res.json(result.rows);
    } catch (err) {
      res.json([]);
    }
  });

  app.use("/api/admin", adminRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
