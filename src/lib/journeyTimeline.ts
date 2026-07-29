import type { Trip } from '$lib/types';

export type Season = 'Winter' | 'Spring' | 'Summer' | 'Fall';

export interface TimelineYearGroup {
  year: number;
  trips: Trip[];
}

function tripYear(trip: Trip): number {
  return Number(trip.startDate.slice(0, 4));
}

export function getSeasonLabel(dateIso: string): Season {
  const month = Number(dateIso.slice(5, 7));
  if (month === 12 || month <= 2) return 'Winter';
  if (month <= 5) return 'Spring';
  if (month <= 8) return 'Summer';
  return 'Fall';
}

export function groupTripsByYear(trips: Trip[]): TimelineYearGroup[] {
  const byYear = new Map<number, Trip[]>();
  for (const trip of trips) {
    const year = tripYear(trip);
    const existing = byYear.get(year);
    if (existing) {
      existing.push(trip);
    } else {
      byYear.set(year, [trip]);
    }
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);
  return years.map((year) => ({
    year,
    trips: byYear.get(year)!.sort((a, b) => b.startDate.localeCompare(a.startDate))
  }));
}

export function uniqueCountriesInYear(group: TimelineYearGroup): string[] {
  return [...new Set(group.trips.flatMap((trip) => trip.countries))];
}

export function countryCodeToFlag(code: string): string {
  if (code.length !== 2) return '';
  const codePoints = [...code.toUpperCase()].map((char) => 0x1f1e6 + (char.codePointAt(0)! - 65));
  return String.fromCodePoint(...codePoints);
}
