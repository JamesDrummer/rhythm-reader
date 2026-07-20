import { describe, expect, it, vi } from 'vitest'
import {
  AudioLockedError,
  preloadSampleFiles,
  SamplePlayer,
} from './SamplePlayer'

function createAudioContext() {
  let state: AudioContextState = 'suspended'
  const starts: number[] = []
  const stops: number[] = []
  const pannerValues: { value: number }[] = []
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
    createStereoPanner: vi.fn(() => {
      const pan = { value: 0 }
      pannerValues.push(pan)
      return {
        connect: vi.fn(),
        pan,
      }
    }),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      start: (time: number) => starts.push(time),
      stop: () => stops.push(1),
    })),
  } as unknown as AudioContext

  return { context, pannerValues, starts, stops }
}

describe('SamplePlayer', () => {
  it('warms every default sample file without creating an audio context', async () => {
    const fetchSample = vi.fn(() =>
      Promise.resolve(new Response(new ArrayBuffer(8))),
    )

    await preloadSampleFiles(fetchSample)

    expect(fetchSample).toHaveBeenCalledTimes(5)
    expect(fetchSample).toHaveBeenCalledWith(
      '/audio/kick.wav',
      expect.objectContaining({ cache: 'force-cache' }),
    )
  })

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

  it('retries loading after a failed sample fetch', async () => {
    const { context } = createAudioContext()
    let shouldFail = true
    const fetchSample = vi.fn(() => {
      if (shouldFail) {
        shouldFail = false
        return Promise.reject(new TypeError('Network request failed'))
      }
      return Promise.resolve(new Response(new ArrayBuffer(8)))
    })
    const player = new SamplePlayer(context, undefined, fetchSample)

    await expect(player.preload()).rejects.toThrow('Network request failed')
    expect(player.isReady).toBe(false)

    await player.preload()

    expect(player.isReady).toBe(true)
  })

  it('places the student layer slightly to the right', async () => {
    const { context, pannerValues } = createAudioContext()
    const fetchSample = vi.fn(() =>
      Promise.resolve(new Response(new ArrayBuffer(8))),
    )
    const player = new SamplePlayer(context, undefined, fetchSample)

    await player.unlock()
    await player.preload()
    player.playAt('kick', 3, { layer: 'student' })

    expect(pannerValues[0].value).toBe(0.22)
  })
})
