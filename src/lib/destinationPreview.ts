import type { Season } from './journeyTimeline';
import { COUNTRY_REFERENCE } from './countryReference';
import type { Trip } from './types';

const SOUTHERN_FLIP: Record<Season, Season> = {
  Winter: 'Summer',
  Spring: 'Fall',
  Summer: 'Winter',
  Fall: 'Spring'
};

function northernSeasonForMonth(month: number): Season {
  if (month === 12 || month <= 2) return 'Winter';
  if (month <= 5) return 'Spring';
  if (month <= 8) return 'Summer';
  return 'Fall';
}

export function getHemisphereAwareSeason(dateIso: string, hemisphere: 'N' | 'S'): Season {
  const month = Number(dateIso.slice(5, 7));
  const northernSeason = northernSeasonForMonth(month);
  return hemisphere === 'N' ? northernSeason : SOUTHERN_FLIP[northernSeason];
}

export const SEASON_BLURBS: Record<Season, string> = {
  Winter: 'Cold, occasional snow',
  Spring: 'Mild, occasional rain',
  Summer: 'Warm to hot',
  Fall: 'Cool, crisp air'
};

export interface DestinationPreviewEntry {
  code: string;
  currency: { code: string; name: string };
  utcOffsetHours: number;
  season: Season;
  seasonBlurb: string;
}

export function computeDestinationPreview(trip: Trip): DestinationPreviewEntry[] {
  const entries: DestinationPreviewEntry[] = [];
  for (const code of trip.countries) {
    const reference = COUNTRY_REFERENCE[code];
    if (!reference) continue;
    const season = getHemisphereAwareSeason(trip.startDate, reference.hemisphere);
    entries.push({
      code,
      currency: reference.currency,
      utcOffsetHours: reference.utcOffsetHours,
      season,
      seasonBlurb: SEASON_BLURBS[season]
    });
  }
  return entries;
}
