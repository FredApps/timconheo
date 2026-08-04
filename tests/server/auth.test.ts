import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";
import { RateLimiter, hashPassword, securityHeaders, verifyPassword } from "../../server/auth.js";

function fakeResponse(): Response & { headers: Record<string, string>; statusCode: number; body: unknown } {
  const headers: Record<string, string> = {};
  const res = {
    headers,
    statusCode: 200,
    body: undefined as unknown,
    setHeader(name: string, value: string | number) {
      headers[name.toLowerCase()] = String(value);
      return res;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res as unknown as Response & { headers: Record<string, string>; statusCode: number; body: unknown };
}

const request = (ip: string) => ({ ip, path: "/api/login" }) as unknown as Request;

test("rate limiting blocks past the window maximum", () => {
  const limiter = new RateLimiter(60_000, 3, (req) => String(req.ip));
  const res = fakeResponse();
  let allowed = 0;
  const next: NextFunction = () => {
    allowed += 1;
  };
  for (let i = 0; i < 5; i += 1) limiter.middleware(request("1.2.3.4"), res, next);
  assert.equal(allowed, 3);
  assert.equal(res.statusCode, 429);
  assert.equal(res.headers["retry-after"], "60");
});

test("stale rate-limit buckets are pruned rather than kept for the process lifetime", async () => {
  const limiter = new RateLimiter(20, 5, (req) => String(req.ip));
  const next: NextFunction = () => undefined;
  for (let i = 0; i < 40; i += 1) limiter.middleware(request(`10.0.0.${i}`), fakeResponse(), next);
  assert.equal(limiter.size, 40);

  // Once a full window has passed with no traffic from those addresses, the next
  // request sweeps them out.
  await new Promise((resolve) => setTimeout(resolve, 40));
  limiter.middleware(request("192.168.0.1"), fakeResponse(), next);
  assert.equal(limiter.size, 1);
});

test("rate limiting is per key", () => {
  const limiter = new RateLimiter(60_000, 2, (req) => String(req.ip));
  const next: NextFunction = () => undefined;
  const first = fakeResponse();
  const second = fakeResponse();
  for (let i = 0; i < 3; i += 1) limiter.middleware(request("1.1.1.1"), first, next);
  limiter.middleware(request("2.2.2.2"), second, next);
  assert.equal(first.statusCode, 429);
  assert.equal(second.statusCode, 200);
});

test("security headers deny framing and third-party connections", () => {
  const res = fakeResponse();
  let called = false;
  securityHeaders({} as Request, res, () => {
    called = true;
  });
  assert.ok(called);
  const csp = res.headers["content-security-policy"];
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /connect-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  assert.equal(res.headers["x-frame-options"], "DENY");
  assert.match(res.headers["permissions-policy"], /microphone=\(self\)/);
  assert.match(res.headers["permissions-policy"], /camera=\(\)/);
});

test("password hashing round-trips and rejects a wrong password", async () => {
  const { hash, salt } = await hashPassword("a-real-password");
  assert.equal(await verifyPassword("a-real-password", hash, salt), true);
  assert.equal(await verifyPassword("a-real-passwore", hash, salt), false);
  // Different salts must produce different hashes for the same input.
  const second = await hashPassword("a-real-password");
  assert.notEqual(second.hash, hash);
});
