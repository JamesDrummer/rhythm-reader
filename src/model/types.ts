export const PPQ = 480

export const VOICES = ['kick', 'snare', 'hihat'] as const

export type Voice = (typeof VOICES)[number]

export interface TimeSignature {
  beats: number
  beatValue: number
  grouping?: number[]
}

export interface NoteEvent {
  voice: Voice
  tick: number
  duration: number
  tuplet?: {
    num: number
    den: number
  }
}

export type Tier = 'beginner' | 'intermediate' | 'advanced'

export type ExerciseMode = 'playAlong' | 'memorise'

export interface Exercise {
  id: string
  title: string
  tempo: number
  timeSignature: TimeSignature
  bars: number
  events: NoteEvent[]
  tier: Tier
  listenFirstAllowed: boolean
  modes: ExerciseMode[]
}
