import { describe, expect, it, vi } from 'vitest'
import { AudioLockedError, SamplePlayer } from './SamplePlayer'

function createAudioContext() {
  let state: AudioContextState = 'suspended'
  const starts: number[] = []
  const stops: number[] = []
  const buffer = {} as AudioBuffer

  const context = {
    currentTime: 2,
    destination: {},
    sampleRate: 44_100,
    get state() {
      return state
    },
    resume: vi.fn(() => {
      state = 'running'
      return Promise.resolve()
    }),
    createBuffer: vi.fn(() => buffer),
    decodeAudioData: vi.fn(() => Promise.resolve(buffer)),
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      gain: { value: 1 },
    })),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      start: (time: number) => starts.push(time),
      stop: () => stops.push(1),
    })),
  } as unknown as AudioContext

  return { context, starts, stops }
}

describe('SamplePlayer', () => {
  it('refuses playback until audio has been gesture-unlocked', async () => {
    const { context } = createAudioContext()
    const fetchSample = vi.fn(() =>
      Promise.resolve(new Response(new ArrayBuffer(8))),
    )
    const player = new SamplePlayer(context, undefined, fetchSample)

    await player.preload()

    expect(() => player.playNow('kick')).toThrow(AudioLockedError)
  })

  it('preloads once and starts voices at exact audio-context times', async () => {
    const { context, starts, stops } = createAudioContext()
    const fetchSample = vi.fn(() =>
      Promise.resolve(new Response(new ArrayBuffer(8))),
    )
    const player = new SamplePlayer(context, undefined, fetchSample)

    await player.unlock()
    await Promise.all([player.preload(), player.preload()])
    const scheduled = player.playAt('snare', 3.25)
    const immediate = player.playNow('hihat')

    expect(player.isUnlocked).toBe(true)
    expect(player.isReady).toBe(true)
    expect(fetchSample).toHaveBeenCalledTimes(5)
    expect(starts).toEqual([2, 3.25, 2])

    scheduled.stop()
    scheduled.stop()
    immediate.stop()
    expect(stops).toHaveLength(2)
  })
})
