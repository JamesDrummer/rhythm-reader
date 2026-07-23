import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Overlay } from './Overlay'
import type { NotationLayout, NotationNoteLabel, NotationProps } from './types'
import { renderExerciseNotation } from './vexflowMapper'

const NOTE_LABEL_HEIGHT = 12
const NOTE_LABEL_CROP_MARGIN = 8
const EMPTY_NOTE_LABELS: readonly NotationNoteLabel[] = []

function fullViewBox(layout: NotationLayout) {
  return (
    layout.viewBox ?? {
      x: 0,
      y: 0,
      width: layout.width,
      height: layout.height,
    }
  )
}

function positionedNoteLabels(
  exercise: NotationProps['exercise'],
  layout: NotationLayout,
  noteLabels: readonly NotationNoteLabel[],
) {
  return noteLabels.flatMap((noteLabel) => {
    const event = exercise.events[noteLabel.eventIndex]
    const noteLayout = layout.noteLayouts.find(
      (candidate) => candidate.event === event,
    )
    if (!noteLayout) return []

    const barLayout = layout.barLayouts.find(
      (bar, index) =>
        event.tick >= bar.startTick &&
        (event.tick < bar.endTick || index === layout.barLayouts.length - 1),
    )
    const staffBottom = barLayout?.staffBottom ?? layout.staffBounds.bottom

    return [
      {
        ...noteLabel,
        x: noteLayout.x,
        y: Math.max(
          staffBottom + 24,
          noteLayout.bbox.y + noteLayout.bbox.height + 18,
        ),
      },
    ]
  })
}

export function Notation({
  exercise,
  clock,
  overlayRef,
  noteLabels = EMPTY_NOTE_LABELS,
  cropToContent = false,
  showClef = true,
  showTimeSignature = true,
  className,
  label = `${exercise.title} drum notation`,
}: NotationProps) {
  const outputRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<NotationLayout | null>(null)
  const hasOverlay = clock !== undefined || overlayRef !== undefined

  useLayoutEffect(() => {
    if (!outputRef.current) return
    const output = outputRef.current
    const render = () => {
      const narrow = output.clientWidth > 0 && output.clientWidth < 480
      const nextLayout = renderExerciseNotation(
        output,
        exercise,
        narrow ? 1 : exercise.bars,
        { cropToContent, showClef, showTimeSignature },
      )
      const labels = positionedNoteLabels(exercise, nextLayout, noteLabels)
      const mappedViewBox = fullViewBox(nextLayout)
      const labelledBottom = labels.length
        ? Math.max(...labels.map(({ y }) => y + NOTE_LABEL_HEIGHT)) +
          NOTE_LABEL_CROP_MARGIN
        : mappedViewBox.y + mappedViewBox.height
      const viewBox = cropToContent
        ? {
            ...mappedViewBox,
            height:
              Math.max(mappedViewBox.y + mappedViewBox.height, labelledBottom) -
              mappedViewBox.y,
          }
        : mappedViewBox

      output
        .querySelector('svg')
        ?.setAttribute(
          'viewBox',
          `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
        )
      setLayout({ ...nextLayout, viewBox })
    }

    render()
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(render)
    observer.observe(output)
    return () => observer.disconnect()
  }, [cropToContent, exercise, noteLabels, showClef, showTimeSignature])

  const labels = layout
    ? positionedNoteLabels(exercise, layout, noteLabels)
    : []
  const viewBox = layout ? fullViewBox(layout) : undefined

  return (
    <div
      aria-label={label}
      className={cn(
        'relative w-full overflow-hidden rounded-xl bg-bhda-surface text-bhda-notation shadow-sm',
        className,
      )}
      role="img"
    >
      <div ref={outputRef} />
      {layout && hasOverlay && (
        <Overlay
          clock={clock}
          exercise={exercise}
          layout={layout}
          ref={overlayRef}
        />
      )}
      {layout && viewBox && labels.length > 0 && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full text-bhda-text/70"
          preserveAspectRatio="xMidYMid meet"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        >
          {labels.map(({ eventIndex, text, x, y }, labelIndex) => (
            <text
              data-note-label-index={eventIndex}
              dominantBaseline="hanging"
              fill="currentColor"
              fontFamily="Montserrat, sans-serif"
              fontSize="12"
              fontWeight="600"
              key={`${eventIndex}-${labelIndex}`}
              textAnchor="middle"
              x={x}
              y={y}
            >
              {text}
            </text>
          ))}
        </svg>
      )}
    </div>
  )
}
