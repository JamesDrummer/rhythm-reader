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
      className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"
      role="group"
    >
      {PADS.map(({ hint, label, voice }) => (
        <button
          aria-label={`Play ${label}`}
          className={cn(
            'min-h-28 touch-manipulation select-none rounded-xl border-2 border-bhda-purple bg-white px-4 py-5 text-bhda-purple shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhda-purple focus-visible:ring-offset-2 focus-visible:ring-offset-bhda-background active:bg-bhda-purple active:text-white sm:min-h-40',
            disabled && 'cursor-not-allowed opacity-50',
          )}
          disabled={disabled}
          key={voice}
          onContextMenu={(event) => event.preventDefault()}
          onPointerDown={(event) => strike(event, voice)}
          type="button"
        >
          <span className="block text-base font-bold">{label}</span>
          <span className="mt-2 block text-sm font-medium opacity-70">
            {hint}
          </span>
        </button>
      ))}
    </div>
  )
}
