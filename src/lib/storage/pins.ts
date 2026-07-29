import type { PinEntry } from '$lib/types';

const PINS_KEY = 'trailune:pins';

function readAll(): PinEntry[] {
  const raw = localStorage.getItem(PINS_KEY);
  return raw ? (JSON.parse(raw) as PinEntry[]) : [];
}

function writeAll(items: PinEntry[]): void {
  localStorage.setItem(PINS_KEY, JSON.stringify(items));
}

export function listPins(tripId: string): PinEntry[] {
  // Backfilled order (index i) is positional, not persisted or identity-stable across
  // calls — it's only a deterministic default for legacy pins with no stored order.
  return readAll()
    .filter((p) => p.tripId === tripId)
    .map((p, i) => ({ order: i, ...p }));
}

export function savePin(pin: PinEntry): void {
  const items = readAll();
  const idx = items.findIndex((p) => p.id === pin.id);
  if (idx === -1) items.push(pin);
  else items[idx] = pin;
  writeAll(items);
}

export function deletePin(id: string): void {
  writeAll(readAll().filter((p) => p.id !== id));
}

export function deletePinsForTrip(tripId: string): void {
  writeAll(readAll().filter((p) => p.tripId !== tripId));
}

// orderedIds must include every pin id for this trip, or pins left out keep their
// stale order and may collide with the newly assigned values.
export function reorderPins(tripId: string, orderedIds: string[]): void {
  const items = readAll();
  for (const item of items) {
    if (item.tripId !== tripId) continue;
    const newOrder = orderedIds.indexOf(item.id);
    if (newOrder !== -1) item.order = newOrder;
  }
  writeAll(items);
}
