/**
 * Local Authentication Module
 *
 * Provides email/password authentication as an alternative to Manus OAuth.
 * Used when LOCAL_AUTH_MODE=true is set in the environment.
 * Integrates with the same JWT session system used by the OAuth flow.
 */
import bcrypt from "bcryptjs";
import type { Express, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import * as db from "../db";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getSessionSecret() {
  return new TextEncoder().encode(ENV.cookieSecret || "local-dev-secret-change-me");
}

export async function createLocalSessionToken(openId: string, name: string): Promise<string> {
  const expiresAt = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);
  return new SignJWT({ openId, appId: ENV.appId || "local", name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expiresAt)
    .sign(getSessionSecret());
}

export async function verifyLocalSession(cookie: string | undefined | null) {
  if (!cookie) return null;
  try {
    const { payload } = await jwtVerify(cookie, getSessionSecret(), { algorithms: ["HS256"] });
    const { openId, name } = payload as Record<string, unknown>;
    if (typeof openId !== "string" || !openId) return null;
    return { openId, name: (name as string) || "" };
  } catch {
    return null;
  }
}

// ─── Password helpers ────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  // Support SHA-256 fallback format: "sha256:salt:hash"
  if (hash.startsWith("sha256:")) {
    const [, salt, storedHash] = hash.split(":");
    const { createHash } = await import("crypto");
    const computed = createHash("sha256").update(salt + plain).digest("hex");
    return computed === storedHash;
  }
  return bcrypt.compare(plain, hash);
}

// ─── Express routes ──────────────────────────────────────────────────────────

export function registerLocalAuthRoutes(app: Express) {
  /**
   * POST /api/auth/login
   * Body: { email: string, password: string }
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "Email e senha são obrigatórios." });
      return;
    }

    try {
      // Look up user by email in local DB
      const user = await db.getUserByEmail(email.trim().toLowerCase());

      if (!user) {
        res.status(401).json({ error: "Email ou senha incorretos." });
        return;
      }

      // Verify password hash
      const passwordField = (user as any).passwordHash ?? (user as any).password ?? null;
      if (!passwordField) {
        // No password set — this user was created via OAuth; cannot login locally
        res.status(401).json({ error: "Esta conta não possui senha. Use o login OAuth." });
        return;
      }

      const valid = await verifyPassword(password, passwordField);
      if (!valid) {
        res.status(401).json({ error: "Email ou senha incorretos." });
        return;
      }

      // Create session token
      const token = await createLocalSessionToken(user.openId, user.name ?? user.email ?? "");
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Update lastSignedIn
      await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });

      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
      console.error("[LocalAuth] Login error:", error);
      res.status(500).json({ error: "Erro interno ao fazer login." });
    }
  });

  /**
   * POST /api/auth/logout
   */
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  /**
   * POST /api/auth/register  (only in local mode, for first-time admin setup)
   * Body: { email, password, name, adminSecret }
   */
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { email, password, name, adminSecret } = req.body ?? {};
    const expectedSecret = process.env.LOCAL_ADMIN_SECRET || "real94-admin-2026";

    if (adminSecret !== expectedSecret) {
      res.status(403).json({ error: "Segredo de administrador inválido." });
      return;
    }

    if (!email || !password) {
      res.status(400).json({ error: "Email e senha são obrigatórios." });
      return;
    }

    try {
      const existing = await db.getUserByEmail(email.trim().toLowerCase());
      if (existing) {
        res.status(409).json({ error: "Este email já está cadastrado." });
        return;
      }

      const passwordHash = await hashPassword(password);
      const openId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      await db.upsertUser({
        openId,
        email: email.trim().toLowerCase(),
        name: name || email,
        loginMethod: "local",
        role: "admin",
        lastSignedIn: new Date(),
        passwordHash,
      } as any);

      const token = await createLocalSessionToken(openId, name || email);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true });
    } catch (error) {
      console.error("[LocalAuth] Register error:", error);
      res.status(500).json({ error: "Erro ao criar conta." });
    }
  });
}
