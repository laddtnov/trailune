import type { Trip } from '$lib/types';

export interface CountryStats {
  visitCount: number;
  totalDays: number;
  longestStayDays: number;
  firstVisitYear: number;
  lastVisitYear: number;
}

export function daysInTrip(trip: Trip): number {
  const start = new Date(trip.startDate).getTime();
  const end = new Date(trip.endDate).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

export function getCountryStats(code: string, trips: Trip[]): CountryStats | null {
  const matching = trips.filter((trip) => trip.countries.includes(code));
  if (matching.length === 0) return null;

  const totalDays = matching.reduce((sum, trip) => sum + daysInTrip(trip), 0);
  const longestStayDays = Math.max(...matching.map((trip) => daysInTrip(trip)));
  const visitYears = matching.map((trip) => new Date(trip.startDate).getFullYear());
  const firstVisitYear = Math.min(...visitYears);
  const lastVisitYear = Math.max(...visitYears);

  return { visitCount: matching.length, totalDays, longestStayDays, firstVisitYear, lastVisitYear };
}
