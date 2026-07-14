export interface CountryInfo {
  code: string;
  name: string;
}

function resolveCountryName(title: string | undefined, dataName: string | undefined, code: string): string {
  if (title && title.length > 0) return title;
  if (dataName && dataName.length > 0) return dataName;
  return code;
}

export function parseCountriesFromSvg(svgText: string): CountryInfo[] {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const paths = Array.from(doc.querySelectorAll('path[id]'));
  return paths
    .map((path) => {
      const code = path.getAttribute('id') ?? '';
      const title = path.querySelector('title')?.textContent?.trim();
      // .dataset is intentionally not used here: this SVG is parsed as an XML
      // document (image/svg+xml), and jsdom (unlike real browsers) doesn't
      // populate .dataset for elements parsed from an XML document. Switching
      // to .dataset breaks every test in countries.test.ts (see issue #3).
      const dataName = path.getAttribute('data-name')?.trim(); // NOSONAR - see comment above
      const name = resolveCountryName(title, dataName, code);
      return { code, name };
    })
    .filter((c) => /^[A-Za-z]{2}$/.test(c.code))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadWorldCountries(): Promise<CountryInfo[]> {
  const res = await fetch('/world-map.svg');
  const svgText = await res.text();
  return parseCountriesFromSvg(svgText);
}
