import {
  assertValidExercise,
  type Exercise,
  type ExerciseMode,
  type Level,
  type NoteEvent,
  validateExercise,
} from '@/model'
import { assertValidLevels } from './validation'

export interface EventGroup extends Omit<NoteEvent, 'tick'> {
  ticks: number[]
}

export interface LibraryExercise extends Omit<Exercise, 'events'> {
  groups: EventGroup[]
}

export interface LibraryLevel extends Omit<Level, 'exercises' | 'custom'> {
  exercises: LibraryExercise[]
}

type GuideSection = NonNullable<Level['guide']>[number]
type GuideKey = NonNullable<GuideSection['key']>[number]

interface ParsedGuideNotation {
  bars: 1
  events: NoteEvent[]
  notationSystems?: 1 | 2
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fail(path: string, message: string): never {
  throw new Error(`${path}: ${message}`)
}

function stringAt(record: Record<string, unknown>, key: string, path: string) {
  const value = record[key]
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`${path}.${key}`, 'must be a non-empty string')
  }
  return value
}

function numberAt(record: Record<string, unknown>, key: string, path: string) {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`${path}.${key}`, 'must be a number')
  }
  return value
}

function booleanAt(record: Record<string, unknown>, key: string, path: string) {
  const value = record[key]
  if (typeof value !== 'boolean') {
    fail(`${path}.${key}`, 'must be true or false')
  }
  return value
}

function parseTuplet(value: unknown, path: string): NoteEvent['tuplet'] {
  if (value === undefined) return undefined
  if (!isRecord(value)) fail(path, 'must contain num and den')
  return {
    num: numberAt(value, 'num', path),
    den: numberAt(value, 'den', path),
  }
}

function parseNoteEvent(value: unknown, path: string): NoteEvent {
  if (!isRecord(value)) fail(path, 'must be an event object')
  if (
    value.voice !== 'kick' &&
    value.voice !== 'snare' &&
    value.voice !== 'hihat'
  ) {
    fail(`${path}.voice`, 'must be kick, snare or hihat')
  }

  return {
    voice: value.voice,
    tick: numberAt(value, 'tick', path),
    duration: numberAt(value, 'duration', path),
    ...(value.tuplet !== undefined
      ? { tuplet: parseTuplet(value.tuplet, `${path}.tuplet`) }
      : {}),
  }
}

function parseGuideNotation(
  value: Record<string, unknown>,
  path: string,
): ParsedGuideNotation {
  if (!Array.isArray(value.events)) fail(`${path}.events`, 'must be an array')
  if (
    value.notationSystems !== undefined &&
    value.notationSystems !== 1 &&
    value.notationSystems !== 2
  ) {
    fail(`${path}.notationSystems`, 'must be 1 or 2')
  }

  const notationSystems =
    value.notationSystems === 1 || value.notationSystems === 2
      ? value.notationSystems
      : undefined
  const notation: ParsedGuideNotation = {
    bars: 1,
    events: value.events.map((event, eventIndex) =>
      parseNoteEvent(event, `${path}.events[${eventIndex}]`),
    ),
    ...(notationSystems ? { notationSystems } : {}),
  }
  const issues = validateExercise({
    id: path,
    title: 'Guide notation',
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
  })
  if (issues.length > 0) {
    throw new Error(
      issues
        .map(
          ({ message, path: issuePath }) => `${path}.${issuePath}: ${message}`,
        )
        .join('\n'),
    )
  }
  return notation
}

function parseGuideKey(value: unknown, path: string): GuideKey {
  if (!isRecord(value)) fail(path, 'must be a key entry object')
  if (value.bars !== 1) fail(`${path}.bars`, 'must be 1')

  const notation = parseGuideNotation(value, path)
  if (value.noteLabels !== undefined && !Array.isArray(value.noteLabels)) {
    fail(`${path}.noteLabels`, 'must be an array')
  }

  const noteLabels = Array.isArray(value.noteLabels)
    ? value.noteLabels.map((noteLabel, noteLabelIndex) => {
        const noteLabelPath = `${path}.noteLabels[${noteLabelIndex}]`
        if (!isRecord(noteLabel)) {
          fail(noteLabelPath, 'must be a note label object')
        }
        const eventIndex = noteLabel.eventIndex
        if (
          typeof eventIndex !== 'number' ||
          !Number.isInteger(eventIndex) ||
          eventIndex < 0 ||
          eventIndex >= notation.events.length
        ) {
          fail(
            `${noteLabelPath}.eventIndex`,
            'must reference an existing event',
          )
        }
        return {
          eventIndex,
          text: stringAt(noteLabel, 'text', noteLabelPath),
        }
      })
    : undefined

  return {
    label: stringAt(value, 'label', path),
    ...notation,
    ...(noteLabels ? { noteLabels } : {}),
  }
}

function parseGuide(value: unknown, path: string): Level['guide'] {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) fail(path, 'must be an array')

  return value.map((section, sectionIndex): GuideSection => {
    const sectionPath = `${path}[${sectionIndex}]`
    if (!isRecord(section)) fail(sectionPath, 'must be a guide section object')
    return {
      text: stringAt(section, 'text', sectionPath),
      ...(section.key !== undefined
        ? {
            key: Array.isArray(section.key)
              ? section.key.map((entry, keyIndex) =>
                  parseGuideKey(entry, `${sectionPath}.key[${keyIndex}]`),
                )
              : fail(`${sectionPath}.key`, 'must be an array'),
          }
        : {}),
    }
  })
}

function parseExercise(value: unknown, path: string): Exercise {
  if (!isRecord(value)) fail(path, 'must be an exercise object')
  const timeSignature = value.timeSignature
  if (!isRecord(timeSignature)) {
    fail(`${path}.timeSignature`, 'must contain beats and beatValue')
  }
  if (!Array.isArray(value.groups)) {
    fail(`${path}.groups`, 'must be an array')
  }
  if (!Array.isArray(value.modes) || value.modes.length === 0) {
    fail(`${path}.modes`, 'must contain at least one enabled mode')
  }

  const modes: ExerciseMode[] = value.modes.map(
    (mode: unknown, index): ExerciseMode => {
      if (mode !== 'playAlong' && mode !== 'memorise') {
        fail(`${path}.modes[${index}]`, 'must be playAlong or memorise')
      }
      return mode
    },
  )

  const events = value.groups.flatMap((group, groupIndex): NoteEvent[] => {
    const groupPath = `${path}.groups[${groupIndex}]`
    if (!isRecord(group)) fail(groupPath, 'must be an event group object')
    if (
      group.voice !== 'kick' &&
      group.voice !== 'snare' &&
      group.voice !== 'hihat'
    ) {
      fail(`${groupPath}.voice`, 'must be kick, snare or hihat')
    }
    const voice = group.voice
    if (!Array.isArray(group.ticks)) {
      fail(`${groupPath}.ticks`, 'must be an array of tick positions')
    }
    const duration = numberAt(group, 'duration', groupPath)
    const tuplet = parseTuplet(group.tuplet, `${groupPath}.tuplet`)
    return group.ticks.map((tick, tickIndex) => {
      if (typeof tick !== 'number' || !Number.isInteger(tick)) {
        fail(`${groupPath}.ticks[${tickIndex}]`, 'must be an integer')
      }
      return {
        voice,
        tick,
        duration,
        ...(tuplet ? { tuplet } : {}),
      }
    })
  })

  const tier = value.tier
  if (tier !== 'beginner' && tier !== 'intermediate' && tier !== 'advanced') {
    fail(`${path}.tier`, 'must be beginner, intermediate or advanced')
  }
  const notationSystems = value.notationSystems
  if (
    notationSystems !== undefined &&
    notationSystems !== 1 &&
    notationSystems !== 2
  ) {
    fail(`${path}.notationSystems`, 'must be 1 or 2')
  }
  if (
    timeSignature.grouping !== undefined &&
    !Array.isArray(timeSignature.grouping)
  ) {
    fail(`${path}.timeSignature.grouping`, 'must be an array of beat groups')
  }

  const exercise: Exercise = {
    id: stringAt(value, 'id', path),
    title: stringAt(value, 'title', path),
    tempo: numberAt(value, 'tempo', path),
    timeSignature: {
      beats: numberAt(timeSignature, 'beats', `${path}.timeSignature`),
      beatValue: numberAt(timeSignature, 'beatValue', `${path}.timeSignature`),
      ...(Array.isArray(timeSignature.grouping)
        ? {
            grouping: timeSignature.grouping.map((group, index) => {
              if (typeof group !== 'number') {
                fail(
                  `${path}.timeSignature.grouping[${index}]`,
                  'must be a number',
                )
              }
              return group
            }),
          }
        : {}),
    },
    bars: numberAt(value, 'bars', path),
    events: events.toSorted(
      (left, right) =>
        left.tick - right.tick || left.voice.localeCompare(right.voice),
    ),
    ...(notationSystems ? { notationSystems } : {}),
    tier,
    listenFirstAllowed: booleanAt(value, 'listenFirstAllowed', path),
    modes,
  }
  assertValidExercise(exercise)
  return exercise
}

export function parseLibraryJson(json: string): Level[] {
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    throw new Error('The selected file is not valid JSON.')
  }
  if (!Array.isArray(value)) {
    throw new Error('The library must be a JSON array of levels.')
  }

  const levels = value.map((level, levelIndex): Level => {
    const path = `levels[${levelIndex}]`
    if (!isRecord(level)) fail(path, 'must be a level object')
    if (!Array.isArray(level.exercises) || level.exercises.length === 0) {
      fail(`${path}.exercises`, 'must contain at least one exercise')
    }
    return {
      id: stringAt(level, 'id', path),
      title: stringAt(level, 'title', path),
      description: stringAt(level, 'description', path),
      order: numberAt(level, 'order', path),
      ...(level.guide !== undefined
        ? { guide: parseGuide(level.guide, `${path}.guide`) }
        : {}),
      exercises: level.exercises.map((exercise, exerciseIndex) =>
        parseExercise(exercise, `${path}.exercises[${exerciseIndex}]`),
      ),
    }
  })
  assertValidLevels(levels)
  return levels
}

function groupEvents(events: readonly NoteEvent[]): EventGroup[] {
  const groups = new Map<string, EventGroup>()
  for (const event of events.toSorted(
    (left, right) =>
      left.voice.localeCompare(right.voice) || left.tick - right.tick,
  )) {
    const key = [
      event.voice,
      event.duration,
      event.tuplet?.num ?? '',
      event.tuplet?.den ?? '',
    ].join(':')
    const group = groups.get(key)
    if (group) {
      group.ticks.push(event.tick)
    } else {
      groups.set(key, {
        voice: event.voice,
        duration: event.duration,
        ticks: [event.tick],
        ...(event.tuplet ? { tuplet: event.tuplet } : {}),
      })
    }
  }
  return [...groups.values()]
}

export function toLibraryFormat(levels: readonly Level[]): LibraryLevel[] {
  assertValidLevels(levels)
  return levels.map((level) => ({
    id: level.id,
    title: level.title,
    description: level.description,
    order: level.order,
    ...(level.guide
      ? {
          guide: level.guide.map((section) => ({
            text: section.text,
            ...(section.key ? { key: section.key } : {}),
          })),
        }
      : {}),
    exercises: level.exercises.map(({ events, ...exercise }) => ({
      ...exercise,
      groups: groupEvents(events),
    })),
  }))
}

export function serialiseLibrary(levels: readonly Level[]): string {
  return `${JSON.stringify(toLibraryFormat(levels), null, 2)}\n`
}
