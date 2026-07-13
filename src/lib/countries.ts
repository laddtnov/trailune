export interface CountryInfo {
  code: string;
  name: string;
}

export function parseCountriesFromSvg(svgText: string): CountryInfo[] {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const paths = Array.from(doc.querySelectorAll('path[id]'));
  return paths
    .map((path) => {
      const code = path.getAttribute('id') ?? '';
      const title = path.querySelector('title')?.textContent?.trim();
      const dataName = path.getAttribute('data-name')?.trim();
      const name =
        title && title.length > 0
          ? title
          : dataName && dataName.length > 0
            ? dataName
            : code;
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
