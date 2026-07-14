import { describe, it, expect, beforeEach } from 'vitest';
import {
  listTrips,
  getTrip,
  saveTrip,
  deleteTrip,
  listJournalEntries,
  getJournalEntry,
  saveJournalEntry,
  deleteJournalEntry,
  deleteJournalEntriesForTrip
} from './local';
import type { Trip, JournalEntry } from '$lib/types';

const trip: Trip = {
  id: 't1',
  name: 'Japan',
  startDate: '2026-03-03',
  endDate: '2026-03-15',
  countries: ['JP'],
  transportMode: 'flight',
  createdAt: '2026-01-01T00:00:00.000Z'
};

beforeEach(() => {
  localStorage.clear();
});

describe('trips repository', () => {
  it('starts empty', () => {
    expect(listTrips()).toEqual([]);
  });

  it('saves and retrieves a trip', () => {
    saveTrip(trip);
    expect(listTrips()).toEqual([trip]);
    expect(getTrip('t1')).toEqual(trip);
  });

  it('updates an existing trip in place instead of duplicating it', () => {
    saveTrip(trip);
    saveTrip({ ...trip, name: 'Japan (updated)' });
    expect(listTrips()).toHaveLength(1);
    expect(listTrips()[0].name).toBe('Japan (updated)');
  });

  it('deletes a trip', () => {
    saveTrip(trip);
    deleteTrip('t1');
    expect(listTrips()).toEqual([]);
  });

  it('defaults transportMode to flight for legacy trips missing the field', () => {
    const legacyTrip = {
      id: 't2',
      name: 'Peru',
      startDate: '2026-07-10',
      endDate: '2026-07-20',
      countries: ['PE'],
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    localStorage.setItem('trailune:trips', JSON.stringify([legacyTrip]));

    expect(listTrips()[0].transportMode).toBe('flight');
    expect(getTrip('t2')?.transportMode).toBe('flight');
  });
});

describe('journal entries repository', () => {
  const entry: JournalEntry = { id: 'e1', tripId: 't1', date: '2026-03-05', note: 'Shibuya', photoIds: [] };

  it('saves and lists entries scoped to a trip', () => {
    saveJournalEntry(entry);
    saveJournalEntry({ ...entry, id: 'e2', tripId: 't2' });
    expect(listJournalEntries('t1')).toEqual([entry]);
  });

  it('retrieves a single entry by id', () => {
    saveJournalEntry(entry);
    expect(getJournalEntry('e1')).toEqual(entry);
  });

  it('deletes a single entry', () => {
    saveJournalEntry(entry);
    deleteJournalEntry('e1');
    expect(listJournalEntries('t1')).toEqual([]);
  });

  it('deletes all entries for a trip', () => {
    saveJournalEntry(entry);
    saveJournalEntry({ ...entry, id: 'e2' });
    saveJournalEntry({ ...entry, id: 'e3', tripId: 't2' });
    deleteJournalEntriesForTrip('t1');
    expect(listJournalEntries('t1')).toEqual([]);
    expect(listJournalEntries('t2')).toHaveLength(1);
  });
});
