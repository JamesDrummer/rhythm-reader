import { VOICES, type Voice } from '@/model'

export const KEYBOARD_MAPPING_STORAGE_KEY = 'keyboardMapping'
export const DEVICE_LATENCY_OFFSET_STORAGE_KEY = 'deviceLatencyOffset'
export const CALIBRATION_PROMPT_SEEN_STORAGE_KEY =
  'latencyCalibrationPromptSeen'
export const LATENCY_CHANGE_EVENT = 'rhythm-reader-latency-change'

export type KeyboardMapping = Record<Voice, string[]>

export const DEFAULT_KEYBOARD_MAPPING: KeyboardMapping = {
  kick: ['KeyF'],
  snare: ['KeyJ'],
  hihat: ['KeyK', 'Space'],
}

function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readStorage(storage: Storage | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}

function writeStorage(
  storage: Storage | null,
  key: string,
  value: string,
): void {
  try {
    storage?.setItem(key, value)
  } catch {
    // Private browsing can make localStorage unavailable. Controls still work
    // for the current page, even when the preference cannot be persisted.
  }
}

function copyMapping(mapping: KeyboardMapping): KeyboardMapping {
  return {
    kick: [...mapping.kick],
    snare: [...mapping.snare],
    hihat: [...mapping.hihat],
  }
}

function isKeyboardMapping(value: unknown): value is KeyboardMapping {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>
  return VOICES.every(
    (voice) =>
      Array.isArray(candidate[voice]) &&
      candidate[voice].length > 0 &&
      candidate[voice].every(
        (key): key is string => typeof key === 'string' && key.length > 0,
      ),
  )
}

export function loadKeyboardMapping(
  storage = browserStorage(),
): KeyboardMapping {
  if (!storage) return copyMapping(DEFAULT_KEYBOARD_MAPPING)

  try {
    const stored = readStorage(storage, KEYBOARD_MAPPING_STORAGE_KEY)
    if (!stored) return copyMapping(DEFAULT_KEYBOARD_MAPPING)

    const parsed: unknown = JSON.parse(stored)
    return isKeyboardMapping(parsed)
      ? copyMapping(parsed)
      : copyMapping(DEFAULT_KEYBOARD_MAPPING)
  } catch {
    return copyMapping(DEFAULT_KEYBOARD_MAPPING)
  }
}

export function saveKeyboardMapping(
  mapping: KeyboardMapping,
  storage = browserStorage(),
): void {
  writeStorage(storage, KEYBOARD_MAPPING_STORAGE_KEY, JSON.stringify(mapping))
}

export function remapVoice(
  mapping: KeyboardMapping,
  voice: Voice,
  code: string,
): KeyboardMapping {
  const next = copyMapping(mapping)
  const previousPrimaryCode = next[voice][0]

  for (const candidate of VOICES) {
    if (candidate === voice) continue
    const usedByCandidate = next[candidate].includes(code)
    next[candidate] = next[candidate].filter((key) => key !== code)
    if (usedByCandidate && next[candidate].length === 0) {
      next[candidate] = [previousPrimaryCode]
    }
  }
  next[voice] = [code]
  return next
}

export function keyCodeLabel(code: string): string {
  if (code === 'Space') return 'Space'
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  return code.replace(/([a-z])([A-Z])/g, '$1 $2')
}

export function loadDeviceLatencyOffset(
  storage = browserStorage(),
): number | null {
  const stored = readStorage(storage, DEVICE_LATENCY_OFFSET_STORAGE_KEY)
  if (stored === null) return null

  const offset = Number(stored)
  return Number.isFinite(offset) ? offset : null
}

export function saveDeviceLatencyOffset(
  offset: number,
  storage = browserStorage(),
): void {
  if (!Number.isFinite(offset)) {
    throw new Error('The device latency offset must be a finite number.')
  }
  writeStorage(storage, DEVICE_LATENCY_OFFSET_STORAGE_KEY, String(offset))
}

export function hasSeenCalibrationPrompt(storage = browserStorage()): boolean {
  return readStorage(storage, CALIBRATION_PROMPT_SEEN_STORAGE_KEY) === 'true'
}

export function markCalibrationPromptSeen(storage = browserStorage()): void {
  writeStorage(storage, CALIBRATION_PROMPT_SEEN_STORAGE_KEY, 'true')
}
