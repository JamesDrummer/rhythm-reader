import { render, screen } from '@testing-library/react'
import { PPQ, type Exercise } from '@/model'
import { scoreExercise } from '@/scoring'
import { describe, expect, it } from 'vitest'
import { HitTimeline } from './HitTimeline'

const exercise: Exercise = {
  id: 'timeline-test',
  title: 'Timeline test',
  tempo: 60,
  timeSignature: { beats: 4, beatValue: 4 },
  bars: 2,
  events: [
    { voice: 'hihat', tick: PPQ, duration: PPQ },
    { voice: 'hihat', tick: PPQ * 5, duration: PPQ },
    { voice: 'snare', tick: PPQ * 2, duration: PPQ },
  ],
  tier: 'beginner',
  listenFirstAllowed: false,
  modes: ['playAlong', 'memorise'],
}

describe('HitTimeline', () => {
  it('positions known early, late and extra hits from ScoreRecord alone', () => {
    const score = scoreExercise(exercise, { perfectMs: 80, goodMs: 160 }, [
      { voice: 'hihat', timeMs: 4_920 },
      { voice: 'snare', timeMs: 6_120 },
      { voice: 'hihat', timeMs: 9_500 },
      { voice: 'kick', timeMs: 8_000 },
    ])

    render(<HitTimeline score={score} />)

    expect(screen.getAllByTestId(/^bar-line-/)).toHaveLength(3)
    expect(screen.getByTestId('actual-hihat-0')).toHaveAttribute(
      'data-rating',
      'perfect',
    )
    expect(screen.getByTestId('actual-snare-1')).toHaveAttribute(
      'data-rating',
      'good',
    )
    expect(screen.getByTestId('actual-kick-3')).toHaveAttribute(
      'data-rating',
      'miss',
    )

    const earlyX = Number(
      screen.getByTestId('actual-hihat-0').getAttribute('cx'),
    )
    const expectedEarlyX = Number(
      screen.getByTestId('expected-hihat-0').getAttribute('cx'),
    )
    const lateX = Number(
      screen.getByTestId('actual-snare-1').getAttribute('cx'),
    )
    const expectedLateX = Number(
      screen.getByTestId('expected-snare-2').getAttribute('cx'),
    )

    expect(earlyX).toBeLessThan(expectedEarlyX)
    expect(lateX).toBeGreaterThan(expectedLateX)
  })
})
