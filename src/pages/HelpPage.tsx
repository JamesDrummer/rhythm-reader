import { Link } from 'react-router-dom'
import { PageIntro } from '@/components/PageIntro'
import { Button } from '@/components/ui/button'
import { STAR_THRESHOLDS_PERCENT, TIMING_WINDOWS_MS } from '@/config'
import { keyCodeLabel, loadKeyboardMapping } from '@/input'
import type { Voice } from '@/model'

const VOICE_LABELS: Record<Voice, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hihat: 'Hi-hat',
}

export function HelpPage() {
  const mapping = loadKeyboardMapping()

  return (
    <PageIntro
      description="Everything you need to start reading, playing and understanding your results."
      eyebrow="Help and about"
      title="How Rhythm Reader works"
    >
      <div className="space-y-8">
        <section aria-labelledby="controls-heading">
          <h2 className="text-xl font-bold" id="controls-heading">
            Play the drums
          </h2>
          <p className="mt-2 text-sm leading-6 text-black/70">
            On a keyboard, use the keys below. On a touch screen, use the three
            pads that appear during an exercise. Rhythm Reader listens from the
            end of the count-in until the final note has had time to land.
          </p>
          <dl className="mt-4 divide-y rounded-xl border">
            {(Object.keys(VOICE_LABELS) as Voice[]).map((voice) => (
              <div
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                key={voice}
              >
                <dt className="font-semibold">{VOICE_LABELS[voice]}</dt>
                <dd className="text-right font-semibold text-black/60">
                  {mapping[voice].map(keyCodeLabel).join(' or ')}
                </dd>
              </div>
            ))}
          </dl>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/settings">Change keyboard controls</Link>
          </Button>
        </section>

        <section aria-labelledby="scoring-heading">
          <h2 className="text-xl font-bold" id="scoring-heading">
            How scoring works
          </h2>
          <p className="mt-2 text-sm leading-6 text-black/70">
            Each written note is matched to your nearest hit on the same drum. A
            very close hit is Perfect, a near hit is Good, and a missed note
            scores zero. Extra hits reduce the result a little. Later levels use
            tighter timing windows, so accuracy matters more as you progress.
          </p>
          <div className="mt-4 rounded-xl bg-bhda-background p-4 text-sm leading-6">
            Beginner exercises allow up to {TIMING_WINDOWS_MS.beginner.goodMs}{' '}
            ms for a Good hit. You earn one star from{' '}
            {STAR_THRESHOLDS_PERCENT.one}%, two from{' '}
            {STAR_THRESHOLDS_PERCENT.two}% and three from{' '}
            {STAR_THRESHOLDS_PERCENT.three}%.
          </div>
        </section>

        <section aria-labelledby="calibration-heading">
          <h2 className="text-xl font-bold" id="calibration-heading">
            Why calibration matters
          </h2>
          <p className="mt-2 text-sm leading-6 text-black/70">
            Every phone, tablet and computer has a slightly different delay
            between a tap and the sound you hear. The short calibration check
            measures that delay on this device, then Rhythm Reader allows for it
            when scoring. That keeps the result focused on your timing, not the
            hardware.
          </p>
          <Button asChild className="mt-4">
            <Link to="/calibrate">Calibrate this device</Link>
          </Button>
        </section>

        <section aria-labelledby="about-heading">
          <h2 className="text-xl font-bold" id="about-heading">
            About Rhythm Reader
          </h2>
          <p className="mt-2 text-sm leading-6 text-black/70">
            Rhythm Reader is a BHDA practice tool for learning to read drum
            rhythms accurately. Your progress and custom exercises stay in this
            browser on this device.
          </p>
        </section>
      </div>
    </PageIntro>
  )
}
