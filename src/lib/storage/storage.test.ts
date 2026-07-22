import { describe, it, expect, beforeEach } from 'vitest';
import {
	createTrip,
	deleteTripCascade,
	addJournalEntry,
	deleteJournalEntryWithPhotos,
	addTipEntry,
	deleteTipEntryWithPhoto,
	savePin,
	listPins
} from './storage';
import { savePackingItem, listPackingItems, saveDoDontItem, listDoDontItems } from './checklist';
import { listJournalEntries } from './local';
import { listTips } from './tips';
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

  it('removes the trip tips along with their photos', async () => {
    const trip = createTrip({ name: 'Japan', startDate: '2026-03-03', endDate: '2026-03-15', countries: ['JP'] });
    const file = new File([new Blob(['fake'], { type: 'image/jpeg' })], 'photo.jpg', { type: 'image/jpeg' });
    const tip = await addTipEntry(trip.id, { category: 'currency', note: 'Good rate downtown', photoFile: file });

    await deleteTripCascade(trip.id);

    expect(listTips(trip.id)).toEqual([]);
    expect(await getPhoto(tip.photoId!)).toBeUndefined();
  });

  it('removes the trip pins', () => {
    const trip = createTrip({ name: 'Ireland', startDate: '2026-06-01', endDate: '2026-06-10', countries: ['IE'] });
    savePin({ id: generateId(), tripId: trip.id, label: 'Cliffs of Moher', note: null, createdAt: new Date().toISOString() });

    deleteTripCascade(trip.id);

    expect(listPins(trip.id)).toEqual([]);
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

  it('persists an optional rating', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-20', countries: ['PE'] });
    const entry = await addJournalEntry(trip.id, {
      date: '2026-07-11',
      note: 'Rated day',
      photoFiles: [],
      rating: 4
    });
    expect(entry.rating).toBe(4);
  });

  it('leaves rating undefined when not provided', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-20', countries: ['PE'] });
    const entry = await addJournalEntry(trip.id, { date: '2026-07-11', note: 'No rating', photoFiles: [] });
    expect(entry.rating).toBeUndefined();
  });
});

describe('addTipEntry', () => {
  it('creates a tip with no photo when none is provided', async () => {
    const trip = createTrip({ name: 'Japan', startDate: '2026-03-03', endDate: '2026-03-15', countries: ['JP'] });
    const tip = await addTipEntry(trip.id, { category: 'currency', note: 'Best rate near the station', photoFile: null });
    expect(tip.photoId).toBeNull();
    expect(tip.category).toBe('currency');
    expect(tip.note).toBe('Best rate near the station');
  });

  it('stores an uploaded photo and links its id on the tip', async () => {
    const trip = createTrip({ name: 'Japan', startDate: '2026-03-03', endDate: '2026-03-15', countries: ['JP'] });
    const file = new File([new Blob(['fake'], { type: 'image/jpeg' })], 'photo.jpg', { type: 'image/jpeg' });

    const tip = await addTipEntry(trip.id, { category: 'sightseeing', note: 'Great view at dusk', photoFile: file });

    expect(tip.photoId).not.toBeNull();
    const stored = await getPhoto(tip.photoId!);
    expect(stored?.id).toBe(tip.photoId);
  });
});

describe('deleteTipEntryWithPhoto', () => {
  it('deletes the tip and its photo blob', async () => {
    const trip = createTrip({ name: 'Japan', startDate: '2026-03-03', endDate: '2026-03-15', countries: ['JP'] });
    const file = new File([new Blob(['fake'], { type: 'image/jpeg' })], 'photo.jpg', { type: 'image/jpeg' });
    const tip = await addTipEntry(trip.id, { category: 'avoid', note: 'Skip this street at night', photoFile: file });
    expect(await getPhoto(tip.photoId!)).toBeDefined();

    await deleteTipEntryWithPhoto(tip.id);

    expect(await getPhoto(tip.photoId!)).toBeUndefined();
    expect(listTips(trip.id)).toEqual([]);
  });

  it('handles a tip with no photo gracefully', async () => {
    const trip = createTrip({ name: 'Japan', startDate: '2026-03-03', endDate: '2026-03-15', countries: ['JP'] });
    const tip = await addTipEntry(trip.id, { category: 'transit', note: 'Airport train is cheapest', photoFile: null });

    await deleteTipEntryWithPhoto(tip.id);

    expect(listTips(trip.id)).toEqual([]);
  });
});
