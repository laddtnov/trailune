import { describe, it, expect, beforeEach } from 'vitest';
import { collectTripPhotos, getTripHeroPhoto } from './tripPhotos';
import { createTrip, addJournalEntry, addTipEntry } from './storage/storage';

beforeEach(() => {
  localStorage.clear();
});

function makeFile(name: string): File {
  return new File([new Blob(['fake'], { type: 'image/jpeg' })], name, { type: 'image/jpeg' });
}

describe('collectTripPhotos', () => {
  it('returns an empty array when the trip has no photos', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-15', countries: ['PE'] });
    await addJournalEntry(trip.id, { date: '2026-07-11', note: 'No photo', photoFiles: [] });

    expect(await collectTripPhotos(trip.id)).toEqual([]);
  });

  it('aggregates photos from journal entries with a Journal caption', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-15', countries: ['PE'] });
    const entry = await addJournalEntry(trip.id, {
      date: '2026-07-11',
      note: 'Cusco',
      photoFiles: [makeFile('cusco.jpg')]
    });

    const photos = await collectTripPhotos(trip.id);

    expect(photos).toHaveLength(1);
    expect(photos[0].photoId).toBe(entry.photoIds[0]);
    expect(photos[0].caption).toBe('Journal · Jul 11');
  });

  it('aggregates photos from tips with a Tip caption using the category label', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-15', countries: ['PE'] });
    const tip = await addTipEntry(trip.id, {
      category: 'sightseeing',
      note: 'Machu Picchu at sunrise',
      photoFile: makeFile('machu-picchu.jpg')
    });

    const photos = await collectTripPhotos(trip.id);

    expect(photos).toHaveLength(1);
    expect(photos[0].photoId).toBe(tip.photoId);
    expect(photos[0].caption).toBe('Tip · Sightseeing');
  });

  it('orders journal photos before tip photos, most recent journal entry first', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-20', countries: ['PE'] });
    const earlier = await addJournalEntry(trip.id, {
      date: '2026-07-11',
      note: 'Day 1',
      photoFiles: [makeFile('day1.jpg')]
    });
    const later = await addJournalEntry(trip.id, {
      date: '2026-07-15',
      note: 'Day 5',
      photoFiles: [makeFile('day5.jpg')]
    });
    const tip = await addTipEntry(trip.id, {
      category: 'currency',
      note: 'Use soles',
      photoFile: makeFile('currency.jpg')
    });

    const photos = await collectTripPhotos(trip.id);

    expect(photos.map((p) => p.photoId)).toEqual([later.photoIds[0], earlier.photoIds[0], tip.photoId]);
  });

  it('skips a tip with no photo attached', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-15', countries: ['PE'] });
    await addTipEntry(trip.id, { category: 'avoid', note: 'No photo tip', photoFile: null });

    expect(await collectTripPhotos(trip.id)).toEqual([]);
  });
});

describe('getTripHeroPhoto', () => {
  it('returns undefined when the trip has no journal entries', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-15', countries: ['PE'] });

    expect(await getTripHeroPhoto(trip.id)).toBeUndefined();
  });

  it('returns undefined when journal entries exist but none have photos', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-15', countries: ['PE'] });
    await addJournalEntry(trip.id, { date: '2026-07-11', note: 'No photo', photoFiles: [] });

    expect(await getTripHeroPhoto(trip.id)).toBeUndefined();
  });

  it('returns the first photo when only one entry has a photo', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-15', countries: ['PE'] });
    const entry = await addJournalEntry(trip.id, {
      date: '2026-07-11',
      note: 'Cusco',
      photoFiles: [makeFile('cusco.jpg')]
    });

    const hero = await getTripHeroPhoto(trip.id);

    expect(hero?.photoId).toBe(entry.photoIds[0]);
  });

  it('returns the earliest-dated entry\'s photo, even if it was added to storage after a later-dated entry', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-01', endDate: '2026-07-20', countries: ['PE'] });
    const later = await addJournalEntry(trip.id, {
      date: '2026-07-15',
      note: 'Day 5',
      photoFiles: [makeFile('day5.jpg')]
    });
    const earlier = await addJournalEntry(trip.id, {
      date: '2026-07-11',
      note: 'Day 1',
      photoFiles: [makeFile('day1.jpg')]
    });

    const hero = await getTripHeroPhoto(trip.id);

    expect(hero?.photoId).toBe(earlier.photoIds[0]);
    expect(hero?.photoId).not.toBe(later.photoIds[0]);
  });

  it('ignores tip photos when the trip has no journal photo', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-15', countries: ['PE'] });
    await addTipEntry(trip.id, {
      category: 'sightseeing',
      note: 'Machu Picchu at sunrise',
      photoFile: makeFile('machu-picchu.jpg')
    });

    expect(await getTripHeroPhoto(trip.id)).toBeUndefined();
  });
});
