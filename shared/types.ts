export type WordStatus = "new" | "learning" | "known" | "ignored";
export interface User { id: string; username: string; isAdmin: boolean; disabled: boolean; createdAt: string; }
export type FsrsCard = Record<string, unknown>;
export interface CardRecord { id: string; entry: string; gloss: string; sourceSentenceId: string; card: FsrsCard; due: number; updatedAt: number; }
export interface ProgressRecord { storyId: string; sentencesRead: string[]; completedAt: number | null; updatedAt: number; }
export interface ImportRecord { id: number; title: string; raw: string; importedAt: number; difficulty: number; }
export interface ToneAttempt { id: number; tone: string; syllable: string; score: number; createdAt: number; }
export interface UserState { words: WordRecord[]; progress: ProgressRecord[]; imports: ImportRecord[]; tones: ToneAttempt[]; }
export interface WordRecord { entry: string; gloss: string; status: WordStatus; timesSeen: number; firstSeen: number; updatedAt: number; }
export interface ForgivenessNotice { message: string; }
export interface QueueResponse { cards: CardRecord[]; budgetMs: number; serverNow: number; forgiveness: ForgivenessNotice | null; newCount: number; }
export interface ApiError { error: { code: string; message: string }; }
