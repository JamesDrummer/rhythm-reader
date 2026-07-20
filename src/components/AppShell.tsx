import { Outlet } from 'react-router-dom'
import { CalibrationBanner } from '@/components/CalibrationBanner'
import { Header } from '@/components/Header'

export function AppShell() {
  return (
    <div className="min-h-svh bg-bhda-background">
      <Header />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <CalibrationBanner />
        <Outlet />
      </main>
    </div>
  )
}
