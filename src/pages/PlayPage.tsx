import { ArrowLeft, Headphones, Play, Square } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createAudioContext,
  SamplePlayer,
  Transport,
  type TransportMode,
  type TransportTiming,
} from '@/audio'
import { TouchPads } from '@/components/TouchPads'
import { Button } from '@/components/ui/button'
import { TIMING_WINDOWS_MS } from '@/config'
import {
  findCatalogueExercise,
  useCatalogue,
  type CatalogueExercise,
} from '@/content'
import { calloutRatingForHit, visibleNoteFeedback } from '@/game/liveFeedback'
import {
  applyDeviceLatencyOffset,
  KeyboardInput,
  keyCodeLabel,
  loadDeviceLatencyOffset,
  loadKeyboardMapping,
  TouchPadInput,
  type AudioTimeline,
  type InputHit,
} from '@/input'
import type { ExerciseMode, NoteEvent } from '@/model'
import {
  Notation,
  type NotationClock,
  type NoteFeedback,
  type OverlayHandle,
} from '@/notation'
import {
  deriveExpectedNotes,
  scoreExercise,
  type CalibratedHit,
  type HitRating,
  type ScoreRecord,
} from '@/scoring'
import { ResultsScreen } from '@/results'
import { useAppServices } from '@/services/useAppServices'

interface AudioEngine {
  context: AudioContext
  player: SamplePlayer
  transport: Transport
}

interface AudioEngineRef {
  current: AudioEngine | null
}

function createInputSources(engineRef: AudioEngineRef) {
  const audioTimeline: AudioTimeline = {
    get currentTime() {
      return engineRef.current?.context.currentTime ?? 0
    },
    getOutputTimestamp() {
      const context = engineRef.current?.context
      return (
        context?.getOutputTimestamp?.() ?? {
          contextTime: context?.currentTime ?? 0,
          performanceTime: performance.now(),
        }
      )
    },
  }

  return {
    keyboard: new KeyboardInput(audioTimeline),
    touch: new TouchPadInput(audioTimeline),
  }
}

type GamePhase =
  | 'ready'
  | 'loading'
  | 'listening'
  | 'countIn'
  | 'playing'
  | 'grace'
  | 'results'
  | 'error'

interface HitCallout {
  id: number
  rating: HitRating
}

function eventKey(event: NoteEvent): string {
  return `${event.voice}:${event.tick}`
}

function feedbackLabel(rating: HitRating): string {
  return rating === 'perfect' ? 'Perfect' : rating === 'good' ? 'Good' : 'Miss'
}

function inputStatus(phase: GamePhase, gameMode: ExerciseMode): string {
  if (phase === 'countIn') return 'Get ready — input starts after four.'
  if (phase === 'playing') {
    return gameMode === 'memorise'
      ? 'From memory — keep the pulse relaxed.'
      : 'Play the notes as the line reaches them.'
  }
  if (phase === 'grace') return 'Hold on — catching the final note.'
  if (phase === 'listening') return 'Listen to the rhythm and follow the score.'
  if (phase === 'loading') return 'Preparing the drum sounds…'
  return gameMode === 'memorise'
    ? 'Study the notation for as long as you need, then press Ready.'
    : 'Press Start when you are ready.'
}

function ExerciseNotFound({ loading }: { loading: boolean }) {
  return (
    <section className="mx-auto max-w-3xl" aria-labelledby="page-title">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-bhda-purple">
        Play Along
      </p>
      <h1 className="mt-3 text-3xl font-bold" id="page-title">
        {loading ? 'Loading exercise' : 'Exercise not found'}
      </h1>
      <p className="mt-4 text-black/65">
        {loading
          ? 'Getting your rhythm ready…'
          : 'Return to the levels page and choose an unlocked exercise.'}
      </p>
      {!loading && (
        <Button asChild className="mt-8" variant="outline">
          <Link to="/">Back to levels</Link>
        </Button>
      )}
    </section>
  )
}

export function PlayPage() {
  const { exerciseId = '' } = useParams()
  const { catalogueScope, exerciseSource } = useAppServices()
  const { levels, loading } = useCatalogue(exerciseSource, catalogueScope)
  const catalogueExercise = findCatalogueExercise(levels, exerciseId)

  if (!catalogueExercise) return <ExerciseNotFound loading={loading} />

  return (
    <PlayableExercise
      catalogueExercise={catalogueExercise}
      catalogue={levels}
      key={catalogueExercise.exercise.id}
    />
  )
}

function PlayableExercise({
  catalogue,
  catalogueExercise,
}: {
  catalogue: readonly import('@/model').Level[]
  catalogueExercise: CatalogueExercise
}) {
  const { exercise } = catalogueExercise
  const { progressScope, progressStore } = useAppServices()
  const engineRef = useRef<AudioEngine | null>(null)
  const timingRef = useRef<TransportTiming | null>(null)
  const transportModeRef = useRef<TransportMode | null>(null)
  const overlayRef = useRef<OverlayHandle>(null)
  const hitsRef = useRef<CalibratedHit[]>([])
  const inputActiveRef = useRef(false)
  const latencyOffsetRef = useRef(0)
  const feedbackRef = useRef(new Map<string, NoteFeedback>())
  const hitCalloutIdRef = useRef(0)
  const runIdRef = useRef(0)
  const mountedRef = useRef(true)
  const phaseRef = useRef<GamePhase>('ready')
  const finalAcceptTimeRef = useRef(0)
  const inputHandlerRef = useRef<(hit: InputHit) => void>(() => undefined)
  const [phase, setPhase] = useState<GamePhase>('ready')
  const [countInBeat, setCountInBeat] = useState<number | null>(null)
  const [latestHit, setLatestHit] = useState<HitCallout | null>(null)
  const [hitCount, setHitCount] = useState(0)
  const [score, setScore] = useState<ScoreRecord | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [inputsEnabled, setInputsEnabled] = useState(false)
  const [selectedMode, setSelectedMode] = useState<ExerciseMode>(
    exercise.modes.includes('playAlong') ? 'playAlong' : exercise.modes[0],
  )
  const [isPlayingLayered, setIsPlayingLayered] = useState(false)
  const [layeredPlaybackError, setLayeredPlaybackError] = useState<
    string | null
  >(null)
  const timingWindow = TIMING_WINDOWS_MS[exercise.tier]
  const keyboardMapping = useMemo(() => loadKeyboardMapping(), [])

  const setGamePhase = useCallback((nextPhase: GamePhase) => {
    phaseRef.current = nextPhase
    setPhase(nextPhase)
  }, [])

  // The factory stores the ref for event-time getters; it does not read it now.
  // eslint-disable-next-line react-hooks/refs
  const inputSources = useMemo(() => createInputSources(engineRef), [])
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

  const setInputsActive = useCallback(
    (active: boolean) => {
      if (inputActiveRef.current === active) return
      inputActiveRef.current = active
      setInputsEnabled(active)
      if (active) {
        inputSources.keyboard.start()
        inputSources.touch.start()
      } else {
        inputSources.keyboard.stop()
        inputSources.touch.stop()
      }
    },
    [inputSources],
  )

  const clearLiveFeedback = useCallback(() => {
    feedbackRef.current.clear()
    overlayRef.current?.clearFeedback()
    setLatestHit(null)
  }, [])

  const syncLiveFeedback = useCallback(
    (currentScore: ScoreRecord, elapsedAttemptMs: number) => {
      const nextFeedback = new Map<string, NoteFeedback>()

      for (const item of visibleNoteFeedback(
        currentScore,
        elapsedAttemptMs,
        timingWindow.goodMs,
      )) {
        const key = eventKey(item.event)
        nextFeedback.set(key, item.rating)
        if (feedbackRef.current.get(key) !== item.rating) {
          overlayRef.current?.showFeedback(item.event, item.rating)
        }
      }

      for (const event of exercise.events) {
        const key = eventKey(event)
        if (feedbackRef.current.has(key) && !nextFeedback.has(key)) {
          overlayRef.current?.clearFeedback(event)
        }
      }
      feedbackRef.current = nextFeedback
    },
    [exercise, timingWindow.goodMs],
  )

  const prepareAudio = useCallback(async (): Promise<AudioEngine> => {
    let engine = engineRef.current
    if (!engine) {
      const context = createAudioContext()
      const player = new SamplePlayer(context)
      engine = { context, player, transport: new Transport(player) }
      engineRef.current = engine
    }

    if (!engine.player.isUnlocked) await engine.player.unlock()
    await engine.player.preload()
    return engine
  }, [])

  const finaliseAttempt = useCallback(() => {
    if (phaseRef.current === 'results') return
    const engine = engineRef.current
    const timing = timingRef.current
    if (!engine || !timing) return

    setInputsActive(false)
    const finalScore = scoreExercise(exercise, timingWindow, hitsRef.current)
    void progressStore
      .recordAttempt(
        progressScope,
        {
          exerciseId: exercise.id,
          accuracyPercent: finalScore.overallAccuracyPercent,
          stars: finalScore.stars,
        },
        catalogue,
      )
      .catch(() => {
        // A failed persistence adapter must not stop the student seeing results.
      })
    if (selectedMode === 'playAlong') {
      syncLiveFeedback(finalScore, Number.POSITIVE_INFINITY)
    }
    runIdRef.current += 1
    engine.transport.stop()
    setScore(finalScore)
    setCountInBeat(null)
    setGamePhase('results')
  }, [
    exercise,
    catalogue,
    progressScope,
    progressStore,
    selectedMode,
    setGamePhase,
    setInputsActive,
    syncLiveFeedback,
    timingWindow,
  ])

  useEffect(() => {
    inputHandlerRef.current = (rawHit) => {
      if (!inputActiveRef.current) return
      const engine = engineRef.current
      const timing = timingRef.current
      if (!engine || !timing) return

      try {
        engine.player.playNow(rawHit.voice)
      } catch (error) {
        setInputsActive(false)
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'That drum sound could not be played.',
        )
        setGamePhase('error')
        return
      }

      const correctedHit = applyDeviceLatencyOffset(
        rawHit,
        latencyOffsetRef.current,
      )
      const attemptHit: CalibratedHit = {
        voice: correctedHit.voice,
        timeMs: correctedHit.timeMs - timing.countInStartTime * 1_000,
      }
      const nextHits = [...hitsRef.current, attemptHit]
      hitsRef.current = nextHits
      setHitCount(nextHits.length)

      const currentScore = scoreExercise(exercise, timingWindow, nextHits)
      if (selectedMode === 'memorise') {
        setLatestHit(null)
        return
      }

      const calloutRating = calloutRatingForHit(
        exercise,
        timingWindow,
        currentScore,
        nextHits.length - 1,
      )
      if (calloutRating) {
        hitCalloutIdRef.current += 1
        setLatestHit({ id: hitCalloutIdRef.current, rating: calloutRating })
      } else {
        setLatestHit(null)
      }
      syncLiveFeedback(currentScore, attemptHit.timeMs)
    }
  })

  useEffect(() => {
    const unsubscribeKeyboard = inputSources.keyboard.subscribe((hit) =>
      inputHandlerRef.current(hit),
    )
    const unsubscribeTouch = inputSources.touch.subscribe((hit) =>
      inputHandlerRef.current(hit),
    )

    return () => {
      unsubscribeKeyboard()
      unsubscribeTouch()
      inputSources.keyboard.stop()
      inputSources.touch.stop()
    }
  }, [inputSources])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      runIdRef.current += 1
      inputActiveRef.current = false
      const engine = engineRef.current
      engine?.transport.stop()
      if (engine && engine.context.state !== 'closed') {
        void engine.context.close().catch(() => {
          // The page is already leaving; there is no recovery UI to show.
        })
      }
    }
  }, [])

  useEffect(() => {
    if (!['countIn', 'playing', 'grace', 'listening'].includes(phase)) {
      return
    }

    let frameId = 0
    const update = () => {
      const engine = engineRef.current
      const timing = timingRef.current
      if (!engine || !timing) return

      const now = engine.context.currentTime
      const mode = transportModeRef.current
      const inputActivationTime =
        timing.exerciseStartTime - timingWindow.goodMs / 1_000

      if (
        mode === 'attempt' &&
        !inputActiveRef.current &&
        now >= inputActivationTime
      ) {
        setInputsActive(true)
      }

      if (now < timing.exerciseStartTime) {
        if (mode === 'attempt') {
          const beatDuration = 60 / timing.tempo
          const beat =
            Math.floor((now - timing.countInStartTime) / beatDuration) + 1
          setCountInBeat(
            Math.max(1, Math.min(exercise.timeSignature.beats, beat)),
          )
        }
      } else {
        setCountInBeat(null)
        if (mode === 'attempt' && phaseRef.current === 'countIn') {
          setInputsActive(true)
          setGamePhase('playing')
        }
      }

      if (mode === 'attempt' && inputActiveRef.current) {
        const elapsedAttemptMs = (now - timing.countInStartTime) * 1_000
        const currentScore = scoreExercise(
          exercise,
          timingWindow,
          hitsRef.current,
        )
        if (selectedMode === 'playAlong') {
          syncLiveFeedback(currentScore, elapsedAttemptMs)
        }

        if (
          now >= timing.exerciseEndTime &&
          now < finalAcceptTimeRef.current &&
          phaseRef.current !== 'grace'
        ) {
          setGamePhase('grace')
        }
        if (now >= finalAcceptTimeRef.current) {
          finaliseAttempt()
          return
        }
      }

      frameId = window.requestAnimationFrame(update)
    }

    frameId = window.requestAnimationFrame(update)
    return () => window.cancelAnimationFrame(frameId)
  }, [
    exercise,
    finaliseAttempt,
    phase,
    selectedMode,
    setGamePhase,
    setInputsActive,
    syncLiveFeedback,
    timingWindow,
  ])

  const startTransport = async (mode: Exclude<TransportMode, 'layered'>) => {
    const runId = runIdRef.current + 1
    runIdRef.current = runId
    setInputsActive(false)
    engineRef.current?.transport.stop()
    clearLiveFeedback()
    setErrorMessage(null)
    setCountInBeat(null)
    setGamePhase('loading')

    if (mode === 'attempt') {
      hitsRef.current = []
      setHitCount(0)
      setScore(null)
      latencyOffsetRef.current = loadDeviceLatencyOffset() ?? 0
    }

    try {
      const engine = await prepareAudio()
      if (!mountedRef.current || runIdRef.current !== runId) return

      const timing = engine.transport.start(exercise, mode, {
        onExerciseStart: () => {
          if (runIdRef.current !== runId || mode !== 'attempt') return
          setInputsActive(true)
          setGamePhase('playing')
        },
        onExerciseEnd: () => {
          if (runIdRef.current !== runId) return
          if (mode === 'playback') {
            setCountInBeat(null)
            setGamePhase('ready')
            return
          }

          if (engine.context.currentTime >= finalAcceptTimeRef.current) {
            finaliseAttempt()
          } else {
            setGamePhase('grace')
          }
        },
        onError: (error) => {
          if (runIdRef.current !== runId) return
          setInputsActive(false)
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Audio playback stopped unexpectedly.',
          )
          setGamePhase('error')
        },
      })
      timingRef.current = timing
      transportModeRef.current = mode

      const finalExpectedTimeMs = Math.max(
        ...deriveExpectedNotes(exercise).map(
          ({ expectedTimeMs }) => expectedTimeMs,
        ),
      )
      finalAcceptTimeRef.current = Math.max(
        timing.exerciseEndTime,
        timing.countInStartTime +
          (finalExpectedTimeMs + timingWindow.goodMs) / 1_000,
      )
      setGamePhase(mode === 'playback' ? 'listening' : 'countIn')
    } catch (error) {
      if (!mountedRef.current || runIdRef.current !== runId) return
      setInputsActive(false)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Audio could not be started in this browser.',
      )
      setGamePhase('error')
    }
  }

  const stopListening = () => {
    runIdRef.current += 1
    engineRef.current?.transport.stop()
    setCountInBeat(null)
    setGamePhase('ready')
  }

  const retry = () => {
    runIdRef.current += 1
    engineRef.current?.transport.stop()
    setIsPlayingLayered(false)
    setLayeredPlaybackError(null)
    setScore(null)
    hitsRef.current = []
    setHitCount(0)
    clearLiveFeedback()
    setGamePhase('ready')
  }

  const startLayeredPlayback = async () => {
    if (!score) return
    const runId = runIdRef.current + 1
    runIdRef.current = runId
    engineRef.current?.transport.stop()
    setLayeredPlaybackError(null)

    try {
      const engine = await prepareAudio()
      if (!mountedRef.current || runIdRef.current !== runId) return
      setIsPlayingLayered(true)
      engine.transport.startLayered(exercise, score.rawHits, {
        onExerciseEnd: () => {
          if (runIdRef.current === runId) setIsPlayingLayered(false)
        },
        onError: (error) => {
          if (runIdRef.current !== runId) return
          setIsPlayingLayered(false)
          setLayeredPlaybackError(
            error instanceof Error
              ? error.message
              : 'The layered playback stopped unexpectedly.',
          )
        },
      })
    } catch (error) {
      if (!mountedRef.current || runIdRef.current !== runId) return
      setIsPlayingLayered(false)
      setLayeredPlaybackError(
        error instanceof Error
          ? error.message
          : 'The layered playback could not be started.',
      )
    }
  }

  const stopLayeredPlayback = () => {
    runIdRef.current += 1
    engineRef.current?.transport.stop()
    setIsPlayingLayered(false)
  }

  if (phase === 'results' && score) {
    const nextExercise =
      catalogueExercise.level.exercises[catalogueExercise.exerciseIndex + 1]
    return (
      <ResultsScreen
        exerciseTitle={exercise.title}
        isPlayingLayered={isPlayingLayered}
        layeredPlaybackError={layeredPlaybackError}
        nextExerciseHref={nextExercise ? `/play/${nextExercise.id}` : '/'}
        nextExerciseLabel={nextExercise ? 'Next exercise' : 'Back to levels'}
        onLayeredPlayback={() => void startLayeredPlayback()}
        onRetry={retry}
        onStopLayeredPlayback={stopLayeredPlayback}
        score={score}
      />
    )
  }

  const attemptInProgress = ['countIn', 'playing', 'grace'].includes(phase)
  const controlsDisabled = phase === 'loading' || attemptInProgress
  const showTouchPads = phase === 'loading' || attemptInProgress

  return (
    <section
      aria-labelledby="page-title"
      className="play-touch-spacing mx-auto w-full max-w-4xl"
    >
      <Link
        className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-black/60 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhda-purple focus-visible:ring-offset-4"
        to="/"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to levels
      </Link>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-bhda-purple">
            {selectedMode === 'memorise' ? 'Memorise & Perform' : 'Play Along'}
          </p>
          <h1
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
            id="page-title"
          >
            {exercise.title}
          </h1>
        </div>
        <div className="flex gap-2 text-sm font-semibold text-black/55">
          <span className="rounded-full border bg-white px-3 py-1.5">
            {exercise.tempo} bpm
          </span>
          <span className="rounded-full border bg-white px-3 py-1.5">
            {exercise.bars} {exercise.bars === 1 ? 'bar' : 'bars'}
          </span>
        </div>
      </div>

      {exercise.modes.length > 1 && (
        <fieldset
          className="mt-6 flex flex-wrap gap-2"
          disabled={phase !== 'ready'}
        >
          <legend className="sr-only">Game mode</legend>
          {exercise.modes.map((mode) => (
            <Button
              aria-pressed={selectedMode === mode}
              className={
                selectedMode === mode
                  ? 'border-bhda-purple text-bhda-purple'
                  : undefined
              }
              key={mode}
              onClick={() => setSelectedMode(mode)}
              type="button"
              variant="outline"
            >
              {mode === 'memorise' ? 'Memorise & Perform' : 'Play Along'}
            </Button>
          ))}
        </fieldset>
      )}

      <div className="mt-7 overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex min-h-14 items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
          <p aria-live="polite" className="text-sm font-semibold text-black/65">
            {errorMessage ?? inputStatus(phase, selectedMode)}
          </p>
          {attemptInProgress && selectedMode === 'playAlong' && (
            <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-bhda-purple">
              {hitCount} {hitCount === 1 ? 'hit' : 'hits'}
            </p>
          )}
        </div>

        <div className="relative p-3 sm:p-5">
          {selectedMode === 'memorise' && phase !== 'ready' ? (
            <div className="grid min-h-64 place-items-center rounded-xl bg-bhda-background px-6 py-12 text-center">
              <div>
                <p className="text-2xl font-bold text-bhda-purple">
                  From memory…
                </p>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-black/60">
                  Keep the rhythm in your head, stay relaxed, and trust the
                  pulse.
                </p>
              </div>
            </div>
          ) : (
            <Notation
              className="shadow-none"
              clock={notationClock}
              exercise={exercise}
              overlayRef={overlayRef}
            />
          )}

          {phase === 'countIn' && countInBeat !== null && (
            <div
              aria-live="assertive"
              className="absolute inset-3 grid place-items-center rounded-xl bg-white/80 backdrop-blur-[2px] sm:inset-5"
            >
              <div className="text-center">
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-bhda-purple">
                  Count in
                </p>
                <p
                  className="count-in-pop mt-1 text-8xl font-bold tabular-nums text-bhda-purple sm:text-9xl"
                  key={countInBeat}
                >
                  {countInBeat}
                </p>
              </div>
            </div>
          )}

          {latestHit && attemptInProgress && selectedMode === 'playAlong' && (
            <div
              aria-live="polite"
              className={`hit-callout hit-callout-${latestHit.rating}`}
              key={latestHit.id}
            >
              {feedbackLabel(latestHit.rating)}
            </div>
          )}
        </div>
      </div>

      <div className="desktop-only mt-4 items-center justify-between rounded-xl border bg-white px-5 py-3 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/45">
          Keyboard
        </p>
        <div className="flex items-center gap-6 text-sm font-semibold">
          {(['kick', 'snare', 'hihat'] as const).map((voice) => (
            <span className="flex items-center gap-2" key={voice}>
              <kbd className="min-w-8 rounded-md border border-black/15 bg-bhda-background px-2 py-1 text-center text-xs shadow-sm">
                {keyboardMapping[voice].map(keyCodeLabel).join(' / ')}
              </kbd>
              {voice === 'hihat'
                ? 'Hi-hat'
                : voice[0].toUpperCase() + voice.slice(1)}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {selectedMode === 'playAlong' &&
          exercise.listenFirstAllowed &&
          phase !== 'listening' && (
            <Button
              className="h-12 px-6"
              disabled={controlsDisabled}
              onClick={() => void startTransport('playback')}
              variant="outline"
            >
              <Headphones aria-hidden="true" className="size-4" />
              Listen first
            </Button>
          )}
        {phase === 'listening' && (
          <Button
            className="h-12 px-6"
            onClick={stopListening}
            variant="outline"
          >
            <Square aria-hidden="true" className="size-4 fill-current" />
            Stop listening
          </Button>
        )}
        {phase !== 'listening' && (
          <Button
            className="h-12 px-7 text-base"
            disabled={controlsDisabled}
            onClick={() => void startTransport('attempt')}
          >
            <Play aria-hidden="true" className="size-4 fill-current" />
            {phase === 'loading'
              ? 'Preparing…'
              : selectedMode === 'memorise'
                ? 'Ready'
                : 'Start'}
          </Button>
        )}
      </div>

      {showTouchPads && (
        <div className="touch-only touch-pad-dock">
          <div className="mx-auto w-full max-w-4xl">
            <TouchPads disabled={!inputsEnabled} source={inputSources.touch} />
          </div>
        </div>
      )}
    </section>
  )
}
