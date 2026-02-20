import type { Request, Response } from "express";

const BASIQ_BASE_URL = "https://au-api.basiq.io";

interface BasiqTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getServerToken(): Promise<string> {
  const apiKey = process.env.BASIQ_API_KEY;
  if (!apiKey) throw new Error("BASIQ_API_KEY not configured");

  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const res = await fetch(`${BASIQ_BASE_URL}/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "basiq-version": "3.0",
    },
    body: "scope=SERVER_ACCESS",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Basiq token error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as BasiqTokenResponse;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

async function basiqFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getServerToken();
  const res = await fetch(`${BASIQ_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "basiq-version": "3.0",
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Basiq API error: ${res.status} ${err}`);
  }

  return res.json();
}

let basiqUserId: string | null = null;

async function getOrCreateUser(): Promise<string> {
  if (basiqUserId) return basiqUserId;

  const stored = process.env.BASIQ_USER_ID;
  if (stored) {
    basiqUserId = stored;
    return stored;
  }

  const data = await basiqFetch("/users", {
    method: "POST",
    body: JSON.stringify({ email: "user@pocketplan.app" }),
  });

  basiqUserId = data.id;
  console.log("Created Basiq user:", basiqUserId);
  return data.id;
}

export async function checkApiKey(_req: Request, res: Response) {
  try {
    const apiKey = process.env.BASIQ_API_KEY;
    if (!apiKey) {
      return res.json({ configured: false });
    }
    await getServerToken();
    return res.json({ configured: true });
  } catch (e: any) {
    return res.json({ configured: false, error: e.message });
  }
}

export async function getInstitutions(_req: Request, res: Response) {
  try {
    const data = await basiqFetch("/institutions?filter=institution.authorization:user,institution.stage:live&limit=500");
    const institutions = (data.data || [])
      .filter((i: any) => i.status !== "major-outage")
      .map((i: any) => ({
        id: i.id,
        name: i.name || i.shortName,
        shortName: i.shortName,
        logo: i.logo?.links?.square || i.logo?.links?.full || null,
        tier: i.tier,
        status: i.status,
        country: i.country,
      }))
      .sort((a: any, b: any) => {
        const tierOrder: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3 };
        return (tierOrder[a.tier] || 99) - (tierOrder[b.tier] || 99);
      });

    return res.json({ institutions });
  } catch (e: any) {
    console.error("Get institutions error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}

export async function createAuthLink(req: Request, res: Response) {
  try {
    const userId = await getOrCreateUser();
    const { institutionId } = req.body;

    const data = await basiqFetch(`/users/${userId}/auth_link`, {
      method: "POST",
      body: JSON.stringify(institutionId ? { institution: { id: institutionId } } : {}),
    });

    return res.json({ url: data.url, userId });
  } catch (e: any) {
    console.error("Create auth link error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}

export async function getConnections(_req: Request, res: Response) {
  try {
    const userId = await getOrCreateUser();
    const data = await basiqFetch(`/users/${userId}/connections`);

    const connections = (data.data || []).map((c: any) => ({
      id: c.id,
      status: c.status,
      institution: c.institution,
      lastUsed: c.lastUsed,
      createdDate: c.createdDate,
    }));

    return res.json({ connections });
  } catch (e: any) {
    console.error("Get connections error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}

export async function deleteConnection(req: Request, res: Response) {
  try {
    const { connectionId } = req.params;
    const userId = await getOrCreateUser();
    await basiqFetch(`/users/${userId}/connections/${connectionId}`, { method: "DELETE" });
    return res.json({ success: true });
  } catch (e: any) {
    console.error("Delete connection error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}

export async function getAccounts(_req: Request, res: Response) {
  try {
    const userId = await getOrCreateUser();
    const data = await basiqFetch(`/users/${userId}/accounts`);

    const accounts = (data.data || []).map((a: any) => ({
      id: a.id,
      accountHolder: a.accountHolder,
      accountNo: a.accountNo,
      name: a.name,
      balance: a.balance ? parseFloat(a.balance) : null,
      availableFunds: a.availableFunds ? parseFloat(a.availableFunds) : null,
      currency: a.currency || "AUD",
      class: a.class,
      connection: a.connection,
      institution: a.institution,
      status: a.status,
      lastUpdated: a.lastUpdated,
    }));

    return res.json({ accounts });
  } catch (e: any) {
    console.error("Get accounts error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}

export async function getTransactions(req: Request, res: Response) {
  try {
    const userId = await getOrCreateUser();
    const { limit = "100", from, to } = req.query;

    let filter = `limit=${limit}`;
    if (from) filter += `&filter=transaction.postDate.bt('${from}','${to || new Date().toISOString().split("T")[0]}')`;

    const data = await basiqFetch(`/users/${userId}/transactions?${filter}`);

    const transactions = (data.data || []).map((t: any) => ({
      id: t.id,
      amount: t.amount ? parseFloat(t.amount) : 0,
      description: t.description,
      postDate: t.postDate,
      transactionDate: t.transactionDate,
      status: t.status,
      direction: t.direction,
      class: t.class,
      account: t.account,
      institution: t.institution,
      connection: t.connection,
      enrich: t.enrich,
      category: t.subClass?.title || t.class?.title || "Other",
    }));

    return res.json({ transactions, count: transactions.length });
  } catch (e: any) {
    console.error("Get transactions error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}

export async function refreshConnection(req: Request, res: Response) {
  try {
    const { connectionId } = req.params;
    const userId = await getOrCreateUser();
    const data = await basiqFetch(`/users/${userId}/connections/${connectionId}/refresh`, {
      method: "POST",
    });
    return res.json({ jobId: data.id, status: data.status });
  } catch (e: any) {
    console.error("Refresh connection error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}

export async function getJobStatus(req: Request, res: Response) {
  try {
    const { jobId } = req.params;
    const data = await basiqFetch(`/jobs/${jobId}`);
    return res.json({
      id: data.id,
      status: data.status,
      steps: data.steps,
      createdDate: data.createdDate,
      updatedDate: data.updatedDate,
    });
  } catch (e: any) {
    console.error("Get job status error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
