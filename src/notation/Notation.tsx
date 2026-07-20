import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Overlay } from './Overlay'
import type { NotationLayout, NotationProps } from './types'
import { renderExerciseNotation } from './vexflowMapper'

export function Notation({
  exercise,
  clock,
  overlayRef,
  className,
  label = `${exercise.title} drum notation`,
}: NotationProps) {
  const outputRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<NotationLayout | null>(null)

  useLayoutEffect(() => {
    if (!outputRef.current) return
    setLayout(renderExerciseNotation(outputRef.current, exercise))
  }, [exercise])

  return (
    <div
      aria-label={label}
      className={cn(
        'relative w-full overflow-hidden rounded-xl bg-white shadow-sm',
        className,
      )}
      role="img"
    >
      <div ref={outputRef} />
      {layout && (
        <Overlay
          clock={clock}
          exercise={exercise}
          layout={layout}
          ref={overlayRef}
        />
      )}
    </div>
  )
}
