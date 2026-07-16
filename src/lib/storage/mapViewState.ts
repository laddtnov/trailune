const LAST_SEEN_KEY = 'trailune:map-last-seen';

export function getLastSeenVisitedCodes(): Set<string> {
  const raw = localStorage.getItem(LAST_SEEN_KEY);
  if (!raw) return new Set();
  return new Set(JSON.parse(raw) as string[]);
}

export function setLastSeenVisitedCodes(codes: Set<string>): void {
  localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(Array.from(codes)));
}
