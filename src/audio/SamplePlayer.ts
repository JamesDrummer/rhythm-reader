import type { Voice } from '@/model'
import type {
  AudioVoice,
  PlayAtOptions,
  ScheduledVoice,
  TransportVoicePlayer,
} from './types'

const baseUrl = import.meta.env.BASE_URL

export const DEFAULT_SAMPLE_URLS: Record<AudioVoice, string> = {
  kick: `${baseUrl}audio/kick.wav`,
  snare: `${baseUrl}audio/snare.wav`,
  hihat: `${baseUrl}audio/hihat-closed.wav`,
  clickAccent: `${baseUrl}audio/click-accent.wav`,
  clickRegular: `${baseUrl}audio/click-regular.wav`,
}

let sampleFilePreloadPromise: Promise<void> | null = null

async function loadSampleFiles(fetchSample: typeof fetch): Promise<void> {
  await Promise.all(
    Object.values(DEFAULT_SAMPLE_URLS).map(async (url) => {
      const response = await fetchSample(url, { cache: 'force-cache' })
      if (!response.ok) throw new Error(`Could not load audio sample: ${url}`)
      await response.arrayBuffer()
    }),
  )
}

/** Warms the browser cache without creating or unlocking an AudioContext. */
export function preloadSampleFiles(
  fetchSample: typeof fetch = fetch,
): Promise<void> {
  if (fetchSample !== fetch) return loadSampleFiles(fetchSample)

  sampleFilePreloadPromise ??= loadSampleFiles(fetchSample).catch(
    (error: unknown) => {
      sampleFilePreloadPromise = null
      throw error
    },
  )
  return sampleFilePreloadPromise
}

const VOICE_LEVELS: Record<AudioVoice, number> = {
  kick: 0.7,
  snare: 0.55,
  hihat: 0.35,
  clickAccent: 0.35,
  clickRegular: 0.25,
}

export class AudioLockedError extends Error {
  constructor() {
    super(
      'Your browser blocked the audio. Tap the start button once more to enable sound.',
    )
    this.name = 'AudioLockedError'
  }
}

export class SamplesNotLoadedError extends Error {
  constructor() {
    super('The drum sounds are still loading. Please try once more.')
    this.name = 'SamplesNotLoadedError'
  }
}

/**
 * Decodes every one-shot once, then creates a fresh AudioBufferSourceNode for
 * each hit. Buffer sources are cheap, one-use voices in the Web Audio API.
 */
export class SamplePlayer implements TransportVoicePlayer {
  private readonly buffers = new Map<AudioVoice, AudioBuffer>()
  readonly context: AudioContext
  private readonly fetchSample: typeof fetch
  private loadPromise: Promise<void> | null = null
  private readonly sampleUrls: Record<AudioVoice, string>
  private unlocked = false

  constructor(
    context: AudioContext,
    sampleUrls = DEFAULT_SAMPLE_URLS,
    fetchSample: typeof fetch = fetch,
  ) {
    this.context = context
    this.sampleUrls = sampleUrls
    this.fetchSample = fetchSample
  }

  get currentTime(): number {
    return this.context.currentTime
  }

  get isReady(): boolean {
    return this.buffers.size === Object.keys(this.sampleUrls).length
  }

  get isUnlocked(): boolean {
    return this.unlocked && this.context.state === 'running'
  }

  preload(): Promise<void> {
    this.loadPromise ??= this.loadAllSamples().catch((error: unknown) => {
      this.loadPromise = null
      throw error
    })
    return this.loadPromise
  }

  /** Must be called directly from the first user gesture, especially on iOS. */
  async unlock(): Promise<void> {
    if (this.context.state === 'closed') {
      throw new Error('The audio context is closed.')
    }

    // Both calls happen before the first await so they stay in the original
    // tap/click gesture chain required by iOS WebKit.
    const resumePromise = this.context.resume()
    const silentBuffer = this.context.createBuffer(
      1,
      1,
      this.context.sampleRate,
    )
    const silentSource = this.context.createBufferSource()
    silentSource.buffer = silentBuffer
    silentSource.connect(this.context.destination)
    silentSource.start(this.context.currentTime)

    await resumePromise
    if (this.context.state !== 'running') {
      throw new AudioLockedError()
    }

    this.unlocked = true
  }

  playAt(
    voice: AudioVoice,
    time: number,
    options: PlayAtOptions = {},
  ): ScheduledVoice {
    if (!this.isUnlocked) throw new AudioLockedError()

    const buffer = this.buffers.get(voice)
    if (!buffer) throw new SamplesNotLoadedError()

    const source = this.context.createBufferSource()
    const gain = this.context.createGain()
    source.buffer = buffer
    gain.gain.value = VOICE_LEVELS[voice]
    source.connect(gain)
    const studentPan =
      options.layer === 'student'
        ? this.context.createStereoPanner?.()
        : undefined
    if (studentPan) {
      studentPan.pan.value = 0.22
      gain.connect(studentPan)
      studentPan.connect(this.context.destination)
    } else {
      gain.connect(this.context.destination)
    }
    source.start(Math.max(time, this.context.currentTime))

    let stopped = false
    return {
      stop: () => {
        if (stopped) return
        stopped = true
        try {
          source.stop()
        } catch {
          // A source that has naturally ended needs no further action.
        }
      },
    }
  }

  playNow(voice: Voice): ScheduledVoice {
    return this.playAt(voice, this.context.currentTime)
  }

  private async loadAllSamples(): Promise<void> {
    const fetchSample = this.fetchSample
    const decoded = await Promise.all(
      Object.entries(this.sampleUrls).map(async ([voice, url]) => {
        const response = await fetchSample(url)
        if (!response.ok) {
          throw new Error(`Could not load audio sample: ${url}`)
        }

        const encodedAudio = await response.arrayBuffer()
        const buffer = await this.context.decodeAudioData(encodedAudio)
        return [voice as AudioVoice, buffer] as const
      }),
    )

    decoded.forEach(([voice, buffer]) => this.buffers.set(voice, buffer))
  }
}
