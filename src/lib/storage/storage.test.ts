import { describe, it, expect, beforeEach } from 'vitest';
import { createTrip, deleteTripCascade, addJournalEntry, deleteJournalEntryWithPhotos } from './storage';
import { savePackingItem, listPackingItems, saveDoDontItem, listDoDontItems } from './checklist';
import { listJournalEntries } from './local';
import { getPhoto } from './photos';
import { generateId } from '$lib/utils/id';

beforeEach(() => {
  localStorage.clear();
});

describe('createTrip', () => {
  it('copies template packing items into new trip-scoped items', () => {
    savePackingItem({ id: generateId(), tripId: null, category: 'Documents', label: 'Passport', checked: false });
    const trip = createTrip({ name: 'Japan', startDate: '2026-03-03', endDate: '2026-03-15', countries: ['JP'] });
    const tripItems = listPackingItems(trip.id);
    expect(tripItems).toHaveLength(1);
    expect(tripItems[0].label).toBe('Passport');
    expect(tripItems[0].tripId).toBe(trip.id);
    expect(tripItems[0].checked).toBe(false);
  });

  it('never mutates the shared template', () => {
    savePackingItem({ id: generateId(), tripId: null, category: 'Documents', label: 'Passport', checked: false });
    createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-20', countries: ['PE'] });
    expect(listPackingItems(null)).toHaveLength(1);
  });

  it('defaults transportMode to flight when not provided', () => {
    const trip = createTrip({ name: 'Japan', startDate: '2026-03-03', endDate: '2026-03-15', countries: ['JP'] });
    expect(trip.transportMode).toBe('flight');
  });

  it('honors an explicit transportMode', () => {
    const trip = createTrip({
      name: 'Alps hike',
      startDate: '2026-08-05',
      endDate: '2026-08-12',
      countries: ['AT'],
      transportMode: 'other'
    });
    expect(trip.transportMode).toBe('other');
  });
});

describe('deleteTripCascade', () => {
  it('removes the trip along with its journal entries, packing items, and do/dont items', async () => {
    const trip = createTrip({ name: 'Japan', startDate: '2026-03-03', endDate: '2026-03-15', countries: ['JP'] });
    await addJournalEntry(trip.id, { date: '2026-03-05', note: 'Shibuya', photoFiles: [] });
    saveDoDontItem({ id: generateId(), tripId: trip.id, type: 'do', text: 'Learn phrases', checked: false });

    await deleteTripCascade(trip.id);

    expect(listJournalEntries(trip.id)).toEqual([]);
    expect(listPackingItems(trip.id)).toEqual([]);
    expect(listDoDontItems(trip.id)).toEqual([]);
  });

  it('deletes photo blobs belonging to the trip journal entries', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-20', countries: ['PE'] });
    const file = new File([new Blob(['fake'], { type: 'image/jpeg' })], 'photo.jpg', { type: 'image/jpeg' });
    const entry = await addJournalEntry(trip.id, { date: '2026-07-11', note: 'Cusco', photoFiles: [file] });
    const photoId = entry.photoIds[0];
    expect(await getPhoto(photoId)).toBeDefined();

    await deleteTripCascade(trip.id);

    expect(await getPhoto(photoId)).toBeUndefined();
  });
});

describe('deleteJournalEntryWithPhotos', () => {
  it('deletes the entry and its photo blobs', async () => {
    const trip = createTrip({ name: 'Japan', startDate: '2026-03-03', endDate: '2026-03-15', countries: ['JP'] });
    const file = new File([new Blob(['fake'], { type: 'image/jpeg' })], 'photo.jpg', { type: 'image/jpeg' });
    const entry = await addJournalEntry(trip.id, { date: '2026-03-05', note: 'Shibuya', photoFiles: [file] });
    const photoId = entry.photoIds[0];
    expect(await getPhoto(photoId)).toBeDefined();

    await deleteJournalEntryWithPhotos(entry.id);

    expect(await getPhoto(photoId)).toBeUndefined();
    expect(listJournalEntries(trip.id)).toEqual([]);
  });

  it('handles an entry with no photos gracefully', async () => {
    const trip = createTrip({ name: 'Japan', startDate: '2026-03-03', endDate: '2026-03-15', countries: ['JP'] });
    const entry = await addJournalEntry(trip.id, { date: '2026-03-05', note: 'No photos', photoFiles: [] });

    await deleteJournalEntryWithPhotos(entry.id);

    expect(listJournalEntries(trip.id)).toEqual([]);
  });
});

describe('addJournalEntry', () => {
  it('stores uploaded photos and links their ids on the entry', async () => {
    const trip = createTrip({ name: 'Japan', startDate: '2026-03-03', endDate: '2026-03-15', countries: ['JP'] });
    const file = new File([new Blob(['fake'], { type: 'image/jpeg' })], 'photo.jpg', { type: 'image/jpeg' });

    const entry = await addJournalEntry(trip.id, { date: '2026-03-05', note: 'Shibuya crossing', photoFiles: [file] });

    expect(entry.photoIds).toHaveLength(1);
    const stored = await getPhoto(entry.photoIds[0]);
    expect(stored?.id).toBe(entry.photoIds[0]);
  });

  it('creates an entry with no photos when none are provided', async () => {
    const trip = createTrip({ name: 'Japan', startDate: '2026-03-03', endDate: '2026-03-15', countries: ['JP'] });
    const entry = await addJournalEntry(trip.id, { date: '2026-03-05', note: 'No photos today', photoFiles: [] });
    expect(entry.photoIds).toEqual([]);
  });
});
