import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { HeoDatabase } from "../../server/database.js";
import { backupDatabase, listBackups } from "../../scripts/backup-db.js";

function scratch(): { dir: string; source: string; backups: string; dispose: () => void } {
  const dir = mkdtempSync(path.join(tmpdir(), "heo-backup-"));
  return {
    dir,
    source: path.join(dir, "live.sqlite3"),
    backups: path.join(dir, "backups"),
    dispose: () => rmSync(dir, { recursive: true, force: true }),
  };
}

function seed(file: string, words: number): void {
  const db = new HeoDatabase(file);
  const user = db.createUser({
    username: "tester",
    usernameNorm: "tester",
    passwordHash: "hash",
    passwordSalt: "salt",
    isAdmin: true,
  });
  const now = Date.now();
  for (let i = 0; i < words; i += 1) {
    db.putWord(user.id, {
      entry: `từ-${i}`,
      gloss: `word ${i}`,
      status: "learning",
      timesSeen: 1,
      firstSeen: now,
      updatedAt: now,
    });
  }
  db.close();
}

test("a backup is written, verified, and restorable into a fresh database", () => {
  const { source, backups, dispose } = scratch();
  try {
    seed(source, 12);
    const result = backupDatabase(source, backups);
    assert.ok(existsSync(result.file));
    assert.equal(result.tables.users, 1);
    assert.equal(result.tables.words, 12);

    // Restoration check: open the backup on its own and read the data back.
    const restored = new DatabaseSync(result.file, { readOnly: true });
    const row = restored.prepare("SELECT COUNT(*) AS n FROM words").get() as { n: number };
    assert.equal(Number(row.n), 12);
    const integrity = restored.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
    assert.equal(integrity.integrity_check, "ok");
    restored.close();
  } finally {
    dispose();
  }
});

test("backups older than the retention count are pruned", () => {
  const { source, backups, dispose } = scratch();
  try {
    seed(source, 1);
    // Retention of 2 with three backups must leave exactly the two newest.
    const created: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      // The filename carries a one-second stamp, so space the writes out enough
      // that the names differ the way they would in real use.
      const start = Date.now();
      while (Date.now() - start < 1010) {
        /* wait for the next second */
      }
      created.push(path.basename(backupDatabase(source, backups, 2).file));
    }
    const remaining = listBackups(backups);
    assert.equal(remaining.length, 2);
    assert.deepEqual(remaining, [created[2], created[1]]);
  } finally {
    dispose();
  }
});

test("backing up a missing database is an error, not a silent empty file", () => {
  const { dir, backups, dispose } = scratch();
  try {
    assert.throws(() => backupDatabase(path.join(dir, "nothing.sqlite3"), backups), /No database at/);
  } finally {
    dispose();
  }
});
