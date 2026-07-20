import { PageIntro } from '@/components/PageIntro'

export function CalibratePage() {
  return (
    <PageIntro
      description="Calibration will help Rhythm Reader measure your timing fairly on this device."
      eyebrow="Device timing"
      title="Latency calibration"
    >
      <h2 className="text-base font-semibold">Calibration placeholder</h2>
      <p className="mt-2 text-sm leading-6 text-black/70">
        The tap-along calibration test will be added in a later build stage.
      </p>
    </PageIntro>
  )
}
