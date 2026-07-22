import { ArrowRight, CircleCheck, LockKeyhole, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { preloadSampleFiles } from '@/audio'
import { useCatalogue } from '@/content'
import {
  deriveLevelProgress,
  type LevelProgressState,
  type ProgressSnapshot,
} from '@/progress'
import { useAppServices } from '@/services/useAppServices'
import type { Level } from '@/model'

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
  const destination = `/levels/${encodeURIComponent(level.id)}`

  return (
    <article
      aria-labelledby={`${level.id}-title`}
      className="rounded-xl border bg-bhda-surface shadow-sm"
      id={`level-${level.id}`}
    >
      <Link
        aria-label={`${unlocked ? 'Open' : 'Preview'} ${level.custom ? 'custom level' : `level ${level.order}`}: ${level.title}`}
        className="group block rounded-xl p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhda-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bhda-background sm:p-6"
        to={destination}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-bhda-accent">
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
                className="size-5 text-bhda-accent"
              />
            ) : (
              <LockKeyhole aria-hidden="true" className="size-5" />
            )}
            {unlocked ? 'Unlocked' : 'Locked'}
          </span>
        </div>

        <p className="mt-3 text-sm leading-6 text-bhda-text/65">
          {level.description}
        </p>

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2">
          <div className="col-start-1 row-start-1 flex justify-between gap-3 text-sm font-semibold">
            <span>Progress</span>
            <span className="tabular-nums">
              {state?.completedExercises ?? 0}/{level.exercises.length} complete
            </span>
          </div>
          <div
            aria-label={`${Math.round(completionPercent)}% complete`}
            className="col-start-1 row-start-2 h-2 min-w-0 overflow-hidden rounded-full bg-bhda-text/10"
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
          <span className="col-start-2 row-start-2 flex shrink-0 items-center gap-2 text-sm font-semibold tabular-nums">
            <Star
              aria-hidden="true"
              className="size-5 fill-bhda-accent text-bhda-accent"
            />
            {state?.totalStars ?? 0}/{level.exercises.length * 3} stars
          </span>
        </div>

        {!unlocked && state && (
          <p className="mt-5 rounded-lg bg-bhda-text/5 px-4 py-3 text-sm leading-6">
            Complete all {previousLevelProgress?.exerciseCount ?? 0} exercises
            in the previous level and collect at least{' '}
            {previousLevelProgress?.requiredStars ?? 0} stars there to unlock
            this level.
          </p>
        )}

        <span className="mt-5 flex items-center justify-end gap-2 text-sm font-semibold text-bhda-accent">
          {unlocked ? 'Open level' : 'Preview level'}
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform group-hover:translate-x-1"
          />
        </span>
      </Link>
    </article>
  )
}

export function LevelSelectPage() {
  const { hash } = useLocation()
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
    void preloadSampleFiles().catch(() => {
      // The start button retries the load and provides recovery copy if needed.
    })
  }, [])

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

  useEffect(() => {
    if (!hash.startsWith('#level-')) return
    document
      .getElementById(hash.slice(1))
      ?.scrollIntoView?.({ block: 'center' })
  }, [hash, levels])

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
      <p className="text-sm font-semibold uppercase tracking-widest text-bhda-accent">
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
          <p className="mt-4 max-w-2xl text-base leading-7 text-bhda-text/70">
            Start with the unlocked level and build your reading one steady step
            at a time. Your best result is saved on this device.
          </p>
        </div>
        <p className="flex shrink-0 items-center gap-2 text-sm font-semibold">
          <Star
            aria-hidden="true"
            className="size-5 fill-bhda-accent text-bhda-accent"
          />
          {totalStars} stars earned
        </p>
      </div>

      {(catalogueError || progressError) && (
        <p
          aria-live="polite"
          className="mt-6 rounded-xl border bg-bhda-surface p-4 text-sm"
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
