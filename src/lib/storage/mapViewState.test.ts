import { describe, it, expect, beforeEach } from 'vitest';
import { getLastSeenVisitedCodes, setLastSeenVisitedCodes } from './mapViewState';

beforeEach(() => {
  localStorage.clear();
});

describe('mapViewState', () => {
  it('returns an empty set when nothing has been stored yet', () => {
    expect(getLastSeenVisitedCodes()).toEqual(new Set());
  });

  it('round-trips a set of codes through storage', () => {
    setLastSeenVisitedCodes(new Set(['FR', 'DE']));
    expect(getLastSeenVisitedCodes()).toEqual(new Set(['FR', 'DE']));
  });

  it('overwrites the previously stored set rather than merging', () => {
    setLastSeenVisitedCodes(new Set(['FR']));
    setLastSeenVisitedCodes(new Set(['DE']));
    expect(getLastSeenVisitedCodes()).toEqual(new Set(['DE']));
  });
});
