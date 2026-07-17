import { describe, it, expect } from 'vitest';
import { computeTripStats } from './tripStats';
import type { Trip } from '$lib/types';
import type { CountryInfo } from '$lib/countries';

const countries: CountryInfo[] = Array.from({ length: 211 }, (_, i) => ({
  code: `C${i}`,
  name: `Country ${i}`
}));

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

describe('computeTripStats', () => {
  it('returns an all-zero/null shape for zero trips', () => {
    expect(computeTripStats([], countries)).toEqual({
      totalCountries: 0,
      percentWorld: 0,
      totalContinents: 0,
      totalTrips: 0,
      totalFlights: 0,
      totalDays: 0,
      longestTrip: null,
      averageTripDays: 0
    });
  });

  it('computes all fields for a single trip', () => {
    const trips = [
      makeTrip({ id: 't1', name: 'Japan Trip', countries: ['JP'], startDate: '2026-01-01', endDate: '2026-01-05', transportMode: 'flight' })
    ];
    const stats = computeTripStats(trips, countries);
    expect(stats.totalCountries).toBe(1);
    expect(stats.totalContinents).toBe(1);
    expect(stats.totalTrips).toBe(1);
    expect(stats.totalFlights).toBe(1);
    expect(stats.totalDays).toBe(5);
    expect(stats.longestTrip).toEqual({ name: 'Japan Trip', days: 5 });
    expect(stats.averageTripDays).toBe(5);
  });

  it('sums countries/continents/days across multiple trips and counts non-flight modes correctly', () => {
    const trips = [
      makeTrip({ id: 't1', name: 'Japan Trip', countries: ['JP'], startDate: '2026-01-01', endDate: '2026-01-05', transportMode: 'flight' }),
      makeTrip({ id: 't2', name: 'France Trip', countries: ['FR', 'DE'], startDate: '2026-03-01', endDate: '2026-03-03', transportMode: 'train' })
    ];
    const stats = computeTripStats(trips, countries);
    expect(stats.totalCountries).toBe(3);
    expect(stats.totalContinents).toBe(2);
    expect(stats.totalTrips).toBe(2);
    expect(stats.totalFlights).toBe(1);
    expect(stats.totalDays).toBe(5 + 3);
  });

  it('picks the trip with the largest day count as longestTrip', () => {
    const trips = [
      makeTrip({ id: 't1', name: 'Short Trip', countries: ['FR'], startDate: '2026-01-01', endDate: '2026-01-02' }),
      makeTrip({ id: 't2', name: 'Long Trip', countries: ['DE'], startDate: '2026-02-01', endDate: '2026-02-14' })
    ];
    const stats = computeTripStats(trips, countries);
    expect(stats.longestTrip).toEqual({ name: 'Long Trip', days: 14 });
  });

  it('rounds averageTripDays to one decimal place', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['FR'], startDate: '2026-01-01', endDate: '2026-01-01' }),
      makeTrip({ id: 't2', countries: ['DE'], startDate: '2026-01-01', endDate: '2026-01-02' })
    ];
    const stats = computeTripStats(trips, countries);
    expect(stats.totalDays).toBe(1 + 2);
    expect(stats.averageTripDays).toBe(1.5);
  });

  it('rounds percentWorld to a whole percent', () => {
    const trips = [makeTrip({ countries: ['FR'] })];
    const stats = computeTripStats(trips, countries);
    expect(stats.percentWorld).toBe(Math.round((1 / 211) * 100));
  });
});
