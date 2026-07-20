# Rhythm Reader

Rhythm Reader is a browser-based drum rhythm reading game for BHDA students. It runs without an account, stores progress and custom exercises in the current browser, and is designed for desktop, iPad and phone use.

## Setup

You need Node.js 20.19 or newer and npm.

```bash
npm install
npm run dev
```

Vite prints the local address, normally `http://localhost:5173`.

Before deploying a change, run the complete local check:

```bash
npm test
npm run lint
npm run format:check
npm run build
```

The production build is written to `dist/`. To inspect that build locally:

```bash
npm run preview
```

## Architecture

The app keeps rhythm rules separate from browser and presentation code so each part can be tested and replaced independently.

- `src/model/` contains renderer-independent exercise types, validation and integer tick maths at 480 PPQ. It has no audio, DOM or VexFlow dependencies.
- `src/audio/` owns sample loading, Web Audio scheduling, count-in and transport timing. Musical scheduling follows the audio clock; animation frames are only used to display progress.
- `src/notation/` is the only layer that knows about VexFlow. It converts model exercises into notation and exposes plain coordinate data to the playhead and feedback overlay.
- `src/scoring/` is a pure timing engine. It receives an exercise and calibrated hits, then returns the per-note, per-voice and overall result used by the UI.
- `src/input/` translates keyboard or touch input into one shared hit shape. A MIDI input can be added later without changing scoring.
- `src/content/` merges built-in JSON with custom exercises from localStorage.
- `src/progress/` exposes a `ProgressStore` interface, currently backed by localStorage.
- `src/pages/` composes those parts into level select, play, calibration, settings, help and editor routes.

The `ExerciseSource` and `ProgressStore` interfaces are the main portal-readiness seams. Server-backed implementations can replace the local adapters when Rhythm Reader moves into the BHDA Student Portal, without coupling Convex or Clerk to the model, notation, audio or scoring layers.

## Audio assets

The drum and click samples are small CC0 WAV files. Their sources, licence and processing are documented in [ASSETS.md](./ASSETS.md).

The level-select page warms the browser cache for all five files. The first Start, Listen first, preview or calibration gesture then unlocks Web Audio, decodes the cached files and waits for them to be ready before the transport begins.

## Adding built-in levels from the editor

The editor at `/editor` saves custom exercises only on the current device. Its export format is deliberately the same format used by the built-in library.

1. Create and save the exercises in the editor.
2. In **Custom exercises**, choose **Export all**. To add only one exercise, use its download button.
3. Open the downloaded JSON and `src/content/library/levels.json`.
4. Add the exported level object to the built-in array, or add its exercise objects to the correct existing level.
5. Keep every level `id` and exercise `id` unique. Set `order` to the required position.
6. Run `npm test`, `npm run lint` and `npm run build`. The library tests validate every built-in exercise and its progression data.

An exported exercise stores repeated notes in compact `groups`. Each group has a drum `voice`, tick `duration` and a list of absolute `ticks`. Triplet groups also include `{ "tuplet": { "num": 3, "den": 2 } }`. Do not convert these values to milliseconds; tempo is stored separately and the model derives timing from ticks.

## Deployment

`vercel.json` sends client-side routes such as `/play/:exerciseId`, `/editor` and `/help` back to `index.html`. Static files are still served directly by Vercel.

For an already linked Vercel project:

```bash
npx vercel --prod
```

No environment variables, backend services or personal data are required in v1.
