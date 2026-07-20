import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  hasSeenCalibrationPrompt,
  LATENCY_CHANGE_EVENT,
  loadDeviceLatencyOffset,
  markCalibrationPromptSeen,
} from '@/input'
import { Button } from './ui/button'

export function CalibrationBanner() {
  const { pathname } = useLocation()
  const [visible, setVisible] = useState(
    () => loadDeviceLatencyOffset() === null && !hasSeenCalibrationPrompt(),
  )

  useEffect(() => {
    if (visible) markCalibrationPromptSeen()
  }, [visible])

  useEffect(() => {
    const hide = () => setVisible(false)
    window.addEventListener(LATENCY_CHANGE_EVENT, hide)
    return () => window.removeEventListener(LATENCY_CHANGE_EVENT, hide)
  }, [])

  if (!visible || pathname === '/calibrate') return null

  return (
    <aside
      aria-label="Calibration reminder"
      className="mx-auto mb-6 flex w-full max-w-3xl items-start gap-4 rounded-xl border bg-white p-4 shadow-sm sm:items-center sm:p-6"
    >
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold">Make every tap count fairly</h2>
        <p className="mt-2 text-sm leading-6 text-black/70">
          A quick timing check helps Rhythm Reader allow for this device's audio
          delay.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/calibrate">Calibrate this device</Link>
        </Button>
      </div>
      <Button
        aria-label="Dismiss calibration reminder"
        onClick={() => setVisible(false)}
        size="icon"
        variant="ghost"
      >
        <X aria-hidden="true" className="size-5" />
      </Button>
    </aside>
  )
}
