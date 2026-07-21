const STORAGE_KEY = 'trailune:theme';
const DEFAULT_THEME = 'travel-journal';

export interface ThemePreset {
  id: string;
  name: string;
}

export const THEMES: readonly ThemePreset[] = [
  { id: 'travel-journal', name: 'Travel Journal' },
  { id: 'explorer-night', name: 'Explorer Night' },
  { id: 'golden-sunset', name: 'Golden Sunset' },
  { id: 'polar-morning', name: 'Polar Morning' }
];

function isValidTheme(id: string): boolean {
  return THEMES.some((theme) => theme.id === id);
}

export function getStoredTheme(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && isValidTheme(stored)) return stored;
  return DEFAULT_THEME;
}

export function setStoredTheme(id: string): void {
  localStorage.setItem(STORAGE_KEY, id);
}

export function applyTheme(id: string): void {
  document.documentElement.setAttribute('data-theme', id);
  setStoredTheme(id);
}
