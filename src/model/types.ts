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
  notationSystems?: 1 | 2
  tier: Tier
  listenFirstAllowed: boolean
  modes: ExerciseMode[]
}

export interface Level {
  id: string
  title: string
  description: string
  order: number
  guide?: Array<{
    text: string
    example?: {
      bars: 1 | 2
      events: NoteEvent[]
      notationSystems?: 1 | 2
    }
  }>
  exercises: Exercise[]
  /** Runtime catalogue metadata. Omitted from built-in/exported JSON. */
  custom?: boolean
}
