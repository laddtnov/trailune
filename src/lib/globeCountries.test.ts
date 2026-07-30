import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadGlobeCountries, getFeatureCode, type GlobeCountryFeature } from './globeCountries';

function makeFeature(overrides: Partial<GlobeCountryFeature['properties']> & { NAME?: string }): GlobeCountryFeature {
  return {
    type: 'Feature',
    properties: { ISO_A2: 'JP', NAME: 'Japan', ...overrides },
    geometry: { type: 'Polygon', coordinates: [] }
  };
}

describe('loadGlobeCountries', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({
          type: 'FeatureCollection',
          features: [
            makeFeature({ ISO_A2: 'JP', NAME: 'Japan' }),
            makeFeature({ ISO_A2: 'XYZ', NAME: 'Bad Code' }),
            makeFeature({ ISO_A2: '-99', NAME: 'France' }),
            makeFeature({ ISO_A2: '-99', NAME: 'Norway' }),
            makeFeature({ ISO_A2: '-99', NAME: 'N. Cyprus' }),
            makeFeature({ ISO_A2: 'AQ', NAME: 'Antarctica' })
          ]
        })
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches the bundled GeoJSON asset from the correct path', async () => {
    await loadGlobeCountries();
    expect(fetch).toHaveBeenCalledWith('/world-countries.geojson');
  });

  it('keeps a feature with a valid two-letter ISO_A2 code', async () => {
    const features = await loadGlobeCountries();
    expect(features.some((f) => f.properties.ISO_A2 === 'JP')).toBe(true);
  });

  it('filters out a feature with a non-two-letter code', async () => {
    const features = await loadGlobeCountries();
    expect(features.some((f) => f.properties.NAME === 'Bad Code')).toBe(false);
  });

  it('overrides the invalid ISO_A2 for France to FR', async () => {
    const features = await loadGlobeCountries();
    const france = features.find((f) => f.properties.NAME === 'France');
    expect(france?.properties.ISO_A2).toBe('FR');
  });

  it('overrides the invalid ISO_A2 for Norway to NO', async () => {
    const features = await loadGlobeCountries();
    const norway = features.find((f) => f.properties.NAME === 'Norway');
    expect(norway?.properties.ISO_A2).toBe('NO');
  });

  it('excludes N. Cyprus, which has no override and an invalid code', async () => {
    const features = await loadGlobeCountries();
    expect(features.some((f) => f.properties.NAME === 'N. Cyprus')).toBe(false);
  });

  it('excludes Antarctica even though AQ is a valid two-letter code', async () => {
    const features = await loadGlobeCountries();
    expect(features.some((f) => f.properties.ISO_A2 === 'AQ')).toBe(false);
  });
});

describe('getFeatureCode', () => {
  it('returns the properties.ISO_A2 value', () => {
    const feature = makeFeature({ ISO_A2: 'FR' });
    expect(getFeatureCode(feature)).toBe('FR');
  });
});
