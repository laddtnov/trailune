import { describe, it, expect, beforeEach } from 'vitest';
import { getLastSeenUnlockedIds, setLastSeenUnlockedIds } from './achievementViewState';

beforeEach(() => {
  localStorage.clear();
});

describe('achievementViewState', () => {
  it('returns an empty set when nothing has been stored yet', () => {
    expect(getLastSeenUnlockedIds()).toEqual(new Set());
  });

  it('round-trips a set of ids through storage', () => {
    setLastSeenUnlockedIds(new Set(['explorer', 'globetrotter']));
    expect(getLastSeenUnlockedIds()).toEqual(new Set(['explorer', 'globetrotter']));
  });

  it('overwrites the previously stored set rather than merging', () => {
    setLastSeenUnlockedIds(new Set(['explorer']));
    setLastSeenUnlockedIds(new Set(['photographer']));
    expect(getLastSeenUnlockedIds()).toEqual(new Set(['photographer']));
  });
});
