import type { Trip, JournalEntry } from '$lib/types';

const TRIPS_KEY = 'trailune:trips';
const ENTRIES_KEY = 'trailune:journalEntries';

function readAll<T>(key: string): T[] {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T[]) : [];
}

function writeAll<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

export function listTrips(): Trip[] {
  return readAll<Trip>(TRIPS_KEY);
}

export function getTrip(id: string): Trip | undefined {
  return listTrips().find((t) => t.id === id);
}

export function saveTrip(trip: Trip): void {
  const trips = listTrips();
  const idx = trips.findIndex((t) => t.id === trip.id);
  if (idx === -1) trips.push(trip);
  else trips[idx] = trip;
  writeAll(TRIPS_KEY, trips);
}

export function deleteTrip(id: string): void {
  writeAll(TRIPS_KEY, listTrips().filter((t) => t.id !== id));
}

export function listJournalEntries(tripId: string): JournalEntry[] {
  return readAll<JournalEntry>(ENTRIES_KEY).filter((e) => e.tripId === tripId);
}

export function getJournalEntry(id: string): JournalEntry | undefined {
  return readAll<JournalEntry>(ENTRIES_KEY).find((e) => e.id === id);
}

export function saveJournalEntry(entry: JournalEntry): void {
  const entries = readAll<JournalEntry>(ENTRIES_KEY);
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx === -1) entries.push(entry);
  else entries[idx] = entry;
  writeAll(ENTRIES_KEY, entries);
}

export function deleteJournalEntry(id: string): void {
  writeAll(ENTRIES_KEY, readAll<JournalEntry>(ENTRIES_KEY).filter((e) => e.id !== id));
}

export function deleteJournalEntriesForTrip(tripId: string): void {
  writeAll(ENTRIES_KEY, readAll<JournalEntry>(ENTRIES_KEY).filter((e) => e.tripId !== tripId));
}
