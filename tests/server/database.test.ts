import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { HeoDatabase, MAX_TONE_ATTEMPTS } from "../../server/database.js";

/** Every test gets its own file; none of them may touch the production database. */
function temporaryDatabase(): { db: HeoDatabase; dispose: () => void } {
  const dir = mkdtempSync(path.join(tmpdir(), "heo-test-"));
  const db = new HeoDatabase(path.join(dir, "test.sqlite3"));
  return {
    db,
    dispose: () => {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

function seedUser(db: HeoDatabase): string {
  return db.createUser({
    username: "tester",
    usernameNorm: "tester",
    passwordHash: "hash",
    passwordSalt: "salt",
    isAdmin: true,
  }).id;
}

test("tone attempts are capped so a drill cannot grow the table without bound", () => {
  const { db, dispose } = temporaryDatabase();
  try {
    const userId = seedUser(db);
    for (let i = 0; i < MAX_TONE_ATTEMPTS + 25; i += 1) {
      db.addTone(userId, { tone: "hoi-nga", syllable: "mả", score: i / 1000 });
    }
    assert.equal(db.countTones(userId), MAX_TONE_ATTEMPTS);
  } finally {
    dispose();
  }
});

test("sync operations are idempotent and cursor ordered", () => {
  const { db, dispose } = temporaryDatabase();
  try {
    const userId = seedUser(db);
    const operation = {
      operationId: randomUUID(),
      deviceId: randomUUID(),
      entityId: randomUUID(),
      kind: "word.status" as const,
      occurredAt: Date.now(),
      payload: { entry: "mẹ", status: "known" },
    };
    const first = db.recordSyncOperation(userId, operation, { ok: true });
    assert.equal(db.getSyncOperation(userId, operation.operationId)?.sequence, first.sequence);
    assert.equal(db.listSyncChanges(userId, 0).length, 1);
    assert.equal(db.latestSyncCursor(userId), first.sequence);
    assert.throws(() => db.recordSyncOperation(userId, operation, { ok: false }));
  } finally {
    dispose();
  }
});

test("an import tombstone prevents a stale offline add from resurrecting deleted text", () => {
  const { db, dispose } = temporaryDatabase();
  try {
    const userId = seedUser(db);
    const entityId = randomUUID();
    db.addImport(userId, { title: "One", raw: "Tôi đi.", difficulty: 1 }, entityId);
    db.deleteImportEntity(userId, entityId);
    assert.equal(db.listImports(userId).length, 0);
    assert.throws(() => db.addImport(userId, { title: "Stale", raw: "Tôi đi.", difficulty: 1 }, entityId));
  } finally {
    dispose();
  }
});

test("review events are returned in deterministic occurrence order", () => {
  const { db, dispose } = temporaryDatabase();
  try {
    const userId = seedUser(db);
    const cardId = "recognition:mẹ";
    db.recordReviewEvent(userId, randomUUID(), cardId, 3, 2000);
    db.recordReviewEvent(userId, randomUUID(), cardId, 1, 1000);
    assert.deepEqual(
      db.listReviewEvents(userId, cardId).map((event) => event.rating),
      [1, 3],
    );
  } finally {
    dispose();
  }
});

test("trimming keeps the most recent attempts, not an arbitrary window", () => {
  const { db, dispose } = temporaryDatabase();
  try {
    const userId = seedUser(db);
    for (let i = 0; i < MAX_TONE_ATTEMPTS + 5; i += 1) {
      db.addTone(userId, { tone: "sac", syllable: `s${i}`, score: 0.5 });
    }
    const kept = db.listTones(userId);
    assert.equal(kept[0].syllable, `s${MAX_TONE_ATTEMPTS + 4}`);
  } finally {
    dispose();
  }
});

test("trimming is scoped to one user", () => {
  const { db, dispose } = temporaryDatabase();
  try {
    const first = seedUser(db);
    const second = db.createUser({
      username: "other",
      usernameNorm: "other",
      passwordHash: "hash",
      passwordSalt: "salt",
      isAdmin: false,
    }).id;
    db.addTone(second, { tone: "ngang", syllable: "ma", score: 1 });
    for (let i = 0; i < MAX_TONE_ATTEMPTS + 10; i += 1) {
      db.addTone(first, { tone: "nang", syllable: "mạ", score: 0.2 });
    }
    assert.equal(db.countTones(first), MAX_TONE_ATTEMPTS);
    assert.equal(db.countTones(second), 1);
  } finally {
    dispose();
  }
});

test("settings round-trip through the users row", () => {
  const { db, dispose } = temporaryDatabase();
  try {
    const userId = seedUser(db);
    assert.deepEqual(db.getSettings(userId), {});
    db.setSettings(userId, { lastQueueAt: 1234, forgivenessAt: 5678 });
    assert.deepEqual(db.getSettings(userId), { lastQueueAt: 1234, forgivenessAt: 5678 });
  } finally {
    dispose();
  }
});

test("a word list and its cards stay scoped to their own account", () => {
  const { db, dispose } = temporaryDatabase();
  try {
    const mine = seedUser(db);
    const theirs = db.createUser({
      username: "other",
      usernameNorm: "other",
      passwordHash: "hash",
      passwordSalt: "salt",
      isAdmin: false,
    }).id;
    const now = Date.now();
    db.putWord(mine, {
      entry: "hỏi",
      gloss: "to ask",
      status: "learning",
      timesSeen: 1,
      firstSeen: now,
      updatedAt: now,
    });
    assert.equal(db.listWords(theirs).length, 0);
    assert.equal(db.getWord(theirs, "hỏi"), null);
    assert.equal(db.listWords(mine).length, 1);
  } finally {
    dispose();
  }
});
