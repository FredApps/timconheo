import { createEmptyCard, fsrs, type Card } from "ts-fsrs";
import { Capacitor, CapacitorHttp, registerPlugin } from "@capacitor/core";
import type {
  CardRecord,
  CardKind,
  DeviceSession,
  ImportRecord,
  ProgressRecord,
  QueueResponse,
  SyncOperation,
  SyncOperationKind,
  SyncResponse,
  ToneAttempt,
  User,
  UserState,
  WordRecord,
  WordStatus,
} from "../../shared/types";
import {
  acknowledgeOperations,
  cachedUser,
  deviceId,
  getCachedState,
  getCursor,
  markOffline,
  markSynced,
  markSyncing,
  pendingOperations,
  purgeOfflineData,
  putCachedState,
  queueOperation,
  rememberUser,
  setCursor,
  updateCachedState,
} from "./offline";

const API_BASE = Capacitor.isNativePlatform() ? "https://ayrien.se/heo/api" : "/heo/api";
const offlineScheduler = fsrs({ enable_fuzz: true, enable_short_term: true });
let activeUser: User | null = cachedUser();
interface SecureSessionPlugin {
  get(): Promise<{ value?: string }>;
  set(options: { value: string }): Promise<void>;
  clear(): Promise<void>;
}
const SecureSession = registerPlugin<SecureSessionPlugin>("SecureSession");
let nativeToken: string | undefined;

async function getNativeToken(): Promise<string | undefined> {
  if (!Capacitor.isNativePlatform()) return undefined;
  if (nativeToken) return nativeToken;
  nativeToken = (await SecureSession.get()).value;
  return nativeToken;
}

async function saveNativeToken(token: string | undefined): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  nativeToken = token;
  if (token) await SecureSession.set({ value: token });
  else await SecureSession.clear();
}

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
  if (Capacitor.isNativePlatform()) {
    try {
      const bodyText = typeof init?.body === "string" ? init.body : undefined;
      const token = await getNativeToken();
      const response = await CapacitorHttp.request({
        url: API_BASE + path,
        method: init?.method ?? "GET",
        headers: {
          ...(init?.body ? { "content-type": "application/json" } : {}),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        data: bodyText ? (JSON.parse(bodyText) as unknown) : undefined,
        webFetchExtra: { credentials: "include" },
      });
      const payload = response.data as T & { error?: { message?: string; code?: string; field?: string } };
      if (response.status < 200 || response.status >= 300) {
        throw new ApiError(
          payload?.error?.message ?? "Request failed.",
          payload?.error?.code ?? "UNKNOWN",
          response.status,
          payload?.error?.field,
        );
      }
      return payload;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new NetworkError(error);
    }
  }
  let response: Response;
  try {
    response = await fetch(API_BASE + path, {
      credentials: "include",
      headers: init?.body ? { "content-type": "application/json", ...init.headers } : init?.headers,
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
  return request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
}

function requireUser(): User {
  if (!activeUser) throw new ApiError("Sign in to continue.", "AUTH_REQUIRED", 401);
  return activeUser;
}

function makeOperation(
  kind: SyncOperationKind,
  entityId: string,
  payload: Record<string, unknown>,
): SyncOperation {
  return {
    operationId: crypto.randomUUID(),
    deviceId: deviceId(),
    entityId,
    kind,
    occurredAt: Date.now(),
    payload,
  };
}

async function syncNow(): Promise<void> {
  const user = activeUser;
  if (!user) return;
  const operations = await pendingOperations();
  if (!operations.length) return;
  markSyncing(true);
  try {
    const response = await post<SyncResponse>("/sync", {
      protocolVersion: 1,
      cursor: await getCursor(user.id),
      operations: operations.slice(0, 200),
    });
    await acknowledgeOperations([
      ...response.acknowledged,
      ...response.rejected.map((item) => item.operationId).filter((id) => id !== "unknown"),
    ]);
    await setCursor(user.id, response.cursor);
    const canonical = await request<UserState>("/state");
    await putCachedState(user.id, canonical);
    if (response.rejected.length) {
      markOffline(new Error(response.rejected.map((item) => item.message).join(" ")));
    } else {
      markSynced();
    }
    if ((await pendingOperations()).length) await syncNow();
  } catch (error) {
    markOffline(error);
    if (!isNetworkError(error)) throw error;
  }
}

async function enqueue(
  operation: SyncOperation,
  optimistic: (state: UserState) => UserState,
): Promise<UserState> {
  const user = requireUser();
  const state = await updateCachedState(user.id, optimistic);
  await queueOperation(operation);
  await syncNow().catch(() => undefined);
  return (await getCachedState(user.id)) ?? state;
}

function emptyState(): UserState {
  return { words: [], progress: [], imports: [], tones: [], cards: [], syncCursor: 0 };
}

export const api = {
  session: async () => {
    try {
      const session = await request<{ user: User | null; allowSignups: boolean }>("/session");
      activeUser = session.user;
      rememberUser(session.user);
      return session;
    } catch (error) {
      const user = cachedUser();
      if (isNetworkError(error) && user) {
        activeUser = user;
        markOffline(error);
        return { user, allowSignups: false, offline: true };
      }
      throw error;
    }
  },
  login: async (username: string, password: string) => {
    const result = await post<{ user: User; deviceToken?: string }>("/login", {
      username,
      password,
      nativeDevice: Capacitor.isNativePlatform(),
    });
    await saveNativeToken(result.deviceToken);
    activeUser = result.user;
    rememberUser(result.user);
    return result;
  },
  signup: async (username: string, password: string) => {
    const result = await post<{ user: User; deviceToken?: string }>("/signup", {
      username,
      password,
      nativeDevice: Capacitor.isNativePlatform(),
    });
    await saveNativeToken(result.deviceToken);
    activeUser = result.user;
    rememberUser(result.user);
    return result;
  },
  logout: async (purge = true) => {
    await post<{ ok: true }>("/logout").catch(() => ({ ok: true as const }));
    await saveNativeToken(undefined);
    activeUser = null;
    if (purge) await purgeOfflineData();
    return { ok: true as const };
  },
  state: async (): Promise<UserState> => {
    const user = requireUser();
    await syncNow().catch(() => undefined);
    try {
      const state = await request<UserState>("/state");
      await putCachedState(user.id, state);
      markSynced();
      return state;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      markOffline(error);
      return (await getCachedState(user.id)) ?? emptyState();
    }
  },
  sync: syncNow,
  queue: async (minutes: number): Promise<QueueResponse> => {
    try {
      return await request<QueueResponse>(`/cards/queue?minutes=${encodeURIComponent(String(minutes))}`);
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      const state = (await getCachedState(requireUser().id)) ?? emptyState();
      const now = Date.now();
      return {
        cards: (state.cards ?? [])
          .filter((card) => card.due <= now)
          .sort((a, b) => a.due - b.due)
          .slice(0, minutes * 8),
        budgetMs: minutes * 60000,
        serverNow: now,
        forgiveness: null,
        newCount: 0,
      };
    }
  },
  rememberWord: async (
    entry: string,
    gloss: string,
    sourceSentenceId: string,
    kind: CardKind = "word",
    payload: Record<string, unknown> = {},
  ) => {
    const now = Date.now();
    const operation = makeOperation("word.remember", crypto.randomUUID(), {
      entry,
      gloss,
      sourceSentenceId,
      kind,
      cardPayload: payload,
    });
    const state = await enqueue(operation, (current) => {
      const existing = current.words.find((word) => word.entry === entry);
      const word: WordRecord = {
        entry,
        gloss: gloss || existing?.gloss || "",
        status: existing?.status === "known" ? "known" : "learning",
        timesSeen: (existing?.timesSeen ?? 0) + 1,
        firstSeen: existing?.firstSeen ?? now,
        updatedAt: now,
      };
      const id = kind === "word" ? `recognition:${entry}` : `${kind}:${entry}:${sourceSentenceId}`;
      const existingCard = (current.cards ?? []).find((card) => card.id === id);
      const raw = createEmptyCard(new Date(now));
      const card: CardRecord = existingCard ?? {
        id,
        entry,
        gloss,
        sourceSentenceId,
        card: raw as unknown as Record<string, unknown>,
        due: new Date(raw.due).getTime(),
        updatedAt: now,
        kind,
        payload,
      };
      return {
        ...current,
        words: [...current.words.filter((item) => item.entry !== entry), word],
        cards: [...(current.cards ?? []).filter((item) => item.id !== id), card],
      };
    });
    return {
      word: state.words.find((word) => word.entry === entry)!,
      card: (state.cards ?? []).find(
        (card) =>
          card.id === (kind === "word" ? `recognition:${entry}` : `${kind}:${entry}:${sourceSentenceId}`),
      )!,
    };
  },
  setWordStatus: async (entry: string, status: WordStatus, gloss = "") => {
    const now = Date.now();
    const state = await enqueue(
      makeOperation("word.status", crypto.randomUUID(), { entry, status, gloss }),
      (current) => {
        const existing = current.words.find((word) => word.entry === entry);
        const word: WordRecord = {
          entry,
          gloss: gloss || existing?.gloss || "",
          status,
          timesSeen: existing?.timesSeen ?? 1,
          firstSeen: existing?.firstSeen ?? now,
          updatedAt: now,
        };
        return { ...current, words: [...current.words.filter((item) => item.entry !== entry), word] };
      },
    );
    return { word: state.words.find((word) => word.entry === entry)! };
  },
  reviewCard: async (id: string, rating: number) => {
    if (!activeUser) return post<{ card: CardRecord; word: WordRecord }>("/cards/review", { id, rating });
    const at = Date.now();
    const state = await enqueue(
      makeOperation("card.review", crypto.randomUUID(), { id, rating }),
      (current) => {
        const record = (current.cards ?? []).find((card) => card.id === id);
        if (!record) return current;
        const scheduled = offlineScheduler.next(record.card as unknown as Card, new Date(at), rating);
        const card: CardRecord = {
          ...record,
          card: scheduled.card as unknown as Record<string, unknown>,
          due: new Date(scheduled.card.due).getTime(),
          updatedAt: at,
        };
        return { ...current, cards: [...(current.cards ?? []).filter((item) => item.id !== id), card] };
      },
    );
    const card = (state.cards ?? []).find((item) => item.id === id)!;
    return { card, word: state.words.find((word) => word.entry === card?.entry)! };
  },
  saveProgress: async (storyId: string, sentencesRead: string[], completedAt?: number | null) => {
    const now = Date.now();
    const state = await enqueue(
      makeOperation("progress.merge", crypto.randomUUID(), { storyId, sentencesRead, completedAt }),
      (current) => {
        const existing = current.progress.find((item) => item.storyId === storyId);
        const record: ProgressRecord = {
          storyId,
          sentencesRead: [...new Set([...(existing?.sentencesRead ?? []), ...sentencesRead])],
          completedAt: existing?.completedAt ?? completedAt ?? null,
          updatedAt: now,
        };
        return {
          ...current,
          progress: [...current.progress.filter((item) => item.storyId !== storyId), record],
        };
      },
    );
    return { progress: state.progress };
  },
  addImport: async (title: string, raw: string, difficulty: number) => {
    const entityId = crypto.randomUUID();
    const record: ImportRecord = { id: entityId, entityId, title, raw, difficulty, importedAt: Date.now() };
    const state = await enqueue(
      makeOperation("import.add", entityId, { title, raw, difficulty }),
      (current) => ({
        ...current,
        imports: [record, ...current.imports],
      }),
    );
    return {
      import: state.imports.find((item) => item.entityId === entityId || item.id === entityId) ?? record,
    };
  },
  deleteImport: async (id: number | string) => {
    const current = (await getCachedState(requireUser().id)) ?? emptyState();
    const record = current.imports.find((item) => String(item.id) === String(id));
    const entityId = record?.entityId ?? String(id);
    await enqueue(makeOperation("import.delete", entityId, {}), (state) => ({
      ...state,
      imports: state.imports.filter((item) => String(item.id) !== String(id) && item.entityId !== entityId),
    }));
    return { ok: true as const };
  },
  deleteAllImports: async () => {
    if (!activeUser) return request<{ ok: true }>("/imports", { method: "DELETE" });
    const current = (await getCachedState(activeUser.id)) ?? emptyState();
    for (const item of current.imports) await api.deleteImport(item.id);
    return { ok: true as const };
  },
  addTone: async (tone: string, syllable: string, score: number) => {
    const entityId = crypto.randomUUID();
    const attempt: ToneAttempt = { id: entityId, entityId, tone, syllable, score, createdAt: Date.now() };
    const state = await enqueue(
      makeOperation("tone.add", entityId, { tone, syllable, score }),
      (current) => ({
        ...current,
        tones: [attempt, ...current.tones].slice(0, 500),
      }),
    );
    return { tones: state.tones };
  },
  sessions: () => request<{ sessions: DeviceSession[] }>("/sessions"),
  revokeSession: (id: string) =>
    request<{ ok: true }>(`/sessions/${encodeURIComponent(id)}`, { method: "DELETE" }),
  exportData: () => request<Record<string, unknown>>("/export"),
  deleteAccount: (password: string) =>
    request<{ ok: true }>("/account", { method: "DELETE", body: JSON.stringify({ password }) }),
  purgeDevice: purgeOfflineData,
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
