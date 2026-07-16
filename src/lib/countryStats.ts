import type { Trip } from '$lib/types';

export interface CountryStats {
  visitCount: number;
  totalDays: number;
  lastVisitDate: string;
}

function daysInTrip(trip: Trip): number {
  const start = new Date(trip.startDate).getTime();
  const end = new Date(trip.endDate).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

export function getCountryStats(code: string, trips: Trip[]): CountryStats | null {
  const matching = trips.filter((trip) => trip.countries.includes(code));
  if (matching.length === 0) return null;

  const totalDays = matching.reduce((sum, trip) => sum + daysInTrip(trip), 0);
  const lastVisitTimestamp = Math.max(...matching.map((trip) => new Date(trip.endDate).getTime()));
  const lastVisitDate = new Date(lastVisitTimestamp).toISOString().slice(0, 10);

  return { visitCount: matching.length, totalDays, lastVisitDate };
}
