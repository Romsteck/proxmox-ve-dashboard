import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'app_persistence_v1';
const STORE_NAME = 'auth_prefs_v1';

export async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, key);
}

export async function idbPut<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, value, key);
}

export async function idbDel(key: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, key);
}

export async function idbClear(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}