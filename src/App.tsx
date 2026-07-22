import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './AppRoutes'
import { AppServicesProvider } from '@/services/AppServices'
import { ThemeProvider } from '@/theme'

export function App() {
  return (
    <ThemeProvider>
      <AppServicesProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppServicesProvider>
    </ThemeProvider>
  )
}
