"use client";
/** IndexedDB queue of unsynced attempts. Falls back to localStorage if IndexedDB is unavailable. */
export type QueuedAttempt = { clientId: string; drillId: string; questionId: string; displayedIndex: number | null; timeMs: number; at: number };

const DB = "learncrew";
const STORE = "attempts";

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "clientId" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}
function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
const LS = "lc-queue";
const lsGet = (): QueuedAttempt[] => JSON.parse(localStorage.getItem(LS) ?? "[]");

export async function enqueue(a: QueuedAttempt) {
  const db = await open();
  if (db) await tx(db, "readwrite", (s) => s.put(a));
  else localStorage.setItem(LS, JSON.stringify([...lsGet().filter((x) => x.clientId !== a.clientId), a]));
}
export async function pending(): Promise<QueuedAttempt[]> {
  const db = await open();
  const all = db ? await tx<QueuedAttempt[]>(db, "readonly", (s) => s.getAll() as IDBRequest<QueuedAttempt[]>) : lsGet();
  return all.sort((a, b) => a.at - b.at);
}
export async function remove(ids: string[]) {
  const db = await open();
  if (db) for (const id of ids) await tx(db, "readwrite", (s) => s.delete(id));
  else localStorage.setItem(LS, JSON.stringify(lsGet().filter((x) => !ids.includes(x.clientId))));
}

export type SyncResult = { clientId: string; ok: boolean; status?: number; result?: unknown };
let flushing: Promise<SyncResult[]> | null = null;
/** POST everything queued to /api/sync (idempotent by clientId). Concurrent calls share one flush. */
export function flush(): Promise<SyncResult[]> {
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      const items = await pending();
      if (!items.length) return [];
      const res = await fetch("/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ attempts: items }) });
      if (!res.ok) return [];
      const body = (await res.json()) as { results: SyncResult[] };
      // Drop synced items and permanently-rejected ones (4xx); keep 5xx for retry.
      await remove(body.results.filter((r) => r.ok || (r.status && r.status < 500)).map((r) => r.clientId));
      return body.results;
    } catch {
      return [];
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}
