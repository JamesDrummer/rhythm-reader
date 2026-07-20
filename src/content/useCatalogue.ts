import { useEffect, useState } from 'react'
import { BUILT_IN_LEVELS } from './BuiltInSource'
import type { ExerciseSource } from './types'
import type { CatalogueScope } from './types'
import type { Level } from '@/model'

export function useCatalogue(
  source: ExerciseSource,
  scope: CatalogueScope,
): {
  error: string | null
  levels: readonly Level[]
  loading: boolean
} {
  const [levels, setLevels] = useState<readonly Level[]>(BUILT_IN_LEVELS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void source
      .loadLevels(scope)
      .then((nextLevels) => {
        if (active) {
          setError(null)
          setLevels(nextLevels)
        }
      })
      .catch(() => {
        if (active) {
          setError('Your exercise library could not be loaded.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [scope, source])

  return { error, levels, loading }
}
