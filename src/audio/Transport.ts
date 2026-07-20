import { AUDIO_SCHEDULER, COUNT_IN_BARS } from '@/config'
import {
  generateBeatGrid,
  PPQ,
  tickToSeconds,
  ticksPerBar,
  type Exercise,
} from '@/model'
import { AudioLockedError, SamplesNotLoadedError } from './SamplePlayer'
import type {
  AudioVoice,
  PlaybackLayer,
  ScheduledVoice,
  TransportVoicePlayer,
} from './types'

export type TransportMode = 'attempt' | 'playback' | 'layered'
export type TransportPhase = 'idle' | 'countIn' | 'exercise' | 'ended'
export type ScheduleKind =
  'countInClick' | 'exerciseClick' | 'note' | 'studentHit'

export interface ScheduleInfo {
  kind: ScheduleKind
  voice: AudioVoice
  /** Integer tick relative to the exercise start; count-in ticks are negative. */
  tick: number
  audioTime: number
  bar: number
  beat?: number
  layer?: PlaybackLayer
}

export interface RecordedHit {
  voice: Exercise['events'][number]['voice']
  /** Hit time from the start of the count-in. */
  timeMs: number
}

export interface CountInBeatInfo {
  beat: number
  tick: number
  audioTime: number
}

export interface ExerciseBoundaryInfo {
  audioTime: number
  tick: number
}

export interface TransportCallbacks {
  onCountInBeat?: (info: CountInBeatInfo) => void
  onExerciseStart?: (info: ExerciseBoundaryInfo) => void
  onExerciseEnd?: (info: ExerciseBoundaryInfo) => void
  onSchedule?: (info: ScheduleInfo) => void
  onError?: (error: unknown) => void
}

export interface TransportTiming {
  countInStartTime: number
  exerciseStartTime: number
  exerciseEndTime: number
  exerciseTicks: number
  tempo: number
  /** May extend slightly for a late recorded hit in layered playback. */
  playbackEndTime: number
}

export interface TransportPosition {
  phase: TransportPhase
  audioTime: number
  exerciseTick: number
}

export interface SchedulerTimer {
  start(callback: () => void, intervalMs: number): void
  stop(): void
}

export class BrowserSchedulerTimer implements SchedulerTimer {
  private timerId: number | null = null

  start(callback: () => void, intervalMs: number): void {
    this.stop()
    // This timer only wakes the lookahead. It never determines a sound's time.
    this.timerId = window.setInterval(callback, intervalMs)
  }

  stop(): void {
    if (this.timerId === null) return
    window.clearInterval(this.timerId)
    this.timerId = null
  }
}

type PlannedEvent = ScheduleInfo

interface PlannedCallback {
  audioTime: number
  run: () => void
}

function signedTickToSeconds(tick: number, tempo: number): number {
  return (tick / PPQ) * (60 / tempo)
}

/**
 * Schedules buffers against AudioContext.currentTime in a rolling lookahead.
 * Browser timer jitter can wake this class late without moving already-booked
 * sounds, which is the key separation in the two-clocks scheduling pattern.
 */
export class Transport {
  private callbacks: TransportCallbacks = {}
  private callbackQueue: PlannedCallback[] = []
  private eventQueue: PlannedEvent[] = []
  private nextCallbackIndex = 0
  private nextEventIndex = 0
  private running = false
  private scheduledEvents: ScheduleInfo[] = []
  private scheduledVoices: ScheduledVoice[] = []
  private timing: TransportTiming | null = null
  private readonly player: TransportVoicePlayer
  private readonly timer: SchedulerTimer

  constructor(
    player: TransportVoicePlayer,
    timer: SchedulerTimer = new BrowserSchedulerTimer(),
  ) {
    this.player = player
    this.timer = timer
  }

  get isRunning(): boolean {
    return this.running
  }

  start(
    exercise: Exercise,
    mode: TransportMode = 'attempt',
    callbacks: TransportCallbacks = {},
    recordedHits: readonly RecordedHit[] = [],
  ): TransportTiming {
    if (!this.player.isUnlocked) throw new AudioLockedError()
    if (!this.player.isReady) throw new SamplesNotLoadedError()

    this.stop()
    this.callbacks = callbacks
    this.scheduledEvents = []
    this.scheduledVoices = []
    this.nextCallbackIndex = 0
    this.nextEventIndex = 0

    const barTicks = ticksPerBar(exercise.timeSignature)
    const countInTicks = barTicks * COUNT_IN_BARS
    const exerciseTicks = barTicks * exercise.bars
    const exerciseStartTime =
      this.player.currentTime +
      AUDIO_SCHEDULER.startDelaySeconds +
      tickToSeconds(countInTicks, exercise.tempo)

    const exerciseEndTime =
      exerciseStartTime + tickToSeconds(exerciseTicks, exercise.tempo)
    const countInStartTime =
      exerciseStartTime - tickToSeconds(countInTicks, exercise.tempo)
    const finalRecordedHitTime = recordedHits.reduce(
      (latest, hit) => Math.max(latest, countInStartTime + hit.timeMs / 1_000),
      exerciseEndTime,
    )
    const playbackEndTime =
      mode === 'layered'
        ? Math.max(exerciseEndTime, finalRecordedHitTime + 0.05)
        : exerciseEndTime

    this.timing = {
      countInStartTime,
      exerciseStartTime,
      exerciseEndTime,
      exerciseTicks,
      tempo: exercise.tempo,
      playbackEndTime,
    }

    this.eventQueue = this.buildEventQueue(
      exercise,
      mode,
      this.timing,
      countInTicks,
      barTicks,
      recordedHits,
    )
    this.callbackQueue = this.buildCallbackQueue(
      exercise,
      this.timing,
      countInTicks,
      playbackEndTime,
    )
    this.running = true

    this.pump()
    this.timer.start(() => this.pumpSafely(), AUDIO_SCHEDULER.intervalMs)
    return this.timing
  }

  startLayered(
    exercise: Exercise,
    recordedHits: readonly RecordedHit[],
    callbacks: TransportCallbacks = {},
  ): TransportTiming {
    return this.start(exercise, 'layered', callbacks, recordedHits)
  }

  stop(): void {
    this.timer.stop()
    this.scheduledVoices.forEach((voice) => voice.stop())
    this.scheduledVoices = []
    this.running = false
    this.timing = null
  }

  getScheduledEvents(): readonly ScheduleInfo[] {
    return this.scheduledEvents
  }

  getPosition(): TransportPosition {
    const audioTime = this.player.currentTime
    if (!this.timing) return { phase: 'idle', audioTime, exerciseTick: 0 }

    const exerciseTick =
      ((audioTime - this.timing.exerciseStartTime) * this.timing.tempo * PPQ) /
      60

    if (audioTime < this.timing.exerciseStartTime) {
      return { phase: 'countIn', audioTime, exerciseTick }
    }
    if (audioTime < this.timing.exerciseEndTime) {
      return { phase: 'exercise', audioTime, exerciseTick }
    }
    return {
      phase: 'ended',
      audioTime,
      exerciseTick: this.timing.exerciseTicks,
    }
  }

  private buildEventQueue(
    exercise: Exercise,
    mode: TransportMode,
    timing: TransportTiming,
    countInTicks: number,
    barTicks: number,
    recordedHits: readonly RecordedHit[],
  ): PlannedEvent[] {
    const countInClicks = generateBeatGrid(
      exercise.timeSignature,
      COUNT_IN_BARS,
    ).map((countInTick, index): PlannedEvent => {
      const tick = countInTick - countInTicks
      const beat = (index % exercise.timeSignature.beats) + 1
      return {
        kind: 'countInClick',
        voice: beat === 1 ? 'clickAccent' : 'clickRegular',
        tick,
        audioTime:
          timing.exerciseStartTime + signedTickToSeconds(tick, exercise.tempo),
        bar: Math.floor(countInTick / barTicks) - COUNT_IN_BARS,
        beat,
      }
    })

    const exerciseClicks = generateBeatGrid(
      exercise.timeSignature,
      exercise.bars,
    ).map((tick, index): PlannedEvent => {
      const beat = (index % exercise.timeSignature.beats) + 1
      return {
        kind: 'exerciseClick',
        voice: beat === 1 ? 'clickAccent' : 'clickRegular',
        tick,
        audioTime:
          timing.exerciseStartTime + tickToSeconds(tick, exercise.tempo),
        bar: Math.floor(tick / barTicks),
        beat,
      }
    })

    const notes =
      mode === 'playback' || mode === 'layered'
        ? exercise.events.map((event): PlannedEvent => ({
            kind: 'note',
            voice: event.voice,
            tick: event.tick,
            audioTime:
              timing.exerciseStartTime +
              tickToSeconds(event.tick, exercise.tempo),
            bar: Math.floor(event.tick / barTicks),
            layer: 'correct',
          }))
        : []

    const studentHits =
      mode === 'layered'
        ? recordedHits.map((hit): PlannedEvent => {
            const exerciseRelativeTimeMs =
              hit.timeMs -
              (timing.exerciseStartTime - timing.countInStartTime) * 1_000
            return {
              kind: 'studentHit',
              voice: hit.voice,
              tick:
                (exerciseRelativeTimeMs / 1_000) * (exercise.tempo / 60) * PPQ,
              audioTime: timing.countInStartTime + hit.timeMs / 1_000,
              bar: Math.max(
                0,
                Math.floor(
                  ((exerciseRelativeTimeMs / 1_000) *
                    (exercise.tempo / 60) *
                    PPQ) /
                    barTicks,
                ),
              ),
              layer: 'student',
            }
          })
        : []

    return [...countInClicks, ...exerciseClicks, ...notes, ...studentHits].sort(
      (left, right) => left.audioTime - right.audioTime,
    )
  }

  private buildCallbackQueue(
    exercise: Exercise,
    timing: TransportTiming,
    countInTicks: number,
    playbackEndTime: number,
  ): PlannedCallback[] {
    const countInCallbacks = generateBeatGrid(
      exercise.timeSignature,
      COUNT_IN_BARS,
    ).map((countInTick, index): PlannedCallback => {
      const tick = countInTick - countInTicks
      const info = {
        beat: (index % exercise.timeSignature.beats) + 1,
        tick,
        audioTime:
          timing.exerciseStartTime + signedTickToSeconds(tick, exercise.tempo),
      }
      return {
        audioTime: info.audioTime,
        run: () => this.callbacks.onCountInBeat?.(info),
      }
    })

    return [
      ...countInCallbacks,
      {
        audioTime: timing.exerciseStartTime,
        run: () =>
          this.callbacks.onExerciseStart?.({
            audioTime: timing.exerciseStartTime,
            tick: 0,
          }),
      },
      {
        audioTime: playbackEndTime,
        run: () => this.completeNaturally(playbackEndTime),
      },
    ].sort((left, right) => left.audioTime - right.audioTime)
  }

  private pumpSafely(): void {
    try {
      this.pump()
    } catch (error) {
      this.stop()
      this.callbacks.onError?.(error)
    }
  }

  private pump(): void {
    if (!this.running) return

    const now = this.player.currentTime
    const horizon = now + AUDIO_SCHEDULER.lookaheadSeconds

    while (
      this.nextEventIndex < this.eventQueue.length &&
      this.eventQueue[this.nextEventIndex].audioTime < horizon
    ) {
      const event = this.eventQueue[this.nextEventIndex]
      const scheduledVoice = this.player.playAt(event.voice, event.audioTime, {
        layer: event.layer,
      })
      this.scheduledVoices.push(scheduledVoice)
      this.scheduledEvents.push(event)
      this.callbacks.onSchedule?.(event)
      this.nextEventIndex += 1
    }

    while (
      this.running &&
      this.nextCallbackIndex < this.callbackQueue.length &&
      this.callbackQueue[this.nextCallbackIndex].audioTime <= now
    ) {
      const callback = this.callbackQueue[this.nextCallbackIndex]
      this.nextCallbackIndex += 1
      callback.run()
    }
  }

  private completeNaturally(playbackEndTime: number): void {
    if (!this.timing) return
    const endInfo = {
      audioTime: playbackEndTime,
      tick: this.timing.exerciseTicks,
    }
    this.timer.stop()
    this.running = false
    this.scheduledVoices = []
    this.callbacks.onExerciseEnd?.(endInfo)
  }
}
