import { StrictMode } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayPage } from './PlayPage'

const audio = vi.hoisted(() => {
  let state: AudioContextState = 'suspended'
  const close = vi.fn(() => {
    state = 'closed'
    return Promise.resolve()
  })
  const context = {
    get currentTime() {
      return 0
    },
    get state() {
      return state
    },
    close,
  }

  return {
    close,
    context,
    reset() {
      state = 'suspended'
      close.mockClear()
    },
    unlock() {
      state = 'running'
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
    start() {
      return {
        countInStartTime: 0.05,
        exerciseStartTime: 3.383,
        exerciseEndTime: 6.716,
        exerciseTicks: 1_920,
        tempo: 72,
      }
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
  audio.reset()
  inputs.reset()
})

describe('Play Along page lifecycle', () => {
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

    await user.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() =>
      expect(
        screen.getByText('Get ready — input starts after four.'),
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
    const keyboardBeforeStart = [...inputs.keyboard]
    const touchBeforeStart = [...inputs.touch]

    expect(keyboardBeforeStart).toHaveLength(1)
    expect(touchBeforeStart).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() =>
      expect(
        screen.getByText('Get ready — input starts after four.'),
      ).toBeInTheDocument(),
    )

    expect(inputs.keyboard).toEqual(keyboardBeforeStart)
    expect(inputs.touch).toEqual(touchBeforeStart)

    view.unmount()
  })
})
