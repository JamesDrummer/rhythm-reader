import type { Voice } from '@/model'

export interface InputHit {
  voice: Voice
  /** Hit time in milliseconds on the AudioContext timeline. */
  timeMs: number
}

export type InputListener = (hit: InputHit) => void

export interface InputSource {
  start(): void
  stop(): void
  subscribe(listener: InputListener): () => void
}

export interface AudioTimeline {
  readonly currentTime: number
  getOutputTimestamp?: () => AudioTimestamp
}
