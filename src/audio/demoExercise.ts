import { PPQ, type Exercise } from '@/model'

const eighthNotes = Array.from({ length: 16 }, (_, index) => ({
  voice: 'hihat' as const,
  tick: index * (PPQ / 2),
  duration: PPQ / 2,
}))

export const AUDIO_DEMO_EXERCISE: Exercise = {
  id: 'audio-engine-test',
  title: 'Two-bar audio engine test',
  tempo: 80,
  timeSignature: { beats: 4, beatValue: 4 },
  bars: 2,
  events: [
    ...eighthNotes,
    ...[0, 2, 4, 6].map((beat) => ({
      voice: 'kick' as const,
      tick: beat * PPQ,
      duration: PPQ,
    })),
    ...[1, 3, 5, 7].map((beat) => ({
      voice: 'snare' as const,
      tick: beat * PPQ,
      duration: PPQ,
    })),
  ],
  tier: 'beginner',
  listenFirstAllowed: true,
  modes: ['playAlong', 'memorise'],
}
