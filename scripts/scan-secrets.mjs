#!/usr/bin/env node
// Fails the build if a credential looks like it reached the repository, the
// history, or a build artifact. Deliberately noisy-but-few patterns: a scanner
// nobody trusts is a scanner nobody reads.
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PATTERNS = [
  { name: "private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: "Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: "JWT", re: /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  // FPT.AI keys are 32 lowercase hex characters. Bare hex that long in a config
  // or env assignment is worth a human look even if it turns out to be a hash.
  {
    name: "api-key-shaped assignment",
    re: /(?<![A-Za-z_])(?:api[_-]?key|apikey|secret|token)(?![A-Za-z_])\s*[:=]\s*["']?[A-Za-z0-9/+_-]{24,}["']?/i,
  },
  {
    name: "non-empty password assignment",
    re: /(?<![A-Za-z_])(?:password|passwd|pwd)(?![A-Za-z_])\s*[:=]\s*["'][^"'\s{$][^"']{3,}["']/i,
  },
];

// git's -G takes POSIX extended regular expressions, not JavaScript ones, so the
// history sweep carries its own equivalents rather than reusing the sources above.
const HISTORY_PATTERNS = [
  {
    name: "private key block",
    grep: "BEGIN [A-Z ]*PRIVATE KEY",
    re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
  },
  { name: "AWS access key id", grep: "AKIA[0-9A-Z]{16}", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "GitHub token", grep: "gh[pousr]_[A-Za-z0-9]{36}", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: "Slack token", grep: "xox[baprs]-[A-Za-z0-9-]{10}", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: "Google API key", grep: "AIza[0-9A-Za-z_-]{35}", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
];

// Files that legitimately contain the *shape* of a secret without being one.
const ALLOW_FILES = new Set(["scripts/scan-secrets.mjs", ".env.example", "package-lock.json", "SECURITY.md"]);

const ALLOW_LINE = [
  /HEO_SEED_PASSWORD=\s*$/,
  /HEO_FPT_KEY_FILE=/,
  /password\s*[:=]\s*["']\$\{/i,
  /autoComplete=/,
  /"integrity":/,
  /passwordHash|passwordSalt|password_hash|password_salt/,
];

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
}

const findings = [];

function scan(label, text, { fileAllow = false } = {}) {
  if (fileAllow) return;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.length > 4000) continue;
    if (ALLOW_LINE.some((allow) => allow.test(line))) continue;
    for (const { name, re } of PATTERNS) {
      if (re.test(line)) findings.push(`${label}:${i + 1}  ${name}`);
    }
  }
}

// 1. Tracked working-tree files.
const tracked = git(["ls-files"]).split("\n").filter(Boolean);
for (const file of tracked) {
  if (ALLOW_FILES.has(file)) continue;
  let info;
  try {
    info = statSync(file);
  } catch {
    continue;
  }
  if (!info.isFile() || info.size > 2 * 1024 * 1024) continue;
  scan(file, readFileSync(file, "utf8"));
}

// 2. Build artifacts, which are not tracked but do get published.
for (const dir of ["dist/client/assets", "dist/server"]) {
  let entries = [];
  try {
    entries = execFileSync(
      "node",
      [
        "-e",
        `const {readdirSync}=require("fs");process.stdout.write(readdirSync(${JSON.stringify(dir)}).join("\\n"))`,
      ],
      { encoding: "utf8" },
    )
      .split("\n")
      .filter(Boolean);
  } catch {
    continue;
  }
  for (const name of entries) {
    const path = join(dir, name);
    try {
      if (!statSync(path).isFile()) continue;
      scan(path, readFileSync(path, "utf8"));
    } catch {
      /* unreadable artifact */
    }
  }
}

// 3. History. Only the high-signal patterns; an assignment-shaped false positive
// in an old commit is not something anyone can fix anyway.
for (const { name, grep, re } of HISTORY_PATTERNS) {
  let log = "";
  try {
    log = git(["log", "--all", "--no-color", "-p", "-G", grep, "--", "."]);
  } catch {
    continue;
  }
  for (const line of log.split("\n")) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    if (ALLOW_LINE.some((allow) => allow.test(line))) continue;
    if (re.test(line)) findings.push(`git history  ${name}`);
  }
}

const unique = [...new Set(findings)];
if (unique.length) {
  console.error("Possible secrets found:");
  for (const finding of unique) console.error("  " + finding);
  process.exit(1);
}
console.log(`Secret scan clean (${tracked.length} tracked files, history included).`);
