import { CircleCheck, Headphones, LockKeyhole, Play, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalogue } from '@/content'
import { Button } from '@/components/ui/button'
import {
  deriveLevelProgress,
  type LevelProgressState,
  type ProgressSnapshot,
} from '@/progress'
import { useAppServices } from '@/services/useAppServices'
import type { ExerciseMode, Level } from '@/model'

const MODE_LABELS: Record<ExerciseMode, string> = {
  playAlong: 'Play Along',
  memorise: 'Memorise',
}

function emptySnapshot(levels: readonly Level[]): ProgressSnapshot {
  return {
    exercises: {},
    levels: deriveLevelProgress(levels, {}),
  }
}

function LevelCard({
  level,
  previousLevelProgress,
  progress,
}: {
  level: Level
  previousLevelProgress?: LevelProgressState
  progress: ProgressSnapshot
}) {
  const state = progress.levels[level.id]
  const unlocked = state?.unlocked ?? false
  const completionPercent = state
    ? (state.completedExercises / state.exerciseCount) * 100
    : 0

  return (
    <article
      aria-labelledby={`${level.id}-title`}
      className={`rounded-xl border bg-white p-5 shadow-sm sm:p-6 ${
        unlocked ? '' : 'opacity-70'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-bhda-purple">
            {level.custom ? 'Custom level' : `Level ${level.order}`}
          </p>
          <h2 className="mt-2 text-xl font-bold" id={`${level.id}-title`}>
            {level.title}
          </h2>
        </div>
        <span className="flex shrink-0 items-center gap-2 text-sm font-semibold">
          {unlocked ? (
            <CircleCheck
              aria-hidden="true"
              className="size-5 text-bhda-purple"
            />
          ) : (
            <LockKeyhole aria-hidden="true" className="size-5" />
          )}
          {unlocked ? 'Unlocked' : 'Locked'}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-black/65">
        {level.description}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="flex justify-between gap-3 text-sm font-semibold">
            <span>Progress</span>
            <span className="tabular-nums">
              {state?.completedExercises ?? 0}/{level.exercises.length} complete
            </span>
          </div>
          <div
            aria-label={`${Math.round(completionPercent)}% complete`}
            className="mt-2 h-2 overflow-hidden rounded-full bg-black/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(completionPercent)}
          >
            <div
              className="h-full rounded-full bg-bhda-purple"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          <Star
            aria-hidden="true"
            className="size-5 fill-bhda-purple text-bhda-purple"
          />
          <span className="text-sm font-semibold tabular-nums">
            {state?.totalStars ?? 0}/{level.exercises.length * 3} stars
          </span>
        </div>
      </div>

      {!unlocked && state && (
        <p className="mt-5 rounded-lg bg-black/5 px-4 py-3 text-sm leading-6">
          Complete all {previousLevelProgress?.exerciseCount ?? 0} exercises in
          the previous level and collect at least{' '}
          {previousLevelProgress?.requiredStars ?? 0} stars there to unlock this
          level.
        </p>
      )}

      <ol className="mt-5 divide-y" aria-label={`${level.title} exercises`}>
        {level.exercises.map((exercise, exerciseIndex) => {
          const record = progress.exercises[exercise.id]
          return (
            <li
              className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              key={exercise.id}
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  {exerciseIndex + 1}. {exercise.title}
                </p>
                <p className="mt-1 text-sm text-black/55">
                  {exercise.tempo} bpm · {exercise.tier}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-black/60">
                  {exercise.modes.map((mode) => (
                    <span key={mode}>{MODE_LABELS[mode]}</span>
                  ))}
                  {exercise.listenFirstAllowed && (
                    <span className="inline-flex items-center gap-1">
                      <Headphones aria-hidden="true" className="size-3.5" />
                      Listen First
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                <span
                  aria-label={`${record?.bestStars ?? 0} out of 3 stars`}
                  className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums"
                >
                  <Star
                    aria-hidden="true"
                    className={`size-4 ${
                      record?.bestStars
                        ? 'fill-bhda-purple text-bhda-purple'
                        : 'text-black/25'
                    }`}
                  />
                  {record?.bestStars ?? 0}/3
                </span>
                {unlocked && (
                  <Button asChild className="h-10 px-4" variant="outline">
                    <Link to={`/play/${exercise.id}`}>
                      <Play aria-hidden="true" className="size-4" />
                      Play
                    </Link>
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </article>
  )
}

export function LevelSelectPage() {
  const { catalogueScope, exerciseSource, progressScope, progressStore } =
    useAppServices()
  const { error: catalogueError, levels } = useCatalogue(
    exerciseSource,
    catalogueScope,
  )
  const [progress, setProgress] = useState<ProgressSnapshot>(() =>
    emptySnapshot(levels),
  )
  const [progressError, setProgressError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void progressStore
      .load(progressScope, levels)
      .then((snapshot) => {
        if (active) setProgress(snapshot)
      })
      .catch(() => {
        if (active) setProgressError('Your saved progress could not be loaded.')
      })
    return () => {
      active = false
    }
  }, [levels, progressScope, progressStore])

  const totalStars = useMemo(
    () =>
      Object.values(progress.exercises).reduce(
        (total, exercise) => total + exercise.bestStars,
        0,
      ),
    [progress.exercises],
  )

  return (
    <section className="mx-auto w-full max-w-3xl" aria-labelledby="page-title">
      <p className="text-sm font-semibold uppercase tracking-widest text-bhda-purple">
        BHDA Rhythm Reader
      </p>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight sm:text-4xl"
            id="page-title"
          >
            Ready for your next rhythm?
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-black/70">
            Start with the unlocked level and build your reading one steady step
            at a time. Your best result is saved on this device.
          </p>
        </div>
        <p className="flex shrink-0 items-center gap-2 text-sm font-semibold">
          <Star
            aria-hidden="true"
            className="size-5 fill-bhda-purple text-bhda-purple"
          />
          {totalStars} stars earned
        </p>
      </div>

      {(catalogueError || progressError) && (
        <p
          aria-live="polite"
          className="mt-6 rounded-xl border bg-white p-4 text-sm"
        >
          {catalogueError ?? progressError}
        </p>
      )}

      <div className="mt-8 space-y-6">
        {levels.map((level, index) => (
          <LevelCard
            key={level.id}
            level={level}
            previousLevelProgress={
              index > 0 ? progress.levels[levels[index - 1].id] : undefined
            }
            progress={progress}
          />
        ))}
      </div>
    </section>
  )
}
