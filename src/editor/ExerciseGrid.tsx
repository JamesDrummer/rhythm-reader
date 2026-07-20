import type { CSSProperties } from 'react'
import { PPQ, VOICES, type Voice } from '@/model'
import {
  beatCount,
  subdivisionCount,
  subdivisionTicks,
  toggleGridHit,
  type BeatResolution,
  type EditorGrid,
} from './grid'

const VOICE_LABELS: Record<Voice, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hihat: 'Hi-hat',
}

const RESOLUTION_LABELS: Record<BeatResolution, string> = {
  sixteenth: '16ths',
  tripletEighth: 'Triplets',
}

export function ExerciseGrid({
  grid,
  onChange,
  onResolutionChange,
}: {
  grid: EditorGrid
  onChange: (grid: EditorGrid) => void
  onResolutionChange: (beatIndex: number, resolution: BeatResolution) => void
}) {
  const beats = beatCount(grid.bars)
  const beatColumns = {
    gridTemplateColumns: `repeat(${beats}, minmax(7.5rem, 1fr))`,
  } satisfies CSSProperties

  return (
    <div className="overflow-x-auto pb-2">
      <div className="min-w-max">
        <div className="flex">
          <div className="w-20 shrink-0" />
          <div className="grid flex-1" style={beatColumns}>
            {grid.resolutions.map((resolution, beatIndex) => (
              <div
                className={`px-1 pb-2 ${
                  beatIndex % 4 === 0 ? 'border-l border-black/20' : ''
                }`}
                key={beatIndex}
              >
                <label className="block text-xs font-semibold text-black/60">
                  B{Math.floor(beatIndex / 4) + 1} · {(beatIndex % 4) + 1}
                  <select
                    aria-label={`Bar ${Math.floor(beatIndex / 4) + 1}, beat ${
                      (beatIndex % 4) + 1
                    } resolution`}
                    className="mt-1 h-9 w-full rounded-md border bg-white px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhda-purple"
                    onChange={(event) =>
                      onResolutionChange(
                        beatIndex,
                        event.target.value as BeatResolution,
                      )
                    }
                    value={resolution}
                  >
                    {Object.entries(RESOLUTION_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
        </div>

        {VOICES.map((voice) => (
          <div className="flex" key={voice}>
            <div className="sticky left-0 z-10 flex w-20 shrink-0 items-center bg-white pr-3 text-sm font-semibold">
              {VOICE_LABELS[voice]}
            </div>
            <div className="grid flex-1" style={beatColumns}>
              {grid.resolutions.map((resolution, beatIndex) => {
                const columns = subdivisionCount(resolution)
                return (
                  <div
                    className={`grid gap-1 border-t px-1 py-2 ${
                      beatIndex % 4 === 0 ? 'border-l border-l-black/20' : ''
                    }`}
                    key={beatIndex}
                    style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
                  >
                    {Array.from({ length: columns }, (_, subdivisionIndex) => {
                      const step = subdivisionTicks(resolution)
                      const tick = beatIndex * PPQ + subdivisionIndex * step
                      const active = grid.events.some(
                        (event) => event.voice === voice && event.tick === tick,
                      )
                      const label = `${VOICE_LABELS[voice]}, bar ${
                        Math.floor(beatIndex / 4) + 1
                      }, beat ${(beatIndex % 4) + 1}, ${
                        RESOLUTION_LABELS[resolution]
                      } step ${subdivisionIndex + 1}`
                      return (
                        <button
                          aria-label={label}
                          aria-pressed={active}
                          className={`h-11 min-w-6 rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhda-purple focus-visible:ring-offset-1 ${
                            active
                              ? 'border-bhda-purple bg-bhda-purple'
                              : 'bg-black/5 hover:bg-black/10'
                          }`}
                          key={subdivisionIndex}
                          onClick={() =>
                            onChange(
                              toggleGridHit(
                                grid,
                                voice,
                                beatIndex,
                                subdivisionIndex,
                              ),
                            )
                          }
                          type="button"
                        >
                          <span className="sr-only">
                            {active ? 'Remove' : 'Add'} hit
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
