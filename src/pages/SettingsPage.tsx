import { RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageIntro } from '@/components/PageIntro'
import { Button } from '@/components/ui/button'
import {
  DEFAULT_KEYBOARD_MAPPING,
  keyCodeLabel,
  loadDeviceLatencyOffset,
  loadKeyboardMapping,
  remapVoice,
  saveKeyboardMapping,
  type KeyboardMapping,
} from '@/input'
import { VOICES, type Voice } from '@/model'

const VOICE_LABELS: Record<Voice, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hihat: 'Hi-hat',
}

function signedMilliseconds(value: number): string {
  const rounded = Math.round(value)
  return `${rounded > 0 ? '+' : ''}${rounded} ms`
}

function copyDefaultMapping(): KeyboardMapping {
  return {
    kick: [...DEFAULT_KEYBOARD_MAPPING.kick],
    snare: [...DEFAULT_KEYBOARD_MAPPING.snare],
    hihat: [...DEFAULT_KEYBOARD_MAPPING.hihat],
  }
}

export function SettingsPage() {
  const [mapping, setMapping] = useState(loadKeyboardMapping)
  const [listeningVoice, setListeningVoice] = useState<Voice | null>(null)
  const latencyOffset = loadDeviceLatencyOffset()

  useEffect(() => {
    if (!listeningVoice) return

    const captureKey = (event: KeyboardEvent) => {
      event.preventDefault()
      const next = remapVoice(mapping, listeningVoice, event.code)
      saveKeyboardMapping(next)
      setMapping(next)
      setListeningVoice(null)
    }

    window.addEventListener('keydown', captureKey, { once: true })
    return () => window.removeEventListener('keydown', captureKey)
  }, [listeningVoice, mapping])

  const resetMapping = () => {
    const defaults = copyDefaultMapping()
    saveKeyboardMapping(defaults)
    setMapping(defaults)
    setListeningVoice(null)
  }

  return (
    <PageIntro
      description="Adjust your controls and keep this device set up for accurate rhythm practice."
      eyebrow="Preferences"
      title="Settings"
    >
      <div className="space-y-8">
        <section aria-labelledby="keyboard-heading">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold" id="keyboard-heading">
                Keyboard controls
              </h2>
              <p className="mt-2 text-sm leading-6 text-black/70">
                Choose a drum, then press the key you want to use.
              </p>
            </div>
            <Button onClick={resetMapping} size="icon" variant="ghost">
              <RotateCcw aria-hidden="true" className="size-4" />
              <span className="sr-only">Reset default keys</span>
            </Button>
          </div>

          <div className="mt-6 divide-y rounded-xl border bg-white">
            {VOICES.map((voice) => (
              <div
                className="flex items-center justify-between gap-4 p-4"
                key={voice}
              >
                <span className="text-sm font-semibold">
                  {VOICE_LABELS[voice]}
                </span>
                <Button
                  aria-label={`Remap ${VOICE_LABELS[voice]}`}
                  onClick={() => setListeningVoice(voice)}
                  variant="outline"
                >
                  {listeningVoice === voice
                    ? 'Press a key...'
                    : mapping[voice].map(keyCodeLabel).join(' or ')}
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="latency-heading">
          <h2 className="text-base font-semibold" id="latency-heading">
            Device timing
          </h2>
          <p className="mt-2 text-sm leading-6 text-black/70">
            {latencyOffset === null
              ? 'This device has not been calibrated yet.'
              : `Saved timing offset: ${signedMilliseconds(latencyOffset)}.`}
          </p>
          <Button asChild className="mt-4">
            <Link to="/calibrate">
              {latencyOffset === null
                ? 'Calibrate this device'
                : 'Run calibration again'}
            </Link>
          </Button>
        </section>
      </div>
    </PageIntro>
  )
}
