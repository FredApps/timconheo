import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import express, { type NextFunction, type Request, type Response } from "express";
import { createEmptyCard, fsrs, Rating, State, type Card } from "ts-fsrs";
import type { CardRecord, WordStatus } from "../shared/types.js";
import {
  AuthService,
  RateLimiter,
  hashPassword,
  normalizeUsername,
  requireSameOrigin,
  validatePassword,
  validateUsername,
  type AppError,
} from "./auth.js";
import { config, paths } from "./config.js";
import { HeoDatabase } from "./database.js";
import { forgiveBacklog, packQueue } from "./scheduler.js";
import { FptTtsService } from "./tts.js";

const here = path.dirname(fileURLToPath(import.meta.url));
// dist/server/server.js -> dist/client
const clientDir = path.resolve(here, "../client");

const db = new HeoDatabase();
const auth = new AuthService(db);
const scheduler = fsrs({ enable_fuzz: true, enable_short_term: true });
const tts = new FptTtsService(config.fptKeyFile, paths.ttsCache, config.fptTtsSpeed, { pollTimeoutMs: config.ttsPollTimeoutMs });

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
app.use(express.json({ limit: "1mb" }));
app.use(requireSameOrigin);
app.use(auth.middleware);

const router = express.Router();
const loginLimiter = new RateLimiter(60_000, 10, (req) => `login:${req.ip}`);

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req, res).catch(next);
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
router.post("/api/words/remember", auth.requireUser, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const entry = String(req.body?.entry ?? "").trim();
  if (!entry) {
    res.status(400).json({ error: { code: "INVALID_ENTRY", message: "Missing entry." } });
    return;
  }
  const gloss = String(req.body?.gloss ?? "");
  const sourceSentenceId = String(req.body?.sourceSentenceId ?? "");
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
});

router.post("/api/words/status", auth.requireUser, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const entry = String(req.body?.entry ?? "").trim();
  const status = String(req.body?.status ?? "") as WordStatus;
  if (!entry) {
    res.status(400).json({ error: { code: "INVALID_ENTRY", message: "Missing entry." } });
    return;
  }
  if (!["new", "learning", "known", "ignored"].includes(status)) {
    res.status(400).json({ error: { code: "INVALID_STATUS", message: "Unknown status." } });
    return;
  }
  // The word list lets you mark a word you never tapped, so this upserts.
  const existing = db.getWord(userId, entry);
  if (existing) {
    db.setWordStatus(userId, entry, status);
  } else {
    const now = Date.now();
    db.putWord(userId, {
      entry,
      gloss: String(req.body?.gloss ?? ""),
      status,
      timesSeen: 1,
      firstSeen: now,
      updatedAt: now,
    });
  }
  res.json({ word: db.getWord(userId, entry) });
});

/** Queue construction is server-owned so every device sees the same due set. */
router.get("/api/cards/queue", auth.requireUser, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const minutes = Math.min(20, Math.max(1, Number(req.query.minutes ?? 5)));
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
  res.json({ cards, budgetMs, serverNow: now, newCount, forgiveness: forgiveness.applied ? { message: "Welcome back — your reviews were gently spread out." } : null });
});

/** FSRS scheduling lives here so every device sees the same due dates. */
router.post("/api/cards/review", auth.requireUser, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const id = String(req.body?.id ?? "");
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
  const nextStatus = previousWord?.status === "known" || scheduled.card.state === State.Review ? "known" : "learning";
  db.setWordStatus(userId, record.entry, nextStatus);
  res.json({ card: updated, word: db.getWord(userId, record.entry) });
});

router.post("/api/progress", auth.requireUser, (req: Request, res: Response) => {
  const storyId = String(req.body?.storyId ?? "");
  if (!storyId) {
    res.status(400).json({ error: { code: "INVALID_STORY", message: "Missing storyId." } });
    return;
  }
  const sentencesRead = Array.isArray(req.body?.sentencesRead)
    ? req.body.sentencesRead.map((value: unknown) => String(value))
    : [];
  db.putProgress(req.user!.id, {
    storyId,
    sentencesRead,
    completedAt: req.body?.completedAt ? Number(req.body.completedAt) : null,
    updatedAt: Date.now(),
  });
  res.json({ progress: db.listProgress(req.user!.id) });
});

router.post("/api/imports", auth.requireUser, (req: Request, res: Response) => {
  const raw = String(req.body?.raw ?? "").trim();
  if (!raw) {
    res.status(400).json({ error: { code: "EMPTY_IMPORT", message: "Nothing to import." } });
    return;
  }
  const record = db.addImport(req.user!.id, {
    title: String(req.body?.title ?? "My Vietnamese text"),
    raw,
    difficulty: Number(req.body?.difficulty ?? 0),
  });
  res.status(201).json({ import: record });
});

router.delete("/api/imports/:id", auth.requireUser, (req: Request, res: Response) => {
  db.deleteImport(req.user!.id, Number(req.params.id));
  res.json({ ok: true });
});

router.post("/api/tones", auth.requireUser, (req: Request, res: Response) => {
  db.addTone(req.user!.id, {
    tone: String(req.body?.tone ?? ""),
    syllable: String(req.body?.syllable ?? ""),
    score: Number(req.body?.score ?? 0),
  });
  res.json({ tones: db.listTones(req.user!.id) });
});

router.post("/api/tts", auth.requireUser, asyncRoute(async (req, res) => {
  const response = await tts.request(req.body?.text, req.body?.voice);
  res.status(response.status === "pending" ? 202 : 200).json(response);
}));

router.get("/api/tts/:id", auth.requireUser, asyncRoute(async (req, res) => {
  const response = await tts.status(String(req.params.id));
  res.status(response.status === "failed" ? 503 : response.status === "pending" ? 202 : 200).json(response);
}));

router.get("/api/tts/audio/:id", auth.requireUser, asyncRoute(async (req, res) => {
  const audio = await tts.audio(String(req.params.id));
  res.type("audio/mpeg");
  res.setHeader("Cache-Control", "private, max-age=2592000");
  res.setHeader("Content-Length", String(audio.size));
  res.sendFile(audio.path);
}));

router.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, version: config.version });
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

app.use((error: AppError, _req: Request, res: Response, _next: NextFunction) => {
  const status = error.status ?? 500;
  if (status >= 500) console.error("[heo]", error);
  res.status(status).json({
    error: { code: error.code ?? "INTERNAL", message: status >= 500 ? "Something went wrong." : error.message },
  });
});

await seedFirstUser();
db.purgeExpiredSessions();
setInterval(() => db.purgeExpiredSessions(), 60 * 60 * 1000).unref();

app.listen(config.port, config.host, () => {
  console.log(`[heo] listening on http://${config.host}:${config.port}${config.basePath}/`);
});

