import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  BUILT_IN_LEVELS,
  BuiltInSource,
  CustomSource,
  type ExerciseSource,
} from '@/content'
import type { Level } from '@/model'
import { LocalStorageProgressStore, type ProgressStore } from '@/progress'
import { AppServicesProvider, type AppServices } from '@/services/AppServices'
import { LevelDetailPage } from './LevelDetailPage'

const learner = { learnerId: 'level-detail-test' }

function services(
  store: ProgressStore,
  source: ExerciseSource = new BuiltInSource(),
): AppServices {
  return {
    catalogueScope: learner,
    customExerciseSource: new CustomSource(localStorage),
    exerciseSource: source,
    progressScope: learner,
    progressStore: store,
  }
}

function renderPage(
  levelId: string,
  store: ProgressStore = new LocalStorageProgressStore(localStorage),
  source?: ExerciseSource,
) {
  return render(
    <AppServicesProvider value={services(store, source)}>
      <MemoryRouter initialEntries={[`/levels/${levelId}`]}>
        <Routes>
          <Route path="/levels/:levelId" element={<LevelDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AppServicesProvider>,
  )
}

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('LevelDetailPage', () => {
  it('shows every exercise and Play action for an unlocked level', async () => {
    const level = BUILT_IN_LEVELS[0]
    renderPage(level.id)

    expect(
      await screen.findByRole('heading', { level: 1, name: level.title }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Play' })).toHaveLength(5)
    expect(
      screen.getByText(`1. ${level.exercises[0].title}`),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Listen First')).not.toHaveLength(0)
    expect(screen.getByRole('progressbar')).toHaveClass(
      'col-start-1',
      'row-start-2',
    )
    expect(
      screen.getByRole('link', { name: 'Back to all levels' }),
    ).toHaveAttribute('href', `/#level-${level.id}`)
  })

  it('previews a locked level and keeps historical results visible', async () => {
    const level = BUILT_IN_LEVELS[1]
    const store = new LocalStorageProgressStore(localStorage)
    await store.recordAttempt(
      learner,
      {
        exerciseId: level.exercises[0].id,
        accuracyPercent: 92,
        stars: 3,
      },
      BUILT_IN_LEVELS,
    )

    renderPage(level.id, store)

    expect(
      await screen.findByRole('heading', { level: 1, name: level.title }),
    ).toBeInTheDocument()
    expect(screen.getByText('Locked')).toBeInTheDocument()
    expect(
      screen.getByText(`1. ${level.exercises[0].title}`),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Play' })).toBeNull()
    expect(screen.getByText('3/15 stars')).toBeInTheDocument()
    expect(screen.getByLabelText('3 out of 3 stars')).toBeInTheDocument()
    expect(screen.getByText(/Complete all 5 exercises/)).toHaveTextContent(
      'collect at least 10 stars there to unlock it',
    )
  })

  it('shows a reading guide and engraves its key on a locked preview', async () => {
    const guidedLevel: Level = {
      ...BUILT_IN_LEVELS[1],
      guide: [
        {
          text: 'Count four steady beats and read the snare on beats one and three.',
          key: [
            {
              label: 'Quarter-note snare',
              bars: 1,
              events: [{ voice: 'snare', tick: 0, duration: 480 }],
              notationSystems: 1,
              noteLabels: [{ eventIndex: 0, text: 'Beat one' }],
              counts: [{ tick: 0, text: '1' }],
            },
          ],
        },
      ],
    }
    const source: ExerciseSource = {
      loadLevels: () => Promise.resolve([BUILT_IN_LEVELS[0], guidedLevel]),
    }

    renderPage(guidedLevel.id, undefined, source)

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'How to read this level',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(guidedLevel.guide![0].text)).toBeInTheDocument()
    expect(screen.getByText('Locked')).toBeInTheDocument()
    expect(screen.getByText('Quarter-note snare')).toBeInTheDocument()
    expect(screen.getByText('Beat one')).toBeInTheDocument()
    const keyNotation = screen.getByRole('img', {
      name: 'Quarter-note snare notation',
    })
    expect(
      keyNotation.querySelector('[data-note-label-index="0"]'),
    ).toBeInTheDocument()
    expect(
      keyNotation.querySelector('[data-count-tick="0"]'),
    ).toHaveTextContent('1')
  })

  it('does not show a reading guide card when the level has no guide', async () => {
    const levelWithoutGuide: Level = {
      ...BUILT_IN_LEVELS[0],
      guide: undefined,
    }
    const source: ExerciseSource = {
      loadLevels: () => Promise.resolve([levelWithoutGuide]),
    }
    renderPage(levelWithoutGuide.id, undefined, source)

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: levelWithoutGuide.title,
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        level: 2,
        name: 'How to read this level',
      }),
    ).toBeNull()
  })

  it('loads custom levels through the configured exercise source', async () => {
    const customLevel: Level = {
      ...BUILT_IN_LEVELS[0],
      custom: true,
      id: 'custom-reading-level',
      order: 100,
      title: 'My custom reading level',
      exercises: BUILT_IN_LEVELS[0].exercises.map((exercise, index) => ({
        ...exercise,
        id: `custom-reading-${index + 1}`,
      })),
    }
    const source: ExerciseSource = {
      loadLevels: () => Promise.resolve([customLevel]),
    }

    renderPage(customLevel.id, undefined, source)

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: customLevel.title,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Custom level')).toBeInTheDocument()
    expect(screen.getByText('Unlocked')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Play' })).toHaveLength(5)
  })

  it('waits for the catalogue before deciding that a level is missing', async () => {
    let resolveLevels: ((levels: readonly Level[]) => void) | undefined
    const source: ExerciseSource = {
      loadLevels: () =>
        new Promise((resolve) => {
          resolveLevels = resolve
        }),
    }

    renderPage('eventual-level', undefined, source)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Loading level' }),
    ).toBeInTheDocument()

    const eventualLevel: Level = {
      ...BUILT_IN_LEVELS[0],
      id: 'eventual-level',
      title: 'Eventually loaded',
    }
    resolveLevels?.([eventualLevel])

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: eventualLevel.title,
      }),
    ).toBeInTheDocument()
  })

  it('shows friendly missing and progress-error states', async () => {
    const missing = renderPage('missing-level')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Level not found' }),
    ).toBeInTheDocument()
    missing.unmount()

    const failingStore: ProgressStore = {
      load: () => Promise.reject(new Error('Unavailable')),
      recordAttempt: () => Promise.reject(new Error('Unavailable')),
    }
    renderPage(BUILT_IN_LEVELS[0].id, failingStore)
    const alert = await screen.findByText(
      'Your saved progress could not be loaded.',
    )
    expect(
      within(alert.closest('section')!).getByText('Unlocked'),
    ).toBeInTheDocument()
  })
})
