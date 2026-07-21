import { describe, it, expect } from 'vitest';
import { computeYearInReview, getAvailableYears } from './yearInReview';
import type { Trip } from './types';

function makeTrip(overrides: Partial<Trip>): Trip {
  return {
    id: overrides.id ?? 'trip-1',
    name: overrides.name ?? 'Test Trip',
    startDate: overrides.startDate ?? '2025-01-01',
    endDate: overrides.endDate ?? '2025-01-01',
    countries: overrides.countries ?? ['FR'],
    transportMode: overrides.transportMode ?? 'flight',
    createdAt: overrides.createdAt ?? '2025-01-01T00:00:00.000Z'
  };
}

describe('getAvailableYears', () => {
  it('returns distinct years sorted descending', () => {
    const trips = [
      makeTrip({ id: '1', startDate: '2024-03-01' }),
      makeTrip({ id: '2', startDate: '2026-01-01' }),
      makeTrip({ id: '3', startDate: '2025-06-01' }),
      makeTrip({ id: '4', startDate: '2024-11-01' })
    ];
    expect(getAvailableYears(trips)).toEqual([2026, 2025, 2024]);
  });

  it('returns an empty array when there are no trips', () => {
    expect(getAvailableYears([])).toEqual([]);
  });
});

describe('computeYearInReview', () => {
  it('filters trips to the given year by startDate', () => {
    const trips = [
      makeTrip({ id: '1', startDate: '2025-03-01', endDate: '2025-03-05', countries: ['FR'] }),
      makeTrip({ id: '2', startDate: '2024-03-01', endDate: '2024-03-05', countries: ['DE'] })
    ];
    const result = computeYearInReview(trips, 2025);
    expect(result.totalTrips).toBe(1);
    expect(result.totalCountries).toBe(1);
  });

  it('counts distinct countries, trips, flights, and total days for the year', () => {
    const trips = [
      makeTrip({
        id: '1',
        startDate: '2025-01-01',
        endDate: '2025-01-05',
        countries: ['FR', 'DE'],
        transportMode: 'flight'
      }),
      makeTrip({
        id: '2',
        startDate: '2025-06-10',
        endDate: '2025-06-12',
        countries: ['FR'],
        transportMode: 'train'
      })
    ];
    const result = computeYearInReview(trips, 2025);
    expect(result.totalCountries).toBe(2);
    expect(result.totalTrips).toBe(2);
    expect(result.totalFlights).toBe(1);
    expect(result.totalDays).toBe(5 + 3);
  });

  it('picks the most-visited country, tie-broken by earliest first-visit date', () => {
    const trips = [
      makeTrip({ id: '1', startDate: '2025-01-01', endDate: '2025-01-02', countries: ['FR'] }),
      makeTrip({ id: '2', startDate: '2025-02-01', endDate: '2025-02-02', countries: ['DE'] }),
      makeTrip({ id: '3', startDate: '2025-03-01', endDate: '2025-03-02', countries: ['FR'] })
    ];
    const result = computeYearInReview(trips, 2025);
    expect(result.mostVisitedCountry).toEqual({ code: 'FR', visitCount: 2 });
  });

  it('picks the longest trip for the year', () => {
    const trips = [
      makeTrip({ id: '1', name: 'Short Trip', startDate: '2025-01-01', endDate: '2025-01-02' }),
      makeTrip({ id: '2', name: 'Long Trip', startDate: '2025-02-01', endDate: '2025-02-10' })
    ];
    const result = computeYearInReview(trips, 2025);
    expect(result.longestTrip).toEqual({ name: 'Long Trip', days: 10 });
  });

  it('computes the most active month across a trip spanning multiple months', () => {
    const trips = [
      // Jan 28 - Feb 3: 4 days in January (28,29,30,31), 3 days in February (1,2,3)
      makeTrip({ id: '1', startDate: '2025-01-28', endDate: '2025-02-03' })
    ];
    const result = computeYearInReview(trips, 2025);
    expect(result.mostActiveMonth).toEqual({ month: 0, days: 4 }); // January = month 0
  });

  it('assigns a trip to its startDate year regardless of local timezone (UTC-parsed, not local-time getFullYear)', () => {
    const trips = [makeTrip({ id: '1', startDate: '2025-01-01', endDate: '2025-01-01', countries: ['FR'] })];
    const result = computeYearInReview(trips, 2025);
    expect(result.totalTrips).toBe(1);
    expect(getAvailableYears(trips)).toEqual([2025]);
  });

  it('does not attribute days from the following year to a year-spanning trip most active month', () => {
    const trips = [
      // Dec 28, 2025 - Jan 3, 2026: entire trip belongs to 2025 (never split), but only
      // the December days (28,29,30,31 = 4 days) should count toward 2025's most active month
      makeTrip({ id: '1', startDate: '2025-12-28', endDate: '2026-01-03' })
    ];
    const result = computeYearInReview(trips, 2025);
    expect(result.totalTrips).toBe(1);
    expect(result.mostActiveMonth).toEqual({ month: 11, days: 4 }); // December = month 11
  });

  it('returns null for mostVisitedCountry, longestTrip, and mostActiveMonth when the year has no trips', () => {
    const result = computeYearInReview([], 2025);
    expect(result.mostVisitedCountry).toBeNull();
    expect(result.longestTrip).toBeNull();
    expect(result.mostActiveMonth).toBeNull();
    expect(result.totalTrips).toBe(0);
    expect(result.totalCountries).toBe(0);
    expect(result.totalDays).toBe(0);
  });
});
