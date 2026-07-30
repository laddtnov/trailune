export interface GlobeCountryFeature {
  type: 'Feature';
  properties: Record<string, unknown> & { ISO_A2: string };
  geometry: { type: string; coordinates: unknown };
}

const ISO_A2_OVERRIDES: Record<string, string> = {
  France: 'FR',
  Norway: 'NO'
};

export async function loadGlobeCountries(): Promise<GlobeCountryFeature[]> {
  const res = await fetch('/world-countries.geojson');
  const data = await res.json();

  return (data.features as GlobeCountryFeature[])
    .map((feature) => {
      const name = feature.properties.NAME as string | undefined;
      const override = name ? ISO_A2_OVERRIDES[name] : undefined;
      if (!override) return feature;
      return { ...feature, properties: { ...feature.properties, ISO_A2: override } };
    })
    .filter((feature) => /^[A-Z]{2}$/.test(feature.properties.ISO_A2))
    .filter((feature) => feature.properties.ISO_A2 !== 'AQ');
}

export function getFeatureCode(feature: GlobeCountryFeature): string {
  return feature.properties.ISO_A2;
}
