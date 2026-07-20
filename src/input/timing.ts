import type { AudioTimeline, InputHit } from './types'

/**
 * Maps performance.now() onto the Web Audio clock. getOutputTimestamp gives
 * the browser's measured relationship between the two clocks. Older Safari
 * versions fall back to currentTime, sampled in the same event handler.
 */
export function performanceTimeToAudioTimeMs(
  timeline: AudioTimeline,
  performanceTimeMs = performance.now(),
): number {
  const timestamp = timeline.getOutputTimestamp?.()
  const contextTime = timestamp?.contextTime
  const outputPerformanceTime = timestamp?.performanceTime

  if (
    contextTime !== undefined &&
    outputPerformanceTime !== undefined &&
    Number.isFinite(contextTime) &&
    Number.isFinite(outputPerformanceTime) &&
    outputPerformanceTime > 0
  ) {
    return contextTime * 1_000 + (performanceTimeMs - outputPerformanceTime)
  }

  return timeline.currentTime * 1_000
}

/** Scoring consumes this corrected timestamp in the next milestone. */
export function applyDeviceLatencyOffset(
  hit: InputHit,
  deviceLatencyOffset: number,
): InputHit {
  return { ...hit, timeMs: hit.timeMs - deviceLatencyOffset }
}
