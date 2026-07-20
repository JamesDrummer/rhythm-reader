import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { RouteLoading } from '@/components/RouteLoading'

const CalibratePage = lazy(() =>
  import('@/pages/CalibratePage').then(({ CalibratePage: Page }) => ({
    default: Page,
  })),
)
const EditorPage = lazy(() =>
  import('@/pages/EditorPage').then(({ EditorPage: Page }) => ({
    default: Page,
  })),
)
const LevelSelectPage = lazy(() =>
  import('@/pages/LevelSelectPage').then(({ LevelSelectPage: Page }) => ({
    default: Page,
  })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then(({ NotFoundPage: Page }) => ({
    default: Page,
  })),
)
const PlayPage = lazy(() =>
  import('@/pages/PlayPage').then(({ PlayPage: Page }) => ({ default: Page })),
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then(({ SettingsPage: Page }) => ({
    default: Page,
  })),
)

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<LevelSelectPage />} />
          <Route path="play/:exerciseId" element={<PlayPage />} />
          <Route path="editor" element={<EditorPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="calibrate" element={<CalibratePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
