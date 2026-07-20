import { useContext } from 'react'
import { AppServicesContext, type AppServices } from './context'

export function useAppServices(): AppServices {
  return useContext(AppServicesContext)
}
