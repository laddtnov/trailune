import type { Trip } from './types';

export interface TravelDay {
  date: string;
  tripId: string;
}

const TRIP_COLOR_PALETTE = [
  'var(--color-trip-1)',
  'var(--color-trip-2)',
  'var(--color-trip-3)',
  'var(--color-trip-4)',
  'var(--color-trip-5)'
];

export function computeYearHeatmap(trips: Trip[], year: number): TravelDay[] {
  const days: TravelDay[] = [];
  for (const trip of trips) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    for (
      let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
      d <= end;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      if (d.getUTCFullYear() === year) {
        days.push({ date: d.toISOString().slice(0, 10), tripId: trip.id });
      }
    }
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

export function assignTripColors(trips: Trip[]): Map<string, string> {
  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const colors = new Map<string, string>();
  sorted.forEach((trip, index) => {
    colors.set(trip.id, TRIP_COLOR_PALETTE[index % TRIP_COLOR_PALETTE.length]);
  });
  return colors;
}

export function buildYearWeeks(year: number): (string | null)[][] {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dec31 = new Date(Date.UTC(year, 11, 31));
  const startPad = jan1.getUTCDay();
  const weeks: (string | null)[][] = [];
  let week: (string | null)[] = new Array(startPad).fill(null);
  for (let d = new Date(jan1); d <= dec31; d.setUTCDate(d.getUTCDate() + 1)) {
    week.push(d.toISOString().slice(0, 10));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}
