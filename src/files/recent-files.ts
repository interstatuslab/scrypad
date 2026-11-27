// File › Recent: the last few files ScryPad opened or saved.
// Kept in this browser's own storage (IndexedDB), never sent anywhere.
// Web: the browser's file "handle" (it asks once for permission when you reopen).
// Desktop app: the file's path on your PC.

export interface RecentFile {
  key: string;          // path on desktop, name + time on the web
  name: string;
  path?: string;        // desktop app
  handle?: FileSystemFileHandle; // web
  at: number;
}

const DB = 'scrypad';
const STORE = 'recent';
const MAX = 6;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function all(): Promise<RecentFile[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as RecentFile[]).sort((a, b) => b.at - a.at));
    req.onerror = () => reject(req.error);
  });
}

async function write(fn: (store: IDBObjectStore) => void): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listRecent(): Promise<RecentFile[]> {
  try { return (await all()).slice(0, MAX); } catch { return []; }
}

export async function rememberFile(entry: { name: string; path?: string | null; handle?: FileSystemFileHandle | null }): Promise<void> {
  if (!entry.path && !entry.handle) return; // a plain upload can't be reopened later
  try {
    const list = await all();
    // The same file again (same path, or the same handle) moves to the top
    let same: RecentFile | undefined;
    if (entry.path) same = list.find((r) => r.path === entry.path);
    else {
      for (const r of list) {
        if (r.handle && entry.handle && (await r.handle.isSameEntry?.(entry.handle))) { same = r; break; }
      }
    }
    const key = same?.key ?? (entry.path || `${entry.name}-${Date.now()}`);
    const rec: RecentFile = { key, name: entry.name, at: Date.now() };
    if (entry.path) rec.path = entry.path;
    if (entry.handle) rec.handle = entry.handle;
    const extra = list.filter((r) => r.key !== key).slice(MAX - 1);
    await write((s) => { s.put(rec); extra.forEach((r) => s.delete(r.key)); });
  } catch { /* storage blocked: Recent just stays empty */ }
}

export async function forgetFile(key: string): Promise<void> {
  try { await write((s) => s.delete(key)); } catch { /* ignore */ }
}

export async function clearRecent(): Promise<void> {
  try { await write((s) => s.clear()); } catch { /* ignore */ }
}
