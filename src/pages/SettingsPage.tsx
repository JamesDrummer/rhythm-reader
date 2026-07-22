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
import { useTheme, type ThemePreference } from '@/theme'

const VOICE_LABELS: Record<Voice, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hihat: 'Hi-hat',
}

const MODIFIER_KEYS = new Set([
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'CapsLock',
])

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
  const { preference, setPreference } = useTheme()
  const [mapping, setMapping] = useState(loadKeyboardMapping)
  const [listeningVoice, setListeningVoice] = useState<Voice | null>(null)
  const latencyOffset = loadDeviceLatencyOffset()

  useEffect(() => {
    if (!listeningVoice) return

    const captureKey = (event: KeyboardEvent) => {
      if (MODIFIER_KEYS.has(event.code)) return

      event.preventDefault()
      window.removeEventListener('keydown', captureKey)

      if (event.code === 'Escape') {
        setListeningVoice(null)
        return
      }

      const next = remapVoice(mapping, listeningVoice, event.code)
      saveKeyboardMapping(next)
      setMapping(next)
      setListeningVoice(null)
    }

    window.addEventListener('keydown', captureKey)
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
        <section aria-labelledby="appearance-heading">
          <h2 className="text-base font-semibold" id="appearance-heading">
            Appearance
          </h2>
          <p className="mt-2 text-sm leading-6 text-bhda-text/70">
            Choose a theme, or let Rhythm Reader follow this device.
          </p>
          <label className="mt-4 block max-w-sm text-sm font-semibold">
            Theme
            <select
              className="mt-2 h-11 w-full rounded-md border bg-bhda-surface px-3 text-sm text-bhda-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhda-accent"
              onChange={(event) =>
                setPreference(event.target.value as ThemePreference)
              }
              value={preference}
            >
              <option value="system">Use device setting</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </section>

        <section aria-labelledby="keyboard-heading">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold" id="keyboard-heading">
                Keyboard controls
              </h2>
              <p className="mt-2 text-sm leading-6 text-bhda-text/70">
                Choose a drum, then press the key you want to use.
              </p>
            </div>
            <Button onClick={resetMapping} size="icon" variant="ghost">
              <RotateCcw aria-hidden="true" className="size-4" />
              <span className="sr-only">Reset default keys</span>
            </Button>
          </div>

          <div className="mt-6 divide-y rounded-xl border bg-bhda-surface">
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
          <p className="mt-2 text-sm leading-6 text-bhda-text/70">
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
