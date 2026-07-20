import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BUILT_IN_LEVELS, BuiltInSource } from '@/content'
import { LocalStorageProgressStore } from '@/progress'
import { AppServicesProvider, type AppServices } from '@/services/AppServices'
import { LevelSelectPage } from './LevelSelectPage'

const learner = { learnerId: 'level-page-test' }

function services(store: LocalStorageProgressStore): AppServices {
  return {
    catalogueScope: learner,
    exerciseSource: new BuiltInSource(),
    progressScope: learner,
    progressStore: store,
  }
}

function renderPage(store: LocalStorageProgressStore) {
  return render(
    <AppServicesProvider value={services(store)}>
      <MemoryRouter>
        <LevelSelectPage />
      </MemoryRouter>
    </AppServicesProvider>,
  )
}

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('LevelSelectPage', () => {
  it('shows only level one unlocked for a fresh learner', async () => {
    renderPage(new LocalStorageProgressStore(localStorage))

    const cards = await screen.findAllByRole('article')
    expect(cards).toHaveLength(6)
    expect(within(cards[0]).getByText('Unlocked')).toBeInTheDocument()
    expect(
      within(cards[0]).getAllByRole('link', { name: 'Play' }),
    ).toHaveLength(5)

    for (const card of cards.slice(1)) {
      expect(within(card).getByText('Locked')).toBeInTheDocument()
      expect(within(card).queryByRole('link', { name: 'Play' })).toBeNull()
    }
  })

  it('shows persisted stars and unlocks level two after legitimate stored results', async () => {
    const store = new LocalStorageProgressStore(localStorage)
    for (const exercise of BUILT_IN_LEVELS[0].exercises) {
      await store.recordAttempt(
        learner,
        { exerciseId: exercise.id, accuracyPercent: 78, stars: 2 },
        BUILT_IN_LEVELS,
      )
    }

    renderPage(new LocalStorageProgressStore(localStorage))
    const cards = await screen.findAllByRole('article')

    await waitFor(() =>
      expect(within(cards[1]).getByText('Unlocked')).toBeInTheDocument(),
    )
    expect(within(cards[0]).getByText('10/15 stars')).toBeInTheDocument()
    expect(
      within(cards[1]).getAllByRole('link', { name: 'Play' }),
    ).toHaveLength(5)
  })
})
