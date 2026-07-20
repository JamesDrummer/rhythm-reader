import { createContext } from 'react'
import {
  BuiltInSource,
  CustomSource,
  MergedExerciseSource,
  type CatalogueScope,
  type ExerciseSource,
} from '@/content'
import {
  LocalStorageProgressStore,
  type ProgressScope,
  type ProgressStore,
} from '@/progress'

export interface AppServices {
  catalogueScope: CatalogueScope
  exerciseSource: ExerciseSource
  progressScope: ProgressScope
  progressStore: ProgressStore
}

export const localServices: AppServices = {
  catalogueScope: { learnerId: 'local-device' },
  exerciseSource: new MergedExerciseSource([
    new BuiltInSource(),
    new CustomSource(),
  ]),
  progressScope: { learnerId: 'local-device' },
  progressStore: new LocalStorageProgressStore(),
}

export const AppServicesContext = createContext<AppServices>(localServices)
