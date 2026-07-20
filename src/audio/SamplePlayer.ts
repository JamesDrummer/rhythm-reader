import type { Voice } from '@/model'
import type { AudioVoice, ScheduledVoice, TransportVoicePlayer } from './types'

const baseUrl = import.meta.env.BASE_URL

export const DEFAULT_SAMPLE_URLS: Record<AudioVoice, string> = {
  kick: `${baseUrl}audio/kick.wav`,
  snare: `${baseUrl}audio/snare.wav`,
  hihat: `${baseUrl}audio/hihat-closed.wav`,
  clickAccent: `${baseUrl}audio/click-accent.wav`,
  clickRegular: `${baseUrl}audio/click-regular.wav`,
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
    super('Audio is locked. Unlock it from a tap or click before playback.')
    this.name = 'AudioLockedError'
  }
}

export class SamplesNotLoadedError extends Error {
  constructor() {
    super('Audio samples have not finished loading.')
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
    this.loadPromise ??= this.loadAllSamples()
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

  playAt(voice: AudioVoice, time: number): ScheduledVoice {
    if (!this.isUnlocked) throw new AudioLockedError()

    const buffer = this.buffers.get(voice)
    if (!buffer) throw new SamplesNotLoadedError()

    const source = this.context.createBufferSource()
    const gain = this.context.createGain()
    source.buffer = buffer
    gain.gain.value = VOICE_LEVELS[voice]
    source.connect(gain)
    gain.connect(this.context.destination)
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
