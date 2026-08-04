import type {
  CardRecord,
  ImportRecord,
  ProgressRecord,
  QueueResponse,
  ToneAttempt,
  User,
  UserState,
  WordRecord,
  WordStatus,
} from "../../shared/types";

const API_BASE = "/heo/api";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly field?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * The request never reached the server, or the reply was not usable.
 *
 * Kept separate from ApiError because the two mean opposite things to the user:
 * a 401 means sign in again, a dropped connection means wait and retry. Treating
 * the second as the first is how an app throws someone out of a session over a
 * lift ride.
 */
export class NetworkError extends Error {
  readonly code = "NETWORK";
  constructor(cause?: unknown) {
    super("Cannot reach the server.");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof NetworkError;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API_BASE + path, {
      credentials: "include",
      headers: init?.body ? { "content-type": "application/json" } : undefined,
      ...init,
    });
  } catch (cause) {
    throw new NetworkError(cause);
  }

  let payload: unknown = {};
  try {
    const text = await response.text();
    payload = text ? JSON.parse(text) : {};
  } catch (cause) {
    if (response.ok) throw new NetworkError(cause);
  }

  if (!response.ok) {
    const error = (payload as { error?: { message?: string; code?: string; field?: string } }).error;
    throw new ApiError(
      error?.message ?? "Request failed.",
      error?.code ?? "UNKNOWN",
      response.status,
      error?.field,
    );
  }
  return payload as T;
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export const api = {
  session: () => request<{ user: User | null; allowSignups: boolean }>("/session"),
  login: (username: string, password: string) => post<{ user: User }>("/login", { username, password }),
  signup: (username: string, password: string) => post<{ user: User }>("/signup", { username, password }),
  logout: () => post<{ ok: true }>("/logout"),
  state: () => request<UserState>("/state"),
  queue: (minutes: number) =>
    request<QueueResponse>(`/cards/queue?minutes=${encodeURIComponent(String(minutes))}`),
  rememberWord: (entry: string, gloss: string, sourceSentenceId: string) =>
    post<{ word: WordRecord; card: CardRecord }>("/words/remember", {
      entry,
      gloss,
      sourceSentenceId,
    }),
  setWordStatus: (entry: string, status: WordStatus, gloss?: string) =>
    post<{ word: WordRecord }>("/words/status", { entry, status, gloss }),
  reviewCard: (id: string, rating: number) =>
    post<{ card: CardRecord; word: WordRecord }>("/cards/review", { id, rating }),
  saveProgress: (storyId: string, sentencesRead: string[], completedAt?: number | null) =>
    post<{ progress: ProgressRecord[] }>("/progress", { storyId, sentencesRead, completedAt }),
  addImport: (title: string, raw: string, difficulty: number) =>
    post<{ import: ImportRecord }>("/imports", { title, raw, difficulty }),
  deleteImport: (id: number) => request<{ ok: true }>(`/imports/${id}`, { method: "DELETE" }),
  addTone: (tone: string, syllable: string, score: number) =>
    post<{ tones: ToneAttempt[] }>("/tones", { tone, syllable, score }),
  health: () => request<{ ok: true; version: string; commit: string | null }>("/health"),
};

export type {
  CardRecord,
  ImportRecord,
  ProgressRecord,
  QueueResponse,
  ToneAttempt,
  User,
  UserState,
  WordRecord,
  WordStatus,
};
