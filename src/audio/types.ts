import type { Voice } from '@/model'

export const CLICK_VOICES = ['clickAccent', 'clickRegular'] as const

export type ClickVoice = (typeof CLICK_VOICES)[number]
export type AudioVoice = Voice | ClickVoice

export interface ScheduledVoice {
  stop(): void
}

export type PlaybackLayer = 'correct' | 'student'

export interface PlayAtOptions {
  layer?: PlaybackLayer
}

export interface TransportVoicePlayer {
  readonly currentTime: number
  readonly isReady: boolean
  readonly isUnlocked: boolean
  playAt(
    voice: AudioVoice,
    time: number,
    options?: PlayAtOptions,
  ): ScheduledVoice
}
