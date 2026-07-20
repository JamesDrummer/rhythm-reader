import { PPQ, assertValidExercise, type Exercise } from '@/model'

const quarterNotes: Exercise = {
  id: 'quarter-notes',
  title: 'Quarter note pulse',
  tempo: 72,
  timeSignature: { beats: 4, beatValue: 4 },
  bars: 1,
  events: [0, 480, 960, 1_440].map((tick) => ({
    voice: 'snare' as const,
    tick,
    duration: PPQ,
  })),
  notationSystems: 2,
  tier: 'beginner',
  listenFirstAllowed: true,
  modes: ['playAlong'],
}

const eighthNoteBackbeat: Exercise = {
  id: 'eighth-note-backbeat',
  title: 'Eighth-note backbeat',
  tempo: 78,
  timeSignature: { beats: 4, beatValue: 4 },
  bars: 1,
  events: [
    ...[0, 240, 480, 720, 960, 1_200, 1_440, 1_680].map((tick) => ({
      voice: 'hihat' as const,
      tick,
      duration: PPQ / 2,
    })),
    ...[480, 1_440].map((tick) => ({
      voice: 'snare' as const,
      tick,
      duration: PPQ / 2,
    })),
    ...[0, 960].map((tick) => ({
      voice: 'kick' as const,
      tick,
      duration: PPQ / 2,
    })),
  ],
  notationSystems: 1,
  tier: 'beginner',
  listenFirstAllowed: true,
  modes: ['playAlong'],
}

const syncopationStarter: Exercise = {
  id: 'syncopation-starter',
  title: 'Syncopation starter',
  tempo: 84,
  timeSignature: { beats: 4, beatValue: 4 },
  bars: 2,
  events: [
    ...[0, 240, 480, 720, 960, 1_200, 1_440, 1_680].map((tick) => ({
      voice: 'hihat' as const,
      tick,
      duration: PPQ / 2,
    })),
    ...[1_920, 2_160, 2_400, 2_640, 2_880, 3_120, 3_360, 3_600].map((tick) => ({
      voice: 'hihat' as const,
      tick,
      duration: PPQ / 2,
    })),
    ...[480, 1_440, 2_400, 3_360].map((tick) => ({
      voice: 'snare' as const,
      tick,
      duration: PPQ / 2,
    })),
    ...[0, 720, 960, 1_680, 1_920, 2_640, 2_880, 3_600].map((tick) => ({
      voice: 'kick' as const,
      tick,
      duration: PPQ / 2,
    })),
  ],
  notationSystems: 2,
  tier: 'intermediate',
  listenFirstAllowed: false,
  modes: ['playAlong'],
}

export const PLAY_ALONG_EXERCISES = [
  quarterNotes,
  eighthNoteBackbeat,
  syncopationStarter,
] as const satisfies readonly Exercise[]

PLAY_ALONG_EXERCISES.forEach(assertValidExercise)

export function findPlayAlongExercise(id: string): Exercise | undefined {
  return PLAY_ALONG_EXERCISES.find((exercise) => exercise.id === id)
}
