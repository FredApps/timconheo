import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TtsResponse, TtsVoice } from "../shared/types.js";

const FPT_URL = "https://api.fpt.ai/hmi/tts/v5";
const MAX_TEXT = 20000;
const MAX_PART = 4500;
const RETRY_MS = 1500;
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_CACHE_BYTES = 250 * 1024 * 1024;

export const FPT_VOICES = { myan: "My An (female Central Vietnamese)", giahuy: "Gia Huy (male Central Vietnamese)" } as const satisfies Record<TtsVoice, string>;
export class TtsError extends Error { constructor(readonly code: string, message: string, readonly status = 500) { super(message); this.name = "TtsError"; } }
export function normalizeTtsText(value: unknown): string {
  const text = typeof value === "string" ? value.normalize("NFC").trim() : "";
  if (!text) throw new TtsError("INVALID_TEXT", "Speech text is required.", 400);
  if (text.length > MAX_TEXT) throw new TtsError("TEXT_TOO_LONG", "Speech text is too long.", 400);
  return text;
}
export function normalizeTtsVoice(value: unknown): TtsVoice {
  if (value === "myan" || value === "giahuy") return value;
  throw new TtsError("INVALID_VOICE", "Unknown Central Vietnamese voice.", 400);
}
export function padTtsText(text: string): string { return text.length >= 3 ? text : text + ".".repeat(3 - text.length); }
export function splitTtsText(text: string): string[] {
  if (text.length <= MAX_PART) return [padTtsText(text)];
  const parts: string[] = []; let rest = text;
  while (rest.length > MAX_PART) {
    const probe = rest.slice(0, MAX_PART + 1);
    const boundary = Math.max(probe.lastIndexOf(" "), probe.lastIndexOf("\n"));
    const cut = boundary >= MAX_PART * 0.6 ? boundary : MAX_PART;
    parts.push(padTtsText(rest.slice(0, cut).trim())); rest = rest.slice(cut).trimStart();
  }
  if (rest) parts.push(padTtsText(rest)); return parts;
}
export function ttsCacheKey(text: string, voice: TtsVoice, speed: number): string {
  return createHash("sha256").update("tts-v1\0" + voice + "\0" + speed + "\0" + text).digest("hex");
}
type FetchLike = typeof fetch;
type Job = { id: string; voice: TtsVoice; audioIds: string[]; status: "pending" | "ready" | "failed"; error?: { code: string; message: string } };
export interface TtsServiceOptions { fetcher?: FetchLike; pollTimeoutMs?: number; pollRetryMs?: number; }
export class FptTtsService {
  private readonly fetcher: FetchLike; private readonly jobs = new Map<string, Job>(); private initialized: Promise<void> | null = null;
  constructor(private readonly keyFile: string, private readonly cacheDir: string, private readonly speed: number, private readonly options: TtsServiceOptions = {}) { this.fetcher = options.fetcher ?? fetch; }
  async request(textValue: unknown, voiceValue: unknown): Promise<TtsResponse> {
    await this.init(); const text = normalizeTtsText(textValue); const voice = normalizeTtsVoice(voiceValue);
    const parts = splitTtsText(text); const id = ttsCacheKey(text, voice, this.speed); const audioIds = parts.map((part) => ttsCacheKey(part, voice, this.speed));
    if (await this.allCached(audioIds)) return this.ready(audioIds, voice);
    const old = this.jobs.get(id); if (old) return this.response(old);
    const job: Job = { id, voice, audioIds, status: "pending" }; this.jobs.set(id, job);
    void this.run(job, parts).catch((error: unknown) => { const safe = error instanceof TtsError ? error : new TtsError("FPT_UNAVAILABLE", "Central speech is unavailable."); job.status = "failed"; job.error = { code: safe.code, message: safe.message }; });
    return this.response(job);
  }
  async status(id: string): Promise<TtsResponse> { await this.init(); const job = this.jobs.get(id); if (!job) throw new TtsError("UNKNOWN_TTS_REQUEST", "Speech request has expired. Please try again.", 404); return this.response(job); }
  async audio(id: string): Promise<{ path: string; size: number }> {
    await this.init(); if (!/^[a-f0-9]{64}$/.test(id)) throw new TtsError("INVALID_AUDIO", "Invalid audio request.", 400);
    const filePath = path.join(this.cacheDir, id + ".mp3");
    try { const info = await stat(filePath); return { path: filePath, size: info.size }; } catch { throw new TtsError("AUDIO_NOT_READY", "Audio is not ready.", 404); }
  }
  private ready(ids: string[], voice: TtsVoice): TtsResponse { return { status: "ready", audioUrls: ids.map((id) => "/heo/api/tts/audio/" + id), voice }; }
  private response(job: Job): TtsResponse {
    if (job.status === "ready") return this.ready(job.audioIds, job.voice);
    if (job.status === "failed") return { status: "failed", error: job.error ?? { code: "FPT_UNAVAILABLE", message: "Central speech is unavailable." }, voice: job.voice };
    return { status: "pending", requestId: job.id, retryAfterMs: this.options.pollRetryMs ?? RETRY_MS, voice: job.voice };
  }
  private async run(job: Job, parts: string[]): Promise<void> {
    const key = await this.readKey();
    for (let i = 0; i < parts.length; i += 1) if (!(await this.has(job.audioIds[i]))) await this.write(job.audioIds[i], await this.generate(key, job.voice, parts[i]));
    job.status = "ready";
  }
  private async generate(key: string, voice: TtsVoice, text: string): Promise<Buffer> {
    const response = await this.fetchSafe(FPT_URL, { method: "POST", headers: { api_key: key, voice, speed: String(this.speed), format: "mp3", "content-type": "text/plain; charset=utf-8" }, body: text });
    if (!response.ok) throw new TtsError(response.status === 429 ? "FPT_QUOTA" : "FPT_REQUEST_FAILED", "Central speech could not be requested.", response.status === 429 ? 503 : 502);
    let payload: { error?: number; async?: string };
    try { payload = await response.json() as typeof payload; } catch { throw new TtsError("FPT_BAD_RESPONSE", "Central speech returned an invalid response.", 502); }
    if (payload.error !== 0 || !payload.async) throw new TtsError(payload.error === 1 ? "FPT_QUOTA" : "FPT_REJECTED", "Central speech could not be generated.", payload.error === 1 ? 503 : 502);
    let url: URL; try { url = new URL(payload.async); } catch { throw new TtsError("FPT_BAD_URL", "Central speech returned an invalid audio URL.", 502); }
    if (url.protocol !== "https:") throw new TtsError("FPT_BAD_URL", "Central speech returned an invalid audio URL.", 502);
    const deadline = Date.now() + (this.options.pollTimeoutMs ?? 120000); let wait = this.options.pollRetryMs ?? RETRY_MS;
    while (Date.now() < deadline) {
      const audio = await this.fetchSafe(url.href, undefined, true); const type = audio.headers.get("content-type")?.toLowerCase() ?? "";
      if (audio.ok && (type.startsWith("audio/") || type === "application/octet-stream" || type === "")) { const bytes = Buffer.from(await audio.arrayBuffer()); if (bytes.length) return bytes; }
      await new Promise((resolve) => setTimeout(resolve, wait)); wait = Math.min(5000, Math.round(wait * 1.35));
    }
    throw new TtsError("FPT_TIMEOUT", "Central speech took too long to become available.", 504);
  }
  private async fetchSafe(url: string, init?: RequestInit, polling = false): Promise<Response> {
    try { return await this.fetcher(url, init); } catch { if (polling) return new Response(null, { status: 503 }); throw new TtsError("FPT_UNAVAILABLE", "Central speech is unavailable."); }
  }
  private async readKey(): Promise<string> {
    if (!this.keyFile) throw new TtsError("FPT_NOT_CONFIGURED", "Central speech is not configured.", 503);
    try { const key = (await readFile(this.keyFile, "utf8")).trim(); if (!key) throw new Error("empty"); return key; } catch { throw new TtsError("FPT_NOT_CONFIGURED", "Central speech is not configured.", 503); }
  }
  private async has(id: string): Promise<boolean> { try { await stat(path.join(this.cacheDir, id + ".mp3")); return true; } catch { return false; } }
  private async allCached(ids: string[]): Promise<boolean> { for (const id of ids) if (!(await this.has(id))) return false; return true; }
  private async write(id: string, audio: Buffer): Promise<void> {
    const destination = path.join(this.cacheDir, id + ".mp3"); const temporary = destination + "." + randomUUID() + ".tmp";
    await writeFile(temporary, audio); try { await rename(temporary, destination); } catch { await unlink(temporary).catch(() => undefined); }
  }
  private async init(): Promise<void> { if (!this.initialized) this.initialized = mkdir(this.cacheDir, { recursive: true }).then(() => this.prune()); await this.initialized; }
  private async prune(): Promise<void> {
    const now = Date.now(); let files: { name: string; size: number; mtime: number }[] = [];
    for (const name of await readdir(this.cacheDir).catch(() => [])) if (name.endsWith(".mp3")) try { const info = await stat(path.join(this.cacheDir, name)); files.push({ name, size: info.size, mtime: info.mtimeMs }); } catch { /* concurrent write */ }
    for (const file of files.filter((item) => now - item.mtime > TTL_MS)) await unlink(path.join(this.cacheDir, file.name)).catch(() => undefined);
    files = files.filter((item) => now - item.mtime <= TTL_MS).sort((a, b) => b.mtime - a.mtime); let total = files.reduce((sum, item) => sum + item.size, 0);
    for (const file of files.reverse()) { if (total <= MAX_CACHE_BYTES) break; await unlink(path.join(this.cacheDir, file.name)).catch(() => undefined); total -= file.size; }
  }
}
