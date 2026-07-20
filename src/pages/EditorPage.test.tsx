import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BuiltInSource,
  CustomSource,
  MergedExerciseSource,
  serialiseLibrary,
} from '@/content'
import type { Level } from '@/model'
import { LocalStorageProgressStore } from '@/progress'
import { AppServicesProvider, type AppServices } from '@/services/AppServices'
import { EditorPage } from './EditorPage'

vi.mock('@/notation', () => ({
  Notation: ({ exercise }: { exercise: { title: string } }) => (
    <div aria-label={`${exercise.title} drum notation`} role="img" />
  ),
}))

const scope = { learnerId: 'editor-page-test' }

function services(): AppServices {
  const customSource = new CustomSource(localStorage)
  return {
    catalogueScope: scope,
    customExerciseSource: customSource,
    exerciseSource: new MergedExerciseSource([
      new BuiltInSource(),
      customSource,
    ]),
    progressScope: scope,
    progressStore: new LocalStorageProgressStore(localStorage),
  }
}

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('Exercise editor', () => {
  it('saves a two-bar mixed binary and triplet exercise with both modes', async () => {
    const user = userEvent.setup()
    const appServices = services()
    render(
      <AppServicesProvider value={appServices}>
        <MemoryRouter>
          <EditorPage />
        </MemoryRouter>
      </AppServicesProvider>,
    )

    await user.type(screen.getByLabelText('Exercise title'), 'Mixed study')
    await user.selectOptions(screen.getByLabelText('Bars'), '2')
    await user.selectOptions(
      screen.getByLabelText('Bar 1, beat 2 resolution'),
      'tripletEighth',
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Kick, bar 1, beat 1, 16ths step 2',
      }),
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Snare, bar 1, beat 2, Triplets step 2',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Save exercise' }))

    expect(
      await screen.findByText(/It is ready to play from the levels page/),
    ).toBeInTheDocument()
    const levels = await appServices.customExerciseSource.loadLevels(scope)
    expect(levels).toHaveLength(1)
    expect(levels[0].custom).toBe(true)
    expect(levels[0].exercises[0]).toMatchObject({
      title: 'Mixed study',
      bars: 2,
      modes: ['playAlong', 'memorise'],
      events: [
        { voice: 'kick', tick: 120, duration: 120 },
        {
          voice: 'snare',
          tick: 640,
          duration: 160,
          tuplet: { num: 3, den: 2 },
        },
      ],
    })
    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: 'Play Mixed study' }),
      ).toBeInTheDocument(),
    )
  })

  it('imports built-in-compatible JSON into the custom library', async () => {
    const user = userEvent.setup()
    const appServices = services()
    const importedLevel: Level = {
      id: 'custom-imported-level',
      title: 'Imported level',
      description: 'Restored from a backup.',
      order: 100,
      exercises: [
        {
          id: 'custom-imported-exercise',
          title: 'Imported rhythm',
          tempo: 68,
          timeSignature: { beats: 4, beatValue: 4 },
          bars: 1,
          events: [{ voice: 'snare', tick: 0, duration: 120 }],
          tier: 'beginner',
          listenFirstAllowed: true,
          modes: ['playAlong', 'memorise'],
        },
      ],
    }
    render(
      <AppServicesProvider value={appServices}>
        <MemoryRouter>
          <EditorPage />
        </MemoryRouter>
      </AppServicesProvider>,
    )
    const json = serialiseLibrary([importedLevel])
    const file = new File([json], 'library.json', {
      type: 'application/json',
    })
    Object.defineProperty(file, 'text', {
      value: () => Promise.resolve(json),
    })

    await user.upload(screen.getByLabelText('Import JSON'), file)

    expect(
      await screen.findByText('Imported 1 custom exercise.'),
    ).toBeInTheDocument()
    expect(await appServices.customExerciseSource.loadLevels(scope)).toEqual([
      { ...importedLevel, custom: true },
    ])
  })
})
