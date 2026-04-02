/**
 * Auth Module — Xano Native Auth
 * Proxies login/signup to Xano's built-in auth endpoints.
 */
import type { Express, Request, Response } from "express";

const XANO_BASE_URL = process.env.XANO_API_BASE_URL || 'https://xd23-clr8-wwle.b2.xano.io/api:PzghHKzc';

async function xanoAuthFetch(path: string, body: Record<string, string>) {
  const res = await fetch(`${XANO_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export function registerLocalAuthRoutes(app: Express) {
  /**
   * POST /api/auth/login
   * Body: { email, password }
   * Returns: { authToken }
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "Email e senha são obrigatórios." });
      return;
    }

    try {
      const { ok, data } = await xanoAuthFetch('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      if (!ok || !data.authToken) {
        res.status(401).json({ error: "Email ou senha incorretos." });
        return;
      }

      res.json({ authToken: data.authToken });
    } catch (error) {
      console.error("[Auth] Login error:", error);
      res.status(500).json({ error: "Erro interno ao fazer login." });
    }
  });

  /**
   * POST /api/auth/signup
   * Body: { email, password, name }
   * Returns: { authToken }
   */
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    const { email, password, name } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "Email e senha são obrigatórios." });
      return;
    }

    try {
      const { ok, data } = await xanoAuthFetch('/auth/signup', {
        email: email.trim().toLowerCase(),
        password,
        name: name || email,
      });

      if (!ok || !data.authToken) {
        res.status(400).json({ error: data?.message || "Erro ao criar conta." });
        return;
      }

      res.json({ authToken: data.authToken });
    } catch (error) {
      console.error("[Auth] Signup error:", error);
      res.status(500).json({ error: "Erro interno ao criar conta." });
    }
  });

  /**
   * POST /api/auth/logout
   * Client-side only — just confirms logout (token cleared on frontend)
   */
  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    res.json({ success: true });
  });
}
