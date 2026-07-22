import { useEffect, useRef, useState } from 'react'
import {
  createAudioContext,
  SamplePlayer,
  Transport,
  type TransportTiming,
} from '@/audio'
import { PageIntro } from '@/components/PageIntro'
import { TouchPads } from '@/components/TouchPads'
import { Button } from '@/components/ui/button'
import { CALIBRATION } from '@/config'
import {
  KeyboardInput,
  keyCodeLabel,
  LATENCY_CHANGE_EVENT,
  loadKeyboardMapping,
  medianSignedOffset,
  saveDeviceLatencyOffset,
  TouchPadInput,
  type InputHit,
} from '@/input'
import type { Exercise } from '@/model'

type CalibrationPhase = 'idle' | 'preparing' | 'running' | 'complete' | 'error'

interface CalibrationEngine {
  context: AudioContext
  player: SamplePlayer
  transport: Transport
}

const CALIBRATION_EXERCISE: Exercise = {
  id: 'device-latency-calibration',
  title: 'Device latency calibration',
  tempo: CALIBRATION.tempo,
  timeSignature: { beats: 4, beatValue: 4 },
  bars: 8,
  events: [],
  tier: 'beginner',
  listenFirstAllowed: false,
  modes: ['playAlong'],
}

const beatDurationMs = 60_000 / CALIBRATION.tempo

function signedMilliseconds(value: number): string {
  const rounded = Math.round(value)
  return `${rounded > 0 ? '+' : ''}${rounded} ms`
}

export function CalibratePage() {
  const engineRef = useRef<CalibrationEngine | null>(null)
  const keyboardRef = useRef<KeyboardInput | null>(null)
  const touchRef = useRef<TouchPadInput | null>(null)
  const unsubscribeRef = useRef<(() => void)[]>([])
  const timingRef = useRef<TransportTiming | null>(null)
  const offsetsRef = useRef<number[]>([])
  const phaseRef = useRef<CalibrationPhase>('idle')
  const [phase, setPhase] = useState<CalibrationPhase>('idle')
  const [tapCount, setTapCount] = useState(0)
  const [measuredOffset, setMeasuredOffset] = useState<number | null>(null)
  const [message, setMessage] = useState(
    'Press start, then tap once with every click. Your first four taps help you settle in; the next twelve are measured.',
  )
  const [touchSource, setTouchSource] = useState<TouchPadInput | null>(null)
  const keyHint = Object.values(loadKeyboardMapping())
    .flat()
    .map(keyCodeLabel)
    .join(', ')

  const stopInputs = () => {
    keyboardRef.current?.stop()
    touchRef.current?.stop()
    unsubscribeRef.current.forEach((unsubscribe) => unsubscribe())
    unsubscribeRef.current = []
  }

  useEffect(
    () => () => {
      stopInputs()
      const engine = engineRef.current
      engine?.transport.stop()
      if (engine) void engine.context.close()
    },
    [],
  )

  const finishCalibration = (offsets: readonly number[]) => {
    const offset = medianSignedOffset(offsets, CALIBRATION.discardCount)
    saveDeviceLatencyOffset(offset)
    window.dispatchEvent(new Event(LATENCY_CHANGE_EVENT))
    engineRef.current?.transport.stop()
    stopInputs()
    phaseRef.current = 'complete'
    setPhase('complete')
    setMeasuredOffset(offset)
    setMessage(
      'That is saved for this device. Rhythm Reader will automatically allow for this difference when it scores your playing.',
    )
  }

  const handleHit = (hit: InputHit) => {
    if (phaseRef.current !== 'running') return

    try {
      engineRef.current?.player.playNow(hit.voice)
    } catch {
      phaseRef.current = 'error'
      setPhase('error')
      setMessage('The hit sound could not play. Please start the check again.')
      stopInputs()
      return
    }

    const timing = timingRef.current
    if (!timing) return

    const firstClickMs = timing.countInStartTime * 1_000
    const nearestBeat = Math.round((hit.timeMs - firstClickMs) / beatDurationMs)
    const clickTimeMs = firstClickMs + nearestBeat * beatDurationMs
    const offsets = [...offsetsRef.current, hit.timeMs - clickTimeMs]
    offsetsRef.current = offsets
    setTapCount(offsets.length)

    if (offsets.length === CALIBRATION.tapCount) {
      finishCalibration(offsets)
    } else if (offsets.length < CALIBRATION.discardCount) {
      setMessage('Keep going and relax into the click.')
    } else if (offsets.length === CALIBRATION.discardCount) {
      setMessage('Nicely settled. The next twelve taps are being measured.')
    } else {
      setMessage('Good. Keep tapping once with every click.')
    }
  }

  const startCalibration = async () => {
    setPhase('preparing')
    phaseRef.current = 'preparing'
    setTapCount(0)
    setMeasuredOffset(null)
    offsetsRef.current = []
    setMessage('Getting the click ready...')
    stopInputs()
    engineRef.current?.transport.stop()

    try {
      let engine = engineRef.current
      if (!engine) {
        const context = createAudioContext()
        const player = new SamplePlayer(context)
        engine = { context, player, transport: new Transport(player) }
        engineRef.current = engine
      }

      if (!engine.player.isUnlocked) await engine.player.unlock()
      await engine.player.preload()

      const keyboard = new KeyboardInput(engine.context)
      const touch = new TouchPadInput(engine.context)
      keyboardRef.current = keyboard
      touchRef.current = touch
      setTouchSource(touch)
      unsubscribeRef.current = [
        keyboard.subscribe(handleHit),
        touch.subscribe(handleHit),
      ]

      const timing = engine.transport.start(CALIBRATION_EXERCISE, 'attempt', {
        onExerciseEnd: () => {
          if (phaseRef.current !== 'running') return
          stopInputs()
          phaseRef.current = 'error'
          setPhase('error')
          setMessage(
            'The click finished before all sixteen taps were captured. Please try once more.',
          )
        },
        onError: () => {
          stopInputs()
          phaseRef.current = 'error'
          setPhase('error')
          setMessage('The audio stopped unexpectedly. Please try once more.')
        },
      })

      timingRef.current = timing
      phaseRef.current = 'running'
      setPhase('running')
      keyboard.start()
      touch.start()
      setMessage('Tap once with every click using any pad or mapped key.')
    } catch (error) {
      stopInputs()
      phaseRef.current = 'error'
      setPhase('error')
      setMessage(
        error instanceof Error
          ? error.message
          : 'Audio could not be started on this device.',
      )
    }
  }

  const isRunning = phase === 'running'

  return (
    <PageIntro
      description="A short tap-along check lets Rhythm Reader score your timing fairly on this device."
      eyebrow="Device timing"
      title="Latency calibration"
    >
      <div className="space-y-8">
        <div aria-live="polite">
          <h2 className="text-base font-semibold">
            {phase === 'complete'
              ? 'Timing check complete'
              : 'Tap with the click'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-bhda-text/70">{message}</p>
        </div>

        {phase === 'complete' && measuredOffset !== null ? (
          <div className="rounded-xl bg-bhda-background p-6 text-center">
            <p className="text-sm font-semibold text-bhda-text/70">
              Measured offset
            </p>
            <p className="mt-2 text-3xl font-bold text-bhda-accent">
              {signedMilliseconds(measuredOffset)}
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-4 text-sm font-semibold">
              <span>
                {tapCount} of {CALIBRATION.tapCount} taps
              </span>
              {isRunning && (
                <span className="text-bhda-accent">
                  {tapCount < CALIBRATION.discardCount
                    ? 'Settling in'
                    : 'Measuring'}
                </span>
              )}
            </div>
            <div
              aria-label="Calibration progress"
              aria-valuemax={CALIBRATION.tapCount}
              aria-valuemin={0}
              aria-valuenow={tapCount}
              className="mt-3 h-2 overflow-hidden rounded-md bg-bhda-text/10"
              role="progressbar"
            >
              <div
                className="h-full bg-bhda-purple transition-[width]"
                style={{
                  width: `${(tapCount / CALIBRATION.tapCount) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {touchSource && (
          <TouchPads disabled={!isRunning} source={touchSource} />
        )}

        <div>
          <p className="text-sm leading-6 text-bhda-text/70">
            Keyboard: {keyHint}. Touch devices can use the three pads above.
          </p>
          {phase !== 'running' && phase !== 'preparing' && (
            <Button className="mt-4" onClick={() => void startCalibration()}>
              {phase === 'idle' ? 'Start calibration' : 'Run calibration again'}
            </Button>
          )}
          {phase === 'preparing' && (
            <Button className="mt-4" disabled>
              Preparing audio...
            </Button>
          )}
        </div>
      </div>
    </PageIntro>
  )
}
