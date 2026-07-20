import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './AppRoutes'
import { AppServicesProvider } from '@/services/AppServices'

export function App() {
  return (
    <AppServicesProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppServicesProvider>
  )
}
