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

  it('counts a single trip: visitCount 1, inclusive day count, longest stay equals that trip, one visit year', () => {
    const trips = [makeTrip({ id: 't1', countries: ['FR'], startDate: '2026-01-01', endDate: '2026-01-05' })];
    expect(getCountryStats('FR', trips)).toEqual({
      visitCount: 1,
      totalDays: 5,
      longestStayDays: 5,
      firstVisitYear: 2026,
      lastVisitYear: 2026
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
      longestStayDays: 5,
      firstVisitYear: 2026,
      lastVisitYear: 2026
    });
  });

  it('picks the maximum trip duration as longestStayDays regardless of trip order', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['FR'], startDate: '2026-03-01', endDate: '2026-03-03' }),
      makeTrip({ id: 't2', countries: ['FR'], startDate: '2026-01-01', endDate: '2026-01-10' })
    ];
    expect(getCountryStats('FR', trips)?.longestStayDays).toBe(10);
  });

  it('returns the same value for firstVisitYear and lastVisitYear when all trips are in one year', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['FR'], startDate: '2026-01-01', endDate: '2026-01-05' }),
      makeTrip({ id: 't2', countries: ['FR'], startDate: '2026-06-01', endDate: '2026-06-03' })
    ];
    const stats = getCountryStats('FR', trips);
    expect(stats?.firstVisitYear).toBe(2026);
    expect(stats?.lastVisitYear).toBe(2026);
  });

  it('spans firstVisitYear and lastVisitYear across trips in different years, regardless of order', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['FR'], startDate: '2027-03-01', endDate: '2027-03-03' }),
      makeTrip({ id: 't2', countries: ['FR'], startDate: '2022-01-01', endDate: '2022-01-05' })
    ];
    const stats = getCountryStats('FR', trips);
    expect(stats?.firstVisitYear).toBe(2022);
    expect(stats?.lastVisitYear).toBe(2027);
  });

  it('picks the shared duration as longestStayDays when two trips tie', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['FR'], startDate: '2026-01-01', endDate: '2026-01-05' }),
      makeTrip({ id: 't2', countries: ['FR'], startDate: '2026-06-01', endDate: '2026-06-05' })
    ];
    expect(getCountryStats('FR', trips)?.longestStayDays).toBe(5);
  });

  it('ignores trips that do not include the requested country', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['FR'] }),
      makeTrip({ id: 't2', countries: ['DE'] })
    ];
    expect(getCountryStats('FR', trips)?.visitCount).toBe(1);
  });
});
