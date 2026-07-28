import { describe, it, expect } from 'vitest';
import { computeVisitCounts, getIntensityTier } from './visitIntensity';
import type { Trip } from '$lib/types';

function makeTrip(overrides: Partial<Trip>): Trip {
  return {
    id: 't1',
    name: 'Trip',
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    countries: [],
    transportMode: 'flight',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

describe('computeVisitCounts', () => {
  it('returns an empty map for no trips', () => {
    expect(computeVisitCounts([])).toEqual(new Map());
  });

  it('counts a country once per trip that includes it', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['JP'] }),
      makeTrip({ id: 't2', countries: ['JP', 'FR'] }),
      makeTrip({ id: 't3', countries: ['JP'] })
    ];
    const counts = computeVisitCounts(trips);
    expect(counts.get('JP')).toBe(3);
    expect(counts.get('FR')).toBe(1);
  });

  it('does not include a country with zero trips', () => {
    const trips = [makeTrip({ id: 't1', countries: ['JP'] })];
    expect(computeVisitCounts(trips).has('DE')).toBe(false);
  });
});

describe('getIntensityTier', () => {
  it('returns null for 0', () => {
    expect(getIntensityTier(0)).toBeNull();
  });

  it('returns tier 1 for exactly 1', () => {
    expect(getIntensityTier(1)).toBe(1);
  });

  it('returns tier 2 for 2 and for 4', () => {
    expect(getIntensityTier(2)).toBe(2);
    expect(getIntensityTier(4)).toBe(2);
  });

  it('returns tier 3 for 5 and for a much higher number', () => {
    expect(getIntensityTier(5)).toBe(3);
    expect(getIntensityTier(50)).toBe(3);
  });
});
