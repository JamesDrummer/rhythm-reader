import { VOICES, type Voice } from '@/model'
import type { HitRating, ScoreRecord } from '@/scoring'

const VIEW_WIDTH = 760
const LABEL_WIDTH = 76
const TRACK_START = 92
const TRACK_END = 744
const LANE_HEIGHT = 56
const TOP_GUTTER = 30

const VOICE_LABELS: Record<Voice, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hihat: 'Hi-hat',
}

const RATING_COLOURS: Record<HitRating, string> = {
  perfect: 'rgb(var(--bhda-perfect))',
  good: 'rgb(var(--bhda-good))',
  miss: 'rgb(var(--bhda-miss))',
}

const RATING_DOT_CLASSES: Record<HitRating, string> = {
  perfect: 'bg-bhda-perfect',
  good: 'bg-bhda-good',
  miss: 'bg-bhda-miss',
}

function activeVoices(score: ScoreRecord): Voice[] {
  return VOICES.filter(
    (voice) =>
      score.perVoice[voice].expectedCount > 0 ||
      score.rawHits.some((hit) => hit.voice === voice),
  )
}

function xForTime(score: ScoreRecord, timeMs: number): number {
  const duration = score.timeline.endTimeMs - score.timeline.startTimeMs
  if (duration <= 0) return TRACK_START

  const progress = (timeMs - score.timeline.startTimeMs) / duration
  return (
    TRACK_START + Math.min(1, Math.max(0, progress)) * (TRACK_END - TRACK_START)
  )
}

export function HitTimeline({ score }: { score: ScoreRecord }) {
  const voices = activeVoices(score)
  const matchedRatings = new Map(
    score.noteResults.flatMap((result) =>
      result.hitIndex === null
        ? []
        : [[result.hitIndex, result.rating] as const],
    ),
  )
  const height = TOP_GUTTER + Math.max(voices.length, 1) * LANE_HEIGHT + 12

  return (
    <div>
      <div className="rounded-xl border bg-bhda-background p-2 sm:p-3">
        <svg
          aria-labelledby="hit-timeline-title hit-timeline-description"
          className="block h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        >
          <title id="hit-timeline-title">Hit timing timeline</title>
          <desc id="hit-timeline-description">
            Hollow dots show the correct timing. Coloured dots show your hits;
            dots to the left were early and dots to the right were late.
          </desc>

          {score.timeline.barLineTimeMs.map((timeMs, index) => {
            const x = xForTime(score, timeMs)
            return (
              <g data-testid={`bar-line-${index}`} key={`${timeMs}-${index}`}>
                <line
                  stroke="rgb(var(--bhda-text))"
                  strokeOpacity={
                    index === 0 ||
                    index === score.timeline.barLineTimeMs.length - 1
                      ? 0.32
                      : 0.18
                  }
                  strokeWidth={
                    index === 0 ||
                    index === score.timeline.barLineTimeMs.length - 1
                      ? 2
                      : 1
                  }
                  x1={x}
                  x2={x}
                  y1={20}
                  y2={height - 8}
                />
                {index < score.timeline.barLineTimeMs.length - 1 && (
                  <text
                    fill="rgb(var(--bhda-text))"
                    fontSize="10"
                    fontWeight="600"
                    opacity="0.48"
                    textAnchor="middle"
                    x={x + 12}
                    y={12}
                  >
                    {index + 1}
                  </text>
                )}
              </g>
            )
          })}

          {voices.map((voice, laneIndex) => {
            const y = TOP_GUTTER + laneIndex * LANE_HEIGHT + LANE_HEIGHT / 2
            const expected = score.noteResults.filter(
              (result) => result.event.voice === voice,
            )
            const actual = score.rawHits.flatMap((hit, hitIndex) =>
              hit.voice === voice ? [{ hit, hitIndex }] : [],
            )

            return (
              <g key={voice}>
                <text
                  fill="rgb(var(--bhda-text))"
                  fontSize="12"
                  fontWeight="700"
                  textAnchor="end"
                  x={LABEL_WIDTH}
                  y={y + 4}
                >
                  {VOICE_LABELS[voice]}
                </text>
                <line
                  stroke="rgb(var(--bhda-text))"
                  strokeOpacity="0.14"
                  x1={TRACK_START}
                  x2={TRACK_END}
                  y1={y}
                  y2={y}
                />

                {expected.map((result) => (
                  <circle
                    cx={xForTime(score, result.expectedTimeMs)}
                    cy={y}
                    data-testid={`expected-${voice}-${result.noteIndex}`}
                    fill="rgb(var(--bhda-background))"
                    key={result.noteIndex}
                    r="6"
                    stroke="rgb(var(--bhda-text))"
                    strokeOpacity="0.48"
                    strokeWidth="1.5"
                  />
                ))}

                {actual.map(({ hit, hitIndex }) => {
                  const rating = matchedRatings.get(hitIndex) ?? 'miss'
                  return (
                    <circle
                      cx={xForTime(score, hit.timeMs)}
                      cy={y}
                      data-rating={rating}
                      data-testid={`actual-${voice}-${hitIndex}`}
                      fill={RATING_COLOURS[rating]}
                      key={hitIndex}
                      r="4"
                      stroke="rgb(var(--bhda-surface))"
                      strokeWidth="1"
                    />
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-bhda-text/55">
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-full border border-bhda-text/50 bg-bhda-background" />
          Correct timing
        </span>
        {(['perfect', 'good', 'miss'] as const).map((rating) => (
          <span className="inline-flex items-center gap-2" key={rating}>
            <span
              className={`size-3 rounded-full ${RATING_DOT_CLASSES[rating]}`}
            />
            {rating === 'miss'
              ? 'Miss or extra'
              : rating[0].toUpperCase() + rating.slice(1)}
          </span>
        ))}
      </div>
    </div>
  )
}
