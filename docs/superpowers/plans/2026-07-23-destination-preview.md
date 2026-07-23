# Destination Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show, in the trip hub, a card per country with currency, UTC offset, and a hemisphere-aware season/climate blurb computed from the trip's actual travel dates — no live weather or exchange-rate API.

**Architecture:** A static bundled reference table (`countryReference.ts`) covers every country code the app's world map already supports. A pure module (`destinationPreview.ts`) turns a trip's countries + start date into per-country preview entries, flipping the season calculation for Southern-hemisphere countries. A new `DestinationPreview.svelte` component renders one card per entry, wired into the trip hub above the tab navigation.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Vitest, Tailwind v4.

## Global Constraints

- No live weather API and no live currency exchange rates — everything is static/bundled (spec: Non-goals).
- The four season blurbs (Winter/Spring/Summer/Fall) are generic and shared across every country — no per-country weather nuance (spec: Non-goals).
- One representative UTC offset per country (typically the capital city's), even for countries spanning multiple timezones (spec: Non-goals).
- Ships only in the trip hub in this cycle — no destination preview in the trip-creation dialog (spec: Non-goals).
- Fractional UTC offsets (e.g. `5.5`, `5.75`) must format as `"UTC+5:30"` / `"UTC+5:45"` (hours:minutes), never as a decimal (spec: Edge cases).
- Season is computed from `trip.startDate` only — no second card or range for trips spanning a season boundary (spec: Data flow & interaction notes).

---

### Task 1: `countryReference.ts` — static country data table

**Files:**
- Create: `src/lib/countryReference.ts`
- Test: `src/lib/countryReference.test.ts`

**Interfaces:**
- Consumes: nothing — this is the foundational data task.
- Produces:
  - `export interface CountryReference { currency: { code: string; name: string }; utcOffsetHours: number; hemisphere: 'N' | 'S' }`
  - `export const COUNTRY_REFERENCE: Record<string, CountryReference>` — one entry per every 2-letter code in `src/lib/countries.ts`'s supported set (211 codes, matching `static/world-map.svg`'s `path[id]` elements).

- [ ] **Step 1: Write the failing test**

Create `src/lib/countryReference.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/countryReference.test.ts`
Expected: FAIL with "Cannot find module './countryReference'"

- [ ] **Step 3: Write the implementation**

Create `src/lib/countryReference.ts`:

```ts
export interface CountryReference {
  currency: { code: string; name: string };
  utcOffsetHours: number;
  hemisphere: 'N' | 'S';
}

export const COUNTRY_REFERENCE: Record<string, CountryReference> = {
  AD: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 1, hemisphere: 'N' },
  AE: { currency: { code: 'AED', name: 'UAE Dirham' }, utcOffsetHours: 4, hemisphere: 'N' },
  AF: { currency: { code: 'AFN', name: 'Afghan Afghani' }, utcOffsetHours: 4.5, hemisphere: 'N' },
  AG: { currency: { code: 'XCD', name: 'East Caribbean Dollar' }, utcOffsetHours: -4, hemisphere: 'N' },
  AI: { currency: { code: 'XCD', name: 'East Caribbean Dollar' }, utcOffsetHours: -4, hemisphere: 'N' },
  AL: { currency: { code: 'ALL', name: 'Albanian Lek' }, utcOffsetHours: 1, hemisphere: 'N' },
  AM: { currency: { code: 'AMD', name: 'Armenian Dram' }, utcOffsetHours: 4, hemisphere: 'N' },
  AO: { currency: { code: 'AOA', name: 'Angolan Kwanza' }, utcOffsetHours: 1, hemisphere: 'S' },
  AR: { currency: { code: 'ARS', name: 'Argentine Peso' }, utcOffsetHours: -3, hemisphere: 'S' },
  AT: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 1, hemisphere: 'N' },
  AU: { currency: { code: 'AUD', name: 'Australian Dollar' }, utcOffsetHours: 10, hemisphere: 'S' },
  AW: { currency: { code: 'AWG', name: 'Aruban Florin' }, utcOffsetHours: -4, hemisphere: 'N' },
  AZ: { currency: { code: 'AZN', name: 'Azerbaijani Manat' }, utcOffsetHours: 4, hemisphere: 'N' },
  BA: { currency: { code: 'BAM', name: 'Bosnia-Herzegovina Convertible Mark' }, utcOffsetHours: 1, hemisphere: 'N' },
  BB: { currency: { code: 'BBD', name: 'Barbadian Dollar' }, utcOffsetHours: -4, hemisphere: 'N' },
  BD: { currency: { code: 'BDT', name: 'Bangladeshi Taka' }, utcOffsetHours: 6, hemisphere: 'N' },
  BE: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 1, hemisphere: 'N' },
  BF: { currency: { code: 'XOF', name: 'West African CFA Franc' }, utcOffsetHours: 0, hemisphere: 'N' },
  BG: { currency: { code: 'BGN', name: 'Bulgarian Lev' }, utcOffsetHours: 2, hemisphere: 'N' },
  BI: { currency: { code: 'BIF', name: 'Burundian Franc' }, utcOffsetHours: 2, hemisphere: 'S' },
  BJ: { currency: { code: 'XOF', name: 'West African CFA Franc' }, utcOffsetHours: 1, hemisphere: 'N' },
  BM: { currency: { code: 'BMD', name: 'Bermudian Dollar' }, utcOffsetHours: -4, hemisphere: 'N' },
  BN: { currency: { code: 'BND', name: 'Brunei Dollar' }, utcOffsetHours: 8, hemisphere: 'N' },
  BO: { currency: { code: 'BOB', name: 'Bolivian Boliviano' }, utcOffsetHours: -4, hemisphere: 'S' },
  BR: { currency: { code: 'BRL', name: 'Brazilian Real' }, utcOffsetHours: -3, hemisphere: 'S' },
  BS: { currency: { code: 'BSD', name: 'Bahamian Dollar' }, utcOffsetHours: -5, hemisphere: 'N' },
  BT: { currency: { code: 'BTN', name: 'Bhutanese Ngultrum' }, utcOffsetHours: 6, hemisphere: 'N' },
  BW: { currency: { code: 'BWP', name: 'Botswana Pula' }, utcOffsetHours: 2, hemisphere: 'S' },
  BY: { currency: { code: 'BYN', name: 'Belarusian Ruble' }, utcOffsetHours: 3, hemisphere: 'N' },
  BZ: { currency: { code: 'BZD', name: 'Belize Dollar' }, utcOffsetHours: -6, hemisphere: 'N' },
  CA: { currency: { code: 'CAD', name: 'Canadian Dollar' }, utcOffsetHours: -5, hemisphere: 'N' },
  CD: { currency: { code: 'CDF', name: 'Congolese Franc' }, utcOffsetHours: 1, hemisphere: 'S' },
  CF: { currency: { code: 'XAF', name: 'Central African CFA Franc' }, utcOffsetHours: 1, hemisphere: 'N' },
  CG: { currency: { code: 'XAF', name: 'Central African CFA Franc' }, utcOffsetHours: 1, hemisphere: 'S' },
  CH: { currency: { code: 'CHF', name: 'Swiss Franc' }, utcOffsetHours: 1, hemisphere: 'N' },
  CI: { currency: { code: 'XOF', name: 'West African CFA Franc' }, utcOffsetHours: 0, hemisphere: 'N' },
  CL: { currency: { code: 'CLP', name: 'Chilean Peso' }, utcOffsetHours: -4, hemisphere: 'S' },
  CM: { currency: { code: 'XAF', name: 'Central African CFA Franc' }, utcOffsetHours: 1, hemisphere: 'N' },
  CN: { currency: { code: 'CNY', name: 'Chinese Yuan' }, utcOffsetHours: 8, hemisphere: 'N' },
  CO: { currency: { code: 'COP', name: 'Colombian Peso' }, utcOffsetHours: -5, hemisphere: 'N' },
  CR: { currency: { code: 'CRC', name: 'Costa Rican Colón' }, utcOffsetHours: -6, hemisphere: 'N' },
  CU: { currency: { code: 'CUP', name: 'Cuban Peso' }, utcOffsetHours: -5, hemisphere: 'N' },
  CV: { currency: { code: 'CVE', name: 'Cape Verdean Escudo' }, utcOffsetHours: -1, hemisphere: 'N' },
  CW: { currency: { code: 'ANG', name: 'Netherlands Antillean Guilder' }, utcOffsetHours: -4, hemisphere: 'N' },
  CY: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 2, hemisphere: 'N' },
  CZ: { currency: { code: 'CZK', name: 'Czech Koruna' }, utcOffsetHours: 1, hemisphere: 'N' },
  DE: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 1, hemisphere: 'N' },
  DJ: { currency: { code: 'DJF', name: 'Djiboutian Franc' }, utcOffsetHours: 3, hemisphere: 'N' },
  DK: { currency: { code: 'DKK', name: 'Danish Krone' }, utcOffsetHours: 1, hemisphere: 'N' },
  DM: { currency: { code: 'XCD', name: 'East Caribbean Dollar' }, utcOffsetHours: -4, hemisphere: 'N' },
  DO: { currency: { code: 'DOP', name: 'Dominican Peso' }, utcOffsetHours: -4, hemisphere: 'N' },
  DZ: { currency: { code: 'DZD', name: 'Algerian Dinar' }, utcOffsetHours: 1, hemisphere: 'N' },
  EC: { currency: { code: 'USD', name: 'US Dollar' }, utcOffsetHours: -5, hemisphere: 'S' },
  EE: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 2, hemisphere: 'N' },
  EG: { currency: { code: 'EGP', name: 'Egyptian Pound' }, utcOffsetHours: 2, hemisphere: 'N' },
  EH: { currency: { code: 'MAD', name: 'Moroccan Dirham' }, utcOffsetHours: 0, hemisphere: 'N' },
  ER: { currency: { code: 'ERN', name: 'Eritrean Nakfa' }, utcOffsetHours: 3, hemisphere: 'N' },
  ES: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 1, hemisphere: 'N' },
  ET: { currency: { code: 'ETB', name: 'Ethiopian Birr' }, utcOffsetHours: 3, hemisphere: 'N' },
  FI: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 2, hemisphere: 'N' },
  FJ: { currency: { code: 'FJD', name: 'Fijian Dollar' }, utcOffsetHours: 12, hemisphere: 'S' },
  FK: { currency: { code: 'FKP', name: 'Falkland Islands Pound' }, utcOffsetHours: -3, hemisphere: 'S' },
  FO: { currency: { code: 'DKK', name: 'Danish Krone' }, utcOffsetHours: 0, hemisphere: 'N' },
  FR: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 1, hemisphere: 'N' },
  GA: { currency: { code: 'XAF', name: 'Central African CFA Franc' }, utcOffsetHours: 1, hemisphere: 'S' },
  GB: { currency: { code: 'GBP', name: 'British Pound' }, utcOffsetHours: 0, hemisphere: 'N' },
  GD: { currency: { code: 'XCD', name: 'East Caribbean Dollar' }, utcOffsetHours: -4, hemisphere: 'N' },
  GE: { currency: { code: 'GEL', name: 'Georgian Lari' }, utcOffsetHours: 4, hemisphere: 'N' },
  GF: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: -3, hemisphere: 'N' },
  GH: { currency: { code: 'GHS', name: 'Ghanaian Cedi' }, utcOffsetHours: 0, hemisphere: 'N' },
  GL: { currency: { code: 'DKK', name: 'Danish Krone' }, utcOffsetHours: -3, hemisphere: 'N' },
  GM: { currency: { code: 'GMD', name: 'Gambian Dalasi' }, utcOffsetHours: 0, hemisphere: 'N' },
  GN: { currency: { code: 'GNF', name: 'Guinean Franc' }, utcOffsetHours: 0, hemisphere: 'N' },
  GP: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: -4, hemisphere: 'N' },
  GQ: { currency: { code: 'XAF', name: 'Central African CFA Franc' }, utcOffsetHours: 1, hemisphere: 'N' },
  GR: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 2, hemisphere: 'N' },
  GT: { currency: { code: 'GTQ', name: 'Guatemalan Quetzal' }, utcOffsetHours: -6, hemisphere: 'N' },
  GW: { currency: { code: 'XOF', name: 'West African CFA Franc' }, utcOffsetHours: 0, hemisphere: 'N' },
  GY: { currency: { code: 'GYD', name: 'Guyanese Dollar' }, utcOffsetHours: -4, hemisphere: 'N' },
  HK: { currency: { code: 'HKD', name: 'Hong Kong Dollar' }, utcOffsetHours: 8, hemisphere: 'N' },
  HN: { currency: { code: 'HNL', name: 'Honduran Lempira' }, utcOffsetHours: -6, hemisphere: 'N' },
  HR: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 1, hemisphere: 'N' },
  HT: { currency: { code: 'HTG', name: 'Haitian Gourde' }, utcOffsetHours: -5, hemisphere: 'N' },
  HU: { currency: { code: 'HUF', name: 'Hungarian Forint' }, utcOffsetHours: 1, hemisphere: 'N' },
  IC: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 0, hemisphere: 'N' },
  ID: { currency: { code: 'IDR', name: 'Indonesian Rupiah' }, utcOffsetHours: 7, hemisphere: 'S' },
  IE: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 0, hemisphere: 'N' },
  IL: { currency: { code: 'ILS', name: 'Israeli New Shekel' }, utcOffsetHours: 2, hemisphere: 'N' },
  IN: { currency: { code: 'INR', name: 'Indian Rupee' }, utcOffsetHours: 5.5, hemisphere: 'N' },
  IQ: { currency: { code: 'IQD', name: 'Iraqi Dinar' }, utcOffsetHours: 3, hemisphere: 'N' },
  IR: { currency: { code: 'IRR', name: 'Iranian Rial' }, utcOffsetHours: 3.5, hemisphere: 'N' },
  IS: { currency: { code: 'ISK', name: 'Icelandic Króna' }, utcOffsetHours: 0, hemisphere: 'N' },
  IT: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 1, hemisphere: 'N' },
  JM: { currency: { code: 'JMD', name: 'Jamaican Dollar' }, utcOffsetHours: -5, hemisphere: 'N' },
  JO: { currency: { code: 'JOD', name: 'Jordanian Dinar' }, utcOffsetHours: 2, hemisphere: 'N' },
  JP: { currency: { code: 'JPY', name: 'Japanese Yen' }, utcOffsetHours: 9, hemisphere: 'N' },
  KE: { currency: { code: 'KES', name: 'Kenyan Shilling' }, utcOffsetHours: 3, hemisphere: 'S' },
  KG: { currency: { code: 'KGS', name: 'Kyrgyzstani Som' }, utcOffsetHours: 6, hemisphere: 'N' },
  KH: { currency: { code: 'KHR', name: 'Cambodian Riel' }, utcOffsetHours: 7, hemisphere: 'N' },
  KM: { currency: { code: 'KMF', name: 'Comorian Franc' }, utcOffsetHours: 3, hemisphere: 'S' },
  KN: { currency: { code: 'XCD', name: 'East Caribbean Dollar' }, utcOffsetHours: -4, hemisphere: 'N' },
  KP: { currency: { code: 'KPW', name: 'North Korean Won' }, utcOffsetHours: 9, hemisphere: 'N' },
  KR: { currency: { code: 'KRW', name: 'South Korean Won' }, utcOffsetHours: 9, hemisphere: 'N' },
  KW: { currency: { code: 'KWD', name: 'Kuwaiti Dinar' }, utcOffsetHours: 3, hemisphere: 'N' },
  KY: { currency: { code: 'KYD', name: 'Cayman Islands Dollar' }, utcOffsetHours: -5, hemisphere: 'N' },
  KZ: { currency: { code: 'KZT', name: 'Kazakhstani Tenge' }, utcOffsetHours: 5, hemisphere: 'N' },
  LA: { currency: { code: 'LAK', name: 'Lao Kip' }, utcOffsetHours: 7, hemisphere: 'N' },
  LB: { currency: { code: 'LBP', name: 'Lebanese Pound' }, utcOffsetHours: 2, hemisphere: 'N' },
  LC: { currency: { code: 'XCD', name: 'East Caribbean Dollar' }, utcOffsetHours: -4, hemisphere: 'N' },
  LI: { currency: { code: 'CHF', name: 'Swiss Franc' }, utcOffsetHours: 1, hemisphere: 'N' },
  LK: { currency: { code: 'LKR', name: 'Sri Lankan Rupee' }, utcOffsetHours: 5.5, hemisphere: 'N' },
  LR: { currency: { code: 'LRD', name: 'Liberian Dollar' }, utcOffsetHours: 0, hemisphere: 'N' },
  LS: { currency: { code: 'LSL', name: 'Lesotho Loti' }, utcOffsetHours: 2, hemisphere: 'S' },
  LT: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 2, hemisphere: 'N' },
  LU: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 1, hemisphere: 'N' },
  LV: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 2, hemisphere: 'N' },
  LY: { currency: { code: 'LYD', name: 'Libyan Dinar' }, utcOffsetHours: 2, hemisphere: 'N' },
  MA: { currency: { code: 'MAD', name: 'Moroccan Dirham' }, utcOffsetHours: 0, hemisphere: 'N' },
  MD: { currency: { code: 'MDL', name: 'Moldovan Leu' }, utcOffsetHours: 2, hemisphere: 'N' },
  ME: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 1, hemisphere: 'N' },
  MG: { currency: { code: 'MGA', name: 'Malagasy Ariary' }, utcOffsetHours: 3, hemisphere: 'S' },
  MK: { currency: { code: 'MKD', name: 'Macedonian Denar' }, utcOffsetHours: 1, hemisphere: 'N' },
  ML: { currency: { code: 'XOF', name: 'West African CFA Franc' }, utcOffsetHours: 0, hemisphere: 'N' },
  MM: { currency: { code: 'MMK', name: 'Myanmar Kyat' }, utcOffsetHours: 6.5, hemisphere: 'N' },
  MN: { currency: { code: 'MNT', name: 'Mongolian Tögrög' }, utcOffsetHours: 8, hemisphere: 'N' },
  MQ: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: -4, hemisphere: 'N' },
  MR: { currency: { code: 'MRU', name: 'Mauritanian Ouguiya' }, utcOffsetHours: 0, hemisphere: 'N' },
  MS: { currency: { code: 'XCD', name: 'East Caribbean Dollar' }, utcOffsetHours: -4, hemisphere: 'N' },
  MT: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 1, hemisphere: 'N' },
  MU: { currency: { code: 'MUR', name: 'Mauritian Rupee' }, utcOffsetHours: 4, hemisphere: 'S' },
  MV: { currency: { code: 'MVR', name: 'Maldivian Rufiyaa' }, utcOffsetHours: 5, hemisphere: 'N' },
  MW: { currency: { code: 'MWK', name: 'Malawian Kwacha' }, utcOffsetHours: 2, hemisphere: 'S' },
  MX: { currency: { code: 'MXN', name: 'Mexican Peso' }, utcOffsetHours: -6, hemisphere: 'N' },
  MY: { currency: { code: 'MYR', name: 'Malaysian Ringgit' }, utcOffsetHours: 8, hemisphere: 'N' },
  MZ: { currency: { code: 'MZN', name: 'Mozambican Metical' }, utcOffsetHours: 2, hemisphere: 'S' },
  NA: { currency: { code: 'NAD', name: 'Namibian Dollar' }, utcOffsetHours: 2, hemisphere: 'S' },
  NC: { currency: { code: 'XPF', name: 'CFP Franc' }, utcOffsetHours: 11, hemisphere: 'S' },
  NE: { currency: { code: 'XOF', name: 'West African CFA Franc' }, utcOffsetHours: 1, hemisphere: 'N' },
  NG: { currency: { code: 'NGN', name: 'Nigerian Naira' }, utcOffsetHours: 1, hemisphere: 'N' },
  NI: { currency: { code: 'NIO', name: 'Nicaraguan Córdoba' }, utcOffsetHours: -6, hemisphere: 'N' },
  NL: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 1, hemisphere: 'N' },
  NO: { currency: { code: 'NOK', name: 'Norwegian Krone' }, utcOffsetHours: 1, hemisphere: 'N' },
  NP: { currency: { code: 'NPR', name: 'Nepalese Rupee' }, utcOffsetHours: 5.75, hemisphere: 'N' },
  NR: { currency: { code: 'AUD', name: 'Australian Dollar' }, utcOffsetHours: 12, hemisphere: 'S' },
  NZ: { currency: { code: 'NZD', name: 'New Zealand Dollar' }, utcOffsetHours: 12, hemisphere: 'S' },
  OM: { currency: { code: 'OMR', name: 'Omani Rial' }, utcOffsetHours: 4, hemisphere: 'N' },
  PA: { currency: { code: 'PAB', name: 'Panamanian Balboa' }, utcOffsetHours: -5, hemisphere: 'N' },
  PE: { currency: { code: 'PEN', name: 'Peruvian Sol' }, utcOffsetHours: -5, hemisphere: 'S' },
  PF: { currency: { code: 'XPF', name: 'CFP Franc' }, utcOffsetHours: -10, hemisphere: 'S' },
  PG: { currency: { code: 'PGK', name: 'Papua New Guinean Kina' }, utcOffsetHours: 10, hemisphere: 'S' },
  PH: { currency: { code: 'PHP', name: 'Philippine Peso' }, utcOffsetHours: 8, hemisphere: 'N' },
  PK: { currency: { code: 'PKR', name: 'Pakistani Rupee' }, utcOffsetHours: 5, hemisphere: 'N' },
  PL: { currency: { code: 'PLN', name: 'Polish Złoty' }, utcOffsetHours: 1, hemisphere: 'N' },
  PN: { currency: { code: 'NZD', name: 'New Zealand Dollar' }, utcOffsetHours: -8, hemisphere: 'S' },
  PR: { currency: { code: 'USD', name: 'US Dollar' }, utcOffsetHours: -4, hemisphere: 'N' },
  PS: { currency: { code: 'ILS', name: 'Israeli New Shekel' }, utcOffsetHours: 2, hemisphere: 'N' },
  PT: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 0, hemisphere: 'N' },
  PY: { currency: { code: 'PYG', name: 'Paraguayan Guaraní' }, utcOffsetHours: -4, hemisphere: 'S' },
  QA: { currency: { code: 'QAR', name: 'Qatari Riyal' }, utcOffsetHours: 3, hemisphere: 'N' },
  RE: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 4, hemisphere: 'S' },
  RO: { currency: { code: 'RON', name: 'Romanian Leu' }, utcOffsetHours: 2, hemisphere: 'N' },
  RS: { currency: { code: 'RSD', name: 'Serbian Dinar' }, utcOffsetHours: 1, hemisphere: 'N' },
  RU: { currency: { code: 'RUB', name: 'Russian Ruble' }, utcOffsetHours: 3, hemisphere: 'N' },
  RW: { currency: { code: 'RWF', name: 'Rwandan Franc' }, utcOffsetHours: 2, hemisphere: 'S' },
  SA: { currency: { code: 'SAR', name: 'Saudi Riyal' }, utcOffsetHours: 3, hemisphere: 'N' },
  SB: { currency: { code: 'SBD', name: 'Solomon Islands Dollar' }, utcOffsetHours: 11, hemisphere: 'S' },
  SC: { currency: { code: 'SCR', name: 'Seychellois Rupee' }, utcOffsetHours: 4, hemisphere: 'S' },
  SD: { currency: { code: 'SDG', name: 'Sudanese Pound' }, utcOffsetHours: 2, hemisphere: 'N' },
  SE: { currency: { code: 'SEK', name: 'Swedish Krona' }, utcOffsetHours: 1, hemisphere: 'N' },
  SG: { currency: { code: 'SGD', name: 'Singapore Dollar' }, utcOffsetHours: 8, hemisphere: 'N' },
  SI: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 1, hemisphere: 'N' },
  SK: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 1, hemisphere: 'N' },
  SL: { currency: { code: 'SLE', name: 'Sierra Leonean Leone' }, utcOffsetHours: 0, hemisphere: 'N' },
  SN: { currency: { code: 'XOF', name: 'West African CFA Franc' }, utcOffsetHours: 0, hemisphere: 'N' },
  SO: { currency: { code: 'SOS', name: 'Somali Shilling' }, utcOffsetHours: 3, hemisphere: 'N' },
  SR: { currency: { code: 'SRD', name: 'Surinamese Dollar' }, utcOffsetHours: -3, hemisphere: 'N' },
  SS: { currency: { code: 'SSP', name: 'South Sudanese Pound' }, utcOffsetHours: 2, hemisphere: 'N' },
  ST: { currency: { code: 'STN', name: 'São Tomé and Príncipe Dobra' }, utcOffsetHours: 0, hemisphere: 'N' },
  SV: { currency: { code: 'USD', name: 'US Dollar' }, utcOffsetHours: -6, hemisphere: 'N' },
  SX: { currency: { code: 'ANG', name: 'Netherlands Antillean Guilder' }, utcOffsetHours: -4, hemisphere: 'N' },
  SY: { currency: { code: 'SYP', name: 'Syrian Pound' }, utcOffsetHours: 3, hemisphere: 'N' },
  SZ: { currency: { code: 'SZL', name: 'Swazi Lilangeni' }, utcOffsetHours: 2, hemisphere: 'S' },
  TC: { currency: { code: 'USD', name: 'US Dollar' }, utcOffsetHours: -5, hemisphere: 'N' },
  TD: { currency: { code: 'XAF', name: 'Central African CFA Franc' }, utcOffsetHours: 1, hemisphere: 'N' },
  TG: { currency: { code: 'XOF', name: 'West African CFA Franc' }, utcOffsetHours: 0, hemisphere: 'N' },
  TH: { currency: { code: 'THB', name: 'Thai Baht' }, utcOffsetHours: 7, hemisphere: 'N' },
  TJ: { currency: { code: 'TJS', name: 'Tajikistani Somoni' }, utcOffsetHours: 5, hemisphere: 'N' },
  TL: { currency: { code: 'USD', name: 'US Dollar' }, utcOffsetHours: 9, hemisphere: 'S' },
  TM: { currency: { code: 'TMT', name: 'Turkmenistani Manat' }, utcOffsetHours: 5, hemisphere: 'N' },
  TN: { currency: { code: 'TND', name: 'Tunisian Dinar' }, utcOffsetHours: 1, hemisphere: 'N' },
  TO: { currency: { code: 'TOP', name: 'Tongan Paʻanga' }, utcOffsetHours: 13, hemisphere: 'S' },
  TR: { currency: { code: 'TRY', name: 'Turkish Lira' }, utcOffsetHours: 3, hemisphere: 'N' },
  TT: { currency: { code: 'TTD', name: 'Trinidad and Tobago Dollar' }, utcOffsetHours: -4, hemisphere: 'N' },
  TW: { currency: { code: 'TWD', name: 'New Taiwan Dollar' }, utcOffsetHours: 8, hemisphere: 'N' },
  TZ: { currency: { code: 'TZS', name: 'Tanzanian Shilling' }, utcOffsetHours: 3, hemisphere: 'S' },
  UA: { currency: { code: 'UAH', name: 'Ukrainian Hryvnia' }, utcOffsetHours: 2, hemisphere: 'N' },
  UG: { currency: { code: 'UGX', name: 'Ugandan Shilling' }, utcOffsetHours: 3, hemisphere: 'N' },
  US: { currency: { code: 'USD', name: 'US Dollar' }, utcOffsetHours: -5, hemisphere: 'N' },
  UY: { currency: { code: 'UYU', name: 'Uruguayan Peso' }, utcOffsetHours: -3, hemisphere: 'S' },
  UZ: { currency: { code: 'UZS', name: 'Uzbekistani Som' }, utcOffsetHours: 5, hemisphere: 'N' },
  VC: { currency: { code: 'XCD', name: 'East Caribbean Dollar' }, utcOffsetHours: -4, hemisphere: 'N' },
  VE: { currency: { code: 'VES', name: 'Venezuelan Bolívar' }, utcOffsetHours: -4, hemisphere: 'N' },
  VG: { currency: { code: 'USD', name: 'US Dollar' }, utcOffsetHours: -4, hemisphere: 'N' },
  VI: { currency: { code: 'USD', name: 'US Dollar' }, utcOffsetHours: -4, hemisphere: 'N' },
  VN: { currency: { code: 'VND', name: 'Vietnamese Đồng' }, utcOffsetHours: 7, hemisphere: 'N' },
  VU: { currency: { code: 'VUV', name: 'Vanuatu Vatu' }, utcOffsetHours: 11, hemisphere: 'S' },
  YE: { currency: { code: 'YER', name: 'Yemeni Rial' }, utcOffsetHours: 3, hemisphere: 'N' },
  YT: { currency: { code: 'EUR', name: 'Euro' }, utcOffsetHours: 3, hemisphere: 'S' },
  ZA: { currency: { code: 'ZAR', name: 'South African Rand' }, utcOffsetHours: 2, hemisphere: 'S' },
  ZM: { currency: { code: 'ZMW', name: 'Zambian Kwacha' }, utcOffsetHours: 2, hemisphere: 'S' },
  ZW: { currency: { code: 'ZWL', name: 'Zimbabwean Dollar' }, utcOffsetHours: 2, hemisphere: 'S' }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/countryReference.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/countryReference.ts src/lib/countryReference.test.ts
git commit -m "feat: add static country reference table (currency, UTC offset, hemisphere)"
```

---

### Task 2: `destinationPreview.ts` — hemisphere-aware season + preview computation

**Files:**
- Create: `src/lib/destinationPreview.ts`
- Test: `src/lib/destinationPreview.test.ts`

**Interfaces:**
- Consumes: `COUNTRY_REFERENCE` from `./countryReference` (Task 1); `Season` from `./journeyTimeline` (already merged, exported as `'Winter' | 'Spring' | 'Summer' | 'Fall'`); `Trip` from `./types`.
- Produces:
  - `getHemisphereAwareSeason(dateIso: string, hemisphere: 'N' | 'S'): Season`
  - `SEASON_BLURBS: Record<Season, string>`
  - `interface DestinationPreviewEntry { code: string; currency: { code: string; name: string }; utcOffsetHours: number; season: Season; seasonBlurb: string }`
  - `computeDestinationPreview(trip: Trip): DestinationPreviewEntry[]` — consumed by `DestinationPreview.svelte` in Task 3.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/destinationPreview.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getHemisphereAwareSeason, computeDestinationPreview, SEASON_BLURBS } from './destinationPreview';
import type { Trip } from './types';

function makeTrip(overrides: Partial<Trip>): Trip {
  return {
    id: overrides.id ?? 'trip-1',
    name: overrides.name ?? 'Test Trip',
    startDate: overrides.startDate ?? '2026-07-01',
    endDate: overrides.endDate ?? '2026-07-10',
    countries: overrides.countries ?? ['JP'],
    transportMode: overrides.transportMode ?? 'flight',
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z'
  };
}

describe('getHemisphereAwareSeason', () => {
  it('computes the plain season for the Northern hemisphere', () => {
    expect(getHemisphereAwareSeason('2026-01-15', 'N')).toBe('Winter');
    expect(getHemisphereAwareSeason('2026-04-15', 'N')).toBe('Spring');
    expect(getHemisphereAwareSeason('2026-07-15', 'N')).toBe('Summer');
    expect(getHemisphereAwareSeason('2026-10-15', 'N')).toBe('Fall');
  });

  it('flips the season for the Southern hemisphere', () => {
    expect(getHemisphereAwareSeason('2026-01-15', 'S')).toBe('Summer');
    expect(getHemisphereAwareSeason('2026-04-15', 'S')).toBe('Fall');
    expect(getHemisphereAwareSeason('2026-07-15', 'S')).toBe('Winter');
    expect(getHemisphereAwareSeason('2026-10-15', 'S')).toBe('Spring');
  });
});

describe('SEASON_BLURBS', () => {
  it('has a non-empty blurb for every season', () => {
    expect(SEASON_BLURBS.Winter.length).toBeGreaterThan(0);
    expect(SEASON_BLURBS.Spring.length).toBeGreaterThan(0);
    expect(SEASON_BLURBS.Summer.length).toBeGreaterThan(0);
    expect(SEASON_BLURBS.Fall.length).toBeGreaterThan(0);
  });
});

describe('computeDestinationPreview', () => {
  it('returns one entry per country, in order, for a Northern-hemisphere country', () => {
    const trip = makeTrip({ startDate: '2026-07-01', countries: ['JP'] });
    const result = computeDestinationPreview(trip);
    expect(result).toEqual([
      {
        code: 'JP',
        currency: { code: 'JPY', name: 'Japanese Yen' },
        utcOffsetHours: 9,
        season: 'Summer',
        seasonBlurb: SEASON_BLURBS.Summer
      }
    ]);
  });

  it('flips the season correctly for a Southern-hemisphere country on the same date', () => {
    const trip = makeTrip({ startDate: '2026-07-01', countries: ['AU'] });
    const result = computeDestinationPreview(trip);
    expect(result[0].season).toBe('Winter');
  });

  it('returns multiple entries in trip.countries order for a multi-country trip', () => {
    const trip = makeTrip({ startDate: '2026-07-01', countries: ['JP', 'AU'] });
    const result = computeDestinationPreview(trip);
    expect(result.map((r) => r.code)).toEqual(['JP', 'AU']);
  });

  it('silently skips a country code with no COUNTRY_REFERENCE entry', () => {
    const trip = makeTrip({ countries: ['JP', 'ZZ'] });
    const result = computeDestinationPreview(trip);
    expect(result.map((r) => r.code)).toEqual(['JP']);
  });

  it('returns an empty array for a trip with no countries', () => {
    const trip = makeTrip({ countries: [] });
    expect(computeDestinationPreview(trip)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/destinationPreview.test.ts`
Expected: FAIL with "Cannot find module './destinationPreview'"

- [ ] **Step 3: Write the implementation**

Create `src/lib/destinationPreview.ts`:

```ts
import type { Season } from './journeyTimeline';
import { COUNTRY_REFERENCE } from './countryReference';
import type { Trip } from './types';

const SOUTHERN_FLIP: Record<Season, Season> = {
  Winter: 'Summer',
  Spring: 'Fall',
  Summer: 'Winter',
  Fall: 'Spring'
};

function northernSeasonForMonth(month: number): Season {
  if (month === 12 || month <= 2) return 'Winter';
  if (month <= 5) return 'Spring';
  if (month <= 8) return 'Summer';
  return 'Fall';
}

export function getHemisphereAwareSeason(dateIso: string, hemisphere: 'N' | 'S'): Season {
  const month = Number(dateIso.slice(5, 7));
  const northernSeason = northernSeasonForMonth(month);
  return hemisphere === 'N' ? northernSeason : SOUTHERN_FLIP[northernSeason];
}

export const SEASON_BLURBS: Record<Season, string> = {
  Winter: 'Cold, occasional snow',
  Spring: 'Mild, occasional rain',
  Summer: 'Warm to hot',
  Fall: 'Cool, crisp air'
};

export interface DestinationPreviewEntry {
  code: string;
  currency: { code: string; name: string };
  utcOffsetHours: number;
  season: Season;
  seasonBlurb: string;
}

export function computeDestinationPreview(trip: Trip): DestinationPreviewEntry[] {
  const entries: DestinationPreviewEntry[] = [];
  for (const code of trip.countries) {
    const reference = COUNTRY_REFERENCE[code];
    if (!reference) continue;
    const season = getHemisphereAwareSeason(trip.startDate, reference.hemisphere);
    entries.push({
      code,
      currency: reference.currency,
      utcOffsetHours: reference.utcOffsetHours,
      season,
      seasonBlurb: SEASON_BLURBS[season]
    });
  }
  return entries;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/destinationPreview.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (all existing tests plus Task 1's 6 tests and this task's 9 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/destinationPreview.ts src/lib/destinationPreview.test.ts
git commit -m "feat: add hemisphere-aware season computation and destination preview logic"
```

---

### Task 3: `DestinationPreview.svelte` + trip hub wiring

**Files:**
- Create: `src/lib/components/DestinationPreview.svelte`
- Modify: `src/routes/trips/[id]/+page.svelte`

**Interfaces:**
- Consumes: `computeDestinationPreview` from `$lib/destinationPreview` (Task 2); `CountryInfo`, `loadWorldCountries` from `$lib/countries`; `Trip` from `$lib/types`.
- Produces: `DestinationPreview.svelte` with props `{ trip: Trip; countries: CountryInfo[] }` — nothing consumed by later tasks, this is the final task.

- [ ] **Step 1: Create the component**

Create `src/lib/components/DestinationPreview.svelte`:

```svelte
<script lang="ts">
  import { computeDestinationPreview } from '$lib/destinationPreview';
  import type { Trip } from '$lib/types';
  import type { CountryInfo } from '$lib/countries';

  let { trip, countries }: { trip: Trip; countries: CountryInfo[] } = $props();

  let entries = $derived(computeDestinationPreview(trip));
  let countryNames = $derived(new Map(countries.map((c) => [c.code, c.name])));

  function formatUtcOffset(hours: number): string {
    const sign = hours < 0 ? '-' : '+';
    const abs = Math.abs(hours);
    const wholeHours = Math.floor(abs);
    const minutes = Math.round((abs - wholeHours) * 60);
    if (minutes === 0) return `UTC${sign}${wholeHours}`;
    return `UTC${sign}${wholeHours}:${String(minutes).padStart(2, '0')}`;
  }
</script>

{#if entries.length > 0}
  <div class="mt-6 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
    {#each entries as entry (entry.code)}
      <div class="rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
        <h3 class="font-display text-base font-bold">{countryNames.get(entry.code) ?? entry.code}</h3>
        <dl class="mt-2 space-y-1 text-sm text-[var(--color-ink-soft)]">
          <div class="flex justify-between gap-2">
            <dt>Currency</dt>
            <dd class="text-right text-[var(--color-ink)]">{entry.currency.code} &middot; {entry.currency.name}</dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt>Timezone</dt>
            <dd class="text-right text-[var(--color-ink)]">{formatUtcOffset(entry.utcOffsetHours)}</dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt>Season</dt>
            <dd class="text-right text-[var(--color-ink)]">{entry.season} &middot; {entry.seasonBlurb}</dd>
          </div>
        </dl>
      </div>
    {/each}
  </div>
{/if}
```

- [ ] **Step 2: Wire it into the trip hub**

In `src/routes/trips/[id]/+page.svelte`, replace:

```ts
  import { getTrip, listJournalEntries, addJournalEntry, deleteTripCascade } from '$lib/storage/storage';
```

with:

```ts
  import { getTrip, listJournalEntries, addJournalEntry, deleteTripCascade } from '$lib/storage/storage';
  import { loadWorldCountries, type CountryInfo } from '$lib/countries';
  import DestinationPreview from '$lib/components/DestinationPreview.svelte';
```

Replace:

```ts
  let tripId = $derived(page.params.id);
  let trip: Trip | undefined = $state();
```

with:

```ts
  let tripId = $derived(page.params.id);
  let trip: Trip | undefined = $state();
  let countries: CountryInfo[] = $state([]);
```

Replace:

```ts
  onMount(async () => {
    trip = getTrip(tripId);
    await loadEntries();
  });
```

with:

```ts
  onMount(async () => {
    trip = getTrip(tripId);
    countries = await loadWorldCountries();
    await loadEntries();
  });
```

Replace:

```svelte
  </header>

  <nav class="mt-6 flex gap-1 border-b border-[var(--color-card-border)]">
```

with:

```svelte
  </header>

  <DestinationPreview {trip} {countries} />

  <nav class="mt-6 flex gap-1 border-b border-[var(--color-card-border)]">
```

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions — this task adds no new automated tests, matching this project's convention of manual browser verification for page-level display UI)

- [ ] **Step 4: Manually verify in the browser**

Start the dev server, open an existing trip's hub page, and confirm:
- A card renders per country in the trip, above the tab navigation, visible regardless of which tab is active.
- Each card shows the country name, currency (code + name), timezone (formatted as `UTC+9` or `UTC+5:30` for a fractional-offset country), and season + blurb.
- A trip with a country in each hemisphere shows an intuitively-correct season for both (e.g. a July-dated trip shows Summer for a Northern country and Winter for a Southern one).
- Nothing renders (no broken empty box) if you inspect a hypothetical trip with zero countries — this case shouldn't be reachable through the normal UI, but confirm the component itself guards it.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/DestinationPreview.svelte src/routes/trips/\[id\]/+page.svelte
git commit -m "feat: add destination preview cards to the trip hub"
```
