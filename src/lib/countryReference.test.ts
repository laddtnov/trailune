import { describe, it, expect } from 'vitest';
import { COUNTRY_REFERENCE } from './countryReference';

describe('COUNTRY_REFERENCE', () => {
  const entries = Object.entries(COUNTRY_REFERENCE);

  it('has an entry for every country code the world map supports', () => {
    expect(entries.length).toBe(211);
  });

  it('every entry has a valid 3-letter uppercase currency code', () => {
    for (const [code, ref] of entries) {
      expect(ref.currency.code, `${code} currency code`).toMatch(/^[A-Z]{3}$/);
    }
  });

  it('every entry has a non-empty currency name', () => {
    for (const [code, ref] of entries) {
      expect(ref.currency.name.length, `${code} currency name`).toBeGreaterThan(0);
    }
  });

  it('every entry has a numeric utcOffsetHours', () => {
    for (const [code, ref] of entries) {
      expect(typeof ref.utcOffsetHours, `${code} utcOffsetHours`).toBe('number');
    }
  });

  it('every entry has hemisphere exactly N or S', () => {
    for (const [code, ref] of entries) {
      expect(['N', 'S'], `${code} hemisphere`).toContain(ref.hemisphere);
    }
  });

  it('spot-checks a few well-known countries', () => {
    expect(COUNTRY_REFERENCE.JP).toEqual({
      currency: { code: 'JPY', name: 'Japanese Yen' },
      utcOffsetHours: 9,
      hemisphere: 'N'
    });
    expect(COUNTRY_REFERENCE.AU).toEqual({
      currency: { code: 'AUD', name: 'Australian Dollar' },
      utcOffsetHours: 10,
      hemisphere: 'S'
    });
    expect(COUNTRY_REFERENCE.IN.utcOffsetHours).toBe(5.5);
    expect(COUNTRY_REFERENCE.NP.utcOffsetHours).toBe(5.75);
  });
});
