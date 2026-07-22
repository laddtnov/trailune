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
  return readAll().filter((p) => p.tripId === tripId);
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
