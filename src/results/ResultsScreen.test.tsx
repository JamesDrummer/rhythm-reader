import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PPQ, type Exercise } from '@/model'
import { scoreExercise } from '@/scoring'
import { describe, expect, it, vi } from 'vitest'
import { ResultsScreen } from './ResultsScreen'

const exercise: Exercise = {
  id: 'results-test',
  title: 'Results test',
  tempo: 60,
  timeSignature: { beats: 4, beatValue: 4 },
  bars: 1,
  events: [{ voice: 'hihat', tick: PPQ, duration: PPQ }],
  tier: 'beginner',
  listenFirstAllowed: false,
  modes: ['playAlong'],
}

describe('ResultsScreen', () => {
  it('uses friendly timing copy and celebrates three stars', () => {
    const score = scoreExercise(exercise, { perfectMs: 80, goodMs: 160 }, [
      { voice: 'hihat', timeMs: 4_975 },
    ])

    render(
      <MemoryRouter>
        <ResultsScreen
          exerciseTitle={exercise.title}
          isPlayingLayered={false}
          nextExerciseHref="/play/next"
          onLayeredPlayback={vi.fn()}
          onRetry={vi.fn()}
          onStopLayeredPlayback={vi.fn()}
          score={score}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Hi-hat:/).closest('p')).toHaveTextContent(
      'Hi-hat: 100% · rushing by ~25ms',
    )
    expect(screen.getByLabelText('3 out of 3 stars')).toBeInTheDocument()
    expect(screen.getByTestId('three-star-celebration')).toHaveClass(
      'motion-safe:animate-pulse',
    )
    expect(screen.getByText('Play correct + my hits')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Next exercise/ })).toHaveAttribute(
      'href',
      '/play/next',
    )
  })
})
