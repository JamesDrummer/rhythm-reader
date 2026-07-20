import { ticksPerBar } from './ticks'
import type { Exercise } from './types'
import { VOICES } from './types'

export type ValidationCode =
  | 'invalid-bars'
  | 'invalid-tempo'
  | 'invalid-time-signature'
  | 'invalid-grouping'
  | 'invalid-voice'
  | 'invalid-tick'
  | 'invalid-duration'
  | 'event-out-of-bounds'
  | 'duplicate-event'
  | 'invalid-tuplet'

export interface ValidationIssue {
  code: ValidationCode
  path: string
  message: string
}

function issue(
  code: ValidationCode,
  path: string,
  message: string,
): ValidationIssue {
  return { code, path, message }
}

export function validateExercise(exercise: Exercise): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  let barTicks: number | undefined

  if (!Number.isInteger(exercise.bars) || exercise.bars <= 0) {
    issues.push(
      issue('invalid-bars', 'bars', 'Bars must be a positive integer'),
    )
  }

  if (!Number.isFinite(exercise.tempo) || exercise.tempo <= 0) {
    issues.push(
      issue('invalid-tempo', 'tempo', 'Tempo must be greater than zero'),
    )
  }

  try {
    barTicks = ticksPerBar(exercise.timeSignature)
  } catch (error) {
    issues.push(
      issue(
        'invalid-time-signature',
        'timeSignature',
        error instanceof Error ? error.message : 'Invalid time signature',
      ),
    )
  }

  const { grouping } = exercise.timeSignature

  if (
    grouping !== undefined &&
    (grouping.length === 0 ||
      grouping.some((group) => !Number.isInteger(group) || group <= 0) ||
      grouping.reduce((sum, group) => sum + group, 0) !==
        exercise.timeSignature.beats)
  ) {
    issues.push(
      issue(
        'invalid-grouping',
        'timeSignature.grouping',
        'Grouping must contain positive integers that add up to the beat count',
      ),
    )
  }

  const exerciseTicks =
    barTicks !== undefined &&
    Number.isInteger(exercise.bars) &&
    exercise.bars > 0
      ? barTicks * exercise.bars
      : undefined
  const occupiedStarts = new Set<string>()

  exercise.events.forEach((event, index) => {
    const path = `events[${index}]`

    if (!VOICES.includes(event.voice)) {
      issues.push(
        issue('invalid-voice', `${path}.voice`, 'Voice is not supported'),
      )
    }

    if (!Number.isInteger(event.tick) || event.tick < 0) {
      issues.push(
        issue(
          'invalid-tick',
          `${path}.tick`,
          'Event tick must be a non-negative integer',
        ),
      )
    }

    if (!Number.isInteger(event.duration) || event.duration <= 0) {
      issues.push(
        issue(
          'invalid-duration',
          `${path}.duration`,
          'Event duration must be a positive integer',
        ),
      )
    }

    if (
      exerciseTicks !== undefined &&
      Number.isInteger(event.tick) &&
      Number.isInteger(event.duration) &&
      event.duration > 0 &&
      (event.tick < 0 || event.tick + event.duration > exerciseTicks)
    ) {
      issues.push(
        issue(
          'event-out-of-bounds',
          path,
          `Event must fit within ticks 0 to ${exerciseTicks}`,
        ),
      )
    }

    const startKey = `${event.voice}:${event.tick}`

    if (occupiedStarts.has(startKey)) {
      issues.push(
        issue(
          'duplicate-event',
          path,
          'Two events cannot use the same voice at the same tick',
        ),
      )
    } else {
      occupiedStarts.add(startKey)
    }

    if (event.tuplet !== undefined) {
      const { den, num } = event.tuplet
      const hasValidRatio =
        Number.isInteger(num) && num > 0 && Number.isInteger(den) && den > 0
      const hasWholeBaseDuration =
        hasValidRatio &&
        Number.isInteger(event.duration) &&
        event.duration > 0 &&
        (event.duration * num) % den === 0

      if (!hasWholeBaseDuration) {
        issues.push(
          issue(
            'invalid-tuplet',
            `${path}.tuplet`,
            'Tuplet values must be positive integers and match an integer base duration',
          ),
        )
      }
    }
  })

  return issues
}

export function assertValidExercise(exercise: Exercise): void {
  const issues = validateExercise(exercise)

  if (issues.length > 0) {
    throw new Error(
      issues.map(({ message, path }) => `${path}: ${message}`).join('\n'),
    )
  }
}
