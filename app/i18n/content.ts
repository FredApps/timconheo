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

export const V07_TEXT = {
  syncing: { en: "Syncing", vi: "Đang đồng bộ" },
  waiting: { en: "Waiting to sync", vi: "Chờ đồng bộ" },
  offline: { en: "Offline", vi: "Đang ngoại tuyến" },
  offlineSafe: { en: "Your changes are safe on this device", vi: "Thay đổi được giữ an toàn trên thiết bị" },
  offlineReady: { en: "You can keep reading and reviewing", vi: "Bạn vẫn có thể đọc và ôn tập" },
  retry: { en: "Try again", vi: "Thử lại" },
  update: { en: "A new version is ready", vi: "Có phiên bản mới" },
  updateBody: { en: "Load it when you are ready.", vi: "Tải khi bạn đã sẵn sàng." },
  updateAction: { en: "Update", vi: "Cập nhật" },
  privacyUnderstand: { en: "I understand how this text is stored", vi: "Tôi hiểu cách văn bản được lưu" },
  privacyImportBody: {
    en: "Text is stored server-readable for device sync. Pressing play sends the selection to FPT.AI. You can delete it at any time.",
    vi: "Nội dung được lưu dạng máy chủ có thể đọc để đồng bộ thiết bị. Khi bấm nghe, đoạn đã chọn được gửi tới FPT.AI. Bạn có thể xóa bất cứ lúc nào.",
  },
  cardTypes: {
    word: { en: "Word", vi: "Từ" },
    cloze: { en: "Cloze", vi: "Điền từ" },
    listening: { en: "Listening", vi: "Nghe" },
    grammar: { en: "Grammar", vi: "Ngữ pháp" },
  },
  privacyTitle: { en: "Data and privacy", vi: "Dữ liệu và quyền riêng tư" },
  privacyBody: {
    en: "Imported readings are server-readable for sync. Encrypted backups are kept up to 30 days. Text reaches FPT.AI only after you request pronunciation.",
    vi: "Bài nhập được lưu dạng máy chủ có thể đọc để đồng bộ. Bản sao lưu được mã hóa và giữ tối đa 30 ngày. Nội dung chỉ được gửi tới FPT.AI sau khi bạn yêu cầu phát âm.",
  },
  export: { en: "Export all data", vi: "Xuất mọi dữ liệu" },
  importsDeleteAll: { en: "Delete all imported readings", vi: "Xóa mọi bài nhập" },
  purgeDevice: { en: "Clear data on this device", vi: "Xóa dữ liệu trên thiết bị này" },
  sessions: { en: "Signed-in devices", vi: "Phiên đăng nhập" },
  thisDevice: { en: "this device", vi: "thiết bị này" },
  revoke: { en: "Revoke", vi: "Thu hồi" },
  accountDelete: { en: "Delete account and all data", vi: "Xóa tài khoản và toàn bộ dữ liệu" },
  passwordConfirm: { en: "Enter your password to confirm", vi: "Nhập mật khẩu để xác nhận" },
  accountDeleteAction: { en: "Permanently delete account", vi: "Xóa tài khoản vĩnh viễn" },
  exportDone: { en: "Your data was exported.", vi: "Đã xuất dữ liệu của bạn." },
  importsDeleted: { en: "All imported readings were deleted.", vi: "Đã xóa mọi bài nhập." },
  passwordFailed: { en: "The password could not be confirmed.", vi: "Không thể xác nhận mật khẩu." },
  signOutClear: { en: "Sign out and clear this device", vi: "Đăng xuất và xóa dữ liệu thiết bị" },
  signOutKeep: { en: "Sign out but keep offline data", vi: "Đăng xuất nhưng giữ dữ liệu ngoại tuyến" },
} as const;
