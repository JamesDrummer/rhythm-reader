import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'

const CalibratePage = lazy(() =>
  import('@/pages/CalibratePage').then((module) => ({
    default: module.CalibratePage,
  })),
)
const EditorPage = lazy(() =>
  import('@/pages/EditorPage').then((module) => ({
    default: module.EditorPage,
  })),
)
const HelpPage = lazy(() =>
  import('@/pages/HelpPage').then((module) => ({ default: module.HelpPage })),
)
const LevelSelectPage = lazy(() =>
  import('@/pages/LevelSelectPage').then((module) => ({
    default: module.LevelSelectPage,
  })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
)
const PlayPage = lazy(() =>
  import('@/pages/PlayPage').then((module) => ({ default: module.PlayPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
)

function RouteLoading() {
  return (
    <p aria-live="polite" className="text-sm font-semibold text-black/60">
      Loading Rhythm Reader…
    </p>
  )
}

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
          <Route path="help" element={<HelpPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
