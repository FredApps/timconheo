import path from "node:path";

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
  version: process.env.npm_package_version ?? "0.5.0",
};

export const paths = {
  database: path.join(config.dataDir, "timconheo.sqlite3"),
  backups: path.join(config.dataDir, "backups"),
};

