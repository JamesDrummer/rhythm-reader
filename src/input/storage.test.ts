import { describe, expect, it } from 'vitest'
import { DEFAULT_KEYBOARD_MAPPING, remapVoice } from './storage'

describe('keyboard remapping', () => {
  it('assigns a new key to one voice', () => {
    const remapped = remapVoice(DEFAULT_KEYBOARD_MAPPING, 'snare', 'KeyL')

    expect(remapped.snare).toEqual(['KeyL'])
    expect(remapped.kick).toEqual(['KeyF'])
    expect(remapped.hihat).toEqual(['KeyK', 'Space'])
  })

  it("swaps the previous key when taking another voice's only key", () => {
    const remapped = remapVoice(DEFAULT_KEYBOARD_MAPPING, 'snare', 'KeyF')

    expect(remapped.snare).toEqual(['KeyF'])
    expect(remapped.kick).toEqual(['KeyJ'])
  })

  it('keeps an alternate key when taking one of several mappings', () => {
    const remapped = remapVoice(DEFAULT_KEYBOARD_MAPPING, 'kick', 'KeyK')

    expect(remapped.kick).toEqual(['KeyK'])
    expect(remapped.hihat).toEqual(['Space'])
  })
})
