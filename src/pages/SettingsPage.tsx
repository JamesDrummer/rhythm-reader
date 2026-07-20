import { Link } from 'react-router-dom'
import { PageIntro } from '@/components/PageIntro'
import { Button } from '@/components/ui/button'

export function SettingsPage() {
  return (
    <PageIntro
      description="Adjust your controls and keep your device set up for accurate rhythm practice."
      eyebrow="Preferences"
      title="Settings"
    >
      <h2 className="text-base font-semibold">Settings placeholder</h2>
      <p className="mt-2 text-sm leading-6 text-black/70">
        Key mappings and device preferences will be available here.
      </p>
      <Button asChild className="mt-6">
        <Link to="/calibrate">Open calibration</Link>
      </Button>
    </PageIntro>
  )
}
