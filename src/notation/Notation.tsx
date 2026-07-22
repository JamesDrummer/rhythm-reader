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
    const output = outputRef.current
    const render = () => {
      const narrow = output.clientWidth > 0 && output.clientWidth < 480
      setLayout(
        renderExerciseNotation(output, exercise, narrow ? 1 : exercise.bars),
      )
    }

    render()
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(render)
    observer.observe(output)
    return () => observer.disconnect()
  }, [exercise])

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
