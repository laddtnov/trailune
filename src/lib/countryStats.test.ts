import { describe, it, expect } from 'vitest';
import { getCountryStats } from './countryStats';
import type { Trip } from '$lib/types';

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

describe('getCountryStats', () => {
  it('returns null for a country with no trips', () => {
    const trips = [makeTrip({ countries: ['FR'] })];
    expect(getCountryStats('DE', trips)).toBeNull();
  });

  it('counts a single trip: visitCount 1, inclusive day count, lastVisitDate = endDate', () => {
    const trips = [makeTrip({ id: 't1', countries: ['FR'], startDate: '2026-01-01', endDate: '2026-01-05' })];
    expect(getCountryStats('FR', trips)).toEqual({
      visitCount: 1,
      totalDays: 5,
      lastVisitDate: '2026-01-05'
    });
  });

  it('sums days and counts visits across multiple trips to the same country', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['FR'], startDate: '2026-01-01', endDate: '2026-01-05' }),
      makeTrip({ id: 't2', countries: ['FR', 'DE'], startDate: '2026-03-01', endDate: '2026-03-03' })
    ];
    expect(getCountryStats('FR', trips)).toEqual({
      visitCount: 2,
      totalDays: 8,
      lastVisitDate: '2026-03-03'
    });
  });

  it('picks the maximum endDate as lastVisitDate regardless of trip order', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['FR'], startDate: '2026-03-01', endDate: '2026-03-03' }),
      makeTrip({ id: 't2', countries: ['FR'], startDate: '2026-01-01', endDate: '2026-01-05' })
    ];
    expect(getCountryStats('FR', trips)?.lastVisitDate).toBe('2026-03-03');
  });

  it('ignores trips that do not include the requested country', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['FR'] }),
      makeTrip({ id: 't2', countries: ['DE'] })
    ];
    expect(getCountryStats('FR', trips)?.visitCount).toBe(1);
  });
});
