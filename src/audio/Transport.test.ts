import { describe, expect, it, vi } from 'vitest'
import { AUDIO_DEMO_EXERCISE } from './demoExercise'
import { AudioLockedError } from './SamplePlayer'
import {
  Transport,
  type SchedulerTimer,
  type TransportCallbacks,
} from './Transport'
import type {
  AudioVoice,
  PlayAtOptions,
  ScheduledVoice,
  TransportVoicePlayer,
} from './types'

class ManualTimer implements SchedulerTimer {
  callback: (() => void) | null = null

  start(callback: () => void): void {
    this.callback = callback
  }

  stop(): void {
    this.callback = null
  }

  fire(): void {
    this.callback?.()
  }
}

class FakePlayer implements TransportVoicePlayer {
  currentTime = 10
  isReady = true
  isUnlocked = true
  readonly played: {
    options?: PlayAtOptions
    time: number
    voice: AudioVoice
  }[] = []

  playAt(
    voice: AudioVoice,
    time: number,
    options?: PlayAtOptions,
  ): ScheduledVoice {
    this.played.push({ voice, time, options })
    return { stop: vi.fn() }
  }
}

function runUntil(
  player: FakePlayer,
  timer: ManualTimer,
  audioTime: number,
): void {
  while (player.currentTime < audioTime) {
    player.currentTime = Math.min(player.currentTime + 0.025, audioTime)
    timer.fire()
  }
}

describe('Transport', () => {
  it('refuses to start before the audio context is unlocked', () => {
    const player = new FakePlayer()
    player.isUnlocked = false

    expect(() =>
      new Transport(player, new ManualTimer()).start(AUDIO_DEMO_EXERCISE),
    ).toThrow(AudioLockedError)
  })

  it('schedules count-in and exercise clicks without cumulative drift', () => {
    const player = new FakePlayer()
    const timer = new ManualTimer()
    const transport = new Transport(player, timer)
    const timing = transport.start(AUDIO_DEMO_EXERCISE)

    runUntil(player, timer, timing.exerciseEndTime + 0.01)

    const clicks = player.played.filter(({ voice }) =>
      voice.startsWith('click'),
    )
    expect(clicks).toHaveLength(12)
    clicks.slice(1).forEach((click, index) => {
      expect(click.time - clicks[index].time).toBeCloseTo(0.75, 10)
    })
    expect(clicks.at(-1)?.time).toBeCloseTo(
      timing.exerciseStartTime + 7 * 0.75,
      10,
    )
    expect(transport.isRunning).toBe(false)
  })

  it('emits audio-clock boundaries and only renders notes in playback mode', () => {
    const player = new FakePlayer()
    const timer = new ManualTimer()
    const callbacks: Required<
      Pick<
        TransportCallbacks,
        'onCountInBeat' | 'onExerciseStart' | 'onExerciseEnd'
      >
    > = {
      onCountInBeat: vi.fn(),
      onExerciseStart: vi.fn(),
      onExerciseEnd: vi.fn(),
    }
    const transport = new Transport(player, timer)
    const timing = transport.start(AUDIO_DEMO_EXERCISE, 'playback', callbacks)

    runUntil(player, timer, timing.exerciseEndTime + 0.01)

    expect(callbacks.onCountInBeat).toHaveBeenCalledTimes(4)
    expect(callbacks.onCountInBeat).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ beat: 1, tick: -1920 }),
    )
    expect(callbacks.onExerciseStart).toHaveBeenCalledWith({
      audioTime: timing.exerciseStartTime,
      tick: 0,
    })
    expect(callbacks.onExerciseEnd).toHaveBeenCalledWith({
      audioTime: timing.exerciseEndTime,
      tick: 3840,
    })
    expect(player.played.filter(({ voice }) => voice === 'hihat')).toHaveLength(
      AUDIO_DEMO_EXERCISE.events.filter(({ voice }) => voice === 'hihat')
        .length,
    )
    expect(player.played.filter(({ voice }) => voice === 'kick')).toHaveLength(
      AUDIO_DEMO_EXERCISE.events.filter(({ voice }) => voice === 'kick').length,
    )
    expect(player.played.filter(({ voice }) => voice === 'snare')).toHaveLength(
      AUDIO_DEMO_EXERCISE.events.filter(({ voice }) => voice === 'snare')
        .length,
    )
  })

  it('reports a fractional playhead tick from the audio clock', () => {
    const player = new FakePlayer()
    const timer = new ManualTimer()
    const transport = new Transport(player, timer)
    const timing = transport.start(AUDIO_DEMO_EXERCISE)

    player.currentTime = timing.exerciseStartTime + 0.375

    expect(transport.getPosition()).toEqual({
      phase: 'exercise',
      audioTime: player.currentTime,
      exerciseTick: 240,
    })
  })

  it('layers the correct rhythm with distinctly panned recorded hits', () => {
    const player = new FakePlayer()
    const timer = new ManualTimer()
    const transport = new Transport(player, timer)
    const timing = transport.startLayered(AUDIO_DEMO_EXERCISE, [
      { voice: 'kick', timeMs: 3_025 },
      { voice: 'snare', timeMs: 9_100 },
    ])

    runUntil(player, timer, timing.playbackEndTime + 0.01)

    const studentHits = player.played.filter(
      ({ options }) => options?.layer === 'student',
    )
    const correctHits = player.played.filter(
      ({ options }) => options?.layer === 'correct',
    )

    expect(correctHits).toHaveLength(AUDIO_DEMO_EXERCISE.events.length)
    expect(studentHits).toEqual([
      {
        voice: 'kick',
        time: timing.countInStartTime + 3.025,
        options: { layer: 'student' },
      },
      {
        voice: 'snare',
        time: timing.countInStartTime + 9.1,
        options: { layer: 'student' },
      },
    ])
    expect(timing.playbackEndTime).toBeGreaterThan(timing.exerciseEndTime)
  })
})
