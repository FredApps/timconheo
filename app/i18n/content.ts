import type { Bi, KindKey, LicenseKey, PosKey, RegionKey, WordStatus } from "../types";
import type { DifficultyBand } from "../lib/difficulty";
import type { StringKey } from "./strings";

/**
 * Labels for the closed sets that travel with content. Keeping them keyed means
 * a typo is a compile error rather than a Vietnamese string nobody notices is
 * wrong.
 */

export const POS_LABELS = {
  classifier: { en: "classifier", vi: "loại từ" },
  noun: { en: "noun", vi: "danh từ" },
  verb: { en: "verb", vi: "động từ" },
  adjective: { en: "adjective", vi: "tính từ" },
  pronoun: { en: "pronoun", vi: "đại từ" },
  conjunction: { en: "connector", vi: "liên từ" },
  phrase: { en: "phrase", vi: "cụm từ" },
  question: { en: "question word", vi: "từ hỏi" },
  particle: { en: "particle", vi: "trợ từ" },
  adverb: { en: "adverb", vi: "trạng từ" },
  numeral: { en: "number", vi: "số từ" },
  preposition: { en: "preposition", vi: "giới từ" },
  letter: { en: "letter", vi: "chữ cái" },
  name: { en: "name", vi: "danh từ riêng" },
} as const satisfies Record<PosKey, Bi>;

export const KIND_LABELS = {
  dongDao: { en: "folk rhyme", vi: "đồng dao" },
  caDao: { en: "folk verse", vi: "ca dao" },
  alphabet: { en: "alphabet", vi: "bảng chữ cái" },
  tonePrimer: { en: "tone primer", vi: "nhập môn thanh" },
  firstWords: { en: "first words", vi: "từ đầu tiên" },
  scene: { en: "everyday scene", vi: "cảnh đời thường" },
  import: { en: "your text", vi: "bài riêng" },
} as const satisfies Record<KindKey, Bi>;

export const REGION_LABELS = {
  national: { en: "Vietnam", vi: "Việt Nam" },
  central: { en: "Central Vietnam", vi: "miền Trung" },
  daNang: { en: "Đà Nẵng", vi: "Đà Nẵng" },
  quangNam: { en: "Quảng Nam", vi: "Quảng Nam" },
} as const satisfies Record<RegionKey, Bi>;

export const LICENSE_LABELS = {
  publicDomain: { en: "public domain", vi: "phạm vi công cộng" },
  copyrightedExcerpt: {
    en: "short attributed excerpt; rights reserved",
    vi: "trích đoạn ngắn có ghi tác giả; bảo lưu quyền",
  },
  original: { en: "original app text", vi: "văn bản gốc của ứng dụng" },
  user: { en: "your account", vi: "tài khoản của bạn" },
} as const satisfies Record<LicenseKey, Bi>;

export const BAND_LABELS = {
  gentle: { en: "gentle", vi: "nhẹ nhàng" },
  steady: { en: "steady", vi: "vừa sức" },
  stretch: { en: "stretch", vi: "thử thách" },
  hard: { en: "hard", vi: "khó" },
} as const satisfies Record<DifficultyBand, Bi>;

/** Word-status labels reuse the reader's keys so one word means one thing. */
export const STATUS_KEYS = {
  new: "reader.new",
  learning: "reader.learning",
  known: "reader.known",
  ignored: "reader.ignored",
} as const satisfies Record<WordStatus, StringKey>;

/**
 * Server error codes that have a translated message. Anything else falls through
 * to `error.UNKNOWN` rather than showing an English string from a route handler.
 */
export const ERROR_KEYS = {
  INVALID_CREDENTIALS: "error.INVALID_CREDENTIALS",
  INVALID_USERNAME: "error.INVALID_USERNAME",
  INVALID_PASSWORD: "error.INVALID_PASSWORD",
  SIGNUPS_CLOSED: "error.SIGNUPS_CLOSED",
  USERNAME_TAKEN: "error.USERNAME_TAKEN",
  RATE_LIMITED: "error.RATE_LIMITED",
  AUTH_REQUIRED: "error.AUTH_REQUIRED",
  INVALID_IMPORT: "error.INVALID_IMPORT",
  INVALID_ENTRY: "error.INVALID_ENTRY",
  NETWORK: "error.NETWORK",
  UNKNOWN: "error.UNKNOWN",
} as const satisfies Record<string, StringKey>;

export function errorKey(code: string | undefined): StringKey {
  return code && code in ERROR_KEYS ? ERROR_KEYS[code as keyof typeof ERROR_KEYS] : ERROR_KEYS.UNKNOWN;
}
