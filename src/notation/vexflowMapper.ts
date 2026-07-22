import {
  Beam,
  Formatter,
  Fraction,
  Renderer,
  Stave,
  StaveNote,
  Stem,
  SVGContext,
  Tuplet,
  Voice as VexVoice,
  type RenderContext,
} from 'vexflow/bravura'
import {
  PPQ,
  ticksPerBar,
  ticksPerBeat,
  type Exercise,
  type NoteEvent,
  type TimeSignature,
  type Voice,
} from '@/model'
import type { LayoutBox, NotationLayout, NoteLayout } from './types'

const SCORE_HEIGHT = 216
const HORIZONTAL_PADDING = 20
const BAR_WIDTH = 500
const STAVE_Y = 64
const ENGRAVING_STYLE = {
  fillStyle: 'currentColor',
  strokeStyle: 'currentColor',
}

const DRUM_KEYS: Record<Voice, string> = {
  kick: 'f/4',
  snare: 'c/5',
  hihat: 'g/5/x',
}

const DURATION_SPECS = [
  { ticks: PPQ * 4, vex: 'w' },
  { ticks: PPQ * 3, vex: 'hd' },
  { ticks: PPQ * 2, vex: 'h' },
  { ticks: (PPQ * 3) / 2, vex: 'qd' },
  { ticks: PPQ, vex: 'q' },
  { ticks: (PPQ * 3) / 4, vex: '8d' },
  { ticks: PPQ / 2, vex: '8' },
  { ticks: (PPQ * 3) / 8, vex: '16d' },
  { ticks: PPQ / 4, vex: '16' },
  { ticks: PPQ / 8, vex: '32' },
] as const

interface TupletSpec {
  start: number
  step: number
  num: number
  den: number
}

interface TimelineEntry {
  tick: number
  duration: number
  events: NoteEvent[]
  tuplet?: TupletSpec
}

interface Lane {
  id: string
  voices: Voice[]
  stemDirection: number
  restLine: number
  mergeToShortestDuration?: boolean
}

interface RenderedEntry {
  entry: TimelineEntry
  note: StaveNote
}

interface EventNoteReference {
  event: NoteEvent
  keyIndex: number
  note: StaveNote
}

function durationSpec(ticks: number): string {
  const spec = DURATION_SPECS.find((candidate) => candidate.ticks === ticks)
  if (!spec) {
    throw new RangeError(`Unsupported notation duration: ${ticks} ticks`)
  }
  return spec.vex
}

function effectiveGrouping(timeSignature: TimeSignature): number[] {
  if (timeSignature.grouping?.length) return timeSignature.grouping

  if (
    timeSignature.beatValue === 8 &&
    timeSignature.beats > 3 &&
    timeSignature.beats % 3 === 0
  ) {
    return Array.from({ length: timeSignature.beats / 3 }, () => 3)
  }

  return Array.from({ length: timeSignature.beats }, () => 1)
}

function groupingBoundaries(timeSignature: TimeSignature): number[] {
  const beatTicks = ticksPerBeat(timeSignature)
  const boundaries = [0]
  let tick = 0

  for (const group of effectiveGrouping(timeSignature)) {
    tick += group * beatTicks
    boundaries.push(tick)
  }

  const barTicks = ticksPerBar(timeSignature)
  if (boundaries.at(-1) !== barTicks) boundaries.push(barTicks)
  return boundaries
}

function beamGroups(timeSignature: TimeSignature): Fraction[] {
  return effectiveGrouping(timeSignature).map(
    (group) => new Fraction(group, timeSignature.beatValue),
  )
}

function createLanes(exercise: Exercise): Lane[] {
  const lanes: Lane[] = []
  const presentVoices = new Set(exercise.events.map((event) => event.voice))

  if (exercise.notationSystems === 1) {
    return presentVoices.size === 0
      ? []
      : [
          {
            id: 'single-system',
            voices: [...presentVoices],
            stemDirection: Stem.UP,
            restLine: 3,
            mergeToShortestDuration: true,
          },
        ]
  }

  if (presentVoices.has('hihat') || presentVoices.has('snare')) {
    lanes.push({
      id: 'hands',
      voices: ['snare', 'hihat'],
      stemDirection: Stem.UP,
      restLine: 4,
      mergeToShortestDuration: true,
    })
  }

  if (presentVoices.has('kick')) {
    lanes.push({
      id: 'kick',
      voices: ['kick'],
      stemDirection: Stem.DOWN,
      restLine: 2,
    })
  }

  return lanes
}

function tupletSpecs(
  events: readonly NoteEvent[],
  barStart: number,
  mergeToShortestDuration: boolean,
): TupletSpec[] {
  const specs = new Map<string, TupletSpec>()
  const shortestEventsByTick = new Map<number, NoteEvent>()

  if (mergeToShortestDuration) {
    for (const event of events) {
      const shortest = shortestEventsByTick.get(event.tick)
      if (!shortest || event.duration < shortest.duration) {
        shortestEventsByTick.set(event.tick, event)
      }
    }
  }

  const sourceEvents = mergeToShortestDuration
    ? [...shortestEventsByTick.values()]
    : events

  for (const event of sourceEvents) {
    if (!event.tuplet) continue
    const localTick = event.tick - barStart
    const span = event.duration * event.tuplet.num
    const start = Math.floor(localTick / span) * span
    const spec = {
      start,
      step: event.duration,
      num: event.tuplet.num,
      den: event.tuplet.den,
    }
    specs.set(`${start}:${spec.step}:${spec.num}:${spec.den}`, spec)
  }

  return [...specs.values()].toSorted((left, right) => left.start - right.start)
}

function nextBoundaryAfter(
  boundaries: readonly number[],
  tick: number,
): number {
  return (
    boundaries.find((boundary) => boundary > tick) ?? boundaries.at(-1) ?? tick
  )
}

function appendRests(
  entries: TimelineEntry[],
  start: number,
  end: number,
  boundaries: readonly number[],
): void {
  let cursor = start

  while (cursor < end) {
    const structuralEnd = Math.min(end, nextBoundaryAfter(boundaries, cursor))
    const remaining = structuralEnd - cursor
    const candidate =
      DURATION_SPECS.find((duration) => duration.ticks <= remaining) ??
      DURATION_SPECS.at(-1)

    if (!candidate) throw new Error('No rest duration is available.')

    const duration = Math.min(candidate.ticks, remaining)
    entries.push({ tick: cursor, duration, events: [] })
    cursor += duration
  }
}

function buildTimeline(
  events: readonly NoteEvent[],
  barStart: number,
  barTicks: number,
  timeSignature: TimeSignature,
  mergeToShortestDuration = false,
): TimelineEntry[] {
  const localEvents = new Map<number, NoteEvent[]>()
  for (const event of events) {
    const localTick = event.tick - barStart
    const atTick = localEvents.get(localTick) ?? []
    atTick.push(event)
    localEvents.set(localTick, atTick)
  }

  const tuplets = tupletSpecs(events, barStart, mergeToShortestDuration)
  const tupletsAtTick = new Map(tuplets.map((tuplet) => [tuplet.start, tuplet]))
  const boundaries = groupingBoundaries(timeSignature)
  const entries: TimelineEntry[] = []
  let cursor = 0

  while (cursor < barTicks) {
    const tuplet = tupletsAtTick.get(cursor)
    if (tuplet) {
      for (let index = 0; index < tuplet.num; index += 1) {
        const tick = cursor + index * tuplet.step
        entries.push({
          tick,
          duration: tuplet.step,
          events: localEvents.get(tick) ?? [],
          tuplet,
        })
      }
      cursor += tuplet.step * tuplet.num
      continue
    }

    const eventsAtTick = localEvents.get(cursor)
    if (eventsAtTick?.length) {
      const writtenDuration = mergeToShortestDuration
        ? Math.min(...eventsAtTick.map((event) => event.duration))
        : eventsAtTick[0].duration
      const nextEvent = [...localEvents.keys()]
        .filter((tick) => tick > cursor)
        .toSorted((left, right) => left - right)[0]
      const nextTuplet = tuplets.find(
        (candidate) => candidate.start > cursor,
      )?.start
      const nextPosition = Math.min(
        nextEvent ?? barTicks,
        nextTuplet ?? barTicks,
      )
      const duration = mergeToShortestDuration
        ? Math.min(writtenDuration, nextPosition - cursor)
        : writtenDuration
      entries.push({ tick: cursor, duration, events: eventsAtTick })
      cursor += duration
      continue
    }

    const nextEvent = [...localEvents.keys()]
      .filter((tick) => tick > cursor)
      .toSorted((left, right) => left - right)[0]
    const nextTuplet = tuplets.find(
      (candidate) => candidate.start > cursor,
    )?.start
    const nextPosition = Math.min(nextEvent ?? barTicks, nextTuplet ?? barTicks)
    appendRests(entries, cursor, nextPosition, boundaries)
    cursor = nextPosition
  }

  return entries
}

function createStaveNote(entry: TimelineEntry, lane: Lane): StaveNote {
  const tuplet = entry.tuplet
  const writtenTicks = tuplet
    ? (entry.duration * tuplet.num) / tuplet.den
    : entry.duration
  const duration = durationSpec(writtenTicks)
  const isRest = entry.events.length === 0
  const note = new StaveNote({
    keys: isRest
      ? ['b/4']
      : entry.events.map((event) => DRUM_KEYS[event.voice]),
    duration: `${duration}${isRest ? 'r' : ''}`,
    clef: 'percussion',
    stemDirection: lane.stemDirection,
  }).setStyle(ENGRAVING_STYLE)

  if (isRest) note.setKeyLine(0, lane.restLine)
  return note
}

function noteHeadBox(note: StaveNote, keyIndex: number): LayoutBox {
  const noteHead = note.noteHeads[keyIndex]
  const box = noteHead.getBoundingBox()
  const width = box.getW() || noteHead.getWidth() || 12
  const height = box.getH() || 12
  const x = Number.isFinite(box.getX()) ? box.getX() : noteHead.getAbsoluteX()
  const yFromNote = note.getYs()[keyIndex] ?? 0
  const y = Number.isFinite(box.getY()) ? box.getY() : yFromNote - height / 2

  return { x, y, width, height }
}

function renderBar(
  context: RenderContext,
  exercise: Exercise,
  lanes: readonly Lane[],
  barIndex: number,
  stave: Stave,
): EventNoteReference[] {
  const barTicks = ticksPerBar(exercise.timeSignature)
  const barStart = barIndex * barTicks
  const references: EventNoteReference[] = []
  const voices: VexVoice[] = []
  const allBeams: Beam[] = []
  const allTuplets: Tuplet[] = []

  for (const lane of lanes) {
    const laneEvents = exercise.events.filter(
      (event) =>
        lane.voices.includes(event.voice) &&
        event.tick >= barStart &&
        event.tick < barStart + barTicks,
    )
    const timeline = buildTimeline(
      laneEvents,
      barStart,
      barTicks,
      exercise.timeSignature,
      lane.mergeToShortestDuration,
    )
    const rendered: RenderedEntry[] = timeline.map((entry) => ({
      entry,
      note: createStaveNote(entry, lane),
    }))
    for (const { entry, note } of rendered) {
      entry.events.forEach((event, keyIndex) => {
        references.push({ event, keyIndex, note })
      })
    }

    const tupletEntries = new Map<string, RenderedEntry[]>()
    for (const renderedEntry of rendered) {
      const tuplet = renderedEntry.entry.tuplet
      if (!tuplet) continue
      const key = `${tuplet.start}:${tuplet.step}:${tuplet.num}:${tuplet.den}`
      const group = tupletEntries.get(key) ?? []
      group.push(renderedEntry)
      tupletEntries.set(key, group)
    }

    for (const group of tupletEntries.values()) {
      const spec = group[0].entry.tuplet
      if (!spec) continue
      allTuplets.push(
        new Tuplet(
          group.map(({ note }) => note),
          {
            numNotes: spec.num,
            notesOccupied: spec.den,
            location:
              lane.stemDirection === Stem.DOWN
                ? Tuplet.LOCATION_BOTTOM
                : Tuplet.LOCATION_TOP,
            bracketed: group.some(({ entry }) => entry.events.length === 0),
          },
        ).setStyle(ENGRAVING_STYLE),
      )
    }

    const voice = new VexVoice({
      numBeats: exercise.timeSignature.beats,
      beatValue: exercise.timeSignature.beatValue,
    }).addTickables(rendered.map(({ note }) => note))

    allBeams.push(
      ...Beam.generateBeams(
        rendered.map(({ note }) => note),
        {
          groups: beamGroups(exercise.timeSignature),
          stemDirection: lane.stemDirection,
          maintainStemDirections: true,
          beamRests: false,
        },
      ).map((beam) => beam.setStyle(ENGRAVING_STYLE)),
    )
    voices.push(voice)
  }

  new Formatter()
    .joinVoices(voices)
    .formatToStave(voices, stave, { context, alignRests: false })
  voices.forEach((voice) => voice.draw(context, stave))
  allBeams.forEach((beam) => beam.setContext(context).draw())
  allTuplets.forEach((tuplet) => tuplet.setContext(context).draw())
  return references
}

/**
 * Renders an exercise into an SVG container and returns renderer-agnostic
 * coordinates for the dynamic overlay.
 */
export function renderExerciseNotation(
  container: HTMLDivElement,
  exercise: Exercise,
  barsPerLine = exercise.bars,
): NotationLayout {
  container.replaceChildren()

  const safeBarsPerLine = Math.max(
    1,
    Math.min(exercise.bars, Math.floor(barsPerLine)),
  )
  const rowCount = Math.ceil(exercise.bars / safeBarsPerLine)
  const width =
    Math.min(exercise.bars, safeBarsPerLine) * BAR_WIDTH +
    HORIZONTAL_PADDING * 2
  const height = rowCount * SCORE_HEIGHT
  const renderer = new Renderer(container, Renderer.Backends.SVG)
  renderer.resize(width, height)
  const context = renderer.getContext()
  context.setFillStyle('currentColor')
  context.setStrokeStyle('currentColor')

  if (context instanceof SVGContext) {
    context.setViewBox(0, 0, width, height)
    context.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    context.svg.setAttribute('aria-hidden', 'true')
    context.svg.setAttribute('fill', 'currentColor')
    context.svg.setAttribute('stroke', 'currentColor')
    context.svg.style.display = 'block'
    context.svg.style.width = '100%'
    context.svg.style.height = 'auto'
  }

  const lanes = createLanes(exercise)
  const references: EventNoteReference[] = []
  const staves: Stave[] = []

  for (let bar = 0; bar < exercise.bars; bar += 1) {
    const row = Math.floor(bar / safeBarsPerLine)
    const column = bar % safeBarsPerLine
    const stave = new Stave(
      HORIZONTAL_PADDING + column * BAR_WIDTH,
      STAVE_Y + row * SCORE_HEIGHT,
      BAR_WIDTH,
    )
    stave.setStyle(ENGRAVING_STYLE)
    stave.setDefaultLedgerLineStyle(ENGRAVING_STYLE)
    if (column === 0) {
      stave
        .addClef('percussion')
        .addTimeSignature(
          `${exercise.timeSignature.beats}/${exercise.timeSignature.beatValue}`,
        )
    }
    stave.setContext(context).draw()
    staves.push(stave)
    references.push(...renderBar(context, exercise, lanes, bar, stave))
  }

  const noteLayouts: NoteLayout[] = references
    .map(({ event, keyIndex, note }) => {
      const bbox = noteHeadBox(note, keyIndex)
      return {
        event,
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2,
        bbox,
      }
    })
    .toSorted(
      (left, right) =>
        left.event.tick - right.event.tick ||
        left.event.voice.localeCompare(right.event.voice),
    )

  const barBoundaries = [
    staves[0]?.getNoteStartX() ?? HORIZONTAL_PADDING,
    ...staves.slice(1).map((stave) => stave.getNoteStartX()),
    staves.at(-1)?.getNoteEndX() ?? width - HORIZONTAL_PADDING,
  ]
  const barTicks = ticksPerBar(exercise.timeSignature)
  const barLayouts = staves.map((stave, index) => ({
    startTick: index * barTicks,
    endTick: (index + 1) * barTicks,
    startX: stave.getNoteStartX(),
    endX: stave.getNoteEndX(),
    staffTop: stave.getTopLineTopY(),
    staffBottom: stave.getBottomLineBottomY(),
  }))

  return {
    width,
    height,
    noteLayouts,
    barBoundaries,
    barLayouts,
    staffBounds: {
      top: staves[0]?.getTopLineTopY() ?? STAVE_Y,
      bottom: staves[0]?.getBottomLineBottomY() ?? STAVE_Y + 60,
    },
  }
}
