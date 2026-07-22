import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider, useTheme } from '@/theme'
import {
  applyResolvedTheme,
  loadThemePreference,
  resolveTheme,
  saveThemePreference,
  THEME_STORAGE_KEY,
} from './theme'

function createMediaQuery(initialMatches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const query = {
    matches: initialMatches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (
      _type: string,
      listener: EventListenerOrEventListenerObject,
    ) => listeners.add(listener as (event: MediaQueryListEvent) => void),
    removeEventListener: (
      _type: string,
      listener: EventListenerOrEventListenerObject,
    ) => listeners.delete(listener as (event: MediaQueryListEvent) => void),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList

  return {
    query,
    change(matches: boolean) {
      Object.defineProperty(query, 'matches', {
        configurable: true,
        value: matches,
      })
      listeners.forEach((listener) =>
        listener({ matches } as MediaQueryListEvent),
      )
    },
  }
}

function ThemeProbe() {
  const { preference, resolvedTheme, setPreference } = useTheme()
  return (
    <div>
      <output>{`${preference}:${resolvedTheme}`}</output>
      <button onClick={() => setPreference('dark')} type="button">
        Dark
      </button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
  document.documentElement.style.colorScheme = ''
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('theme preference storage', () => {
  it('defaults invalid and unavailable storage to the device setting', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia')
    expect(loadThemePreference()).toBe('system')

    const unavailable = {
      getItem: () => {
        throw new Error('Storage unavailable')
      },
    } as unknown as Storage
    expect(loadThemePreference(unavailable)).toBe('system')
  })

  it('persists valid preferences and tolerates write failures', () => {
    saveThemePreference('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    const unavailable = {
      setItem: () => {
        throw new Error('Storage unavailable')
      },
    } as unknown as Storage
    expect(() => saveThemePreference('light', unavailable)).not.toThrow()
  })

  it('resolves System without changing explicit choices', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})

describe('ThemeProvider', () => {
  it('follows live device changes until an explicit preference is chosen', () => {
    const media = createMediaQuery(false)
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => media.query),
    )
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    )

    expect(screen.getByText('system:light')).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')

    act(() => media.change(true))
    expect(screen.getByText('system:dark')).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }))
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    act(() => media.change(false))
    expect(screen.getByText('dark:dark')).toBeInTheDocument()
  })

  it('synchronises a preference changed in another tab', () => {
    const media = createMediaQuery(false)
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => media.query),
    )
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    )

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: THEME_STORAGE_KEY,
          newValue: 'dark',
        }),
      )
    })

    expect(screen.getByText('dark:dark')).toBeInTheDocument()
  })

  it('updates native colour scheme and browser theme colour', () => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.append(meta)

    applyResolvedTheme('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(meta).toHaveAttribute('content', '#171717')

    meta.remove()
  })
})
