import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import express, { type NextFunction, type Request, type Response } from "express";
import { createEmptyCard, fsrs, Rating, State, type Card } from "ts-fsrs";
import type { CardRecord } from "../shared/types.js";
import {
  LIMITS,
  ValidationError,
  validateCardId,
  validateCompletedAt,
  validateEntry,
  validateGloss,
  validateImport,
  validateMinutes,
  validateRowId,
  validateScore,
  validateSentenceId,
  validateSentenceIds,
  validateStoryId,
  validateSyllable,
  validateToneKey,
  validateWordStatus,
} from "../shared/validation.js";
import {
  AuthService,
  RateLimiter,
  hashPassword,
  normalizeUsername,
  requireSameOrigin,
  securityHeaders,
  validatePassword,
  validateUsername,
  type AppError,
} from "./auth.js";
import { config, paths } from "./config.js";
import { HeoDatabase } from "./database.js";
import { forgiveBacklog, packQueue } from "./scheduler.js";
import { FptTtsService, TtsError } from "./tts.js";

const here = path.dirname(fileURLToPath(import.meta.url));
// dist/server/server.js -> dist/client
const clientDir = path.resolve(here, "../client");

const db = new HeoDatabase();
const auth = new AuthService(db);
const scheduler = fsrs({ enable_fuzz: true, enable_short_term: true });
const tts = new FptTtsService(config.fptKeyFile, paths.ttsCache, config.fptTtsSpeed, {
  pollTimeoutMs: config.ttsPollTimeoutMs,
});

const startedAt = Date.now();

/**
 * Seed the first account so a fresh install is usable immediately. Only ever
 * runs when the users table is empty; it never resets an existing password.
 */
async function seedFirstUser(): Promise<void> {
  if (db.countUsers() > 0) return;
  const username = process.env.HEO_SEED_USER ?? "fredrik";
  const password = process.env.HEO_SEED_PASSWORD;
  if (!password) {
    throw new Error("HEO_SEED_PASSWORD must be set before the first account is created.");
  }
  const { hash, salt } = await hashPassword(password);
  db.createUser({
    username,
    usernameNorm: normalizeUsername(username),
    passwordHash: hash,
    passwordSalt: salt,
    isAdmin: true,
  });
  console.log(`[heo] seeded first user "${username}"`);
}

const app = express();
app.set("trust proxy", true);
app.disable("x-powered-by");
app.use(compression());
app.use(securityHeaders);
app.use(express.json({ limit: "1mb" }));
app.use(requireSameOrigin);
app.use(auth.middleware);

const router = express.Router();
const loginLimiter = new RateLimiter(60_000, 10, (req) => `login:${req.ip}`);
const ttsLimiter = new RateLimiter(60_000, 30, (req) => `tts:${req.user?.id ?? req.ip}`);

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}

/**
 * Validation throws rather than returning, so every route body is wrapped once
 * here and the shared validators decide the code and message. That is what makes
 * a 400 from `/api/tones` look the same as a 400 from `/api/imports`.
 */
function route(handler: (req: Request, res: Response) => void) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      handler(req, res);
    } catch (error) {
      next(error);
    }
  };
}

// -- auth ---------------------------------------------------------------------

router.get("/api/session", (req: Request, res: Response) => {
  res.json({ user: req.user ?? null, allowSignups: config.allowSignups });
});

router.post(
  "/api/login",
  loginLimiter.middleware,
  asyncRoute(async (req, res) => {
    const user = await auth.authenticate(req.body?.username, req.body?.password);
    auth.issueSession(user, res);
    res.json({ user });
  }),
);

router.post(
  "/api/signup",
  loginLimiter.middleware,
  asyncRoute(async (req, res) => {
    // Open only when explicitly enabled, or when there is genuinely no account yet.
    if (!config.allowSignups && db.countUsers() > 0) {
      res.status(403).json({ error: { code: "SIGNUPS_CLOSED", message: "Signups are closed." } });
      return;
    }
    const username = validateUsername(req.body?.username);
    if (!username.valid) {
      res.status(400).json({ error: { code: "INVALID_USERNAME", message: username.error } });
      return;
    }
    const password = validatePassword(req.body?.password);
    if (!password.valid) {
      res.status(400).json({ error: { code: "INVALID_PASSWORD", message: password.error } });
      return;
    }
    const usernameNorm = normalizeUsername(username.username);
    if (db.getUserAuth(usernameNorm)) {
      res.status(409).json({ error: { code: "USERNAME_TAKEN", message: "That name is taken." } });
      return;
    }
    const { hash, salt } = await hashPassword(password.password);
    const user = db.createUser({
      username: username.username,
      usernameNorm,
      passwordHash: hash,
      passwordSalt: salt,
      isAdmin: db.countUsers() === 0,
    });
    auth.issueSession(user, res);
    res.status(201).json({ user });
  }),
);

router.post("/api/logout", (req: Request, res: Response) => {
  auth.clearSession(req, res);
  res.json({ ok: true });
});

// -- learning state -----------------------------------------------------------

router.get("/api/state", auth.requireUser, (req: Request, res: Response) => {
  res.json(db.getState(req.user!.id));
});

/** Tapping a word in the reader: record it, and open a recognition card once. */
router.post(
  "/api/words/remember",
  auth.requireUser,
  route((req, res) => {
    const userId = req.user!.id;
    const entry = validateEntry(req.body?.entry);
    const gloss = validateGloss(req.body?.gloss);
    const sourceSentenceId = validateSentenceId(req.body?.sourceSentenceId);
    const now = Date.now();
    const current = db.getWord(userId, entry);
    db.putWord(userId, {
      entry,
      gloss,
      status: current?.status === "known" ? "known" : "learning",
      timesSeen: (current?.timesSeen ?? 0) + 1,
      firstSeen: current?.firstSeen ?? now,
      updatedAt: now,
    });
    const id = `recognition:${entry}`;
    if (!db.getCard(userId, id)) {
      const card = createEmptyCard(new Date());
      db.putCard(userId, {
        id,
        entry,
        gloss,
        sourceSentenceId,
        card: card as unknown as Record<string, unknown>,
        due: new Date(card.due).getTime(),
        updatedAt: now,
      });
    }
    res.json({ word: db.getWord(userId, entry), card: db.getCard(userId, id) });
  }),
);

router.post(
  "/api/words/status",
  auth.requireUser,
  route((req, res) => {
    const userId = req.user!.id;
    const entry = validateEntry(req.body?.entry);
    const status = validateWordStatus(req.body?.status);
    // The word list lets you mark a word you never tapped, so this upserts.
    const existing = db.getWord(userId, entry);
    if (existing) {
      db.setWordStatus(userId, entry, status);
    } else {
      const now = Date.now();
      db.putWord(userId, {
        entry,
        gloss: validateGloss(req.body?.gloss),
        status,
        timesSeen: 1,
        firstSeen: now,
        updatedAt: now,
      });
    }
    res.json({ word: db.getWord(userId, entry) });
  }),
);

/** Queue construction is server-owned so every device sees the same due set. */
router.get(
  "/api/cards/queue",
  auth.requireUser,
  route((req, res) => {
    const userId = req.user!.id;
    const minutes = validateMinutes(req.query.minutes);
    const now = Date.now();
    let settings = db.getSettings(userId);
    let due = db.listCardsDue(userId, now);
    const forgiveness = forgiveBacklog(due, now, settings);
    if (forgiveness.applied) {
      for (const item of forgiveness.cards) db.rescheduleCardDue(userId, item.id, item.due);
      settings = { ...forgiveness.settings, lastQueueAt: now };
      due = db.listCardsDue(userId, now);
    } else {
      settings = { ...settings, lastQueueAt: now };
    }
    db.setSettings(userId, settings);
    const newCount = db.countNewCardsSince(userId, now - 86400000);
    const budgetMs = minutes * 60000;
    const cards = packQueue(due, now, budgetMs, newCount);
    res.json({
      cards,
      budgetMs,
      serverNow: now,
      newCount,
      forgiveness: forgiveness.applied
        ? { message: "Welcome back — your reviews were gently spread out." }
        : null,
    });
  }),
);

/** FSRS scheduling lives here so every device sees the same due dates. */
router.post(
  "/api/cards/review",
  auth.requireUser,
  route((req, res) => {
    const userId = req.user!.id;
    const id = validateCardId(req.body?.id);
    const rating = Number(req.body?.rating);
    if (![Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].includes(rating)) {
      res.status(400).json({ error: { code: "INVALID_RATING", message: "Unknown rating." } });
      return;
    }
    const record = db.getCard(userId, id);
    if (!record) {
      res.status(404).json({ error: { code: "NO_CARD", message: "No such card." } });
      return;
    }
    const scheduled = scheduler.next(record.card as unknown as Card, new Date(), rating);
    const updated: CardRecord = {
      ...record,
      card: scheduled.card as unknown as Record<string, unknown>,
      due: new Date(scheduled.card.due).getTime(),
      updatedAt: Date.now(),
    };
    db.putCard(userId, updated);
    const previousWord = db.getWord(userId, record.entry);
    // Promotion is monotonic. Reaching "known" is permanent: a lapse re-opens
    // review scheduling but never uproots a garden plant. A user may still demote
    // by hand from the word list -- an explicit claim is a different thing from a
    // scheduler side effect.
    const nextStatus =
      previousWord?.status === "known" || scheduled.card.state === State.Review ? "known" : "learning";
    db.setWordStatus(userId, record.entry, nextStatus);
    res.json({ card: updated, word: db.getWord(userId, record.entry) });
  }),
);

router.post(
  "/api/progress",
  auth.requireUser,
  route((req, res) => {
    db.putProgress(req.user!.id, {
      storyId: validateStoryId(req.body?.storyId),
      sentencesRead: validateSentenceIds(req.body?.sentencesRead),
      completedAt: validateCompletedAt(req.body?.completedAt),
      updatedAt: Date.now(),
    });
    res.json({ progress: db.listProgress(req.user!.id) });
  }),
);

router.post(
  "/api/imports",
  auth.requireUser,
  route((req, res) => {
    const input = validateImport(req.body ?? {});
    res.status(201).json({ import: db.addImport(req.user!.id, input) });
  }),
);

router.delete(
  "/api/imports/:id",
  auth.requireUser,
  route((req, res) => {
    db.deleteImport(req.user!.id, validateRowId(req.params.id));
    res.json({ ok: true });
  }),
);

router.post(
  "/api/tones",
  auth.requireUser,
  route((req, res) => {
    db.addTone(req.user!.id, {
      tone: validateToneKey(req.body?.tone),
      syllable: validateSyllable(req.body?.syllable),
      score: validateScore(req.body?.score),
    });
    res.json({ tones: db.listTones(req.user!.id) });
  }),
);

// -- speech -------------------------------------------------------------------

router.post(
  "/api/tts",
  auth.requireUser,
  ttsLimiter.middleware,
  asyncRoute(async (req, res) => {
    const response = await tts.request(req.body?.text, req.body?.voice);
    res.status(response.status === "pending" ? 202 : 200).json(response);
  }),
);

/**
 * Which of these phrases would play instantly. Answered from the local cache
 * only: nothing here reaches FPT, so the reader can show what a tap will cost
 * without spending quota to find out.
 */
router.post(
  "/api/tts/cached",
  auth.requireUser,
  asyncRoute(async (req, res) => {
    const texts: unknown = req.body?.texts;
    if (!Array.isArray(texts)) {
      throw new ValidationError("INVALID_TEXTS", "Texts must be a list.", "texts");
    }
    if (texts.length > 200) {
      throw new ValidationError("INVALID_TEXTS", "At most 200 phrases per request.", "texts");
    }
    const voice: unknown = req.body?.voice;
    const cached: boolean[] = [];
    for (const text of texts) {
      cached.push(await tts.isCached(text, voice).catch(() => false));
    }
    res.json({ cached });
  }),
);

router.get(
  "/api/tts/:id",
  auth.requireUser,
  asyncRoute(async (req, res) => {
    const response = await tts.status(String(req.params.id));
    res.status(response.status === "failed" ? 503 : response.status === "pending" ? 202 : 200).json(response);
  }),
);

router.get(
  "/api/tts/audio/:id",
  auth.requireUser,
  asyncRoute(async (req, res) => {
    const audio = await tts.audio(String(req.params.id));
    res.type("audio/mpeg");
    res.setHeader("Cache-Control", "private, max-age=2592000");
    res.setHeader("Content-Length", String(audio.size));
    res.sendFile(audio.path);
  }),
);

router.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    version: config.version,
    commit: config.commit || null,
    startedAt: new Date(startedAt).toISOString(),
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    limits: { importText: LIMITS.importText, importTitle: LIMITS.importTitle },
  });
});

// -- downloads ----------------------------------------------------------------

// The APK is served from the data directory rather than dist/client, because
// `vite build` empties dist/client on every install.
router.use(
  "/download",
  express.static(path.join(config.dataDir, "downloads"), {
    setHeaders(res, filePath) {
      if (filePath.endsWith(".apk")) {
        res.setHeader("Content-Type", "application/vnd.android.package-archive");
      }
      res.setHeader("Cache-Control", "no-cache");
    },
  }),
);

// -- static client ------------------------------------------------------------

router.use(
  express.static(clientDir, {
    index: false,
    setHeaders(res, filePath) {
      // Vite emits content-hashed asset filenames, so they can be cached hard.
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }),
);

// The client routes on the hash, so every non-API path returns the shell.
router.get(/.*/, (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(clientDir, "index.html"));
});

app.use(config.basePath, router);
app.get("/", (_req: Request, res: Response) => res.redirect(`${config.basePath}/`));

app.use((error: AppError | ValidationError | TtsError, _req: Request, res: Response, _next: NextFunction) => {
  const status = "status" in error && typeof error.status === "number" ? error.status : 500;
  if (status >= 500) console.error("[heo]", error);
  const body: { error: { code: string; message: string; field?: string } } = {
    error: {
      code: "code" in error && error.code ? error.code : "INTERNAL",
      message: status >= 500 ? "Something went wrong." : error.message,
    },
  };
  if (error instanceof ValidationError && error.field) body.error.field = error.field;
  res.status(status).json(body);
});

await seedFirstUser();
db.purgeExpiredSessions();
setInterval(() => db.purgeExpiredSessions(), 60 * 60 * 1000).unref();

app.listen(config.port, config.host, () => {
  console.log(
    `[heo] v${config.version}${config.commit ? ` (${config.commit.slice(0, 8)})` : ""} listening on ` +
      `http://${config.host}:${config.port}${config.basePath}/`,
  );
});
