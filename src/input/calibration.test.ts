import { describe, expect, it } from 'vitest'
import { median, medianSignedOffset } from './calibration'

describe('calibration median', () => {
  it('calculates odd and even medians without mutating the samples', () => {
    const samples = [30, -10, 10, 20]

    expect(median(samples)).toBe(15)
    expect(median([8, 2, 5])).toBe(5)
    expect(samples).toEqual([30, -10, 10, 20])
  })

  it('discards the first four taps and keeps the signed offset', () => {
    const offsets = [180, -140, 95, -80, -20, -10, -5, 0, 5, 10, 15, 20]

    expect(medianSignedOffset(offsets, 4)).toBe(2.5)
    expect(medianSignedOffset([1, 2, 3, 4, -30, -20, -10], 4)).toBe(-20)
  })

  it('rejects a calibration with no measured taps', () => {
    expect(() => medianSignedOffset([1, 2, 3, 4], 4)).toThrow('Not enough taps')
    expect(() => median([])).toThrow('at least one value')
  })
})
