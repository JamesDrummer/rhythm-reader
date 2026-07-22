import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { KEYBOARD_MAPPING_STORAGE_KEY } from '@/input'
import { ThemeProvider, THEME_STORAGE_KEY } from '@/theme'
import { SettingsPage } from './SettingsPage'

function renderSettings() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </ThemeProvider>,
  )
}

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('SettingsPage keyboard remapping', () => {
  it('ignores modifier keys and cancels remapping with Escape', async () => {
    const user = userEvent.setup()
    renderSettings()

    const snareButton = screen.getByRole('button', { name: 'Remap Snare' })
    await user.click(snareButton)
    expect(snareButton).toHaveTextContent('Press a key...')

    fireEvent.keyDown(window, { code: 'ShiftLeft', key: 'Shift' })
    expect(snareButton).toHaveTextContent('Press a key...')

    fireEvent.keyDown(window, { code: 'Escape', key: 'Escape' })
    expect(snareButton).toHaveTextContent('J')
    expect(localStorage.getItem(KEYBOARD_MAPPING_STORAGE_KEY)).toBeNull()
  })

  it('applies and retains an explicit theme preference', async () => {
    const user = userEvent.setup()
    const view = renderSettings()
    const selector = screen.getByRole('combobox', { name: 'Theme' })

    expect(selector).toHaveValue('system')
    await user.selectOptions(selector, 'dark')

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    view.unmount()
    renderSettings()
    expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveValue('dark')
  })
})
