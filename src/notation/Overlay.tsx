import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Exercise, NoteEvent } from '@/model'
import {
  buildPositionAnchors,
  interpolatePlayheadPosition,
  type PlayheadPosition,
} from './playhead'
import type {
  NotationClock,
  NotationLayout,
  NoteFeedback,
  OverlayHandle,
} from './types'

const FEEDBACK_COLOURS: Record<NoteFeedback, string> = {
  perfect: '#2E7D32',
  good: '#B26A00',
  miss: '#C62828',
}

const FEEDBACK_LABELS: Record<NoteFeedback, string> = {
  perfect: 'Perfect',
  good: 'Good',
  miss: 'Miss',
}

interface FeedbackMarker {
  id: number
  feedback: NoteFeedback
}

interface OverlayProps {
  exercise: Exercise
  layout: NotationLayout
  clock?: NotationClock
}

function eventKey(event: NoteEvent): string {
  return `${event.voice}:${event.tick}`
}

export const Overlay = forwardRef<OverlayHandle, OverlayProps>(function Overlay(
  { exercise, layout, clock },
  ref,
) {
  const [feedback, setFeedback] = useState<Record<string, FeedbackMarker>>({})
  const [playhead, setPlayhead] = useState<PlayheadPosition | null>(null)
  const markerId = useRef(0)
  const anchors = useMemo(
    () => buildPositionAnchors(exercise, layout),
    [exercise, layout],
  )

  useImperativeHandle(
    ref,
    () => ({
      showFeedback(event, result) {
        markerId.current += 1
        setFeedback((current) => ({
          ...current,
          [eventKey(event)]: { id: markerId.current, feedback: result },
        }))
      },
      clearFeedback(event) {
        if (!event) {
          setFeedback({})
          return
        }

        setFeedback((current) => {
          const next = { ...current }
          delete next[eventKey(event)]
          return next
        })
      },
    }),
    [],
  )

  useEffect(() => {
    if (!clock) {
      setPlayhead(null)
      return
    }

    let frame = 0
    const update = () => {
      setPlayhead(interpolatePlayheadPosition(clock.getElapsedTicks(), anchors))
      frame = window.requestAnimationFrame(update)
    }

    frame = window.requestAnimationFrame(update)
    return () => window.cancelAnimationFrame(frame)
  }, [anchors, clock])

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
    >
      {layout.noteLayouts.map(({ event, bbox, x, y }) => {
        const marker = feedback[eventKey(event)]
        if (!marker) return null
        const colour = FEEDBACK_COLOURS[marker.feedback]
        const row = layout.barLayouts.find(
          (bar, index) =>
            event.tick >= bar.startTick &&
            (event.tick < bar.endTick ||
              index === layout.barLayouts.length - 1),
        )

        return (
          <g key={`${eventKey(event)}:${marker.id}`}>
            <rect
              fill={colour}
              height={Math.max(12, bbox.height + 6)}
              opacity="0.42"
              rx="5"
              stroke={colour}
              strokeWidth="1.5"
              width={Math.max(14, bbox.width + 6)}
              x={bbox.x - 3}
              y={bbox.y - 3}
            />
            <g>
              <animateTransform
                attributeName="transform"
                dur="700ms"
                fill="freeze"
                from="0 0"
                to="0 -12"
                type="translate"
              />
              <text
                fill={colour}
                fontFamily="Montserrat, sans-serif"
                fontSize="14"
                fontWeight="700"
                textAnchor="middle"
                x={x}
                y={Math.min(
                  y - 18,
                  (row?.staffTop ?? layout.staffBounds.top) - 8,
                )}
              >
                {FEEDBACK_LABELS[marker.feedback]}
              </text>
            </g>
          </g>
        )
      })}

      {playhead !== null && (
        <line
          stroke="#614E90"
          strokeLinecap="round"
          strokeWidth="3"
          x1={playhead.x}
          x2={playhead.x}
          y1={(playhead.staffTop ?? layout.staffBounds.top) - 18}
          y2={(playhead.staffBottom ?? layout.staffBounds.bottom) + 18}
        />
      )}
    </svg>
  )
})
