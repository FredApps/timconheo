export type WordStatus = "new" | "learning" | "known" | "ignored";

export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  disabled: boolean;
  createdAt: string;
}

export interface WordRecord {
  entry: string;
  gloss: string;
  status: WordStatus;
  timesSeen: number;
  firstSeen: number;
  updatedAt: number;
}

/** The serialised ts-fsrs `Card`. Kept opaque here so the scheduler owns its shape. */
export type FsrsCard = Record<string, unknown>;

export interface CardRecord {
  id: string;
  entry: string;
  gloss: string;
  sourceSentenceId: string;
  card: FsrsCard;
  due: number;
  updatedAt: number;
}

export interface ProgressRecord {
  storyId: string;
  sentencesRead: string[];
  completedAt: number | null;
  updatedAt: number;
}

export interface ImportRecord {
  id: number;
  title: string;
  raw: string;
  importedAt: number;
  difficulty: number;
}

export interface ToneAttempt {
  id: number;
  tone: string;
  syllable: string;
  score: number;
  createdAt: number;
}

/** Everything the client needs for a signed-in session, in one round trip. */
export interface UserState {
  words: WordRecord[];
  cards: CardRecord[];
  progress: ProgressRecord[];
  imports: ImportRecord[];
  tones: ToneAttempt[];
}

export interface ApiError {
  error: { code: string; message: string };
}
