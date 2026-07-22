import { Star } from 'lucide-react'
import type { LevelProgressState } from '@/progress'

interface ProgressSummaryProps {
  className: string
  exerciseCount: number
  progress?: LevelProgressState
}

export function ProgressSummary({
  className,
  exerciseCount,
  progress,
}: ProgressSummaryProps) {
  const completionPercent = progress
    ? (progress.completedExercises / progress.exerciseCount) * 100
    : 0

  return (
    <div
      className={`${className} grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2`}
    >
      <div className="col-start-1 row-start-1 flex justify-between gap-3 text-sm font-semibold">
        <span>Progress</span>
        <span className="tabular-nums">
          {progress?.completedExercises ?? 0}/{exerciseCount} complete
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
        {progress?.totalStars ?? 0}/{exerciseCount * 3} stars
      </span>
    </div>
  )
}
