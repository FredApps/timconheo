import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type {
  CardRecord,
  ImportRecord,
  ProgressRecord,
  ToneAttempt,
  User,
  UserState,
  WordRecord,
  WordStatus,
} from "../shared/types.js";
import { paths } from "./config.js";

export interface UserAuthRecord {
  user: User;
  passwordHash: string;
  passwordSalt: string;
}

interface SessionRow {
  id: string;
  user_id: string;
  expires_at: number;
  last_seen: number;
}

function toUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    username: String(row.username),
    isAdmin: Number(row.is_admin) === 1,
    disabled: Number(row.disabled) === 1,
    createdAt: String(row.created_at),
  };
}

export class HeoDatabase {
  private readonly db: DatabaseSync;

  constructor(file: string = paths.database) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        username_norm TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        is_admin INTEGER NOT NULL DEFAULT 0,
        disabled INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

      CREATE TABLE IF NOT EXISTS words (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        entry TEXT NOT NULL,
        gloss TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'learning',
        times_seen INTEGER NOT NULL DEFAULT 0,
        first_seen INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, entry)
      );

      CREATE TABLE IF NOT EXISTS cards (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        id TEXT NOT NULL,
        entry TEXT NOT NULL,
        gloss TEXT NOT NULL DEFAULT '',
        source_sentence_id TEXT NOT NULL DEFAULT '',
        card_json TEXT NOT NULL,
        due INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(user_id, due);

      CREATE TABLE IF NOT EXISTS progress (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        story_id TEXT NOT NULL,
        sentences_json TEXT NOT NULL DEFAULT '[]',
        completed_at INTEGER,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, story_id)
      );

      CREATE TABLE IF NOT EXISTS imports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        raw TEXT NOT NULL,
        difficulty REAL NOT NULL DEFAULT 0,
        imported_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_imports_user ON imports(user_id, imported_at);

      CREATE TABLE IF NOT EXISTS tone_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tone TEXT NOT NULL,
        syllable TEXT NOT NULL DEFAULT '',
        score REAL NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tones_user ON tone_attempts(user_id, created_at);
    `);
  }

  close(): void {
    this.db.close();
  }

  // -- users -----------------------------------------------------------------

  countUsers(): number {
    const row = this.db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
    return Number(row.n);
  }

  getUserAuth(usernameNorm: string): UserAuthRecord | null {
    const row = this.db
      .prepare("SELECT * FROM users WHERE username_norm = ?")
      .get(usernameNorm) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      user: toUser(row),
      passwordHash: String(row.password_hash),
      passwordSalt: String(row.password_salt),
    };
  }

  getUser(id: string): User | null {
    const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? toUser(row) : null;
  }

  listUsers(): User[] {
    const rows = this.db
      .prepare("SELECT * FROM users ORDER BY created_at")
      .all() as Record<string, unknown>[];
    return rows.map(toUser);
  }

  createUser(input: {
    username: string;
    usernameNorm: string;
    passwordHash: string;
    passwordSalt: string;
    isAdmin: boolean;
  }): User {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO users (id, username, username_norm, password_hash, password_salt, is_admin, disabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      )
      .run(
        id,
        input.username,
        input.usernameNorm,
        input.passwordHash,
        input.passwordSalt,
        input.isAdmin ? 1 : 0,
        now,
        now,
      );
    return this.getUser(id)!;
  }

  setPassword(userId: string, passwordHash: string, passwordSalt: string): void {
    this.db
      .prepare("UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?")
      .run(passwordHash, passwordSalt, new Date().toISOString(), userId);
  }

  // -- sessions --------------------------------------------------------------

  createSession(userId: string, tokenHash: string, expiresAt: number): void {
    const now = Date.now();
    this.db
      .prepare(
        "INSERT INTO sessions (id, user_id, token_hash, expires_at, last_seen, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(randomUUID(), userId, tokenHash, expiresAt, now, now);
  }

  getSession(tokenHash: string): { id: string; user: User; lastSeen: number } | null {
    const row = this.db
      .prepare("SELECT * FROM sessions WHERE token_hash = ?")
      .get(tokenHash) as SessionRow | undefined;
    if (!row) return null;
    if (row.expires_at <= Date.now()) {
      this.deleteSessionByHash(tokenHash);
      return null;
    }
    const user = this.getUser(row.user_id);
    if (!user) return null;
    return { id: row.id, user, lastSeen: row.last_seen };
  }

  touchSession(id: string, expiresAt: number): void {
    this.db
      .prepare("UPDATE sessions SET expires_at = ?, last_seen = ? WHERE id = ?")
      .run(expiresAt, Date.now(), id);
  }

  deleteSessionByHash(tokenHash: string): void {
    this.db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
  }

  purgeExpiredSessions(): void {
    this.db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
  }

  // -- per-user learning state ----------------------------------------------

  getState(userId: string): UserState {
    return {
      words: this.listWords(userId),
      cards: this.listCards(userId),
      progress: this.listProgress(userId),
      imports: this.listImports(userId),
      tones: this.listTones(userId),
    };
  }

  listWords(userId: string): WordRecord[] {
    const rows = this.db
      .prepare("SELECT * FROM words WHERE user_id = ? ORDER BY updated_at DESC")
      .all(userId) as Record<string, unknown>[];
    return rows.map((row) => ({
      entry: String(row.entry),
      gloss: String(row.gloss),
      status: String(row.status) as WordStatus,
      timesSeen: Number(row.times_seen),
      firstSeen: Number(row.first_seen),
      updatedAt: Number(row.updated_at),
    }));
  }

  getWord(userId: string, entry: string): WordRecord | null {
    const row = this.db
      .prepare("SELECT * FROM words WHERE user_id = ? AND entry = ?")
      .get(userId, entry) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      entry: String(row.entry),
      gloss: String(row.gloss),
      status: String(row.status) as WordStatus,
      timesSeen: Number(row.times_seen),
      firstSeen: Number(row.first_seen),
      updatedAt: Number(row.updated_at),
    };
  }

  putWord(userId: string, word: WordRecord): void {
    this.db
      .prepare(
        `INSERT INTO words (user_id, entry, gloss, status, times_seen, first_seen, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, entry) DO UPDATE SET
           gloss = excluded.gloss, status = excluded.status,
           times_seen = excluded.times_seen, updated_at = excluded.updated_at`,
      )
      .run(
        userId,
        word.entry,
        word.gloss,
        word.status,
        word.timesSeen,
        word.firstSeen,
        word.updatedAt,
      );
  }

  setWordStatus(userId: string, entry: string, status: WordStatus): void {
    this.db
      .prepare("UPDATE words SET status = ?, updated_at = ? WHERE user_id = ? AND entry = ?")
      .run(status, Date.now(), userId, entry);
  }

  listCards(userId: string): CardRecord[] {
    const rows = this.db
      .prepare("SELECT * FROM cards WHERE user_id = ? ORDER BY due")
      .all(userId) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      entry: String(row.entry),
      gloss: String(row.gloss),
      sourceSentenceId: String(row.source_sentence_id),
      card: JSON.parse(String(row.card_json)),
      due: Number(row.due),
      updatedAt: Number(row.updated_at),
    }));
  }

  getCard(userId: string, id: string): CardRecord | null {
    const row = this.db
      .prepare("SELECT * FROM cards WHERE user_id = ? AND id = ?")
      .get(userId, id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      entry: String(row.entry),
      gloss: String(row.gloss),
      sourceSentenceId: String(row.source_sentence_id),
      card: JSON.parse(String(row.card_json)),
      due: Number(row.due),
      updatedAt: Number(row.updated_at),
    };
  }

  putCard(userId: string, card: CardRecord): void {
    this.db
      .prepare(
        `INSERT INTO cards (user_id, id, entry, gloss, source_sentence_id, card_json, due, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, id) DO UPDATE SET
           gloss = excluded.gloss, card_json = excluded.card_json,
           due = excluded.due, updated_at = excluded.updated_at`,
      )
      .run(
        userId,
        card.id,
        card.entry,
        card.gloss,
        card.sourceSentenceId,
        JSON.stringify(card.card),
        card.due,
        card.updatedAt,
      );
  }

  listProgress(userId: string): ProgressRecord[] {
    const rows = this.db
      .prepare("SELECT * FROM progress WHERE user_id = ?")
      .all(userId) as Record<string, unknown>[];
    return rows.map((row) => ({
      storyId: String(row.story_id),
      sentencesRead: JSON.parse(String(row.sentences_json)),
      completedAt: row.completed_at == null ? null : Number(row.completed_at),
      updatedAt: Number(row.updated_at),
    }));
  }

  putProgress(userId: string, progress: ProgressRecord): void {
    this.db
      .prepare(
        `INSERT INTO progress (user_id, story_id, sentences_json, completed_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, story_id) DO UPDATE SET
           sentences_json = excluded.sentences_json,
           completed_at = excluded.completed_at,
           updated_at = excluded.updated_at`,
      )
      .run(
        userId,
        progress.storyId,
        JSON.stringify(progress.sentencesRead),
        progress.completedAt,
        progress.updatedAt,
      );
  }

  listImports(userId: string): ImportRecord[] {
    const rows = this.db
      .prepare("SELECT * FROM imports WHERE user_id = ? ORDER BY imported_at DESC")
      .all(userId) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: Number(row.id),
      title: String(row.title),
      raw: String(row.raw),
      difficulty: Number(row.difficulty),
      importedAt: Number(row.imported_at),
    }));
  }

  addImport(
    userId: string,
    input: { title: string; raw: string; difficulty: number },
  ): ImportRecord {
    const importedAt = Date.now();
    this.db
      .prepare(
        "INSERT INTO imports (user_id, title, raw, difficulty, imported_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(userId, input.title, input.raw, input.difficulty, importedAt);
    const row = this.db
      .prepare("SELECT * FROM imports WHERE user_id = ? ORDER BY id DESC LIMIT 1")
      .get(userId) as Record<string, unknown>;
    return {
      id: Number(row.id),
      title: String(row.title),
      raw: String(row.raw),
      difficulty: Number(row.difficulty),
      importedAt: Number(row.imported_at),
    };
  }

  deleteImport(userId: string, id: number): void {
    this.db.prepare("DELETE FROM imports WHERE user_id = ? AND id = ?").run(userId, id);
  }

  listTones(userId: string): ToneAttempt[] {
    const rows = this.db
      .prepare("SELECT * FROM tone_attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 200")
      .all(userId) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: Number(row.id),
      tone: String(row.tone),
      syllable: String(row.syllable),
      score: Number(row.score),
      createdAt: Number(row.created_at),
    }));
  }

  addTone(userId: string, input: { tone: string; syllable: string; score: number }): void {
    this.db
      .prepare(
        "INSERT INTO tone_attempts (user_id, tone, syllable, score, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(userId, input.tone, input.syllable, input.score, Date.now());
  }
}
