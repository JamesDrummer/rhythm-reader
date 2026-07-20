import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AppRoutes } from './AppRoutes'

afterEach(cleanup)

const routes = [
  { path: '/', heading: 'Ready for your next rhythm?' },
  { path: '/play/quarter-notes', heading: 'Exercise: quarter-notes' },
  { path: '/editor', heading: 'Exercise editor' },
  { path: '/settings', heading: 'Settings' },
  { path: '/calibrate', heading: 'Latency calibration' },
] as const

describe('app routes', () => {
  it.each(routes)(
    'renders the placeholder for $path',
    async ({ heading, path }) => {
      render(
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>,
      )

      expect(
        await screen.findByRole('heading', { level: 1, name: heading }),
      ).toBeInTheDocument()
      expect(screen.getByText('Rhythm Reader')).toBeInTheDocument()
    },
  )
})
