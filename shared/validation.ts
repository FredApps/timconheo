// One place that decides what the API will accept. The server enforces it; the
// client imports the same limits so a field can say "120 characters" and mean it.
//
// Every rejection is a code the UI can translate, never a raw message from a
// database driver.

export const LIMITS = {
  entry: 64,
  gloss: 200,
  id: 128,
  sentenceId: 128,
  storyId: 128,
  importTitle: 120,
  importText: 20000,
  progressSentences: 500,
  syllable: 32,
  minutes: { min: 1, max: 20 },
  score: { min: 0, max: 1 },
  difficulty: { min: 0, max: 10 },
  rowId: { min: 1, max: Number.MAX_SAFE_INTEGER },
  syncBatch: 200,
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateUuid(value: unknown, field: string): string {
  const text = requiredText(value, field, 64, "INVALID_SYNC");
  if (!UUID.test(text)) reject("INVALID_SYNC", `${field} must be a UUID.`, field);
  return text;
}

export function validateOccurredAt(value: unknown): number {
  const now = Date.now();
  return validateNumber(value, "occurredAt", now - 365 * 86400000, now + 5 * 60000, "INVALID_SYNC");
}

export const TONE_KEYS = ["ngang", "huyen", "sac", "hoi-nga", "nang"] as const;
export type ToneKeyValue = (typeof TONE_KEYS)[number];

export const WORD_STATUSES = ["new", "learning", "known", "ignored"] as const;

export class ValidationError extends Error {
  readonly status = 400;
  constructor(
    readonly code: string,
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

function reject(code: string, message: string, field?: string): never {
  throw new ValidationError(code, message, field);
}

/**
 * Trimmed, NFC-normalised text. Vietnamese arrives from several keyboards and
 * platforms, and a decomposed "ả" that fails every lookup is the worst kind of
 * bug: silent, and only for the users who type the language the app is about.
 */
export function requiredText(value: unknown, field: string, max: number, code: string): string {
  if (typeof value !== "string") reject(code, `${field} must be text.`, field);
  const text = value.normalize("NFC").trim();
  if (!text) reject(code, `${field} is required.`, field);
  if (text.length > max) reject(code, `${field} must be ${max} characters or fewer.`, field);
  return text;
}

export function optionalText(value: unknown, field: string, max: number, code: string): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") reject(code, `${field} must be text.`, field);
  const text = value.normalize("NFC").trim();
  if (text.length > max) reject(code, `${field} must be ${max} characters or fewer.`, field);
  return text;
}

export function validateEntry(value: unknown): string {
  return requiredText(value, "Word", LIMITS.entry, "INVALID_ENTRY");
}

export function validateGloss(value: unknown): string {
  return optionalText(value, "Meaning", LIMITS.gloss, "INVALID_GLOSS");
}

export function validateCardId(value: unknown): string {
  return requiredText(value, "Card id", LIMITS.id, "INVALID_CARD_ID");
}

export function validateSentenceId(value: unknown): string {
  return optionalText(value, "Sentence id", LIMITS.sentenceId, "INVALID_SENTENCE_ID");
}

export function validateStoryId(value: unknown): string {
  return requiredText(value, "Story id", LIMITS.storyId, "INVALID_STORY");
}

export function validateWordStatus(value: unknown): (typeof WORD_STATUSES)[number] {
  if (typeof value === "string" && (WORD_STATUSES as readonly string[]).includes(value)) {
    return value as (typeof WORD_STATUSES)[number];
  }
  reject("INVALID_STATUS", "Unknown word status.", "status");
}

export function validateToneKey(value: unknown): ToneKeyValue {
  if (typeof value === "string" && (TONE_KEYS as readonly string[]).includes(value)) {
    return value as ToneKeyValue;
  }
  reject("INVALID_TONE", "Unknown tone.", "tone");
}

export function validateSyllable(value: unknown): string {
  return optionalText(value, "Syllable", LIMITS.syllable, "INVALID_SYLLABLE");
}

/** Bounded finite number. Rejects NaN and Infinity rather than clamping them to a lie. */
export function validateNumber(
  value: unknown,
  field: string,
  min: number,
  max: number,
  code: string,
): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) reject(code, `${field} must be a number.`, field);
  if (parsed < min || parsed > max) {
    reject(code, `${field} must be between ${min} and ${max}.`, field);
  }
  return parsed;
}

export function validateScore(value: unknown): number {
  return validateNumber(value, "Score", LIMITS.score.min, LIMITS.score.max, "INVALID_SCORE");
}

export function validateDifficulty(value: unknown): number {
  return validateNumber(
    value ?? 0,
    "Difficulty",
    LIMITS.difficulty.min,
    LIMITS.difficulty.max,
    "INVALID_DIFFICULTY",
  );
}

/** Route parameters arrive as strings; a non-integer id is a 400, not a 404. */
export function validateRowId(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isInteger(parsed) || parsed < LIMITS.rowId.min) {
    reject("INVALID_ID", "Identifier must be a positive whole number.", "id");
  }
  return parsed;
}

export function validateMinutes(value: unknown, fallback = 5): number {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) reject("INVALID_MINUTES", "Minutes must be a number.", "minutes");
  return Math.min(LIMITS.minutes.max, Math.max(LIMITS.minutes.min, Math.round(parsed)));
}

/**
 * Progress is a list of sentence ids the reader finished. It is bounded because
 * it is client-supplied and stored verbatim as JSON.
 */
export function validateSentenceIds(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    reject("INVALID_PROGRESS", "Progress must be a list of sentence ids.", "sentencesRead");
  }
  if (value.length > LIMITS.progressSentences) {
    reject(
      "INVALID_PROGRESS",
      `Progress may contain at most ${LIMITS.progressSentences} sentences.`,
      "sentencesRead",
    );
  }
  const seen = new Set<string>();
  for (const item of value) {
    const id = requiredText(item, "Sentence id", LIMITS.sentenceId, "INVALID_PROGRESS");
    seen.add(id);
  }
  return [...seen];
}

export function validateCompletedAt(value: unknown): number | null {
  if (value === undefined || value === null || value === false || value === 0) return null;
  return validateNumber(value, "Completion time", 0, Number.MAX_SAFE_INTEGER, "INVALID_PROGRESS");
}

export interface ImportInput {
  title: string;
  raw: string;
  difficulty: number;
}

export function validateImport(body: { title?: unknown; raw?: unknown; difficulty?: unknown }): ImportInput {
  const raw = requiredText(body.raw, "Text", LIMITS.importText, "INVALID_IMPORT");
  const title = optionalText(body.title, "Title", LIMITS.importTitle, "INVALID_IMPORT");
  return { title: title || "My Vietnamese text", raw, difficulty: validateDifficulty(body.difficulty) };
}
