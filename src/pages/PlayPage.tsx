import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  createAudioContext,
  SamplePlayer,
  Transport,
  type TransportMode,
} from '@/audio'
import { AUDIO_DEMO_EXERCISE } from '@/audio/demoExercise'
import { PageIntro } from '@/components/PageIntro'
import { Button } from '@/components/ui/button'
import { ticksPerBar, type Voice } from '@/model'
import {
  Notation,
  type NotationClock,
  type NoteFeedback,
  type OverlayHandle,
} from '@/notation'
import { SIX_EIGHT_PROOF_EXERCISE } from '@/notation/demoExercises'

interface AudioEngine {
  context: AudioContext
  player: SamplePlayer
  transport: Transport
}

const demoExerciseTicks =
  ticksPerBar(AUDIO_DEMO_EXERCISE.timeSignature) * AUDIO_DEMO_EXERCISE.bars
const ONE_SYSTEM_DEMO_EXERCISE = {
  ...AUDIO_DEMO_EXERCISE,
  notationSystems: 1 as const,
}

export function PlayPage() {
  const { exerciseId = 'Unknown exercise' } = useParams()
  const engineRef = useRef<AudioEngine | null>(null)
  const overlayRef = useRef<OverlayHandle>(null)
  const notationClock = useMemo<NotationClock>(
    () => ({
      getElapsedTicks: () => {
        const position = engineRef.current?.transport.getPosition()
        return position && position.phase !== 'idle'
          ? position.exerciseTick
          : -1
      },
    }),
    [],
  )
  const [audioReady, setAudioReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [countInBeat, setCountInBeat] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [scheduledCount, setScheduledCount] = useState(0)
  const [status, setStatus] = useState(
    'Choose a test. Your tap unlocks audio before the transport starts.',
  )

  useEffect(
    () => () => {
      const engine = engineRef.current
      engine?.transport.stop()
      if (engine) void engine.context.close()
    },
    [],
  )

  useEffect(() => {
    if (!isPlaying) return

    let frameId = 0
    const updatePlayhead = () => {
      const position = engineRef.current?.transport.getPosition()
      if (position?.phase === 'exercise') {
        setProgress(
          Math.min(
            100,
            Math.max(0, (position.exerciseTick / demoExerciseTicks) * 100),
          ),
        )
      }
      frameId = window.requestAnimationFrame(updatePlayhead)
    }

    frameId = window.requestAnimationFrame(updatePlayhead)
    return () => window.cancelAnimationFrame(frameId)
  }, [isPlaying])

  const prepareAudio = async (): Promise<AudioEngine> => {
    let engine = engineRef.current
    if (!engine) {
      const context = createAudioContext()
      const player = new SamplePlayer(context)
      engine = { context, player, transport: new Transport(player) }
      engineRef.current = engine
    }

    if (!engine.player.isUnlocked) await engine.player.unlock()
    await engine.player.preload()
    setAudioReady(true)
    return engine
  }

  const start = async (mode: TransportMode) => {
    setBusy(true)
    setCountInBeat(null)
    setProgress(0)
    setScheduledCount(0)
    setStatus('Loading and decoding the one-shot samples...')

    try {
      const engine = await prepareAudio()
      engine.transport.start(AUDIO_DEMO_EXERCISE, mode, {
        onCountInBeat: ({ beat }) => {
          setCountInBeat(beat)
          setStatus(`Count in: ${beat}`)
        },
        onExerciseStart: () => {
          setCountInBeat(null)
          setStatus(
            mode === 'playback'
              ? 'Listen First playback is running.'
              : 'Exercise click is running.',
          )
        },
        onExerciseEnd: () => {
          setCountInBeat(null)
          setIsPlaying(false)
          setProgress(100)
          setStatus('Finished exactly at the two-bar boundary.')
        },
        onSchedule: () => setScheduledCount((count) => count + 1),
        onError: () => {
          setIsPlaying(false)
          setStatus(
            'Audio playback stopped because the browser reported an error.',
          )
        },
      })
      setIsPlaying(true)
      setStatus('Audio unlocked. The one-bar count-in is about to begin.')
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Audio could not be started in this browser.',
      )
    } finally {
      setBusy(false)
    }
  }

  const stop = () => {
    engineRef.current?.transport.stop()
    setCountInBeat(null)
    setIsPlaying(false)
    setProgress(0)
    setStatus('Playback stopped.')
  }

  const playNow = (voice: Voice) => {
    try {
      engineRef.current?.player.playNow(voice)
      setStatus(`${voice === 'hihat' ? 'Hi-hat' : voice} played immediately.`)
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'The hit could not play.',
      )
    }
  }

  const showFeedback = (feedback: NoteFeedback) => {
    const voice: Voice =
      feedback === 'perfect' ? 'hihat' : feedback === 'good' ? 'snare' : 'kick'
    const event = AUDIO_DEMO_EXERCISE.events.find(
      (candidate) => candidate.voice === voice,
    )
    if (event) overlayRef.current?.showFeedback(event, feedback)
  }

  return (
    <PageIntro
      description="Temporary milestone page: engraved drum notation, overlay feedback and a playhead driven directly by the Web Audio clock."
      eyebrow="Notation renderer test"
      title={`Exercise: ${exerciseId}`}
    >
      <div className="space-y-8">
        <div aria-live="polite" className="space-y-3">
          <h2 className="text-base font-semibold">{status}</h2>
          <p className="text-sm leading-6 text-black/70">
            {scheduledCount} sound events have been booked on the audio clock.
          </p>
          {countInBeat !== null && (
            <p className="text-4xl font-bold text-bhda-purple">{countInBeat}</p>
          )}
          <div
            aria-label="Exercise progress"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(progress)}
            className="h-2 overflow-hidden rounded-md bg-black/10"
            role="progressbar"
          >
            <div
              className="h-full bg-bhda-purple"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-semibold">
            Two-system layout (default)
          </h2>
          <Notation
            clock={notationClock}
            exercise={AUDIO_DEMO_EXERCISE}
            overlayRef={overlayRef}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-semibold">One-system layout</h2>
          <Notation
            exercise={ONE_SYSTEM_DEMO_EXERCISE}
            label="Audio demo exercise in one-system drum notation"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <Button
            disabled={busy || isPlaying}
            onClick={() => void start('attempt')}
          >
            Play count-in and click
          </Button>
          <Button
            disabled={busy || isPlaying}
            onClick={() => void start('playback')}
            variant="outline"
          >
            Listen First
          </Button>
          {isPlaying && (
            <Button onClick={stop} variant="outline">
              Stop
            </Button>
          )}
        </div>

        <div>
          <h2 className="text-base font-semibold">Immediate hit test</h2>
          <p className="mt-2 text-sm leading-6 text-black/70">
            These call the same playNow voice method that pads and keys will
            use.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            {(['kick', 'snare', 'hihat'] as const).map((voice) => (
              <Button
                disabled={!audioReady}
                key={voice}
                onClick={() => playNow(voice)}
                variant="outline"
              >
                {voice === 'hihat' ? 'Hi-hat' : voice}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold">Overlay feedback check</h2>
          <p className="mt-2 text-sm leading-6 text-black/70">
            These checks colour only the transparent overlay; VexFlow stays
            static underneath.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            {(['perfect', 'good', 'miss'] as const).map((feedback) => (
              <Button
                key={feedback}
                onClick={() => showFeedback(feedback)}
                variant="outline"
              >
                {feedback[0].toUpperCase() + feedback.slice(1)}
              </Button>
            ))}
            <Button
              onClick={() => overlayRef.current?.clearFeedback()}
              variant="outline"
            >
              Clear feedback
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">6/8 renderer proof</h2>
            <p className="mt-2 text-sm leading-6 text-black/70">
              Renderer-only proof: two grouped dotted-quarter pulses. Compound
              time remains outside the v1 exercise UI.
            </p>
          </div>
          <Notation
            exercise={SIX_EIGHT_PROOF_EXERCISE}
            label="6/8 grouped drum notation renderer proof"
          />
        </div>
      </div>
    </PageIntro>
  )
}
