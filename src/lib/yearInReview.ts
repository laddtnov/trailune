import type { Trip } from '$lib/types';
import { daysInTrip } from '$lib/countryStats';

export interface YearInReview {
  year: number;
  totalCountries: number;
  totalTrips: number;
  totalFlights: number;
  totalDays: number;
  mostVisitedCountry: { code: string; visitCount: number } | null;
  longestTrip: { name: string; days: number } | null;
  mostActiveMonth: { month: number; days: number } | null;
}

function tripYear(trip: Trip): number {
  return Number(trip.startDate.slice(0, 4));
}

export function getAvailableYears(trips: Trip[]): number[] {
  const years = new Set(trips.map(tripYear));
  return [...years].sort((a, b) => b - a);
}

function computeMostActiveMonth(trips: Trip[], year: number): { month: number; days: number } | null {
  const monthDays = new Array(12).fill(0);
  for (const trip of trips) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    for (
      let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
      d <= end;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      if (d.getUTCFullYear() === year) {
        monthDays[d.getUTCMonth()] += 1;
      }
    }
  }
  let bestMonth = -1;
  let bestDays = 0;
  for (let month = 0; month < 12; month++) {
    if (monthDays[month] > bestDays) {
      bestDays = monthDays[month];
      bestMonth = month;
    }
  }
  return bestMonth === -1 ? null : { month: bestMonth, days: bestDays };
}

export function computeYearInReview(trips: Trip[], year: number): YearInReview {
  const yearTrips = trips.filter((trip) => tripYear(trip) === year);

  const totalCountries = new Set(yearTrips.flatMap((trip) => trip.countries)).size;
  const totalTrips = yearTrips.length;
  const totalFlights = yearTrips.filter((trip) => trip.transportMode === 'flight').length;
  const totalDays = yearTrips.reduce((sum, trip) => sum + daysInTrip(trip), 0);

  const visitCounts = new Map<string, { visitCount: number; firstVisit: number }>();
  for (const trip of yearTrips) {
    const start = new Date(trip.startDate).getTime();
    for (const code of trip.countries) {
      const existing = visitCounts.get(code);
      if (existing) {
        existing.visitCount += 1;
        existing.firstVisit = Math.min(existing.firstVisit, start);
      } else {
        visitCounts.set(code, { visitCount: 1, firstVisit: start });
      }
    }
  }
  let mostVisitedCountry: YearInReview['mostVisitedCountry'] = null;
  for (const [code, { visitCount, firstVisit }] of visitCounts) {
    if (
      !mostVisitedCountry ||
      visitCount > mostVisitedCountry.visitCount ||
      (visitCount === mostVisitedCountry.visitCount &&
        firstVisit < visitCounts.get(mostVisitedCountry.code)!.firstVisit)
    ) {
      mostVisitedCountry = { code, visitCount };
    }
  }

  const longestTrip =
    yearTrips.length === 0
      ? null
      : yearTrips.reduce(
          (longest, trip) => (daysInTrip(trip) > longest.days ? { name: trip.name, days: daysInTrip(trip) } : longest),
          { name: yearTrips[0].name, days: daysInTrip(yearTrips[0]) }
        );

  const mostActiveMonth = computeMostActiveMonth(yearTrips, year);

  return {
    year,
    totalCountries,
    totalTrips,
    totalFlights,
    totalDays,
    mostVisitedCountry,
    longestTrip,
    mostActiveMonth
  };
}
