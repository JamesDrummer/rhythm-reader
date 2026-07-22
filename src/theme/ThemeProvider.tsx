import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import { ThemeContext } from './ThemeContext'
import {
  applyResolvedTheme,
  isThemePreference,
  loadThemePreference,
  resolveTheme,
  saveThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from './theme'

function darkModeQuery(): MediaQueryList | null {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] =
    useState<ThemePreference>(loadThemePreference)
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => darkModeQuery()?.matches ?? false,
  )
  const resolvedTheme = resolveTheme(preference, systemPrefersDark)

  useLayoutEffect(() => {
    applyResolvedTheme(resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    const query = darkModeQuery()
    if (!query) return

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches)
    }

    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return
      setPreferenceState(
        isThemePreference(event.newValue) ? event.newValue : 'system',
      )
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const setPreference = useCallback((next: ThemePreference) => {
    saveThemePreference(next)
    setPreferenceState(next)
  }, [])

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}
