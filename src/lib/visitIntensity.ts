import type { Trip } from '$lib/types';

export function computeVisitCounts(trips: Trip[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const trip of trips) {
    for (const code of new Set(trip.countries)) {
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  }
  return counts;
}

export function getIntensityTier(count: number): 1 | 2 | 3 | null {
  if (count <= 0) return null;
  if (count === 1) return 1;
  if (count <= 4) return 2;
  return 3;
}
