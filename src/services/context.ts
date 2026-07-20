import { createContext } from 'react'
import {
  BuiltInSource,
  CustomSource,
  MergedExerciseSource,
  type CatalogueScope,
  type ExerciseSource,
  type WritableExerciseSource,
} from '@/content'
import {
  LocalStorageProgressStore,
  type ProgressScope,
  type ProgressStore,
} from '@/progress'

export interface AppServices {
  catalogueScope: CatalogueScope
  customExerciseSource: WritableExerciseSource
  exerciseSource: ExerciseSource
  progressScope: ProgressScope
  progressStore: ProgressStore
}

const localCustomSource = new CustomSource()

export const localServices: AppServices = {
  catalogueScope: { learnerId: 'local-device' },
  customExerciseSource: localCustomSource,
  exerciseSource: new MergedExerciseSource([
    new BuiltInSource(),
    localCustomSource,
  ]),
  progressScope: { learnerId: 'local-device' },
  progressStore: new LocalStorageProgressStore(),
}

export const AppServicesContext = createContext<AppServices>(localServices)
