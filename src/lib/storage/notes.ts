import type { TripNote } from '$lib/types';

const NOTES_KEY = 'trailune:notes';

function readAll(): TripNote[] {
  const raw = localStorage.getItem(NOTES_KEY);
  return raw ? (JSON.parse(raw) as TripNote[]) : [];
}

function writeAll(items: TripNote[]): void {
  localStorage.setItem(NOTES_KEY, JSON.stringify(items));
}

export function getNote(tripId: string): TripNote | undefined {
  return readAll().find((n) => n.tripId === tripId);
}

export function saveNote(tripId: string, text: string): void {
  const items = readAll();
  const idx = items.findIndex((n) => n.tripId === tripId);
  const note: TripNote = { tripId, text, updatedAt: new Date().toISOString() };
  if (idx === -1) items.push(note);
  else items[idx] = note;
  writeAll(items);
}

export function deleteNoteForTrip(tripId: string): void {
  writeAll(readAll().filter((n) => n.tripId !== tripId));
}
