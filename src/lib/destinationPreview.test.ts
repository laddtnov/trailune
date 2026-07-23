import { describe, it, expect } from 'vitest';
import { getHemisphereAwareSeason, computeDestinationPreview, SEASON_BLURBS } from './destinationPreview';
import type { Trip } from './types';

function makeTrip(overrides: Partial<Trip>): Trip {
  return {
    id: overrides.id ?? 'trip-1',
    name: overrides.name ?? 'Test Trip',
    startDate: overrides.startDate ?? '2026-07-01',
    endDate: overrides.endDate ?? '2026-07-10',
    countries: overrides.countries ?? ['JP'],
    transportMode: overrides.transportMode ?? 'flight',
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z'
  };
}

describe('getHemisphereAwareSeason', () => {
  it('computes the plain season for the Northern hemisphere', () => {
    expect(getHemisphereAwareSeason('2026-01-15', 'N')).toBe('Winter');
    expect(getHemisphereAwareSeason('2026-04-15', 'N')).toBe('Spring');
    expect(getHemisphereAwareSeason('2026-07-15', 'N')).toBe('Summer');
    expect(getHemisphereAwareSeason('2026-10-15', 'N')).toBe('Fall');
  });

  it('flips the season for the Southern hemisphere', () => {
    expect(getHemisphereAwareSeason('2026-01-15', 'S')).toBe('Summer');
    expect(getHemisphereAwareSeason('2026-04-15', 'S')).toBe('Fall');
    expect(getHemisphereAwareSeason('2026-07-15', 'S')).toBe('Winter');
    expect(getHemisphereAwareSeason('2026-10-15', 'S')).toBe('Spring');
  });
});

describe('SEASON_BLURBS', () => {
  it('has a non-empty blurb for every season', () => {
    expect(SEASON_BLURBS.Winter.length).toBeGreaterThan(0);
    expect(SEASON_BLURBS.Spring.length).toBeGreaterThan(0);
    expect(SEASON_BLURBS.Summer.length).toBeGreaterThan(0);
    expect(SEASON_BLURBS.Fall.length).toBeGreaterThan(0);
  });
});

describe('computeDestinationPreview', () => {
  it('returns one entry per country, in order, for a Northern-hemisphere country', () => {
    const trip = makeTrip({ startDate: '2026-07-01', countries: ['JP'] });
    const result = computeDestinationPreview(trip);
    expect(result).toEqual([
      {
        code: 'JP',
        currency: { code: 'JPY', name: 'Japanese Yen' },
        utcOffsetHours: 9,
        season: 'Summer',
        seasonBlurb: SEASON_BLURBS.Summer
      }
    ]);
  });

  it('flips the season correctly for a Southern-hemisphere country on the same date', () => {
    const trip = makeTrip({ startDate: '2026-07-01', countries: ['AU'] });
    const result = computeDestinationPreview(trip);
    expect(result[0].season).toBe('Winter');
  });

  it('returns multiple entries in trip.countries order for a multi-country trip', () => {
    const trip = makeTrip({ startDate: '2026-07-01', countries: ['JP', 'AU'] });
    const result = computeDestinationPreview(trip);
    expect(result.map((r) => r.code)).toEqual(['JP', 'AU']);
  });

  it('silently skips a country code with no COUNTRY_REFERENCE entry', () => {
    const trip = makeTrip({ countries: ['JP', 'ZZ'] });
    const result = computeDestinationPreview(trip);
    expect(result.map((r) => r.code)).toEqual(['JP']);
  });

  it('returns an empty array for a trip with no countries', () => {
    const trip = makeTrip({ countries: [] });
    expect(computeDestinationPreview(trip)).toEqual([]);
  });
});
