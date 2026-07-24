import type { WishlistEntry } from '$lib/types';

const WISHLIST_KEY = 'trailune:wishlist';

function readAll(): WishlistEntry[] {
  const raw = localStorage.getItem(WISHLIST_KEY);
  return raw ? (JSON.parse(raw) as WishlistEntry[]) : [];
}

function writeAll(items: WishlistEntry[]): void {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
}

export function listWishlist(): WishlistEntry[] {
  return readAll();
}

export function saveWishlistEntry(entry: WishlistEntry): void {
  const items = readAll();
  const idx = items.findIndex((e) => e.id === entry.id);
  if (idx === -1) items.push(entry);
  else items[idx] = entry;
  writeAll(items);
}

export function deleteWishlistEntry(id: string): void {
  writeAll(readAll().filter((e) => e.id !== id));
}
