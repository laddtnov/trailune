import { describe, it, expect, beforeEach } from 'vitest';
import { getAchievements } from './achievements';
import { saveTrip } from '$lib/storage/storage';
import { saveJournalEntry } from '$lib/storage/local';
import { saveTip } from '$lib/storage/tips';
import type { Trip, JournalEntry, TipEntry } from '$lib/types';

function makeTrip(overrides: Partial<Trip>): Trip {
  return {
    id: 't1',
    name: 'Trip',
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    countries: ['FR'],
    transportMode: 'flight',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

function countryCodes(n: number, prefix: string): string[] {
  return Array.from({ length: n }, (_, i) => `${prefix}${i}`);
}

beforeEach(() => {
  localStorage.clear();
});

describe('getAchievements', () => {
  it('always returns exactly 4 achievements in a fixed order', () => {
    const achievements = getAchievements([]);
    expect(achievements.map((a) => a.id)).toEqual([
      'explorer',
      'globetrotter',
      'continental-traveller',
      'photographer'
    ]);
  });

  it('explorer stays locked at 4 countries and unlocks at 5', () => {
    const fourCountries = [makeTrip({ countries: countryCodes(4, 'X') })];
    expect(getAchievements(fourCountries).find((a) => a.id === 'explorer')?.unlocked).toBe(false);

    const fiveCountries = [makeTrip({ countries: countryCodes(5, 'X') })];
    expect(getAchievements(fiveCountries).find((a) => a.id === 'explorer')?.unlocked).toBe(true);
  });

  it('globetrotter stays locked at 24 countries and unlocks at 25', () => {
    const trips24 = [makeTrip({ countries: countryCodes(24, 'X') })];
    expect(getAchievements(trips24).find((a) => a.id === 'globetrotter')?.unlocked).toBe(false);

    const trips25 = [makeTrip({ countries: countryCodes(25, 'X') })];
    expect(getAchievements(trips25).find((a) => a.id === 'globetrotter')?.unlocked).toBe(true);
  });

  it('continental-traveller unlocks only when every South American country (the smallest continent) is visited', () => {
    const allSouthAmerica = ['AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'FK', 'GF', 'GY', 'PE', 'PY', 'SR', 'UY', 'VE'];
    const completeTrip = [makeTrip({ countries: allSouthAmerica })];
    expect(getAchievements(completeTrip).find((a) => a.id === 'continental-traveller')?.unlocked).toBe(true);

    const missingOne = [makeTrip({ countries: allSouthAmerica.slice(0, -1) })];
    expect(getAchievements(missingOne).find((a) => a.id === 'continental-traveller')?.unlocked).toBe(false);
  });

  it('photographer stays locked at 99 combined photos and unlocks at 100', () => {
    const trip = makeTrip({ id: 'tp', countries: ['FR'] });
    saveTrip(trip);

    for (let i = 0; i < 99; i++) {
      const entry: JournalEntry = { id: `e${i}`, tripId: 'tp', date: '2026-01-01', note: '', photoIds: ['p1'] };
      saveJournalEntry(entry);
    }
    expect(getAchievements([trip]).find((a) => a.id === 'photographer')?.unlocked).toBe(false);

    const oneMoreEntry: JournalEntry = { id: 'e99', tripId: 'tp', date: '2026-01-01', note: '', photoIds: ['p1'] };
    saveJournalEntry(oneMoreEntry);
    expect(getAchievements([trip]).find((a) => a.id === 'photographer')?.unlocked).toBe(true);
  });

  it('photographer counts tip photos alongside journal entry photos', () => {
    const trip = makeTrip({ id: 'tp2', countries: ['FR'] });
    saveTrip(trip);

    for (let i = 0; i < 60; i++) {
      const entry: JournalEntry = { id: `je${i}`, tripId: 'tp2', date: '2026-01-01', note: '', photoIds: ['p1'] };
      saveJournalEntry(entry);
    }
    for (let i = 0; i < 39; i++) {
      const tip: TipEntry = {
        id: `tip${i}`,
        tripId: 'tp2',
        category: 'sightseeing',
        note: '',
        photoId: 'ph1',
        createdAt: '2026-01-01T00:00:00.000Z'
      };
      saveTip(tip);
    }
    expect(getAchievements([trip]).find((a) => a.id === 'photographer')?.unlocked).toBe(false);

    const tip: TipEntry = {
      id: 'tipLast',
      tripId: 'tp2',
      category: 'sightseeing',
      note: '',
      photoId: 'ph2',
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    saveTip(tip);
    expect(getAchievements([trip]).find((a) => a.id === 'photographer')?.unlocked).toBe(true);
  });
});
