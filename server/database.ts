import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type {
  CardRecord,
  DeviceSession,
  ImportRecord,
  ProgressRecord,
  SyncChange,
  SyncOperation,
  ToneAttempt,
  User,
  UserState,
  WordRecord,
  WordStatus,
} from "../shared/types.js";
import { paths } from "./config.js";

/** How many tone attempts are kept per user. See {@link HeoDatabase.trimTones}. */
export const MAX_TONE_ATTEMPTS = 500;

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
        updated_at TEXT NOT NULL,
         settings_json TEXT NOT NULL DEFAULT '{}'
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
      CREATE INDEX IF NOT EXISTS idx_tones_user ON tone_attempts(user_id, created_at);      `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_operations (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        operation_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        occurred_at INTEGER NOT NULL,
        accepted_at INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        result_json TEXT NOT NULL DEFAULT 'null',
        UNIQUE(user_id, operation_id)
      );
      CREATE INDEX IF NOT EXISTS idx_sync_user_sequence ON sync_operations(user_id, sequence);
      CREATE TABLE IF NOT EXISTS import_tombstones (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        entity_id TEXT NOT NULL,
        deleted_at INTEGER NOT NULL,
        PRIMARY KEY(user_id, entity_id)
      );
      CREATE TABLE IF NOT EXISTS review_events (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        operation_id TEXT NOT NULL,
        card_id TEXT NOT NULL,
        rating INTEGER NOT NULL,
        occurred_at INTEGER NOT NULL,
        accepted_at INTEGER NOT NULL,
        PRIMARY KEY(user_id, operation_id)
      );
      CREATE INDEX IF NOT EXISTS idx_review_card ON review_events(user_id, card_id, occurred_at, accepted_at);
      CREATE TABLE IF NOT EXISTS review_baselines (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        card_id TEXT NOT NULL,
        record_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY(user_id, card_id)
      );
    `);
    const columns = this.db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === "settings_json")) {
      this.db.exec("ALTER TABLE users ADD COLUMN settings_json TEXT NOT NULL DEFAULT '{}'");
    }
    const importColumns = this.db.prepare("PRAGMA table_info(imports)").all() as Array<{ name: string }>;
    if (!importColumns.some((column) => column.name === "entity_id")) {
      this.db.exec("ALTER TABLE imports ADD COLUMN entity_id TEXT");
      const rows = this.db.prepare("SELECT id FROM imports WHERE entity_id IS NULL").all() as Array<{
        id: number;
      }>;
      const update = this.db.prepare("UPDATE imports SET entity_id = ? WHERE id = ?");
      for (const row of rows) update.run(randomUUID(), row.id);
      this.db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_imports_entity ON imports(user_id, entity_id)");
    }
    const toneColumns = this.db.prepare("PRAGMA table_info(tone_attempts)").all() as Array<{ name: string }>;
    if (!toneColumns.some((column) => column.name === "entity_id")) {
      this.db.exec("ALTER TABLE tone_attempts ADD COLUMN entity_id TEXT");
      const rows = this.db.prepare("SELECT id FROM tone_attempts WHERE entity_id IS NULL").all() as Array<{
        id: number;
      }>;
      const update = this.db.prepare("UPDATE tone_attempts SET entity_id = ? WHERE id = ?");
      for (const row of rows) update.run(randomUUID(), row.id);
      this.db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_tones_entity ON tone_attempts(user_id, entity_id)");
    }
    const cardColumns = this.db.prepare("PRAGMA table_info(cards)").all() as Array<{ name: string }>;
    if (!cardColumns.some((column) => column.name === "kind")) {
      this.db.exec("ALTER TABLE cards ADD COLUMN kind TEXT NOT NULL DEFAULT 'word'");
    }
    if (!cardColumns.some((column) => column.name === "payload_json")) {
      this.db.exec("ALTER TABLE cards ADD COLUMN payload_json TEXT NOT NULL DEFAULT '{}'");
    }
  }

  close(): void {
    this.db.close();
  }

  transaction<T>(work: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = work();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  ping(): boolean {
    return Number((this.db.prepare("SELECT 1 AS ok").get() as { ok: number }).ok) === 1;
  }

  // -- users -----------------------------------------------------------------

  countUsers(): number {
    const row = this.db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
    return Number(row.n);
  }

  getUserAuth(usernameNorm: string): UserAuthRecord | null {
    const row = this.db.prepare("SELECT * FROM users WHERE username_norm = ?").get(usernameNorm) as
      Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      user: toUser(row),
      passwordHash: String(row.password_hash),
      passwordSalt: String(row.password_salt),
    };
  }

  getUser(id: string): User | null {
    const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
      Record<string, unknown> | undefined;
    return row ? toUser(row) : null;
  }

  listUsers(): User[] {
    const rows = this.db.prepare("SELECT * FROM users ORDER BY created_at").all() as Record<
      string,
      unknown
    >[];
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
    const row = this.db.prepare("SELECT * FROM sessions WHERE token_hash = ?").get(tokenHash) as
      SessionRow | undefined;
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

  listSessions(userId: string, currentId?: string): DeviceSession[] {
    const rows = this.db
      .prepare("SELECT id, created_at, last_seen FROM sessions WHERE user_id = ? ORDER BY last_seen DESC")
      .all(userId) as Array<{ id: string; created_at: number; last_seen: number }>;
    return rows.map((row) => ({
      id: row.id,
      deviceName: "Web or Android device",
      createdAt: Number(row.created_at),
      lastSeen: Number(row.last_seen),
      current: row.id === currentId,
    }));
  }

  deleteSession(userId: string, sessionId: string): void {
    this.db.prepare("DELETE FROM sessions WHERE user_id = ? AND id = ?").run(userId, sessionId);
  }

  purgeExpiredSessions(): void {
    this.db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
  }

  // -- per-user learning state ----------------------------------------------

  getState(userId: string): UserState {
    return {
      words: this.listWords(userId),
      progress: this.listProgress(userId),
      imports: this.listImports(userId),
      tones: this.listTones(userId),
      cards: this.listCards(userId),
      syncCursor: this.latestSyncCursor(userId),
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
    const row = this.db.prepare("SELECT * FROM words WHERE user_id = ? AND entry = ?").get(userId, entry) as
      Record<string, unknown> | undefined;
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
      .run(userId, word.entry, word.gloss, word.status, word.timesSeen, word.firstSeen, word.updatedAt);
  }

  setWordStatus(userId: string, entry: string, status: WordStatus): void {
    this.db
      .prepare("UPDATE words SET status = ?, updated_at = ? WHERE user_id = ? AND entry = ?")
      .run(status, Date.now(), userId, entry);
  }

  listCards(userId: string): CardRecord[] {
    const rows = this.db.prepare("SELECT * FROM cards WHERE user_id = ? ORDER BY due").all(userId) as Record<
      string,
      unknown
    >[];
    return rows.map((row) => ({
      id: String(row.id),
      entry: String(row.entry),
      gloss: String(row.gloss),
      sourceSentenceId: String(row.source_sentence_id),
      card: JSON.parse(String(row.card_json)),
      due: Number(row.due),
      updatedAt: Number(row.updated_at),
      kind: (typeof row.kind === "string" ? row.kind : "word") as CardRecord["kind"],
      payload: JSON.parse(typeof row.payload_json === "string" ? row.payload_json : "{}"),
    }));
  }

  listCardsDue(userId: string, now: number): CardRecord[] {
    const rows = this.db
      .prepare("SELECT * FROM cards WHERE user_id = ? AND due <= ? ORDER BY due")
      .all(userId, now) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      entry: String(row.entry),
      gloss: String(row.gloss),
      sourceSentenceId: String(row.source_sentence_id),
      card: JSON.parse(String(row.card_json)),
      due: Number(row.due),
      updatedAt: Number(row.updated_at),
      kind: (typeof row.kind === "string" ? row.kind : "word") as CardRecord["kind"],
      payload: JSON.parse(typeof row.payload_json === "string" ? row.payload_json : "{}"),
    }));
  }

  countNewCardsSince(userId: string, since: number): number {
    const row = this.db
      .prepare(
        "SELECT COUNT(*) AS n FROM cards WHERE user_id = ? AND updated_at >= ? AND json_extract(card_json, '$.reps') = 1",
      )
      .get(userId, since) as { n: number };
    return Number(row.n);
  }

  rescheduleCardDue(userId: string, id: string, due: number): void {
    this.db.prepare("UPDATE cards SET due = ? WHERE user_id = ? AND id = ?").run(due, userId, id);
  }

  getSettings(userId: string): Record<string, number> {
    const row = this.db.prepare("SELECT settings_json FROM users WHERE id = ?").get(userId) as
      { settings_json?: string } | undefined;
    try {
      return row?.settings_json ? (JSON.parse(row.settings_json) as Record<string, number>) : {};
    } catch {
      return {};
    }
  }

  setSettings(userId: string, settings: Record<string, number>): void {
    this.db
      .prepare("UPDATE users SET settings_json = ?, updated_at = ? WHERE id = ?")
      .run(JSON.stringify(settings), new Date().toISOString(), userId);
  }
  getCard(userId: string, id: string): CardRecord | null {
    const row = this.db.prepare("SELECT * FROM cards WHERE user_id = ? AND id = ?").get(userId, id) as
      Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      entry: String(row.entry),
      gloss: String(row.gloss),
      sourceSentenceId: String(row.source_sentence_id),
      card: JSON.parse(String(row.card_json)),
      due: Number(row.due),
      updatedAt: Number(row.updated_at),
      kind: (typeof row.kind === "string" ? row.kind : "word") as CardRecord["kind"],
      payload: JSON.parse(typeof row.payload_json === "string" ? row.payload_json : "{}"),
    };
  }

  putCard(userId: string, card: CardRecord): void {
    this.db
      .prepare(
        `INSERT INTO cards (user_id, id, entry, gloss, source_sentence_id, card_json, due, updated_at, kind, payload_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, id) DO UPDATE SET
           gloss = excluded.gloss, card_json = excluded.card_json,
           due = excluded.due, updated_at = excluded.updated_at,
           kind = excluded.kind, payload_json = excluded.payload_json`,
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
        card.kind ?? "word",
        JSON.stringify(card.payload ?? {}),
      );
  }

  listProgress(userId: string): ProgressRecord[] {
    const rows = this.db.prepare("SELECT * FROM progress WHERE user_id = ?").all(userId) as Record<
      string,
      unknown
    >[];
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
      entityId: String(row.entity_id),
      title: String(row.title),
      raw: String(row.raw),
      difficulty: Number(row.difficulty),
      importedAt: Number(row.imported_at),
    }));
  }

  addImport(
    userId: string,
    input: { title: string; raw: string; difficulty: number },
    entityId: string = randomUUID(),
  ): ImportRecord {
    const tombstone = this.db
      .prepare("SELECT 1 AS present FROM import_tombstones WHERE user_id = ? AND entity_id = ?")
      .get(userId, entityId);
    if (tombstone) throw new Error("IMPORT_DELETED");
    const importedAt = Date.now();
    this.db
      .prepare(
        "INSERT OR IGNORE INTO imports (user_id, title, raw, difficulty, imported_at, entity_id) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(userId, input.title, input.raw, input.difficulty, importedAt, entityId);
    const row = this.db
      .prepare("SELECT * FROM imports WHERE user_id = ? AND entity_id = ?")
      .get(userId, entityId) as Record<string, unknown>;
    return {
      id: Number(row.id),
      entityId: String(row.entity_id),
      title: String(row.title),
      raw: String(row.raw),
      difficulty: Number(row.difficulty),
      importedAt: Number(row.imported_at),
    };
  }

  deleteImport(userId: string, id: number): void {
    const row = this.db
      .prepare("SELECT entity_id FROM imports WHERE user_id = ? AND id = ?")
      .get(userId, id) as { entity_id: string } | undefined;
    if (row) this.deleteImportEntity(userId, row.entity_id);
  }

  deleteImportEntity(userId: string, entityId: string): void {
    const now = Date.now();
    this.db
      .prepare(
        "INSERT INTO import_tombstones (user_id, entity_id, deleted_at) VALUES (?, ?, ?) ON CONFLICT(user_id, entity_id) DO UPDATE SET deleted_at = MAX(deleted_at, excluded.deleted_at)",
      )
      .run(userId, entityId, now);
    this.db.prepare("DELETE FROM imports WHERE user_id = ? AND entity_id = ?").run(userId, entityId);
  }

  deleteAllImports(userId: string): void {
    const rows = this.db.prepare("SELECT entity_id FROM imports WHERE user_id = ?").all(userId) as Array<{
      entity_id: string;
    }>;
    for (const row of rows) this.deleteImportEntity(userId, row.entity_id);
  }

  listTones(userId: string): ToneAttempt[] {
    const rows = this.db
      .prepare("SELECT * FROM tone_attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 200")
      .all(userId) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: Number(row.id),
      entityId: String(row.entity_id),
      tone: String(row.tone),
      syllable: String(row.syllable),
      score: Number(row.score),
      createdAt: Number(row.created_at),
    }));
  }

  addTone(
    userId: string,
    input: { tone: string; syllable: string; score: number },
    entityId: string = randomUUID(),
  ): void {
    this.db
      .prepare(
        "INSERT OR IGNORE INTO tone_attempts (user_id, tone, syllable, score, created_at, entity_id) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(userId, input.tone, input.syllable, input.score, Date.now(), entityId);
    this.trimTones(userId);
  }

  /**
   * Tone attempts are a practice trail, not a record: only the recent shape of
   * someone's accuracy is useful, and the table would otherwise grow without
   * bound from a drill you can run several times a minute.
   */
  trimTones(userId: string, keep = MAX_TONE_ATTEMPTS): void {
    this.db
      .prepare(
        `DELETE FROM tone_attempts
          WHERE user_id = ?
            AND id NOT IN (
              SELECT id FROM tone_attempts WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?
            )`,
      )
      .run(userId, userId, keep);
  }

  countTones(userId: string): number {
    const row = this.db.prepare("SELECT COUNT(*) AS n FROM tone_attempts WHERE user_id = ?").get(userId) as {
      n: number;
    };
    return Number(row.n);
  }

  getSyncOperation(userId: string, operationId: string): SyncChange | null {
    const row = this.db
      .prepare("SELECT * FROM sync_operations WHERE user_id = ? AND operation_id = ?")
      .get(userId, operationId) as Record<string, unknown> | undefined;
    return row ? this.toSyncChange(row) : null;
  }

  recordSyncOperation(userId: string, operation: SyncOperation, result: unknown): SyncChange {
    const acceptedAt = Date.now();
    this.db
      .prepare(
        `INSERT INTO sync_operations
          (user_id, operation_id, device_id, entity_id, kind, occurred_at, accepted_at, payload_json, result_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        userId,
        operation.operationId,
        operation.deviceId,
        operation.entityId,
        operation.kind,
        operation.occurredAt,
        acceptedAt,
        JSON.stringify(operation.payload),
        JSON.stringify(result ?? null),
      );
    return this.getSyncOperation(userId, operation.operationId)!;
  }

  listSyncChanges(userId: string, cursor: number, limit = 1000): SyncChange[] {
    const rows = this.db
      .prepare("SELECT * FROM sync_operations WHERE user_id = ? AND sequence > ? ORDER BY sequence LIMIT ?")
      .all(userId, cursor, limit) as Record<string, unknown>[];
    return rows.map((row) => this.toSyncChange(row));
  }

  latestSyncCursor(userId: string): number {
    const row = this.db
      .prepare("SELECT COALESCE(MAX(sequence), 0) AS cursor FROM sync_operations WHERE user_id = ?")
      .get(userId) as { cursor: number };
    return Number(row.cursor);
  }

  recordReviewEvent(
    userId: string,
    operationId: string,
    cardId: string,
    rating: number,
    occurredAt: number,
  ): void {
    this.db
      .prepare(
        "INSERT OR IGNORE INTO review_events (user_id, operation_id, card_id, rating, occurred_at, accepted_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(userId, operationId, cardId, rating, occurredAt, Date.now());
  }

  ensureReviewBaseline(userId: string, card: CardRecord): void {
    this.db
      .prepare(
        "INSERT OR IGNORE INTO review_baselines (user_id, card_id, record_json, created_at) VALUES (?, ?, ?, ?)",
      )
      .run(userId, card.id, JSON.stringify(card), Date.now());
  }

  getReviewBaseline(userId: string, cardId: string): CardRecord | null {
    const row = this.db
      .prepare("SELECT record_json FROM review_baselines WHERE user_id = ? AND card_id = ?")
      .get(userId, cardId) as { record_json: string } | undefined;
    return row ? (JSON.parse(row.record_json) as CardRecord) : null;
  }

  listReviewEvents(userId: string, cardId: string): Array<{ rating: number; occurredAt: number }> {
    const rows = this.db
      .prepare(
        "SELECT rating, occurred_at FROM review_events WHERE user_id = ? AND card_id = ? ORDER BY occurred_at, accepted_at, operation_id",
      )
      .all(userId, cardId) as Array<{ rating: number; occurred_at: number }>;
    return rows.map((row) => ({ rating: Number(row.rating), occurredAt: Number(row.occurred_at) }));
  }

  deleteUser(userId: string): void {
    this.db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  }

  private toSyncChange(row: Record<string, unknown>): SyncChange {
    return {
      sequence: Number(row.sequence),
      operationId: String(row.operation_id),
      entityId: String(row.entity_id),
      kind: String(row.kind) as SyncChange["kind"],
      acceptedAt: Number(row.accepted_at),
      result: JSON.parse(String(row.result_json)),
    };
  }
}
