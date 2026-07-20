# Audio assets

The five one-shot samples in `public/audio/` come from [Sample Pi](https://github.com/alex-esc/sample-pi), a collection of the samples distributed with Sonic Pi. The pack's README states that all samples are sourced from Freesound and placed in the public domain under the [Creative Commons CC0 1.0 dedication](https://creativecommons.org/publicdomain/zero/1.0/).

| App file            | Sample Pi source          | Original recording                                                                 |
| ------------------- | ------------------------- | ---------------------------------------------------------------------------------- |
| `kick.wav`          | `drum_bass_hard.flac`     | [menegass, Freesound 100051](https://freesound.org/people/menegass/sounds/100051/) |
| `snare.wav`         | `drum_snare_hard.flac`    | [menegass, Freesound 100058](https://freesound.org/people/menegass/sounds/100058/) |
| `hihat-closed.wav`  | `drum_cymbal_closed.flac` | [menegass, Freesound 100053](https://freesound.org/people/menegass/sounds/100053/) |
| `click-accent.wav`  | `elec_tick.flac`          | [looppool, Freesound 13113](https://freesound.org/people/looppool/sounds/13113/)   |
| `click-regular.wav` | `elec_tick.flac`          | [looppool, Freesound 13113](https://freesound.org/people/looppool/sounds/13113/)   |

## Processing

The source FLAC files were downloaded from the Sample Pi `main` branch on 20 July 2026 and converted with FFmpeg to mono, 44.1 kHz, signed 16-bit PCM WAV. The accented click uses the same `elec_tick` recording as the regular click, pitch-shifted up seven semitones so beat 1 is distinct without changing timbre. No other processing is applied. WAV was chosen to maximise reliable `decodeAudioData` support in Chrome and iPad Safari.

The CC0 dedication permits copying, modification, distribution and commercial use without attribution. The source details above are retained so the provenance remains auditable.
