export function createAudioContext(): AudioContext {
  const AudioContextConstructor =
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext
      }
    ).webkitAudioContext

  if (!AudioContextConstructor) {
    throw new Error('This browser does not support the Web Audio API.')
  }

  return new AudioContextConstructor()
}
