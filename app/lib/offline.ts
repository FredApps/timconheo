import type { SyncOperation, SyncStatus, User, UserState } from "../../shared/types";

const DB_NAME = "tim-con-heo-offline";
const DB_VERSION = 1;
const USER_KEY = "tch-offline-user";
const memory = new Map<string, unknown>();
const listeners = new Set<(status: SyncStatus) => void>();

let status: SyncStatus = {
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  syncing: false,
  pending: 0,
  lastSyncedAt: null,
  error: null,
};

function emit(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch };
  for (const listener of listeners) listener(status);
}

export function subscribeSync(listener: (value: SyncStatus) => void): () => void {
  listeners.add(listener);
  listener(status);
  return () => listeners.delete(listener);
}

export function currentSyncStatus(): SyncStatus {
  return status;
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
      if (!db.objectStoreNames.contains("outbox")) db.createObjectStore("outbox", { keyPath: "operationId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline storage."));
  });
}

async function metaGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb().catch(() => null);
  if (!db) return memory.get(key) as T | undefined;
  return new Promise((resolve, reject) => {
    const request = db.transaction("meta").objectStore("meta").get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error ?? new Error("Could not read offline storage."));
  });
}

async function metaPut(key: string, value: unknown): Promise<void> {
  memory.set(key, value);
  const db = await openDb().catch(() => null);
  if (!db) return;
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction("meta", "readwrite").objectStore("meta").put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Could not write offline storage."));
  });
}

export function deviceId(): string {
  const key = "tch-device-id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

export function cachedUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) ?? "null") as User | null;
  } catch {
    return null;
  }
}

export function rememberUser(user: User | null): void {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

const stateKey = (userId: string) => `state:${userId}`;
const cursorKey = (userId: string) => `cursor:${userId}`;

export async function getCachedState(userId: string): Promise<UserState | null> {
  return (await metaGet<UserState>(stateKey(userId))) ?? null;
}

export async function putCachedState(userId: string, stateValue: UserState): Promise<void> {
  await metaPut(stateKey(userId), stateValue);
  if (typeof stateValue.syncCursor === "number") await metaPut(cursorKey(userId), stateValue.syncCursor);
}

export async function updateCachedState(
  userId: string,
  update: (current: UserState) => UserState,
): Promise<UserState> {
  const current = (await getCachedState(userId)) ?? {
    words: [],
    progress: [],
    imports: [],
    tones: [],
    cards: [],
    syncCursor: 0,
  };
  const next = update(current);
  await putCachedState(userId, next);
  return next;
}

export async function queueOperation(operation: SyncOperation): Promise<void> {
  const db = await openDb().catch(() => null);
  if (!db) memory.set(`op:${operation.operationId}`, operation);
  else {
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction("outbox", "readwrite").objectStore("outbox").put(operation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Could not queue offline change."));
    });
  }
  emit({ pending: (await pendingOperations()).length });
}

export async function pendingOperations(): Promise<SyncOperation[]> {
  const db = await openDb().catch(() => null);
  if (!db) {
    return [...memory.entries()]
      .filter(([key]) => key.startsWith("op:"))
      .map(([, value]) => value as SyncOperation)
      .sort((a, b) => a.occurredAt - b.occurredAt);
  }
  return new Promise((resolve, reject) => {
    const request = db.transaction("outbox").objectStore("outbox").getAll();
    request.onsuccess = () =>
      resolve((request.result as SyncOperation[]).sort((a, b) => a.occurredAt - b.occurredAt));
    request.onerror = () => reject(request.error ?? new Error("Could not read offline changes."));
  });
}

export async function acknowledgeOperations(ids: string[]): Promise<void> {
  const db = await openDb().catch(() => null);
  if (!db) ids.forEach((id) => memory.delete(`op:${id}`));
  else {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("outbox", "readwrite");
      for (const id of ids) transaction.objectStore("outbox").delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Could not acknowledge offline changes."));
    });
  }
  emit({ pending: (await pendingOperations()).length });
}

export async function getCursor(userId: string): Promise<number> {
  return (await metaGet<number>(cursorKey(userId))) ?? 0;
}

export async function setCursor(userId: string, cursor: number): Promise<void> {
  await metaPut(cursorKey(userId), cursor);
}

export function markSyncing(syncing: boolean): void {
  emit({ syncing, online: navigator.onLine, error: syncing ? null : status.error });
}

export function markSynced(): void {
  emit({ syncing: false, online: true, lastSyncedAt: Date.now(), error: null });
}

export function markOffline(error?: unknown): void {
  emit({ syncing: false, online: false, error: error instanceof Error ? error.message : null });
}

export async function purgeOfflineData(): Promise<void> {
  rememberUser(null);
  memory.clear();
  if (typeof indexedDB !== "undefined") {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
  }
  emit({ pending: 0, lastSyncedAt: null, error: null });
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => emit({ online: true }));
  window.addEventListener("offline", () => emit({ online: false }));
}
