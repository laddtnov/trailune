const LAST_SEEN_KEY = 'trailune:achievements-last-seen';

export function getLastSeenUnlockedIds(): Set<string> {
  const raw = localStorage.getItem(LAST_SEEN_KEY);
  if (!raw) return new Set();
  return new Set(JSON.parse(raw) as string[]);
}

export function setLastSeenUnlockedIds(ids: Set<string>): void {
  localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(Array.from(ids)));
}
