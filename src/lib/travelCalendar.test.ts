import { describe, it, expect } from 'vitest';
import { computeYearHeatmap, assignTripColors, buildYearWeeks } from './travelCalendar';
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

describe('computeYearHeatmap', () => {
  it('tags every day of a trip fully inside the requested year', () => {
    const trip = makeTrip({ id: 'trip-1', startDate: '2025-06-01', endDate: '2025-06-03' });
    expect(computeYearHeatmap([trip], 2025)).toEqual([
      { date: '2025-06-01', tripId: 'trip-1' },
      { date: '2025-06-02', tripId: 'trip-1' },
      { date: '2025-06-03', tripId: 'trip-1' }
    ]);
  });

  it('only returns the days that fall in the requested year when a trip spans a year boundary', () => {
    const trip = makeTrip({ id: 'trip-1', startDate: '2025-12-30', endDate: '2026-01-02' });
    expect(computeYearHeatmap([trip], 2025)).toEqual([
      { date: '2025-12-30', tripId: 'trip-1' },
      { date: '2025-12-31', tripId: 'trip-1' }
    ]);
    expect(computeYearHeatmap([trip], 2026)).toEqual([
      { date: '2026-01-01', tripId: 'trip-1' },
      { date: '2026-01-02', tripId: 'trip-1' }
    ]);
  });

  it('tags days from multiple non-overlapping trips in the same year', () => {
    const tripA = makeTrip({ id: 'trip-a', startDate: '2025-02-01', endDate: '2025-02-02' });
    const tripB = makeTrip({ id: 'trip-b', startDate: '2025-07-10', endDate: '2025-07-11' });
    expect(computeYearHeatmap([tripA, tripB], 2025)).toEqual([
      { date: '2025-02-01', tripId: 'trip-a' },
      { date: '2025-02-02', tripId: 'trip-a' },
      { date: '2025-07-10', tripId: 'trip-b' },
      { date: '2025-07-11', tripId: 'trip-b' }
    ]);
  });

  it('returns an empty array when no trip falls in the requested year', () => {
    const trip = makeTrip({ startDate: '2024-01-01', endDate: '2024-01-05' });
    expect(computeYearHeatmap([trip], 2025)).toEqual([]);
  });
});

describe('assignTripColors', () => {
  it('assigns colors in chronological order by startDate, not input order', () => {
    const tripA = makeTrip({ id: 'trip-a', startDate: '2025-06-01' });
    const tripB = makeTrip({ id: 'trip-b', startDate: '2025-01-01' });
    const colors = assignTripColors([tripA, tripB]);
    expect(colors.get('trip-b')).toBe('var(--color-trip-1)');
    expect(colors.get('trip-a')).toBe('var(--color-trip-2)');
  });

  it('cycles the palette once trips outnumber the 5 palette entries', () => {
    const trips = Array.from({ length: 6 }, (_, i) =>
      makeTrip({ id: `trip-${i}`, startDate: `2025-0${i + 1}-01` })
    );
    const colors = assignTripColors(trips);
    expect(colors.get('trip-0')).toBe('var(--color-trip-1)');
    expect(colors.get('trip-5')).toBe('var(--color-trip-1)');
  });
});

describe('buildYearWeeks', () => {
  it('pads the first week so days align to their weekday column', () => {
    const weeks = buildYearWeeks(2025);
    expect(weeks[0]).toEqual([null, null, null, '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04']);
  });

  it('produces 53 week columns for 2025 and pads the last week', () => {
    const weeks = buildYearWeeks(2025);
    expect(weeks).toHaveLength(53);
    const lastWeek = weeks[52];
    expect(lastWeek[3]).toBe('2025-12-31');
    expect(lastWeek[4]).toBeNull();
  });
});
