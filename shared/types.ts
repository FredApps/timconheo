export type WordStatus = "new" | "learning" | "known" | "ignored";
export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  disabled: boolean;
  createdAt: string;
}
export type FsrsCard = Record<string, unknown>;
export type CardKind = "word" | "cloze" | "listening" | "grammar";
export interface CardRecord {
  id: string;
  entry: string;
  gloss: string;
  sourceSentenceId: string;
  card: FsrsCard;
  due: number;
  updatedAt: number;
  kind?: CardKind;
  payload?: Record<string, unknown>;
}
export interface ProgressRecord {
  storyId: string;
  sentencesRead: string[];
  completedAt: number | null;
  updatedAt: number;
}
export interface ImportRecord {
  id: number | string;
  entityId?: string;
  title: string;
  raw: string;
  importedAt: number;
  difficulty: number;
}
export interface ToneAttempt {
  id: number | string;
  entityId?: string;
  tone: string;
  syllable: string;
  score: number;
  createdAt: number;
}
export interface UserState {
  words: WordRecord[];
  progress: ProgressRecord[];
  imports: ImportRecord[];
  tones: ToneAttempt[];
  cards?: CardRecord[];
  syncCursor?: number;
}

export type SyncOperationKind =
  | "word.remember"
  | "word.status"
  | "progress.merge"
  | "import.add"
  | "import.delete"
  | "tone.add"
  | "card.review";

export interface SyncOperation {
  operationId: string;
  deviceId: string;
  entityId: string;
  kind: SyncOperationKind;
  occurredAt: number;
  payload: Record<string, unknown>;
}

export interface SyncRequest {
  protocolVersion: 1;
  cursor: number;
  operations: SyncOperation[];
}

export interface SyncChange {
  sequence: number;
  operationId: string;
  entityId: string;
  kind: SyncOperationKind;
  acceptedAt: number;
  result: unknown;
}

export interface SyncRejection {
  operationId: string;
  code: string;
  message: string;
}

export interface SyncResponse {
  protocolVersion: 1;
  acknowledged: string[];
  rejected: SyncRejection[];
  changes: SyncChange[];
  cursor: number;
  serverNow: number;
}

export interface DeviceSession {
  id: string;
  deviceName: string;
  createdAt: number;
  lastSeen: number;
  current: boolean;
}

export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  pending: number;
  lastSyncedAt: number | null;
  error: string | null;
}
export interface WordRecord {
  entry: string;
  gloss: string;
  status: WordStatus;
  timesSeen: number;
  firstSeen: number;
  updatedAt: number;
}
export interface ForgivenessNotice {
  message: string;
}
export interface QueueResponse {
  cards: CardRecord[];
  budgetMs: number;
  serverNow: number;
  forgiveness: ForgivenessNotice | null;
  newCount: number;
}
export interface ApiError {
  error: { code: string; message: string };
}
export type TtsVoice = "myan" | "giahuy";
export type TtsStatus = "ready" | "pending" | "failed";
export interface TtsReadyResponse {
  status: "ready";
  audioUrls: string[];
  voice: TtsVoice;
}
export interface TtsPendingResponse {
  status: "pending";
  requestId: string;
  retryAfterMs: number;
  voice: TtsVoice;
}
export interface TtsFailedResponse {
  status: "failed";
  error: { code: string; message: string };
  voice: TtsVoice;
}
export type TtsResponse = TtsReadyResponse | TtsPendingResponse | TtsFailedResponse;
