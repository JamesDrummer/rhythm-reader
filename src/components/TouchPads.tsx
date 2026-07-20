import type { PointerEvent } from 'react'
import type { TouchPadInput } from '@/input'
import type { Voice } from '@/model'
import { cn } from '@/lib/utils'

const PADS: readonly { voice: Voice; label: string; hint: string }[] = [
  { voice: 'kick', label: 'Kick', hint: 'Bass drum' },
  { voice: 'snare', label: 'Snare', hint: 'Backbeat' },
  { voice: 'hihat', label: 'Hi-hat', hint: 'Timekeeper' },
]

interface TouchPadsProps {
  disabled?: boolean
  source: TouchPadInput
}

export function TouchPads({ disabled = false, source }: TouchPadsProps) {
  const strike = (event: PointerEvent<HTMLButtonElement>, voice: Voice) => {
    event.preventDefault()
    source.pointerDown(voice)
  }

  return (
    <div
      aria-label="Drum touch pads"
      className="grid grid-cols-3 gap-2 sm:gap-3"
      role="group"
    >
      {PADS.map(({ hint, label, voice }) => (
        <button
          aria-label={`Play ${label}`}
          className={cn(
            'min-h-24 touch-none select-none rounded-xl border-2 border-bhda-purple bg-white px-2 py-3 text-bhda-purple shadow-[0_4px_0_#614E90] transition-[transform,background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhda-purple focus-visible:ring-offset-2 focus-visible:ring-offset-bhda-background active:translate-y-1 active:bg-bhda-purple active:text-white active:shadow-none sm:min-h-32 sm:px-4 sm:py-4',
            disabled && 'cursor-not-allowed opacity-50',
          )}
          disabled={disabled}
          key={voice}
          onContextMenu={(event) => event.preventDefault()}
          onPointerDown={(event) => strike(event, voice)}
          type="button"
        >
          <span className="block text-sm font-bold sm:text-base">{label}</span>
          <span className="mt-1 hidden text-xs font-medium opacity-70 sm:block sm:text-sm">
            {hint}
          </span>
        </button>
      ))}
    </div>
  )
}
