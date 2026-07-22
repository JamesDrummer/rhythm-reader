import {
  ArrowRight,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Star,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { VOICES, type Voice } from '@/model'
import type { ScoreRecord, VoiceScore } from '@/scoring'
import { HitTimeline } from './HitTimeline'

const VOICE_LABELS: Record<Voice, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hihat: 'Hi-hat',
}

function timingTendency(voice: VoiceScore): string {
  if (voice.meanSignedErrorMs === null) return 'no matched hits yet'

  const roundedError = Math.round(Math.abs(voice.meanSignedErrorMs))
  if (roundedError < 5) return 'timing spot on'
  return voice.meanSignedErrorMs < 0
    ? `rushing by ~${roundedError}ms`
    : `dragging by ~${roundedError}ms`
}

function encouragement(stars: ScoreRecord['stars']): string {
  if (stars === 3) return 'Brilliant work. Your timing was really secure.'
  if (stars === 2)
    return 'Nice work. One more focused go could earn three stars.'
  if (stars === 1)
    return 'Good start. Keep the pulse relaxed and have another go.'
  return 'Keep going. Listen for the click and aim for one steady pulse.'
}

export interface ResultsScreenProps {
  exerciseTitle: string
  isPlayingLayered: boolean
  layeredPlaybackError?: string | null
  nextExerciseHref: string
  nextExerciseLabel?: string
  onLayeredPlayback: () => void
  onRetry: () => void
  onStopLayeredPlayback: () => void
  score: ScoreRecord
}

export function ResultsScreen({
  exerciseTitle,
  isPlayingLayered,
  layeredPlaybackError,
  nextExerciseHref,
  nextExerciseLabel = 'Next exercise',
  onLayeredPlayback,
  onRetry,
  onStopLayeredPlayback,
  score,
}: ResultsScreenProps) {
  const activeVoices = VOICES.filter(
    (voice) =>
      score.perVoice[voice].expectedCount > 0 ||
      score.perVoice[voice].extraHitCount > 0,
  )

  return (
    <section aria-labelledby="results-title" className="mx-auto max-w-3xl">
      <div className="rounded-xl border bg-bhda-surface px-5 py-8 text-center shadow-sm sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-bhda-accent">
          Exercise complete
        </p>
        <h1 className="mt-2 text-3xl font-bold" id="results-title">
          {exerciseTitle}
        </h1>

        <p className="mt-6 text-6xl font-bold tabular-nums text-bhda-accent sm:text-7xl">
          {Math.round(score.overallAccuracyPercent)}%
        </p>
        <p className="mt-2 text-sm font-semibold text-bhda-text/55">
          Overall accuracy
        </p>

        <div className="mt-5 flex items-center justify-center gap-2">
          <div
            aria-label={`${score.stars} out of 3 stars`}
            className="flex gap-2"
          >
            {[1, 2, 3].map((star) => (
              <Star
                aria-hidden="true"
                className={
                  star <= score.stars
                    ? 'size-9 fill-bhda-accent text-bhda-accent'
                    : 'size-9 text-bhda-text/15'
                }
                key={star}
                strokeWidth={1.8}
              />
            ))}
          </div>
          {score.stars === 3 && (
            <Sparkles
              aria-hidden="true"
              className="size-6 text-bhda-accent motion-safe:animate-pulse"
              data-testid="three-star-celebration"
            />
          )}
        </div>

        <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-bhda-text/65">
          {encouragement(score.stars)}
        </p>
      </div>

      <div className="mt-6 rounded-xl border bg-bhda-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">Your timing by voice</h2>
        <div className="mt-4 divide-y">
          {activeVoices.map((voice) => {
            const result = score.perVoice[voice]
            return (
              <p className="py-3 text-sm leading-6" key={voice}>
                <span className="font-bold">{VOICE_LABELS[voice]}:</span>{' '}
                <span className="tabular-nums">
                  {Math.round(result.accuracyPercent)}%
                </span>{' '}
                <span className="text-bhda-text/55">
                  · {timingTendency(result)}
                </span>
              </p>
            )
          })}
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-bhda-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">Where your hits landed</h2>
        <p className="mt-2 text-sm leading-6 text-bhda-text/60">
          Left of the hollow dot is early; right is late. Bar numbers are shown
          across the top.
        </p>
        <div className="mt-5">
          <HitTimeline score={score} />
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-bhda-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">Hear the difference</h2>
        <p className="mt-2 text-sm leading-6 text-bhda-text/60">
          The correct rhythm stays centred. Your hits sit slightly to the right
          so any timing gaps are easy to hear.
        </p>
        {layeredPlaybackError && (
          <p
            aria-live="polite"
            className="mt-3 rounded-lg bg-bhda-text/5 px-4 py-3 text-sm font-semibold text-bhda-text/70"
          >
            {layeredPlaybackError}
          </p>
        )}
        <Button
          className="mt-5 h-12 w-full px-6 sm:w-auto"
          onClick={isPlayingLayered ? onStopLayeredPlayback : onLayeredPlayback}
        >
          {isPlayingLayered ? (
            <Square aria-hidden="true" className="size-4 fill-current" />
          ) : (
            <Play aria-hidden="true" className="size-4 fill-current" />
          )}
          {isPlayingLayered ? 'Stop playback' : 'Play correct + my hits'}
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button className="h-12 px-6" onClick={onRetry} variant="outline">
          <RotateCcw aria-hidden="true" className="size-4" />
          Retry
        </Button>
        <Button asChild className="h-12 px-6" variant="outline">
          <Link to={nextExerciseHref}>
            {nextExerciseLabel}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
