import type { Trip } from '$lib/types';
import type { CountryInfo } from '$lib/countries';
import { daysInTrip } from '$lib/countryStats';
import { getContinent } from '$lib/continents';

export interface TripStats {
  totalCountries: number;
  percentWorld: number;
  totalContinents: number;
  totalTrips: number;
  totalFlights: number;
  totalDays: number;
  longestTrip: { name: string; days: number } | null;
  averageTripDays: number;
}

export function computeTripStats(trips: Trip[], countries: CountryInfo[]): TripStats {
  const visitedCodes = new Set(trips.flatMap((trip) => trip.countries));
  const totalCountries = visitedCodes.size;
  const percentWorld = countries.length > 0 ? Math.round((totalCountries / countries.length) * 100) : 0;

  const visitedContinents = new Set(
    [...visitedCodes].map((code) => getContinent(code)).filter((c): c is NonNullable<typeof c> => c !== null)
  );

  const totalTrips = trips.length;
  const totalFlights = trips.filter((trip) => trip.transportMode === 'flight').length;
  const totalDays = trips.reduce((sum, trip) => sum + daysInTrip(trip), 0);

  const longestTrip =
    trips.length === 0
      ? null
      : trips.reduce(
          (longest, trip) => (daysInTrip(trip) > longest.days ? { name: trip.name, days: daysInTrip(trip) } : longest),
          { name: trips[0].name, days: daysInTrip(trips[0]) }
        );

  const averageTripDays = totalTrips > 0 ? Math.round((totalDays / totalTrips) * 10) / 10 : 0;

  return {
    totalCountries,
    percentWorld,
    totalContinents: visitedContinents.size,
    totalTrips,
    totalFlights,
    totalDays,
    longestTrip,
    averageTripDays
  };
}
