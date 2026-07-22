import { ArrowRight, CircleCheck, LockKeyhole, Star } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { preloadSampleFiles } from '@/audio'
import { ProgressSummary } from '@/components/ProgressSummary'
import { useCatalogue } from '@/content'
import type { LevelProgressState, ProgressSnapshot } from '@/progress'
import { useProgressSnapshot } from '@/progress/useProgressSnapshot'
import { useAppServices } from '@/services/useAppServices'
import type { Level } from '@/model'

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

        <ProgressSummary
          className="mt-5"
          exerciseCount={level.exercises.length}
          progress={state}
        />

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
  const { catalogueScope, exerciseSource } = useAppServices()
  const { error: catalogueError, levels } = useCatalogue(
    exerciseSource,
    catalogueScope,
  )
  const { error: progressError, snapshot: progress } =
    useProgressSnapshot(levels)

  useEffect(() => {
    void preloadSampleFiles().catch(() => {
      // The start button retries the load and provides recovery copy if needed.
    })
  }, [])

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
