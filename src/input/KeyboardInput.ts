import { VOICES } from '@/model'
import {
  loadKeyboardMapping,
  saveKeyboardMapping,
  type KeyboardMapping,
} from './storage'
import { performanceTimeToAudioTimeMs } from './timing'
import type { AudioTimeline, InputListener, InputSource } from './types'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  )
}

export class KeyboardInput implements InputSource {
  private active = false
  private readonly listeners = new Set<InputListener>()
  private mapping: KeyboardMapping
  private readonly target: Window
  private readonly timeline: AudioTimeline

  constructor(
    timeline: AudioTimeline,
    mapping = loadKeyboardMapping(),
    target: Window = window,
  ) {
    this.timeline = timeline
    this.mapping = mapping
    this.target = target
  }

  start(): void {
    if (this.active) return
    this.active = true
    this.target.addEventListener('keydown', this.handleKeyDown)
  }

  stop(): void {
    if (!this.active) return
    this.active = false
    this.target.removeEventListener('keydown', this.handleKeyDown)
  }

  subscribe(listener: InputListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  setMapping(mapping: KeyboardMapping): void {
    this.mapping = mapping
    saveKeyboardMapping(mapping)
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || isEditableTarget(event.target)) return

    const voice = VOICES.find((candidate) =>
      this.mapping[candidate].includes(event.code),
    )
    if (!voice) return

    event.preventDefault()
    const hit = {
      voice,
      timeMs: performanceTimeToAudioTimeMs(this.timeline, performance.now()),
    }
    this.listeners.forEach((listener) => listener(hit))
  }
}
