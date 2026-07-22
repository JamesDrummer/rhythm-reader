export const THEME_STORAGE_KEY = 'rhythm-reader:theme'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = Exclude<ThemePreference, 'system'>

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function loadThemePreference(
  storage: Storage | null = browserStorage(),
): ThemePreference {
  try {
    const stored = storage?.getItem(THEME_STORAGE_KEY)
    return isThemePreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function saveThemePreference(
  preference: ThemePreference,
  storage: Storage | null = browserStorage(),
): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Private browsing can make storage unavailable. The in-memory preference
    // still applies for the current page.
  }
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light'
  return preference
}

export function applyResolvedTheme(
  theme: ResolvedTheme,
  documentRoot = document.documentElement,
): void {
  documentRoot.dataset.theme = theme
  documentRoot.style.colorScheme = theme

  const themeColour = theme === 'dark' ? '#171717' : '#F5F5F5'
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', themeColour)
}
