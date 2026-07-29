import { describe, it, expect } from 'vitest';
import { getSeasonLabel, groupTripsByYear, countryCodeToFlag, uniqueCountriesInYear } from './journeyTimeline';
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

describe('getSeasonLabel', () => {
  it('returns Winter for December, January, and February', () => {
    expect(getSeasonLabel('2025-12-15')).toBe('Winter');
    expect(getSeasonLabel('2025-01-15')).toBe('Winter');
    expect(getSeasonLabel('2025-02-15')).toBe('Winter');
  });

  it('returns Spring for March through May', () => {
    expect(getSeasonLabel('2025-03-01')).toBe('Spring');
    expect(getSeasonLabel('2025-05-31')).toBe('Spring');
  });

  it('returns Summer for June through August', () => {
    expect(getSeasonLabel('2025-06-01')).toBe('Summer');
    expect(getSeasonLabel('2025-08-31')).toBe('Summer');
  });

  it('returns Fall for September through November', () => {
    expect(getSeasonLabel('2025-09-01')).toBe('Fall');
    expect(getSeasonLabel('2025-11-30')).toBe('Fall');
  });
});

describe('groupTripsByYear', () => {
  it('groups trips by year parsed from startDate', () => {
    const trips = [
      makeTrip({ id: '1', startDate: '2025-03-01' }),
      makeTrip({ id: '2', startDate: '2025-06-01' }),
      makeTrip({ id: '3', startDate: '2024-01-01' })
    ];
    const groups = groupTripsByYear(trips);
    expect(groups).toHaveLength(2);
    expect(groups[0].year).toBe(2025);
    expect(groups[0].trips).toHaveLength(2);
    expect(groups[1].year).toBe(2024);
    expect(groups[1].trips).toHaveLength(1);
  });

  it('orders years with the most recent first', () => {
    const trips = [
      makeTrip({ id: '1', startDate: '2023-01-01' }),
      makeTrip({ id: '2', startDate: '2026-01-01' }),
      makeTrip({ id: '3', startDate: '2024-01-01' })
    ];
    const groups = groupTripsByYear(trips);
    expect(groups.map((g) => g.year)).toEqual([2026, 2024, 2023]);
  });

  it('orders trips within a year with the most recent startDate first', () => {
    const trips = [
      makeTrip({ id: '1', startDate: '2025-01-10' }),
      makeTrip({ id: '2', startDate: '2025-08-05' }),
      makeTrip({ id: '3', startDate: '2025-04-20' })
    ];
    const groups = groupTripsByYear(trips);
    expect(groups[0].trips.map((t) => t.id)).toEqual(['2', '3', '1']);
  });

  it('returns an empty array when there are no trips', () => {
    expect(groupTripsByYear([])).toEqual([]);
  });
});

describe('countryCodeToFlag', () => {
  it('converts a 2-letter ISO code into its flag emoji', () => {
    expect(countryCodeToFlag('JP')).toBe('🇯🇵');
    expect(countryCodeToFlag('us')).toBe('🇺🇸');
  });

  it('returns an empty string for a code that is not 2 letters', () => {
    expect(countryCodeToFlag('XYZ')).toBe('');
  });
});

describe('uniqueCountriesInYear', () => {
  it('dedupes a country visited on two separate trips in the same year', () => {
    const group = {
      year: 2025,
      trips: [
        makeTrip({ id: '1', startDate: '2025-01-01', countries: ['JP'] }),
        makeTrip({ id: '2', startDate: '2025-06-01', countries: ['JP', 'FR'] })
      ]
    };
    expect(uniqueCountriesInYear(group)).toEqual(['JP', 'FR']);
  });

  it('returns an empty array for a year group with no trips', () => {
    expect(uniqueCountriesInYear({ year: 2025, trips: [] })).toEqual([]);
  });
});
