export type ThemeMode = 'light' | 'dark';
export type FontSizeMode = 'sm' | 'md' | 'lg';

const THEME_STORAGE_KEY = 'tjr_theme_mode';
const FONT_STORAGE_KEY = 'tjr_font_size';

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  return saved === 'dark' ? 'dark' : 'light';
}

export function getStoredFontSize(): FontSizeMode {
  if (typeof window === 'undefined') return 'md';
  const saved = localStorage.getItem(FONT_STORAGE_KEY);
  if (saved === 'sm' || saved === 'lg') return saved;
  return 'md';
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem(THEME_STORAGE_KEY, mode);

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', mode === 'dark' ? '#121212' : '#a90008');
  }
}

export function applyFontSize(size: FontSizeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-font-size', size);
  localStorage.setItem(FONT_STORAGE_KEY, size);
}

export function initAppearance() {
  applyTheme(getStoredTheme());
  applyFontSize(getStoredFontSize());
}
