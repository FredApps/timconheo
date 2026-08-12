#!/usr/bin/env node
import { createDecipheriv } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { paths } from "../server/config.js";

const source = process.argv[2];
const destination = process.argv[3] ?? paths.database;
if (!source || !existsSync(source)) throw new Error("Usage: npm run restore -- <backup> [destination]");
if (existsSync(destination) && !process.argv.includes("--force")) {
  throw new Error(`Refusing to overwrite ${destination}; pass --force after stopping the server.`);
}

const temporary = `${destination}.restore-${process.pid}`;
try {
  if (source.endsWith(".enc")) {
    const keyFile = process.env.HEO_BACKUP_KEY_FILE;
    if (!keyFile) throw new Error("HEO_BACKUP_KEY_FILE is required for encrypted backups.");
    const input = readFileSync(source);
    if (input.subarray(0, 4).toString() !== "TCH1") throw new Error("Unknown encrypted backup format.");
    const key = Buffer.from(readFileSync(keyFile, "utf8").trim(), "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, input.subarray(4, 16));
    decipher.setAuthTag(input.subarray(16, 32));
    writeFileSync(temporary, Buffer.concat([decipher.update(input.subarray(32)), decipher.final()]));
  } else copyFileSync(source, temporary);

  const db = new DatabaseSync(temporary, { readOnly: true });
  const check = db.prepare("PRAGMA integrity_check").get() as { integrity_check?: string };
  db.close();
  if (check.integrity_check !== "ok") throw new Error("Restored backup failed integrity_check.");
  if (existsSync(destination)) rmSync(destination, { force: true });
  copyFileSync(temporary, destination);
  console.log(`Restored and verified ${path.basename(source)} -> ${destination}`);
} finally {
  rmSync(temporary, { force: true });
}
