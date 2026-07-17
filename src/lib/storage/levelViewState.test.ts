import { describe, it, expect, beforeEach } from 'vitest';
import { getLastSeenLevelId, setLastSeenLevelId } from './levelViewState';

beforeEach(() => {
  localStorage.clear();
});

describe('levelViewState', () => {
  it('returns null when nothing has been stored yet', () => {
    expect(getLastSeenLevelId()).toBeNull();
  });

  it('round-trips a stored level id', () => {
    setLastSeenLevelId('wanderer');
    expect(getLastSeenLevelId()).toBe('wanderer');
  });

  it('overwrites the previously stored id rather than merging', () => {
    setLastSeenLevelId('adventurer');
    setLastSeenLevelId('voyager');
    expect(getLastSeenLevelId()).toBe('voyager');
  });
});
