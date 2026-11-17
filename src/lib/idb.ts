"use client";
/** Tiny IndexedDB key-value helpers. Two stores: "kv" (database snapshot) and "photos" (image blobs). */
const DB_NAME = "apex";
let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  return (dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("kv");
      r.result.createObjectStore("photos");
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
}

async function tx<T>(store: "kv" | "photos", mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  const d = await open();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => res(req ? (req.result as T) : (undefined as T));
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}

export const idbGet = <T,>(key: string) => tx<T>("kv", "readonly", (s) => s.get(key));
export const idbSet = (key: string, v: unknown) => tx("kv", "readwrite", (s) => { s.put(v, key); });
export const photoGet = (key: string) => tx<Blob | undefined>("photos", "readonly", (s) => s.get(key));
export const photoSet = (key: string, v: Blob) => tx("photos", "readwrite", (s) => { s.put(v, key); });
export const photoDel = (key: string) => tx("photos", "readwrite", (s) => { s.delete(key); });
export const photoClear = () => tx("photos", "readwrite", (s) => { s.clear(); });
export async function wipeAll() {
  await tx("kv", "readwrite", (s) => { s.clear(); });
  await photoClear();
}
