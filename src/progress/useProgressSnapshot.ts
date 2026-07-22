import { useEffect, useMemo, useState } from 'react'
import type { Level } from '@/model'
import { useAppServices } from '@/services/useAppServices'
import { deriveLevelProgress } from './unlocks'
import type { ProgressSnapshot } from './types'

interface LoadedProgress {
  levels: readonly Level[]
  snapshot: ProgressSnapshot
  error: string | null
}

function emptySnapshot(levels: readonly Level[]): ProgressSnapshot {
  return {
    exercises: {},
    levels: deriveLevelProgress(levels, {}),
  }
}

export function useProgressSnapshot(levels: readonly Level[]): {
  snapshot: ProgressSnapshot
  loading: boolean
  error: string | null
} {
  const { progressScope, progressStore } = useAppServices()
  const [loadedProgress, setLoadedProgress] = useState<LoadedProgress | null>(
    null,
  )
  const fallbackSnapshot = useMemo(() => emptySnapshot(levels), [levels])

  useEffect(() => {
    let active = true

    void progressStore
      .load(progressScope, levels)
      .then((snapshot) => {
        if (active) {
          setLoadedProgress({ levels, snapshot, error: null })
        }
      })
      .catch(() => {
        if (active) {
          setLoadedProgress({
            levels,
            snapshot: fallbackSnapshot,
            error: 'Your saved progress could not be loaded.',
          })
        }
      })

    return () => {
      active = false
    }
  }, [fallbackSnapshot, levels, progressScope, progressStore])

  const currentProgress =
    loadedProgress?.levels === levels ? loadedProgress : null

  return {
    snapshot: currentProgress?.snapshot ?? fallbackSnapshot,
    loading: currentProgress === null,
    error: currentProgress?.error ?? null,
  }
}
