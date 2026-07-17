import type { Trip } from '$lib/types';
import { listJournalEntries, listTips } from '$lib/storage/storage';
import { getContinent, getContinentCountryCounts, type Continent } from '$lib/continents';

export interface Achievement {
  id: 'explorer' | 'globetrotter' | 'continental-traveller' | 'photographer';
  name: string;
  description: string;
  unlocked: boolean;
}

const EXPLORER_THRESHOLD = 5;
const GLOBETROTTER_THRESHOLD = 25;
const PHOTOGRAPHER_THRESHOLD = 100;

function visitedCountries(trips: Trip[]): Set<string> {
  return new Set(trips.flatMap((trip) => trip.countries));
}

function hasCompletedAnyContinent(visited: Set<string>): boolean {
  const visitedByContinent = new Map<Continent, number>();
  for (const code of visited) {
    const continent = getContinent(code);
    if (!continent) continue;
    visitedByContinent.set(continent, (visitedByContinent.get(continent) ?? 0) + 1);
  }

  const totals = getContinentCountryCounts();
  for (const [continent, visitedCount] of visitedByContinent) {
    if (visitedCount === totals[continent]) return true;
  }
  return false;
}

function totalPhotoCount(trips: Trip[]): number {
  let count = 0;
  for (const trip of trips) {
    const entries = listJournalEntries(trip.id);
    for (const entry of entries) count += entry.photoIds.length;

    const tips = listTips(trip.id);
    for (const tip of tips) {
      if (tip.photoId !== null) count += 1;
    }
  }
  return count;
}

export function getAchievements(trips: Trip[]): Achievement[] {
  const visited = visitedCountries(trips);

  return [
    {
      id: 'explorer',
      name: 'Explorer',
      description: `Visit ${EXPLORER_THRESHOLD} countries`,
      unlocked: visited.size >= EXPLORER_THRESHOLD
    },
    {
      id: 'globetrotter',
      name: 'Globetrotter',
      description: `Visit ${GLOBETROTTER_THRESHOLD} countries`,
      unlocked: visited.size >= GLOBETROTTER_THRESHOLD
    },
    {
      id: 'continental-traveller',
      name: 'Continental Traveller',
      description: 'Visit every country on one continent',
      unlocked: hasCompletedAnyContinent(visited)
    },
    {
      id: 'photographer',
      name: 'Photographer',
      description: `Take ${PHOTOGRAPHER_THRESHOLD} photos`,
      unlocked: totalPhotoCount(trips) >= PHOTOGRAPHER_THRESHOLD
    }
  ];
}
