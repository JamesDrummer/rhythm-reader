Project: Rhythm Reader \| Status: Ready for build \| Owner: James Bracey \| Last updated: 20 July 2026
<callout icon="🎯" color="purple_bg">
	**Purpose:** **Rhythm Reader** is a browser-based rhythm game that teaches BHDA private students to **read rhythms accurately**. Multi-voice support (hi-hat, snare, kick) is included because real drum reading means tracking rhythms that are broken across voices; it serves the rhythm-reading goal and is not a goal in its own right. This document is the complete specification plus a sequenced set of prompts to give the Codex agent (GPT 5.6 Sol). Hand Codex the prompts in order, one at a time, verifying each "Done when" checklist before moving on.
</callout>
# 1. Product Overview
- **Audience:** BHDA private students, from complete beginners to moderately experienced readers. Used at home as a self-directed practice tool, so the UI must be self-explanatory with no teacher present.
- **Primary goal:** accurate rhythm reading. Multiple voices exist so students learn to read rhythms correctly when they are broken across kick, snare and hi-hat; multi-voice play is a supporting feature, not a co-equal goal. **Scope rule: when any design or feature decision is in tension, rhythm-reading accuracy wins.** Articulations, dynamics and score navigation (repeats etc.) are explicitly out of scope for v1.
- **Platforms:** desktop/laptop and iPad first, responsive down to mobile.
- **Input:** keyboard keys (desktop) and on-screen touch pads (tablet/mobile). MIDI is a nice-to-have: the input layer must be architected so a Web MIDI adapter can be added later without changes to the scoring or game logic.
- **Accounts:** none in v1. Open the page and play. Progress persists in localStorage. Long term this integrates into the BHDA Student Portal (React + Convex + Clerk), so architecture must keep clean seams (see section 3.7).
# 2. Product Specification
## 2.1 Game modes
**Play Along**
- Notation is visible for the whole attempt, with a smooth playhead sweeping across the static bar(s).
- One bar of click count-in with a visual "1 - 2 - 3 - 4".
- The exercise plays **once through**, then shows the results screen.
- **Per-hit live feedback:** each hit instantly shows Miss / Good / Perfect (and colours the relevant notehead).
- **Listen First:** on exercises flagged `listenFirstAllowed` (lower levels, or any exercise introducing a new subdivision), the student can hear the rhythm played back with the click before attempting it.
**Memorise & Perform**
- Notation is displayed for unlimited study time. Student clicks **Ready**, notation hides, count-in plays, student performs from memory.
- **No live feedback during play**: all feedback is retrospective on the results screen.
- One attempt per run; no mid-exercise retries.
## 2.2 What the student hears
- Their own hits, rendered with proper drum one-shot samples (kick, snare, hi-hat), plus the metronome click. **The correct rhythm is never played underneath them during an attempt.**
- Codex must source clean, freely licensed (CC0/public domain) drum one-shots and document their provenance in the repo.
## 2.3 Scoring
- Scoring is **timing accuracy**, per hit, per voice, measured against the Web Audio clock with the device's calibrated latency offset applied.
- Timing windows tighten with level tier. All values live in a single config file:
<table header-row="true">
<tr>
<td>Tier</td>
<td>Perfect</td>
<td>Good</td>
</tr>
<tr>
<td>Beginner</td>
<td>±80ms</td>
<td>±160ms</td>
</tr>
<tr>
<td>Intermediate</td>
<td>±60ms</td>
<td>±120ms</td>
</tr>
<tr>
<td>Advanced</td>
<td>±40ms</td>
<td>±90ms</td>
</tr>
</table>
- Per-hit scoring: Perfect = 100%, Good = 70%, Miss = 0%. Wrong-voice hits count as a miss on the expected note plus an extra-hit penalty. Extra/spurious hits deduct a small configurable penalty.
- Exercise accuracy = weighted average across all expected notes.
- **Stars (tuneable config):** 1★ = 60%, 2★ = 75%, 3★ = 90%.
## 2.4 Results screen
- Overall accuracy % and star rating.
- **Per-voice accuracy breakdown** (e.g. "Kick 92%, Snare 85%, Hi-hat 61%") plus a **rush/drag indicator** per voice (average early/late tendency).
- **Hit timeline visual:** one horizontal timeline per voice. Neutral hollow dots mark where hits *should* have landed; coloured dots (green = perfect, amber = good, red = miss/extra) mark where the student's hits *actually* landed, offset horizontally to show early/late.
- **Layered playback:** a play button that plays back the student's recorded performance layered with the correct rhythm (student hits panned/voiced distinctly, e.g. correct rhythm at full volume, student layer with a slight timbre difference) so they can hear the discrepancies.
- Retry and Next Exercise buttons.
## 2.5 Notation
- Proper percussion staff notation: 5-line stave, percussion clef, standard drum kit mapping (hi-hat = x notehead above top line, snare = third space, kick = bottom space).
- Static bar(s) on screen with a scrolling playhead. No note-highway scrolling.
- **Notation layout (per exercise):** either **two systems** (hands stems up, kick stems down as separate voices; the default) or **one system** (all voices merged into single stem-up chords, beamed together). When simultaneous notes in a one-system exercise have different written durations, the chord takes the shortest duration (standard kit-chart convention); simultaneous notes may not disagree about tuplets.
- **v1 rhythmic scope:** quarter notes, 8th notes, 16th notes, 8th-note triplets, and rests. 4/4 only in the UI.
- **Architecture requirement:** the data model, engine, renderer and scoring must all be time-signature aware and subdivision-extensible (see 3.2). Compound time (6/8), basic odd time (5/4, 7/8), dotted notes, more tuplets and repeat marks are planned future content and must not require a rewrite.
## 2.6 Progression & difficulty design
- Content is organised into **Levels**, each containing a set of exercises.
- **Unlock rule (tuneable):** the next level unlocks when every exercise in the current level has been completed AND a star threshold is met (default: total stars ≥ 2 × number of exercises in the level).
- **Difficulty ingredients, in descending order of impact weight:**
	1. Denser and more varied subdivisions (mixing tuplets with binary subdivisions, or different tuplets against each other, is the highest tier of difficulty)
	2. Rests and syncopation
	3. Tighter timing windows
	4. Faster tempo (tempo is fixed per exercise and is part of its difficulty)
	5. Longer exercises (1 bar → 2 → 4)
	6. More voices at once
- **Level design principle:** introduce low-impact ingredients before high-impact ones. The opening arc is quarter notes and rests on one voice → the same material across multiple voices → introduce 8th notes on one voice → combine quarter notes with pairs of 8th notes → layer voices → introduce 8th-note rests on one voice → combine quarter rests with 8th notes → apply 8th-note rests around the kit → combine quarter and 8th-note rests around the kit. The 16th-note arc then introduces 16ths alone → combines 8ths and 16ths → adds quarter notes → deliberately adds quarter rests, then 8th-note rests, then 16th-note rests → applies the complete binary vocabulary around the kit → and finally introduces triplets and mixed rhythms. Each new stage gets the `listenFirstAllowed` flag on its first two exercises.
- v1 ships with **17 built-in levels of 5 exercises each (85 exercises)**, following this principle. Binary rests grow progressively from full-beat quarter rests to half-beat 8th rests and finally isolated 16th rests; a smaller rest value must not appear before its teaching stage.
- High-score tables are deferred until accounts exist.
## 2.7 Exercise editor (teacher tool)
- Built into the app (a route like `/editor`), designed for James only, but no auth in v1.
- **Grid input:** step-sequencer style. Rows for kick / snare / hi-hat, columns for the current subdivision grid, click to toggle hits. Grid resolution switchable per beat (16ths vs triplet 8ths) so tuplets and binary subdivisions can coexist in one bar.
- **Live notation preview** rendered by the same renderer as the game, plus audio preview playback with click.
- Exercise settings: title, tempo, bars, tier (timing windows), level assignment, `listenFirstAllowed` flag, notation layout (one or two systems).
- **Saving (no redeploy needed):** saved exercises write to localStorage and appear immediately as playable Custom Levels on that device. JSON export/import lets James back up exercises or move them between devices. Optionally, exported JSON can be added to the repo's built-in library and deployed for all users.
- When accounts arrive, custom exercises move server-side and become assignable to individual students.
## 2.8 Branding, tone & naming
- Follow the BHDA Brand Guidelines page: BHDA Purple `#614E90` as the anchor colour, black `#000000` text, `#F5F5F5` background, **Montserrat** (Google Fonts) as the only typeface. No off-brand bright reds/yellows/greens except the semantic feedback colours (green/amber/red) used sparingly for hit feedback.
- Copy is student-facing, friendly, encouraging, **British English** (e.g. "Nice! Your snare was spot on. Hi-hats rushed a little, try staying relaxed."). First person singular where the teacher voice appears.
- **Name: Rhythm Reader** (chosen 20 July 2026). It is the app title; suggested repo name `rhythm-reader`.
# 3. Technical Architecture
## 3.1 Stack
- **React + Vite + TypeScript + Tailwind CSS + shadcn/ui**, matching the BHDA Student Portal V2 stack for consistency and future component portability.
- Own GitHub repo, deployed to **Vercel** ([vercel.app](http://vercel.app) URL is fine for now).
- No backend, no database, no analytics in v1. localStorage only. No personal data is collected, so no GDPR surface.
## 3.2 Rhythm data model (the heart of the app)
- **Completely renderer-agnostic.** No VexFlow types may leak into the model, engine, scoring or editor.
- Time is represented in **integer ticks at 480 PPQ** (ticks per quarter note). This represents binary subdivisions and triplets exactly (16th = 120 ticks, triplet 8th = 160 ticks) and extends to any future tuplet.
- Sketch:
```typescript
type Voice = "kick" | "snare" | "hihat"; // extensible union

interface TimeSignature {
  beats: number;        // e.g. 4, 6, 5, 7
  beatValue: number;    // e.g. 4, 8
  grouping?: number[];  // beam/feel grouping, e.g. [3,3] for 6/8, [3,2] for 5/4
}

interface NoteEvent {
  voice: Voice;
  tick: number;         // absolute position from start of exercise
  duration: number;     // notated value in ticks (for rendering)
  tuplet?: { num: number; den: number }; // e.g. {num:3, den:2} for triplets
}

interface Exercise {
  id: string;
  title: string;
  tempo: number;              // BPM, fixed per exercise
  timeSignature: TimeSignature;
  bars: number;
  events: NoteEvent[];        // rests are derived from gaps, but the
                              // renderer computes and displays them explicitly
  notationSystems?: 1 | 2;   // defaults to 2 (hands up, kick down)
  tier: "beginner" | "intermediate" | "advanced"; // timing windows
  listenFirstAllowed: boolean;
  modes: ("playAlong" | "memorise")[];
}
```
- **Proof-of-extensibility requirement:** unit tests must construct, render (headless/snapshot) and score a 6/8 and a 5/4 exercise even though the v1 UI never exposes them.
## 3.3 Notation rendering: VexFlow + overlay hybrid
- **VexFlow renders the static notation** once per exercise (it owns engraving: beams, flags, stems, tuplet brackets, rests, spacing).
- A dedicated mapping module converts the abstract `Exercise` into VexFlow objects, then **extracts the rendered x/y coordinates and bounding boxes of every notehead** and exposes them as a `NoteLayout[]` keyed to `NoteEvent`s.
- A **transparent SVG/canvas overlay** sits on top of the VexFlow output and owns everything dynamic: the smooth playhead (interpolated between note x-positions using tick timing), per-note hit colouring, and Miss/Good/Perfect feedback markers.
- Because the model is renderer-agnostic, VexFlow is swappable later without touching the engine, scoring or editor.
## 3.4 Timing engine
- All scheduling uses the **Web Audio API clock** (`AudioContext.currentTime`) with a lookahead scheduler (the standard Chris Wilson "Tale of Two Clocks" pattern). **Never** `setTimeout`/`setInterval` for musical timing; requestAnimationFrame drives visuals only, reading from the audio clock.
- Input timestamps: use `performance.now()` at the event handler, converted to the audio clock timeline via a measured offset, minus the device's calibrated latency.
- **Latency calibration screen:** a "tap along with the click" test (12 to 16 taps, discard first 4, use the median offset). Stored per device in localStorage, re-runnable from settings, prompted on first visit.
## 3.5 Input layer
- Abstract `InputSource` interface emitting `{ voice, timestamp }` events. Implementations: keyboard (default mapping e.g. F = kick, J = snare, Space or K = hi-hat, remappable in settings) and touch pads (three large labelled pads, thumb-reachable on tablet in landscape). MIDI becomes a third implementation later.
- Touch pads must use `touchstart`/`pointerdown` (not click) and disable double-tap zoom for minimal latency.
## 3.6 Config-driven tuning
- One `config.ts` holds: timing windows per tier, star thresholds, level unlock rule, penalties, count-in length, calibration parameters. James should be able to retune the game feel without touching game code.
## 3.7 Portal-readiness (build for, don't build)
- Progress persistence goes through a `ProgressStore` interface with a localStorage implementation; a Convex implementation slots in later.
- Exercise loading goes through an `ExerciseSource` interface (built-in JSON + localStorage customs now; server-assigned exercises later).
- No assumptions anywhere that there is exactly one anonymous user.
# 4. Testing & QA expectations
- Unit tests: data model, tick maths (especially triplet boundaries), scoring windows, star/unlock logic, calibration median maths, 6/8 and 5/4 proof tests.
- Component tests: grid editor toggling, results timeline rendering from a known score record.
- Manual QA checklist per milestone: desktop Chrome/Safari/Firefox, iPad Safari (touch latency and audio unlock on first gesture), small phone layout.
- Audio on iOS requires the AudioContext to be resumed from a user gesture: the count-in must only start after a tap/click.
# 5. Codex Prompt Sequence
<callout icon="🤖" color="gray_bg">
	Give these to Codex **in order, one at a time**. Each prompt assumes the previous ones are merged. Verify the "Done when" list before moving on. Paste section 2 and 3 of this document alongside Prompt 1 so the agent has the full spec in context, and reference it in later prompts as "the spec".
</callout>
<details>
<summary>**Prompt 1 - Scaffold, theme and app shell**</summary>
	```plain text
Create a new React + Vite + TypeScript project for a browser-based drum rhythm reading game (full spec provided separately - read it first).

Setup:
- Vite + React 19 + TypeScript strict mode
- Tailwind CSS + shadcn/ui, themed with BHDA branding: primary purple #614E90, text #000000, background #F5F5F5, font Montserrat via Google Fonts. Define these as Tailwind custom colours under a `bhda` key.
- ESLint + Prettier, Vitest for testing
- React Router with routes: / (level select), /play/:exerciseId, /editor, /settings, /calibrate
- A responsive app shell: header with the app name "Rhythm Reader" and settings icon, main content area. Mobile-first, must look right on desktop, iPad landscape, and a 375px phone.
- Placeholder pages for each route.
- All copy in British English.

Done when: `npm run dev` serves the shell, all routes render placeholders, theme colours and Montserrat visibly applied, `npm test` and `npm run build` pass.
	```
</details>
<details>
<summary>**Prompt 2 - Rhythm data model, config and tick maths**</summary>
	```plain text
Implement the core rhythm data model exactly as defined in section 3.2 of the spec. This module must have ZERO dependencies on any rendering or audio library.

- src/model/: Voice, TimeSignature, NoteEvent, Exercise types; PPQ constant = 480.
- Tick utilities: ticksPerBar(timeSignature), tickToSeconds(tick, tempo), beat/subdivision grid generators for binary (quarters, 8ths, 16ths) and triplet 8th grids, and derivation of rest positions from gaps between events for a given metric grid.
- Validation: events within bars, no two events on the same voice at the same tick, tuplet fields consistent.
- src/config.ts: timing windows per tier (beginner ±80/160ms, intermediate ±60/120ms, advanced ±40/90ms), star thresholds (60/75/90%), per-hit values (perfect 100%, good 70%), extra-hit penalty, level unlock rule (all exercises complete AND total stars >= 2 × exercise count), count-in = 1 bar.
- Exhaustive unit tests including: triplet 8th positions in 4/4 (ticks 0,160,320 per beat), a 6/8 exercise ({beats:6, beatValue:8, grouping:[3,3]}) and a 5/4 exercise ({grouping:[3,2]}) constructed and validated successfully - these two are our proof the architecture is time-signature ready even though the v1 UI only exposes 4/4.

Done when: all tests pass; no rendering/audio imports anywhere in src/model.
	```
</details>
<details>
<summary>**Prompt 3 - Audio engine: samples, click, transport, count-in**</summary>
	```plain text
Implement the audio engine using the Web Audio API. Musical timing must NEVER use setTimeout/setInterval; use a lookahead scheduler on AudioContext.currentTime (Chris Wilson 'A Tale of Two Clocks' pattern, ~25ms timer, ~100ms lookahead).

- Source clean, freely licensed (CC0 or equivalent) one-shot samples: kick, snare, closed hi-hat, plus two click sounds (accented downbeat + regular). Document source and licence in ASSETS.md.
- SamplePlayer: preloads/decodes samples, plays a voice at an exact AudioContext time.
- Transport: given an Exercise, schedules count-in (1 bar of clicks, accented beat 1) then the click through the exercise, emits tick-accurate schedule info that the UI layer can read for the playhead, fires callbacks for countInBeat (for the visual 1-2-3-4), exerciseStart, exerciseEnd. Supports a 'playback' mode that also schedules the exercise's own notes (used by Listen First, the editor preview, and results playback).
- iOS: AudioContext must resume on first user gesture; transport must refuse to start until unlocked.
- Immediate hit sound: a playNow(voice) call for when the student strikes a pad/key.

Done when: a temporary test page can play the count-in + click for a hardcoded 2-bar exercise at 80bpm with no drift (verify against a DAW/metronome), Listen First playback renders the correct rhythm audibly, works in Chrome and iPad Safari.
	```
</details>
<details>
<summary>**Prompt 4 - Notation rendering: VexFlow + coordinate extraction + overlay playhead**</summary>
	```plain text
Implement notation rendering as a hybrid: VexFlow draws the static notation; a transparent overlay owns all dynamic visuals. No VexFlow types may leak outside src/notation/.

- src/notation/vexflowMapper.ts: converts an Exercise into VexFlow staves/voices/beams/tuplets on a percussion stave. Drum mapping: hi-hat = x notehead above the top line, snare = third space, kick = first space, stems per standard drum convention (hi-hat/snare stems up... use combined voice conventions appropriate for up to 3 voices; kick stems down as its own voice). Rests rendered where the metric grid has gaps. 4/4 for now but driven entirely by exercise.timeSignature and grouping - no hardcoded 4s.
- After render, extract per-NoteEvent layout: { event, x, y, bbox } as NoteLayout[], plus bar boundary x-positions.
- src/notation/Overlay.tsx: absolutely positioned SVG layer over the VexFlow output providing: (a) a smooth playhead line that interpolates x-position from elapsed ticks using NoteLayout + bar boundaries, driven by requestAnimationFrame reading the audio clock; (b) methods to colour a notehead region green/amber/red and float a Perfect/Good/Miss label above it.
- Notation scales responsively (fit-width) while keeping coordinate mapping correct.

Done when: a test page renders a 2-bar exercise using all v1 values (quarters, 8ths, 16ths, triplet 8ths, rests) across 3 voices that visibly looks like correct drum notation; playhead sweeps in perfect sync with the click from Prompt 3; snapshot test of NoteLayout output; the 6/8 proof exercise renders without error on the test page.
	```
</details>
<details>
<summary>**Prompt 4b - One-system and two-system notation layouts**</summary>
	```plain text
Add support for two engraving layouts, driven by a new optional Exercise field notationSystems?: 1 | 2 (default 2 = current behaviour).

- 2 systems (default): current engraving - hands stems up, kick stems down as separate voices.
- 1 system: all voices render in a single stem-up voice, beamed together. Simultaneous events merge into one chord; where their written durations differ, the chord takes the shortest duration (standard kit-chart convention).
- Validation: in one-system exercises, simultaneous events must have identical tuplet status; reject with a clear error otherwise.
- Keep changes inside src/model (type + validation) and src/notation (lane construction). Scoring and audio must be untouched.
- Update SPEC.md sections 2.5, 2.7 and 3.2 to record the new field, so the editor prompt later exposes it as a setting.
- Tests: snapshot a one-system render of the audio demo exercise; a mixed-duration simultaneous pair engraves with the shortest duration; validation rejects mismatched tuplets at a shared tick when notationSystems is 1.

Done when: the notation test page shows the same exercise rendered in both layouts; all tests pass.
	```
</details>
<details>
<summary>**Prompt 5 - Input layer and latency calibration**</summary>
	```plain text
Implement input handling and the latency calibration flow.

- InputSource interface emitting { voice, timeMs } where timeMs is on the AudioContext timeline. Implementations: KeyboardInput (defaults F=kick, J=snare, K or Space=hihat, remappable, persisted in localStorage) and TouchPadInput (three large labelled pads with the BHDA palette, pointerdown-based, no 300ms delay, no double-tap zoom, layout optimised for iPad landscape and phone portrait).
- Every hit triggers SamplePlayer.playNow(voice) immediately for auditory feedback.
- /calibrate route: plays a steady click at 90bpm, user taps any input 16 times, discard the first 4, store the median signed offset in localStorage as deviceLatencyOffset. Show the measured value in ms with a friendly British-English explanation. Prompt users to calibrate on first ever visit (one-time banner). Scoring will subtract this offset from all hit timestamps.
- /settings: key remapping and re-run calibration.

Done when: pads and keys both trigger sounds with no perceptible lag on desktop and iPad; calibration produces a stable, repeatable offset; unit tests cover the median calculation.
	```
</details>
<details>
<summary>**Prompt 6 - Scoring engine**</summary>
	```plain text
Implement scoring as a pure, fully unit-testable module (src/scoring/, no DOM/audio imports).

- Input: Exercise, tier config, and the list of calibrated hits { voice, timeMs }. Expected hit times derive from event ticks + tempo + count-in offset.
- Matching: for each expected note, find the nearest unconsumed hit on the same voice within the Good window; classify Perfect/Good by window; unmatched expected notes = Miss; unmatched hits = extra hits (config penalty). A hit can only match one note.
- Output ScoreRecord: per-note results (with signed error ms), per-voice accuracy % and mean signed error (rush/drag), overall accuracy %, star rating, plus the raw hits (needed for results playback and the timeline visual).
- Live-feedback helper: classify a single hit against the nearest expected note in real time (used by Play Along mode only).
- Unit tests: boundary cases at exact window edges, wrong-voice hits, extra hits, all tiers, and scoring the 5/4 proof exercise.

Done when: all tests pass; module is pure.
	```
</details>
<details>
<summary>**Prompt 7 - Play Along mode (first playable build)**</summary>
	```plain text
Wire everything into the Play Along game mode at /play/:exerciseId.

Flow: exercise loads → notation rendered → if exercise.listenFirstAllowed, show a 'Listen first' button (plays the rhythm with click via transport playback mode) → Start button (also unlocks audio on iOS) → visual + audio count-in (big 1-2-3-4) → playhead sweeps, student plays, per-hit live feedback appears (notehead colouring + Perfect/Good/Miss floats) → exercise ends → results screen (stub for now: overall %, stars, retry, back).
- Input is active only between exercise start and end (plus the Good window grace after the final expected note).
- Keyboard hint strip on desktop; touch pads docked at the bottom on touch devices.
- Handle early exit (back navigation stops transport cleanly).

Done when: a hardcoded set of 3 exercises is fully playable start-to-finish on desktop and iPad; live feedback matches scoring output; no console errors; the game feels responsive (hit sounds instant, feedback within a frame or two).
	```
</details>
<details>
<summary>**Prompt 8 - Memorise & Perform mode + full results screen**</summary>
	```plain text
Add the second game mode and the complete results screen (spec sections 2.1 and 2.4).

Memorise & Perform: notation shown with a 'Ready' button (unlimited study time) → on Ready, notation hides (replaced by a calm 'From memory...' panel) → count-in → student performs with NO live feedback → results.

Results screen (both modes):
- Overall accuracy %, star rating with a small celebration animation for 3 stars.
- Per-voice breakdown: accuracy % and rush/drag indicator (e.g. 'Hi-hat: 61% · rushing by ~25ms') in friendly British-English student-facing copy.
- Hit timeline: one horizontal lane per voice; hollow neutral dots at expected positions; coloured dots (green/amber/red) at actual hit positions showing early/late offset; bar lines marked. Extra hits shown red. Build from ScoreRecord only (component-testable).
- Layered playback button: plays the correct rhythm at full volume layered with the student's recorded hits (subtly different timbre or slight pan) plus click, via the transport.
- Retry / Next exercise buttons.

Done when: both modes playable end-to-end; timeline visually matches known synthetic ScoreRecords in component tests; layered playback audibly reveals timing gaps.
	```
</details>
<details>
<summary>**Prompt 9 - Levels, progression, persistence and the built-in library**</summary>
	```plain text
Implement content structure and progression (spec section 2.6, config from src/config.ts).

- ExerciseSource interface: BuiltInSource (JSON files in the repo) + CustomSource (localStorage) merged into one catalogue of Levels.
- ProgressStore interface with a localStorage implementation: best score/stars per exercise, completion, unlock state. Design both interfaces so server-backed implementations can replace them later (portal integration) - no assumption of a single anonymous user baked into call sites.
- Level select screen (/): levels as cards with lock state, star totals, progress; exercises listed with best stars and available modes. Locked levels show what's needed to unlock. BHDA-branded, friendly copy.
- Unlock logic per config: all exercises in the level completed AND total stars >= 2 × exercise count.
- Author the built-in library: 17 levels x 5 exercises (85 exercises total) following the level design principle in spec 2.6. The ordered arc is quarter-note foundations → around the kit → 8th-note steps → quarter notes with pairs of 8ths → layered 8ths → 8th-note rests on one voice → quarter rests with 8th notes → 8th-note rests around the kit → quarter and 8th rests around the kit → 16th-note foundations → 8ths with 16ths → quarters, 8ths and 16ths → mixed values with quarter rests → mixed values with 8th rests → mixed values with 16th rests → mixed binary rhythms around the kit → triplets and mixed rhythms. Tempos reset slightly for each new reading challenge, then rise within the level. Mark the first two exercises of each new stage `listenFirstAllowed: true`; tighten tiers within later levels. Memorise mode is enabled from level 2 onwards.

Done when: fresh browser shows level 1 only unlocked; playing through legitimately unlocks level 2; progress survives reload; unit tests cover unlock logic; all built-in exercises validate against the model and render correctly.
	```
</details>
<details>
<summary>**Prompt 10 - Exercise editor**</summary>
	```plain text
Build the teacher-facing exercise editor at /editor (spec section 2.7). No auth in v1.

- Step-sequencer grid: rows kick/snare/hihat, columns per subdivision. Per-beat grid resolution toggle: 16ths (4 columns/beat) or triplet 8ths (3 columns/beat), so binary and ternary subdivisions can coexist within one bar. Click/tap toggles hits. Bar count selector (1/2/4).
- Settings panel: title, tempo, tier, listenFirstAllowed, enabled modes, level assignment (existing custom level or create new).
- Live notation preview using the game's renderer, updating as the grid changes, plus audio preview (transport playback mode with click).
- Save writes to localStorage via CustomSource: the exercise is IMMEDIATELY playable from the level select under its custom level, no redeploy.
- Export: download all custom exercises (or one) as JSON; Import: load a JSON file, with validation and clear error messages. Exported JSON format = built-in library format, so exported exercises can be committed to the repo as built-in content.
- Manage list: edit, duplicate, delete existing custom exercises.

Done when: create a 2-bar exercise mixing 16ths and triplet 8ths in the grid, preview it, play it back, save it, then play it as a real exercise in both modes without reloading; export → wipe localStorage → import restores it.
	```
</details>
<details>
<summary>**Prompt 11 - Polish, responsive QA and deploy**</summary>
	```plain text
Final polish and deployment pass.

- Responsive audit: desktop, iPad landscape (primary touch target), phone portrait. Notation scales legibly; touch pads comfortably reachable; no horizontal scrolling.
- Branding audit against BHDA guidelines: #614E90 anchor colour used consistently, Montserrat everywhere, #F5F5F5 background, semantic green/amber/red only for feedback. British English copy audit (no Americanisms, no em dashes).
- Empty/edge states: no custom exercises yet, calibration never run (gentle nudge), audio blocked, tiny screens.
- Performance: preload samples on level select; ensure no audio glitches on first exercise start; Lighthouse pass.
- Add a friendly help/about page: key mappings, how scoring works in plain English, why calibration matters.
- Deploy to Vercel with a vercel.json/SPA fallback as needed; verify the deployed build on a real iPad (audio unlock, touch latency, calibration).
- README: setup, architecture overview (model/audio/notation/scoring separation, portal-readiness seams), how to add built-in levels from editor exports.

Done when: deployed vercel.app URL passes the full manual QA checklist in spec section 4 on desktop and iPad.
	```
</details>
# 6. Working with Sol: code review loop and UI guardrails
## 6.1 Code review loop
- **Cadence:** after each prompt's "Done when" checklist passes, get the code reviewed *before* starting the next prompt. Verbosity compounds; catching it per-milestone keeps refactors small.
- **Two ways to get a review from Notion AI:** connect the GitHub repo to Notion AI so the reviewer can read files and recent changes directly, or paste the diff / key files into a chat.
- **Reusable review brief** (paste alongside the code every time):
```plain text
Review this code against the Rhythm Reader spec. Priorities in order:
1. Correctness against the spec (especially timing maths, tick arithmetic, scoring windows, latency offset handling)
2. Simplicity: flag anything achievable with meaningfully less code - unnecessary abstractions, premature generality, dead code, hand-rolled versions of library/stdlib features, over-engineered state management
3. Boundary leaks: VexFlow types outside src/notation, audio/DOM imports inside src/model or src/scoring, tunable values hardcoded outside config.ts
4. Naming and readability
Suggest concrete simplifications with short before/after sketches. Do NOT suggest new features or scope changes.
```
- **Feed findings back to Sol as targeted instructions** ("Replace the XYZ class with a plain function that takes...") rather than "make it more elegant". Vague feedback produces vague refactors.
## 6.2 UI guardrails for Sol
Sol's weakness is visual taste, so remove taste from the equation: constrain it to a design system whose defaults are already good, and never let it invent visual design.
- **Paste this block into Prompts 1, 5, 7, 8, 9, 10 and 11:**
```plain text
UI rules (non-negotiable):
- shadcn/ui components with default styling, themed only via the bhda Tailwind colours. Tailwind utilities only; no custom CSS files; do not restyle component internals.
- Layout: generous whitespace; max content width ~720px centred (the game screen may go wider); spacing on the 4/8px scale only.
- Type: Montserrat; at most two body text sizes per screen plus one heading size.
- Colour: #F5F5F5 background, near-black text, #614E90 for primary actions and accents ONLY. Green/amber/red are reserved exclusively for hit feedback. No gradients, no extra colours.
- One primary (filled purple) button per screen; icons from lucide-react only.
- Cards: rounded-xl, shadcn default shadow. No heavier shadows, no decorative borders.
- No decorative illustrations, no emoji sprinkled in copy, no invented graphics.
- When unsure, choose the plainer option.
```
- **Wireframe first for the four big screens** (level select, game screen, results, editor): ask Sol to describe the layout in words (regions, hierarchy, what is biggest) before writing any code, and correct it at that stage. Correcting a text wireframe costs seconds; correcting rendered UI costs a whole iteration.
- **Screenshot iteration:** after each UI-heavy prompt, screenshot the result and give concrete corrections ("pads should be \~30% of viewport height, docked to the bottom edge") rather than "make it nicer". Screenshots can also be pasted into a Notion AI chat for a critique with specific fix instructions to relay back to Sol.
# 7. Future roadmap (explicitly out of v1 scope)
- Accounts and portal integration (Convex + Clerk), per-student exercise assignment, high-score tables, server-side progress
- Compound time (6/8), odd time (5/4, 7/8) content and UI
- Dotted notes, further tuplets, repeat marks, dynamics/articulations
- MIDI input adapter (Web MIDI) for e-kits
- Teacher analytics (which subdivisions a student consistently rushes)
