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

  app.use("/api/admin", adminRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
