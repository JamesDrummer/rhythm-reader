import {
  ArrowLeft,
  CircleCheck,
  Headphones,
  LockKeyhole,
  Play,
  Star,
} from 'lucide-react'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ProgressSummary } from '@/components/ProgressSummary'
import { Button } from '@/components/ui/button'
import { useCatalogue } from '@/content'
import type { Exercise, ExerciseMode, Level } from '@/model'
import { Notation } from '@/notation'
import { useProgressSnapshot } from '@/progress/useProgressSnapshot'
import { useAppServices } from '@/services/useAppServices'

const MODE_LABELS: Record<ExerciseMode, string> = {
  playAlong: 'Play Along',
  memorise: 'Memorise',
}

type GuideSection = NonNullable<Level['guide']>[number]
type GuideExample = NonNullable<GuideSection['example']>
type GuideKey = NonNullable<GuideSection['key']>[number]

function guideNotationExercise(
  level: Level,
  notation: GuideExample | GuideKey,
  idSuffix: string,
  title: string,
): Exercise {
  return {
    id: `${level.id}-${idSuffix}`,
    title,
    tempo: 60,
    timeSignature: { beats: 4, beatValue: 4 },
    bars: notation.bars,
    events: notation.events,
    ...(notation.notationSystems
      ? { notationSystems: notation.notationSystems }
      : {}),
    tier: 'beginner',
    listenFirstAllowed: false,
    modes: ['playAlong'],
  }
}

function LevelUnavailable({ loading }: { loading: boolean }) {
  return (
    <section className="mx-auto w-full max-w-3xl" aria-labelledby="page-title">
      <p className="text-sm font-semibold uppercase tracking-widest text-bhda-accent">
        Levels
      </p>
      <h1 className="mt-3 text-3xl font-bold" id="page-title">
        {loading ? 'Loading level' : 'Level not found'}
      </h1>
      <p className="mt-4 text-base leading-7 text-bhda-text/70">
        {loading
          ? 'Getting the exercises ready…'
          : 'That level is not in your exercise library.'}
      </p>
      {!loading && (
        <Button asChild className="mt-8" variant="outline">
          <Link to="/">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to all levels
          </Link>
        </Button>
      )}
    </section>
  )
}

export function LevelDetailPage() {
  const { levelId = '' } = useParams()
  const { catalogueScope, exerciseSource } = useAppServices()
  const {
    error: catalogueError,
    levels,
    loading,
  } = useCatalogue(exerciseSource, catalogueScope)
  const {
    error: progressError,
    loading: progressLoading,
    snapshot: progress,
  } = useProgressSnapshot(levels)

  useEffect(() => {
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [levelId])

  if (loading || progressLoading) return <LevelUnavailable loading />

  const levelIndex = levels.findIndex(({ id }) => id === levelId)
  if (levelIndex < 0) return <LevelUnavailable loading={false} />

  const level = levels[levelIndex]
  const state = progress.levels[level.id]
  const unlocked = state?.unlocked ?? false
  const previousLevelProgress =
    levelIndex > 0 ? progress.levels[levels[levelIndex - 1].id] : undefined

  return (
    <section className="mx-auto w-full max-w-3xl" aria-labelledby="page-title">
      <Link
        className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-bhda-text/60 hover:text-bhda-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhda-accent focus-visible:ring-offset-4"
        to={`/#level-${level.id}`}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to all levels
      </Link>

      <div className="mt-6 rounded-xl border bg-bhda-surface p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-bhda-accent">
              {level.custom ? 'Custom level' : `Level ${level.order}`}
            </p>
            <h1
              className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
              id="page-title"
            >
              {level.title}
            </h1>
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

        <p className="mt-4 text-base leading-7 text-bhda-text/70">
          {level.description}
        </p>

        <ProgressSummary
          className="mt-6"
          exerciseCount={level.exercises.length}
          progress={state}
        />

        {!unlocked && state && (
          <p className="mt-6 rounded-lg bg-bhda-text/5 px-4 py-3 text-sm leading-6">
            This level is a preview. Complete all{' '}
            {previousLevelProgress?.exerciseCount ?? 0} exercises in the
            previous level and collect at least{' '}
            {previousLevelProgress?.requiredStars ?? 0} stars there to unlock
            it.
          </p>
        )}

        {(catalogueError || progressError) && (
          <p
            aria-live="polite"
            className="mt-6 rounded-lg border px-4 py-3 text-sm leading-6"
          >
            {catalogueError ?? progressError}
          </p>
        )}
      </div>

      {level.guide && level.guide.length > 0 && (
        <div className="mt-6 rounded-xl border bg-bhda-surface p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">How to read this level</h2>
          <div className="mt-5 space-y-6">
            {level.guide.map((section, sectionIndex) => (
              <section key={sectionIndex}>
                <p className="text-base leading-7 text-bhda-text/70">
                  {section.text}
                </p>
                {section.example && (
                  <Notation
                    className="mx-auto mt-4 max-w-xl border shadow-none"
                    cropToContent
                    exercise={guideNotationExercise(
                      level,
                      section.example,
                      `guide-${sectionIndex + 1}`,
                      `${level.title} reading example ${sectionIndex + 1}`,
                    )}
                    label={`Reading example ${sectionIndex + 1}`}
                    showClef
                    showTimeSignature
                  />
                )}
                {section.key && section.key.length > 0 && (
                  <div
                    aria-label="Notation key"
                    className="mt-4 flex flex-wrap gap-4"
                    role="list"
                  >
                    {section.key.map((entry, keyIndex) => (
                      <figure
                        className="w-full min-w-0 sm:w-72"
                        key={`${entry.label}-${keyIndex}`}
                        role="listitem"
                      >
                        <Notation
                          className="border shadow-none"
                          cropToContent
                          exercise={guideNotationExercise(
                            level,
                            entry,
                            `guide-${sectionIndex + 1}-key-${keyIndex + 1}`,
                            entry.label,
                          )}
                          label={`${entry.label} notation`}
                          noteLabels={entry.noteLabels}
                          showClef={false}
                          showTimeSignature={false}
                        />
                        <figcaption className="mt-2 text-center text-sm font-semibold text-bhda-text/70">
                          {entry.label}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border bg-bhda-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold">Exercises</h2>
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
                  <p className="mt-1 text-sm text-bhda-text/55">
                    {exercise.tempo} bpm · {exercise.tier}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-bhda-text/60">
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
                          ? 'fill-bhda-accent text-bhda-accent'
                          : 'text-bhda-text/25'
                      }`}
                    />
                    {record?.bestStars ?? 0}/3
                  </span>
                  {unlocked && (
                    <Button asChild className="h-10 px-4" variant="outline">
                      <Link to={`/play/${encodeURIComponent(exercise.id)}`}>
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
      </div>
    </section>
  )
}
