import { useMemo, type ReactNode } from 'react'
import { AppServicesContext, localServices, type AppServices } from './context'

export type { AppServices } from './context'

export function AppServicesProvider({
  children,
  value,
}: {
  children: ReactNode
  value?: AppServices
}) {
  const services = useMemo(() => value ?? localServices, [value])
  return (
    <AppServicesContext.Provider value={services}>
      {children}
    </AppServicesContext.Provider>
  )
}
