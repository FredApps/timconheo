#!/usr/bin/env node
// Consistent SQLite backup. VACUUM INTO takes a read transaction, so it is safe
// to run against the live database while the server is serving requests -- which
// a file copy of a WAL database is not.
//
//   npm run backup            create, verify, prune
//   npm run backup -- --list  show what is retained
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { paths } from "../server/config.js";

const RETAIN = 14;
const PREFIX = "timconheo-";
const SUFFIX = ".sqlite3";

export interface BackupResult {
  file: string;
  bytes: number;
  tables: Record<string, number>;
  pruned: string[];
}

const COUNTED_TABLES = ["users", "words", "cards", "progress", "imports", "tone_attempts"] as const;

function counts(db: DatabaseSync): Record<string, number> {
  const result: Record<string, number> = {};
  for (const table of COUNTED_TABLES) {
    const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number } | undefined;
    result[table] = Number(row?.n ?? 0);
  }
  return result;
}

function stamp(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

export function listBackups(dir: string = paths.backups): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.startsWith(PREFIX) && name.endsWith(SUFFIX))
    .sort()
    .reverse();
}

export function backupDatabase(
  source: string = paths.database,
  dir: string = paths.backups,
  retain = RETAIN,
): BackupResult {
  if (!existsSync(source)) throw new Error(`No database at ${source}`);
  mkdirSync(dir, { recursive: true });

  const target = path.join(dir, `${PREFIX}${stamp()}${SUFFIX}`);
  if (existsSync(target)) throw new Error(`Backup already exists: ${target}`);

  const live = new DatabaseSync(source, { readOnly: true });
  let expected: Record<string, number>;
  try {
    expected = counts(live);
    // The path is interpolated because SQLite does not accept a bound parameter
    // here; the quotes are doubled so a path with an apostrophe cannot break out.
    live.exec(`VACUUM INTO '${target.replaceAll("'", "''")}'`);
  } finally {
    live.close();
  }

  // Verify by reading the backup back, not by trusting that the write returned.
  const restored = new DatabaseSync(target, { readOnly: true });
  try {
    const integrity = restored.prepare("PRAGMA integrity_check").get() as
      { integrity_check?: string } | undefined;
    if (integrity?.integrity_check !== "ok") {
      throw new Error(`Backup failed integrity_check: ${integrity?.integrity_check ?? "unknown"}`);
    }
    const actual = counts(restored);
    for (const table of COUNTED_TABLES) {
      if (actual[table] !== expected[table]) {
        throw new Error(
          `Backup row mismatch in ${table}: expected ${expected[table]}, found ${actual[table]}`,
        );
      }
    }
  } catch (error) {
    restored.close();
    rmSync(target, { force: true });
    throw error;
  }
  restored.close();

  const pruned: string[] = [];
  for (const name of listBackups(dir).slice(retain)) {
    unlinkSync(path.join(dir, name));
    pruned.push(name);
  }

  return { file: target, bytes: statSync(target).size, tables: expected, pruned };
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join("scripts", "backup-db.ts"));

if (invokedDirectly) {
  if (process.argv.includes("--list")) {
    const backups = listBackups();
    if (!backups.length) console.log("No backups yet.");
    for (const name of backups) console.log(name);
  } else {
    const result = backupDatabase();
    const rows = Object.entries(result.tables)
      .map(([table, n]) => `${table}=${n}`)
      .join(" ");
    console.log(`Backed up ${(result.bytes / 1024).toFixed(0)} KB -> ${result.file}`);
    console.log(`Verified: ${rows}`);
    if (result.pruned.length) console.log(`Pruned ${result.pruned.length} old backup(s).`);
  }
}
