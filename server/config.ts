import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

try {
  process.loadEnvFile(path.resolve(process.cwd(), ".env"));
} catch {
  // Environment-only deployments are supported.
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  return !["0", "false", "no", "off"].includes(value.toLowerCase());
}

function int(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

/**
 * The version has to come from the package manifest rather than
 * `npm_package_version`, because the supervisor starts the server with plain
 * `node dist/server/heo-server.js` and npm never sets that variable there. Walking
 * up from the module handles both `server/` (tsx, development) and
 * `dist/server/` (built, production).
 */
function packageVersion(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  for (const candidate of ["../package.json", "../../package.json"]) {
    try {
      const manifest = JSON.parse(readFileSync(path.resolve(here, candidate), "utf8")) as {
        version?: string;
      };
      if (manifest.version) return manifest.version;
    } catch {
      // Try the next candidate.
    }
  }
  return process.env.npm_package_version ?? "0.0.0";
}

export const config = {
  host: process.env.HOST ?? "127.0.0.1",
  port: int(process.env.PORT, 3092, 1, 65535),
  basePath: "/heo",
  dataDir: path.resolve(process.env.HEO_DATA_DIR ?? "C:\\ProgramData\\TimConHeo"),
  secureCookies: bool(process.env.HEO_SECURE_COOKIES, true),
  cookieName: "heo_session",
  sessionDays: 30,
  // Signups are closed by default: this is a personal app behind a reverse proxy.
  // Accounts are created with `npm run admin`.
  allowSignups: bool(process.env.HEO_ALLOW_SIGNUPS, false),
  // When set, any request without a valid session is silently signed in as this
  // username instead of being asked to log in. This removes authentication for
  // the whole deployment: anyone who reaches the URL gets this account, with
  // full read/write on its words, progress and imports. Off unless explicitly
  // set, precisely because it is not a default anyone should get by accident.
  autoLoginUser: (process.env.HEO_AUTO_LOGIN_USER ?? "").trim(),
  version: packageVersion(),
  // Written into .env by scripts/install-server.ps1 so /api/health can say which
  // commit is actually running, not just which version claims to be.
  commit: (process.env.HEO_COMMIT ?? "").trim().slice(0, 40),
  fptKeyFile: process.env.HEO_FPT_KEY_FILE ?? "",
  fptTtsSpeed: int(process.env.HEO_FPT_TTS_SPEED, -1, -3, 3),
  ttsPollTimeoutMs: int(process.env.HEO_FPT_POLL_TIMEOUT_MS, 120000, 5000, 120000),
};

export const paths = {
  database: path.join(config.dataDir, "timconheo.sqlite3"),
  backups: path.join(config.dataDir, "backups"),
  ttsCache: path.join(config.dataDir, "tts-cache"),
};
