import type {
  CardRecord,
  ImportRecord,
  ProgressRecord,
  ToneAttempt,
  User,
  UserState,
  WordRecord,
  WordStatus,
} from "../../shared/types";

/**
 * The app is always mounted at /heo, both behind the IIS reverse proxy and in
 * the Android WebView pointed at https://ayrien.se/heo/.
 */
const API_BASE = "/heo/api";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    // Session lives in an httpOnly cookie, so it must ride along with every call.
    credentials: "include",
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    ...init,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? "Request failed.",
      payload?.error?.code ?? "UNKNOWN",
      response.status,
    );
  }
  return payload as T;
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}

export const api = {
  session: () => request<{ user: User | null; allowSignups: boolean }>("/session"),
  login: (username: string, password: string) =>
    post<{ user: User }>("/login", { username, password }),
  signup: (username: string, password: string) =>
    post<{ user: User }>("/signup", { username, password }),
  logout: () => post<{ ok: true }>("/logout"),

  state: () => request<UserState>("/state"),

  rememberWord: (entry: string, gloss: string, sourceSentenceId: string) =>
    post<{ word: WordRecord; card: CardRecord }>("/words/remember", {
      entry,
      gloss,
      sourceSentenceId,
    }),
  setWordStatus: (entry: string, status: WordStatus) =>
    post<{ word: WordRecord }>("/words/status", { entry, status }),

  reviewCard: (id: string, rating: number) =>
    post<{ card: CardRecord; word: WordRecord }>("/cards/review", { id, rating }),

  saveProgress: (storyId: string, sentencesRead: string[], completedAt?: number | null) =>
    post<{ progress: ProgressRecord[] }>("/progress", { storyId, sentencesRead, completedAt }),

  addImport: (title: string, raw: string, difficulty: number) =>
    post<{ import: ImportRecord }>("/imports", { title, raw, difficulty }),
  deleteImport: (id: number) => request<{ ok: true }>(`/imports/${id}`, { method: "DELETE" }),

  addTone: (tone: string, syllable: string, score: number) =>
    post<{ tones: ToneAttempt[] }>("/tones", { tone, syllable, score }),
};

export type { CardRecord, ImportRecord, ProgressRecord, ToneAttempt, User, UserState, WordRecord };
