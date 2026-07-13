import type { PackingItem, DoDontItem } from '$lib/types';

const PACKING_KEY = 'trailune:packingItems';
const DODONT_KEY = 'trailune:doDontItems';

function readAll<T>(key: string): T[] {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T[]) : [];
}

function writeAll<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

export function listPackingItems(tripId: string | null): PackingItem[] {
  return readAll<PackingItem>(PACKING_KEY).filter((i) => i.tripId === tripId);
}

export function savePackingItem(item: PackingItem): void {
  const items = readAll<PackingItem>(PACKING_KEY);
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx === -1) items.push(item);
  else items[idx] = item;
  writeAll(PACKING_KEY, items);
}

export function deletePackingItem(id: string): void {
  writeAll(PACKING_KEY, readAll<PackingItem>(PACKING_KEY).filter((i) => i.id !== id));
}

export function deletePackingItemsForTrip(tripId: string): void {
  writeAll(PACKING_KEY, readAll<PackingItem>(PACKING_KEY).filter((i) => i.tripId !== tripId));
}

export function listDoDontItems(tripId: string): DoDontItem[] {
  return readAll<DoDontItem>(DODONT_KEY).filter((i) => i.tripId === tripId);
}

export function saveDoDontItem(item: DoDontItem): void {
  const items = readAll<DoDontItem>(DODONT_KEY);
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx === -1) items.push(item);
  else items[idx] = item;
  writeAll(DODONT_KEY, items);
}

export function deleteDoDontItem(id: string): void {
  writeAll(DODONT_KEY, readAll<DoDontItem>(DODONT_KEY).filter((i) => i.id !== id));
}

export function deleteDoDontItemsForTrip(tripId: string): void {
  writeAll(DODONT_KEY, readAll<DoDontItem>(DODONT_KEY).filter((i) => i.tripId !== tripId));
}
