import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { KEYBOARD_MAPPING_STORAGE_KEY } from '@/input'
import { SettingsPage } from './SettingsPage'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('SettingsPage keyboard remapping', () => {
  it('ignores modifier keys and cancels remapping with Escape', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )

    const snareButton = screen.getByRole('button', { name: 'Remap Snare' })
    await user.click(snareButton)
    expect(snareButton).toHaveTextContent('Press a key...')

    fireEvent.keyDown(window, { code: 'ShiftLeft', key: 'Shift' })
    expect(snareButton).toHaveTextContent('Press a key...')

    fireEvent.keyDown(window, { code: 'Escape', key: 'Escape' })
    expect(snareButton).toHaveTextContent('J')
    expect(localStorage.getItem(KEYBOARD_MAPPING_STORAGE_KEY)).toBeNull()
  })
})
