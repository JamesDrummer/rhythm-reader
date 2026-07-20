import type { Voice } from '@/model'
import { performanceTimeToAudioTimeMs } from './timing'
import type { AudioTimeline, InputListener, InputSource } from './types'

export class TouchPadInput implements InputSource {
  private active = false
  private readonly listeners = new Set<InputListener>()
  private readonly timeline: AudioTimeline

  constructor(timeline: AudioTimeline) {
    this.timeline = timeline
  }

  start(): void {
    this.active = true
  }

  stop(): void {
    this.active = false
  }

  subscribe(listener: InputListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  pointerDown(voice: Voice): void {
    if (!this.active) return

    const hit = {
      voice,
      timeMs: performanceTimeToAudioTimeMs(this.timeline, performance.now()),
    }
    this.listeners.forEach((listener) => listener(hit))
  }
}
