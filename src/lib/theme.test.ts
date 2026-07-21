import { describe, it, expect, beforeEach } from 'vitest';
import { THEMES, getStoredTheme, setStoredTheme, applyTheme } from './theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('THEMES', () => {
  it('lists all four presets with travel-journal first', () => {
    expect(THEMES.map((t) => t.id)).toEqual([
      'travel-journal',
      'explorer-night',
      'golden-sunset',
      'polar-morning'
    ]);
  });
});

describe('getStoredTheme', () => {
  it('returns travel-journal when nothing has been stored yet', () => {
    expect(getStoredTheme()).toBe('travel-journal');
  });

  it('returns travel-journal when the stored value is not a known theme id', () => {
    localStorage.setItem('trailune:theme', 'not-a-real-theme');
    expect(getStoredTheme()).toBe('travel-journal');
  });

  it('returns the stored value when it is a valid theme id', () => {
    localStorage.setItem('trailune:theme', 'golden-sunset');
    expect(getStoredTheme()).toBe('golden-sunset');
  });
});

describe('setStoredTheme', () => {
  it('persists the given id to localStorage', () => {
    setStoredTheme('polar-morning');
    expect(localStorage.getItem('trailune:theme')).toBe('polar-morning');
  });
});

describe('applyTheme', () => {
  it('sets the data-theme attribute on the document element', () => {
    applyTheme('explorer-night');
    expect(document.documentElement.getAttribute('data-theme')).toBe('explorer-night');
  });

  it('also persists the choice to localStorage', () => {
    applyTheme('golden-sunset');
    expect(localStorage.getItem('trailune:theme')).toBe('golden-sunset');
  });
});
