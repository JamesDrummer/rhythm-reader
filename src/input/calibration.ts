export function median(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error('A median needs at least one value.')
  }

  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

export function medianSignedOffset(
  signedOffsetsMs: readonly number[],
  discardCount: number,
): number {
  if (!Number.isInteger(discardCount) || discardCount < 0) {
    throw new Error('The discard count must be a non-negative integer.')
  }
  if (signedOffsetsMs.length <= discardCount) {
    throw new Error('Not enough taps remain after discarding the first taps.')
  }

  return median(signedOffsetsMs.slice(discardCount))
}
