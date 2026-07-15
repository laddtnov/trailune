import type { TipEntry } from '$lib/types';

const TIPS_KEY = 'trailune:tips';

function readAll(): TipEntry[] {
  const raw = localStorage.getItem(TIPS_KEY);
  return raw ? (JSON.parse(raw) as TipEntry[]) : [];
}

function writeAll(tips: TipEntry[]): void {
  localStorage.setItem(TIPS_KEY, JSON.stringify(tips));
}

export function listTips(tripId: string): TipEntry[] {
  return readAll().filter((t) => t.tripId === tripId);
}

export function getTip(id: string): TipEntry | undefined {
  return readAll().find((t) => t.id === id);
}

export function saveTip(tip: TipEntry): void {
  const tips = readAll();
  const idx = tips.findIndex((t) => t.id === tip.id);
  if (idx === -1) tips.push(tip);
  else tips[idx] = tip;
  writeAll(tips);
}

export function deleteTip(id: string): void {
  writeAll(readAll().filter((t) => t.id !== id));
}

export function deleteTipsForTrip(tripId: string): void {
  writeAll(readAll().filter((t) => t.tripId !== tripId));
}
