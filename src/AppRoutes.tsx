import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { CalibratePage } from '@/pages/CalibratePage'
import { EditorPage } from '@/pages/EditorPage'
import { LevelSelectPage } from '@/pages/LevelSelectPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PlayPage } from '@/pages/PlayPage'
import { SettingsPage } from '@/pages/SettingsPage'

export function AppRoutes() {
  return (
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
  )
}
