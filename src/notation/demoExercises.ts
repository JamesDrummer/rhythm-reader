import { PPQ, type Exercise } from '@/model'

export const SIX_EIGHT_PROOF_EXERCISE: Exercise = {
  id: 'six-eight-renderer-proof',
  title: '6/8 renderer proof',
  tempo: 80,
  timeSignature: { beats: 6, beatValue: 8, grouping: [3, 3] },
  bars: 1,
  events: [
    ...[0, 240, 480, 720, 960, 1_200].map((tick) => ({
      voice: 'hihat' as const,
      tick,
      duration: PPQ / 2,
    })),
    { voice: 'snare', tick: 720, duration: PPQ / 2 },
    { voice: 'kick', tick: 0, duration: PPQ / 2 },
    { voice: 'kick', tick: 720, duration: PPQ / 2 },
  ],
  tier: 'beginner',
  listenFirstAllowed: true,
  modes: ['playAlong'],
}
