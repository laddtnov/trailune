import { describe, it, expect } from 'vitest';
import { getContinent, CONTINENTS } from './continents';
import { parseCountriesFromSvg } from './countries';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('getContinent', () => {
  it('resolves a spot-check of known country codes to the correct continent', () => {
    expect(getContinent('FR')).toBe('Europe');
    expect(getContinent('JP')).toBe('Asia');
    expect(getContinent('BR')).toBe('South America');
    expect(getContinent('US')).toBe('North America');
    expect(getContinent('AU')).toBe('Oceania');
    expect(getContinent('KE')).toBe('Africa');
  });

  it('returns null for a code with no lookup entry', () => {
    expect(getContinent('ZZ')).toBeNull();
  });

  it('lists exactly 7 continents', () => {
    expect(CONTINENTS).toHaveLength(7);
    expect(new Set(CONTINENTS).size).toBe(7);
  });

  it('has a lookup entry for every country code present in world-map.svg', () => {
    const svgText = readFileSync(resolve(__dirname, '../../static/world-map.svg'), 'utf8');
    const countries = parseCountriesFromSvg(svgText);
    const missing = countries.filter((c) => getContinent(c.code) === null);
    expect(missing.map((c) => c.code)).toEqual([]);
  });
});
