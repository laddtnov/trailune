import { describe, it, expect } from 'vitest';
import { parseCountriesFromSvg } from './countries';

describe('parseCountriesFromSvg', () => {
  it('extracts code and title from path elements, sorted by name', () => {
    const svg = `<svg><path id="US"><title>United States</title></path><path id="FR"><title>France</title></path></svg>`;
    expect(parseCountriesFromSvg(svg)).toEqual([
      { code: 'FR', name: 'France' },
      { code: 'US', name: 'United States' }
    ]);
  });

  it('falls back to the code as the name when no title is present', () => {
    const svg = `<svg><path id="DE"></path></svg>`;
    expect(parseCountriesFromSvg(svg)).toEqual([{ code: 'DE', name: 'DE' }]);
  });

  it('ignores paths whose id is not a 2-letter code', () => {
    const svg = `<svg><path id="background"></path><path id="US"><title>United States</title></path></svg>`;
    expect(parseCountriesFromSvg(svg)).toEqual([{ code: 'US', name: 'United States' }]);
  });
});
