import { openDB, type IDBPDatabase } from 'idb';
import type { Photo } from '$lib/types';

let dbPromise: Promise<IDBPDatabase> | undefined;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB('trailune-photos', 1, {
      upgrade(db) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
    });
  }
  return dbPromise;
}

export async function savePhoto(photo: Photo): Promise<void> {
  const db = await getDb();
  await db.put('photos', photo);
}

export async function getPhoto(id: string): Promise<Photo | undefined> {
  const db = await getDb();
  return db.get('photos', id);
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('photos', id);
}
