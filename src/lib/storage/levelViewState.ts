const LAST_SEEN_KEY = 'trailune:level-last-seen';

export function getLastSeenLevelId(): string | null {
  return localStorage.getItem(LAST_SEEN_KEY);
}

export function setLastSeenLevelId(id: string): void {
  localStorage.setItem(LAST_SEEN_KEY, id);
}
