import crypto, { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import type { User } from "../shared/types.js";
import { config } from "./config.js";
import type { HeoDatabase } from "./database.js";

const scrypt = promisify(scryptCallback);
const SESSION_MS = config.sessionDays * 24 * 60 * 60 * 1000;
const ROLL_AFTER_MS = 24 * 60 * 60 * 1000;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
    }
  }
}

export function normalizeUsername(value: unknown): string {
  return String(value ?? "").trim().toLocaleLowerCase("en-US");
}

export function validateUsername(value: unknown): { valid: boolean; username: string; error?: string } {
  const username = String(value ?? "").trim();
  if (!/^[A-Za-z0-9._-]{3,32}$/.test(username)) {
    return { valid: false, username, error: "Use 3-32 letters, numbers, dots, dashes, or underscores." };
  }
  return { valid: true, username };
}

export function validatePassword(value: unknown): { valid: boolean; password: string; error?: string } {
  const password = String(value ?? "");
  if (password.length < 6) return { valid: false, password, error: "Use at least 6 characters." };
  return { valid: true, password };
}

export async function hashPassword(password: string, saltHex?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : randomBytes(16);
  const derived = (await scrypt(password.normalize("NFKC"), salt, 64)) as Buffer;
  return { hash: derived.toString("hex"), salt: salt.toString("hex") };
}

export async function verifyPassword(password: string, expectedHash: string, salt: string): Promise<boolean> {
  try {
    const actual = Buffer.from((await hashPassword(password, salt)).hash, "hex");
    const expected = Buffer.from(expectedHash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function cookies(header: string | undefined): Map<string, string> {
  const values = new Map<string, string>();
  for (const pair of (header ?? "").split(";")) {
    const index = pair.indexOf("=");
    if (index < 0) continue;
    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (name) values.set(name, decodeURIComponent(value));
  }
  return values;
}

export class AuthService {
  constructor(private readonly db: HeoDatabase) {}

  async authenticate(usernameValue: unknown, passwordValue: unknown): Promise<User> {
    const record = this.db.getUserAuth(normalizeUsername(usernameValue));
    const password = String(passwordValue ?? "");
    // Always spend the same work whether or not the account exists, so response
    // timing does not reveal which usernames are real.
    const valid = record
      ? await verifyPassword(password, record.passwordHash, record.passwordSalt)
      : await fakePasswordCheck(password);
    if (!record || !valid || record.user.disabled) {
      throw authError("INVALID_CREDENTIALS", "Username or password is incorrect.");
    }
    return record.user;
  }

  issueSession(user: User, res: Response): void {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + SESSION_MS;
    this.db.createSession(user.id, hashSessionToken(token), expiresAt);
    this.setCookie(res, token, expiresAt);
  }

  clearSession(req: Request, res: Response): void {
    const token = cookies(req.headers.cookie).get(config.cookieName);
    if (token) this.db.deleteSessionByHash(hashSessionToken(token));
    res.clearCookie(config.cookieName, {
      path: config.basePath,
      secure: config.secureCookies,
      httpOnly: true,
      sameSite: "lax",
    });
  }

  middleware = (req: Request, res: Response, next: NextFunction): void => {
    const token = cookies(req.headers.cookie).get(config.cookieName);
    if (!token) return next();
    const session = this.db.getSession(hashSessionToken(token));
    if (!session || session.user.disabled) {
      res.clearCookie(config.cookieName, {
        path: config.basePath,
        secure: config.secureCookies,
        httpOnly: true,
        sameSite: "lax",
      });
      return next();
    }
    req.user = session.user;
    req.sessionId = session.id;
    if (Date.now() - session.lastSeen > ROLL_AFTER_MS) {
      const expiresAt = Date.now() + SESSION_MS;
      this.db.touchSession(session.id, expiresAt);
      this.setCookie(res, token, expiresAt);
    }
    next();
  };

  requireUser = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { code: "AUTH_REQUIRED", message: "Sign in to continue." } });
      return;
    }
    next();
  };

  private setCookie(res: Response, token: string, expiresAt: number): void {
    res.cookie(config.cookieName, token, {
      httpOnly: true,
      secure: config.secureCookies,
      sameSite: "lax",
      path: config.basePath,
      expires: new Date(expiresAt),
    });
  }
}

export function requireSameOrigin(req: Request, res: Response, next: NextFunction): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (!origin) return next();
  try {
    const originUrl = new URL(origin);
    const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
    const expectedHost = forwardedHost || req.get("host");
    if (originUrl.host === expectedHost && originUrl.protocol === "https:") return next();
    if (!config.secureCookies && originUrl.host === expectedHost) return next();
    // The Android WebView posts from the app origin rather than the site origin.
    if (originUrl.protocol === "https:" && originUrl.host === "ayrien.se") return next();
  } catch {
    // Handled below.
  }
  res.status(403).json({ error: { code: "ORIGIN_REJECTED", message: "The request origin was rejected." } });
}

export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly windowMs: number,
    private readonly maxHits: number,
    private readonly keyFor: (req: Request) => string = (req) => `${req.ip}:${req.path}`,
  ) {}

  middleware = (req: Request, res: Response, next: NextFunction): void => {
    const key = this.keyFor(req);
    const cutoff = Date.now() - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((value) => value > cutoff);
    if (recent.length >= this.maxHits) {
      res.setHeader("Retry-After", Math.ceil(this.windowMs / 1000));
      res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many attempts. Try again shortly." } });
      return;
    }
    recent.push(Date.now());
    this.hits.set(key, recent);
    next();
  };
}

export interface AppError extends Error {
  code: string;
  status: number;
}

export function authError(code: string, message: string): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  error.status = code === "INVALID_CREDENTIALS" ? 401 : 400;
  return error;
}

let fakeHash: Promise<{ hash: string; salt: string }> | null = null;
async function fakePasswordCheck(password: string): Promise<boolean> {
  fakeHash ??= hashPassword("invalid-password-placeholder");
  const value = await fakeHash;
  await verifyPassword(password, value.hash, value.salt);
  return false;
}
