import { StrictMode } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BUILT_IN_LEVELS } from '@/content'
import { LocalStorageProgressStore } from '@/progress'
import { PlayPage } from './PlayPage'

const audio = vi.hoisted(() => {
  let state: AudioContextState = 'suspended'
  let currentTime = 0
  const close = vi.fn(() => {
    state = 'closed'
    return Promise.resolve()
  })
  const context = {
    get currentTime() {
      return currentTime
    },
    get state() {
      return state
    },
    close,
  }

  return {
    close,
    context,
    advanceTo(time: number) {
      currentTime = time
    },
    reset() {
      state = 'suspended'
      currentTime = 0
      close.mockClear()
    },
    unlock() {
      state = 'running'
    },
  }
})

const transport = vi.hoisted(() => {
  type Callbacks = {
    onExerciseEnd?: () => void
  }
  let callbacks: Callbacks = {}

  return {
    finish() {
      callbacks.onExerciseEnd?.()
    },
    reset() {
      callbacks = {}
    },
    setCallbacks(nextCallbacks: Callbacks = {}) {
      callbacks = nextCallbacks
    },
  }
})

const inputs = vi.hoisted(() => ({
  keyboard: [] as object[],
  touch: [] as object[],
  reset() {
    this.keyboard.length = 0
    this.touch.length = 0
  },
}))

vi.mock('@/audio', () => {
  class FakeSamplePlayer {
    isUnlocked = false

    unlock() {
      audio.unlock()
      this.isUnlocked = true
      return Promise.resolve()
    }

    preload() {
      return Promise.resolve()
    }

    playNow() {}
  }

  class FakeTransport {
    start(_exercise: unknown, _mode: unknown, callbacks = {}) {
      transport.setCallbacks(callbacks)
      return {
        countInStartTime: 0.05,
        exerciseStartTime: 3.383,
        exerciseEndTime: 6.716,
        exerciseTicks: 1_920,
        tempo: 72,
        playbackEndTime: 6.716,
      }
    }

    startLayered(_exercise: unknown, _hits: unknown, callbacks = {}) {
      transport.setCallbacks(callbacks)
      return this.start(_exercise, 'layered', callbacks)
    }

    stop() {}

    getPosition() {
      return { phase: 'countIn', audioTime: 0, exerciseTick: -1_920 }
    }
  }

  return {
    createAudioContext: () => audio.context,
    SamplePlayer: FakeSamplePlayer,
    Transport: FakeTransport,
  }
})

vi.mock('@/notation', () => ({
  Notation: ({ exercise }: { exercise: { title: string } }) => (
    <div role="img" aria-label={`${exercise.title} drum notation`} />
  ),
}))

vi.mock('@/input', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/input')>()

  class FakeInputSource {
    private readonly listeners = new Set<(hit: unknown) => void>()

    start() {}

    stop() {}

    subscribe(listener: (hit: unknown) => void) {
      this.listeners.add(listener)
      return () => this.listeners.delete(listener)
    }
  }

  class FakeKeyboardInput extends FakeInputSource {
    constructor() {
      super()
      inputs.keyboard.push(this)
    }
  }

  class FakeTouchPadInput extends FakeInputSource {
    constructor() {
      super()
      inputs.touch.push(this)
    }

    pointerDown() {}
  }

  return {
    ...actual,
    KeyboardInput: FakeKeyboardInput,
    TouchPadInput: FakeTouchPadInput,
  }
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  audio.reset()
  inputs.reset()
  transport.reset()
})

async function unlockLevelTwo() {
  const store = new LocalStorageProgressStore(localStorage)
  for (const exercise of BUILT_IN_LEVELS[0].exercises) {
    await store.recordAttempt(
      { learnerId: 'local-device' },
      { exerciseId: exercise.id, accuracyPercent: 75, stars: 2 },
      BUILT_IN_LEVELS,
    )
  }
}

describe('Play Along page lifecycle', () => {
  it('blocks a direct link to an exercise in a locked level', async () => {
    render(
      <MemoryRouter initialEntries={['/play/quarter-kick-pulse']}>
        <Routes>
          <Route path="play/:exerciseId" element={<PlayPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', {
        name: 'This one is still locked.',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Earn more stars in the earlier levels to open it.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start' })).toBeNull()
  })

  it('still allows an exercise in an unlocked level to play', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/play/quarter-notes']}>
        <Routes>
          <Route path="play/:exerciseId" element={<PlayPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'Start' }))
    expect(
      await screen.findByText('Get ready. Input starts after four.'),
    ).toBeInTheDocument()
  })

  it('keeps a newly-created AudioContext open through the state update', async () => {
    const user = userEvent.setup()
    const view = render(
      <StrictMode>
        <MemoryRouter initialEntries={['/play/quarter-notes']}>
          <Routes>
            <Route path="play/:exerciseId" element={<PlayPage />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    )

    await user.click(await screen.findByRole('button', { name: 'Start' }))
    await waitFor(() =>
      expect(
        screen.getByText('Get ready. Input starts after four.'),
      ).toBeInTheDocument(),
    )

    expect(audio.close).not.toHaveBeenCalled()

    view.unmount()
    await waitFor(() => expect(audio.close).toHaveBeenCalledOnce())
  })

  it('keeps the same input source instances after creating the engine', async () => {
    const user = userEvent.setup()
    const view = render(
      <MemoryRouter initialEntries={['/play/quarter-notes']}>
        <Routes>
          <Route path="play/:exerciseId" element={<PlayPage />} />
        </Routes>
      </MemoryRouter>,
    )
    const startButton = await screen.findByRole('button', { name: 'Start' })
    const keyboardBeforeStart = [...inputs.keyboard]
    const touchBeforeStart = [...inputs.touch]

    expect(keyboardBeforeStart).toHaveLength(1)
    expect(touchBeforeStart).toHaveLength(1)

    await user.click(startButton)
    await waitFor(() =>
      expect(
        screen.getByText('Get ready. Input starts after four.'),
      ).toBeInTheDocument(),
    )

    expect(inputs.keyboard).toEqual(keyboardBeforeStart)
    expect(inputs.touch).toEqual(touchBeforeStart)

    view.unmount()
  })

  it('completes Play Along into the full results screen', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/play/quarter-notes']}>
        <Routes>
          <Route path="play/:exerciseId" element={<PlayPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'Start' }))
    await waitFor(() =>
      expect(
        screen.getByText('Get ready. Input starts after four.'),
      ).toBeInTheDocument(),
    )

    act(() => {
      audio.advanceTo(10)
      transport.finish()
    })

    await waitFor(() =>
      expect(screen.getByText('Where your hits landed')).toBeInTheDocument(),
    )
    expect(screen.getByText('Play correct + my hits')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Next exercise/ }),
    ).toBeInTheDocument()
    expect(
      localStorage.getItem('rhythm-reader:progress:v1:local-device'),
    ).toContain('quarter-notes')
  })

  it('hides the notation after Ready and completes Memorise & Perform', async () => {
    const user = userEvent.setup()
    await unlockLevelTwo()
    render(
      <MemoryRouter initialEntries={['/play/quarter-kick-pulse']}>
        <Routes>
          <Route path="play/:exerciseId" element={<PlayPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('img', {
        name: /Kick on the beat drum notation/,
      }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Memorise & Perform' }))
    await user.click(screen.getByRole('button', { name: 'Ready' }))

    await waitFor(() =>
      expect(screen.getByText('From memory…')).toBeInTheDocument(),
    )
    expect(
      screen.queryByRole('img', { name: /drum notation/ }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Perfect')).not.toBeInTheDocument()

    act(() => {
      audio.advanceTo(10)
      transport.finish()
    })

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Kick on the beat' }),
      ).toBeInTheDocument(),
    )
    expect(screen.getByText('Overall accuracy')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /^Hit timing timeline/ }),
    ).toBeInTheDocument()
  })
})
