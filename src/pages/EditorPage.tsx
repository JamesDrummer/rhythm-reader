import {
  Copy,
  Download,
  Pencil,
  Play,
  Plus,
  Save,
  Square,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { createAudioContext, SamplePlayer, Transport } from '@/audio'
import { Button } from '@/components/ui/button'
import { BUILT_IN_LEVELS, parseLibraryJson, serialiseLibrary } from '@/content'
import { ExerciseGrid } from '@/editor/ExerciseGrid'
import {
  createEditorGrid,
  gridFromExercise,
  normaliseDurations,
  resizeGrid,
  setBeatResolution,
  type BeatResolution,
  type EditorGrid,
} from '@/editor/grid'
import {
  assertValidExercise,
  type Exercise,
  type ExerciseMode,
  type Level,
  type Tier,
} from '@/model'
import { Notation, type NotationClock } from '@/notation'
import { useAppServices } from '@/services/useAppServices'

const NEW_LEVEL_VALUE = '__new_level__'
const FIELD_CLASS =
  'mt-2 h-11 w-full rounded-md border bg-bhda-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhda-accent'

interface DraftSettings {
  title: string
  tempo: number
  tier: Tier
  listenFirstAllowed: boolean
  modes: ExerciseMode[]
  notationSystems: 1 | 2
}

interface PreviewEngine {
  context: AudioContext
  player: SamplePlayer
  transport: Transport
}

function initialSettings(): DraftSettings {
  return {
    title: '',
    tempo: 70,
    tier: 'beginner',
    listenFirstAllowed: true,
    modes: ['playAlong', 'memorise'],
    notationSystems: 2,
  }
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'exercise'
  )
}

function uniqueId(
  prefix: string,
  title: string,
  occupied: Set<string>,
): string {
  const base = `${prefix}-${slug(title)}`
  let id = `${base}-${Date.now().toString(36)}`
  let suffix = 2
  while (occupied.has(id)) {
    id = `${base}-${Date.now().toString(36)}-${suffix}`
    suffix += 1
  }
  return id
}

function downloadJson(filename: string, json: string): void {
  const url = URL.createObjectURL(
    new Blob([json], { type: 'application/json;charset=utf-8' }),
  )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function editorExercise(
  id: string,
  settings: DraftSettings,
  grid: EditorGrid,
): Exercise {
  return {
    id,
    title: settings.title.trim() || 'Untitled exercise',
    tempo: settings.tempo,
    timeSignature: { beats: 4, beatValue: 4 },
    bars: grid.bars,
    events: normaliseDurations(grid.events, grid.resolutions),
    notationSystems: settings.notationSystems,
    tier: settings.tier,
    listenFirstAllowed: settings.listenFirstAllowed,
    modes: settings.modes,
  }
}

export function EditorPage() {
  const { catalogueScope, customExerciseSource } = useAppServices()
  const [customLevels, setCustomLevels] = useState<readonly Level[]>([])
  const [settings, setSettings] = useState<DraftSettings>(initialSettings)
  const [grid, setGrid] = useState<EditorGrid>(() => createEditorGrid())
  const [levelChoice, setLevelChoice] = useState(NEW_LEVEL_VALUE)
  const [newLevelTitle, setNewLevelTitle] = useState('My custom level')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const previewRef = useRef<PreviewEngine | null>(null)

  const refreshCustomLevels = useCallback(() => {
    void customExerciseSource
      .loadLevels(catalogueScope)
      .then(setCustomLevels)
      .catch(() => setError('Your saved custom exercises could not be loaded.'))
  }, [catalogueScope, customExerciseSource])

  useEffect(() => {
    refreshCustomLevels()
    return customExerciseSource.subscribe?.(refreshCustomLevels)
  }, [customExerciseSource, refreshCustomLevels])

  const previewExercise = useMemo(
    () => editorExercise(editingId ?? 'editor-preview', settings, grid),
    [editingId, grid, settings],
  )
  const notationClock = useMemo<NotationClock>(
    () => ({
      getElapsedTicks: () =>
        previewRef.current?.transport.getPosition().exerciseTick ?? -1,
    }),
    [],
  )

  const clearMessages = () => {
    setStatus(null)
    setError(null)
  }

  const resetDraft = () => {
    previewRef.current?.transport.stop()
    setPreviewing(false)
    setSettings(initialSettings())
    setGrid(createEditorGrid())
    setEditingId(null)
    setLevelChoice(customLevels[0]?.id ?? NEW_LEVEL_VALUE)
    setNewLevelTitle('My custom level')
    setDeleteCandidate(null)
    clearMessages()
  }

  const saveLevels = async (levels: readonly Level[]) => {
    await customExerciseSource.saveLevels(catalogueScope, levels)
    setCustomLevels(levels.map((level) => ({ ...level, custom: true })))
  }

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    clearMessages()
    try {
      if (!settings.title.trim()) throw new Error('Add an exercise title.')
      if (
        !Number.isFinite(settings.tempo) ||
        settings.tempo < 30 ||
        settings.tempo > 240
      ) {
        throw new Error('Set a tempo between 30 and 240 bpm.')
      }
      if (settings.modes.length === 0) {
        throw new Error('Enable at least one game mode.')
      }
      if (grid.events.length === 0) {
        throw new Error('Add at least one hit to the grid.')
      }
      if (levelChoice === NEW_LEVEL_VALUE && !newLevelTitle.trim()) {
        throw new Error('Name the new custom level.')
      }

      const occupiedExerciseIds = new Set(
        [...BUILT_IN_LEVELS, ...customLevels].flatMap((level) =>
          level.exercises.map((exercise) => exercise.id),
        ),
      )
      const exerciseId =
        editingId ??
        uniqueId('custom-exercise', settings.title, occupiedExerciseIds)
      const exercise = editorExercise(exerciseId, settings, grid)
      assertValidExercise(exercise)

      let nextLevels = customLevels.map((level) => ({
        ...level,
        exercises: level.exercises.filter((item) => item.id !== editingId),
      }))
      let targetLevel: Level | undefined

      if (levelChoice === NEW_LEVEL_VALUE) {
        const occupiedLevelIds = new Set(
          [...BUILT_IN_LEVELS, ...customLevels].map((level) => level.id),
        )
        targetLevel = {
          id: uniqueId('custom-level', newLevelTitle, occupiedLevelIds),
          title: newLevelTitle.trim(),
          description: 'Custom exercises created in Rhythm Reader.',
          order: Math.max(99, ...customLevels.map((level) => level.order)) + 1,
          exercises: [],
          custom: true,
        }
        nextLevels = [...nextLevels, targetLevel]
      } else {
        targetLevel = nextLevels.find((level) => level.id === levelChoice)
      }
      if (!targetLevel)
        throw new Error('Choose a custom level for this exercise.')

      nextLevels = nextLevels
        .map((level) =>
          level.id === targetLevel.id
            ? { ...level, exercises: [...level.exercises, exercise] }
            : level,
        )
        .filter((level) => level.exercises.length > 0)

      await saveLevels(nextLevels)
      setEditingId(exerciseId)
      setLevelChoice(targetLevel.id)
      setStatus(
        `Saved “${exercise.title}”. It is ready to play from the levels page.`,
      )
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'The exercise could not be saved.',
      )
    }
  }

  const handleEdit = (level: Level, exercise: Exercise) => {
    previewRef.current?.transport.stop()
    setPreviewing(false)
    setSettings({
      title: exercise.title,
      tempo: exercise.tempo,
      tier: exercise.tier,
      listenFirstAllowed: exercise.listenFirstAllowed,
      modes: [...exercise.modes],
      notationSystems: exercise.notationSystems ?? 2,
    })
    setGrid(gridFromExercise(exercise))
    setEditingId(exercise.id)
    setLevelChoice(level.id)
    clearMessages()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDuplicate = async (level: Level, exercise: Exercise) => {
    clearMessages()
    const occupied = new Set(
      customLevels.flatMap((item) =>
        item.exercises.map((candidate) => candidate.id),
      ),
    )
    const duplicate = {
      ...exercise,
      id: uniqueId('custom-exercise', `${exercise.title}-copy`, occupied),
      title: `${exercise.title} copy`,
      events: exercise.events.map((item) => ({ ...item })),
    }
    await saveLevels(
      customLevels.map((item) =>
        item.id === level.id
          ? { ...item, exercises: [...item.exercises, duplicate] }
          : item,
      ),
    )
    setStatus(`Duplicated “${exercise.title}”.`)
  }

  const handleDelete = async (exerciseId: string) => {
    clearMessages()
    const nextLevels = customLevels
      .map((level) => ({
        ...level,
        exercises: level.exercises.filter(
          (exercise) => exercise.id !== exerciseId,
        ),
      }))
      .filter((level) => level.exercises.length > 0)
    await saveLevels(nextLevels)
    if (editingId === exerciseId) resetDraft()
    setDeleteCandidate(null)
    setStatus('Custom exercise deleted from this device.')
  }

  const exportAll = () => {
    clearMessages()
    if (customLevels.length === 0) {
      setError('There are no custom exercises to export yet.')
      return
    }
    downloadJson(
      'rhythm-reader-custom-library.json',
      serialiseLibrary(customLevels),
    )
    setStatus('Downloaded all custom exercises as built-in library JSON.')
  }

  const exportOne = (level: Level, exercise: Exercise) => {
    downloadJson(
      `${slug(exercise.title)}.json`,
      serialiseLibrary([{ ...level, exercises: [exercise] }]),
    )
    setStatus(`Downloaded “${exercise.title}” as built-in library JSON.`)
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    clearMessages()
    try {
      const imported = parseLibraryJson(await file.text())
      const builtInLevelIds = new Set(BUILT_IN_LEVELS.map((level) => level.id))
      const existingExerciseIds = new Set(
        [...BUILT_IN_LEVELS, ...customLevels].flatMap((level) =>
          level.exercises.map((exercise) => exercise.id),
        ),
      )
      const duplicateBuiltInLevel = imported.find((level) =>
        builtInLevelIds.has(level.id),
      )
      if (duplicateBuiltInLevel) {
        throw new Error(
          `A built-in level with the id “${duplicateBuiltInLevel.id}” already exists.`,
        )
      }
      const duplicateExercise = imported
        .flatMap((level) => level.exercises)
        .find((exercise) => existingExerciseIds.has(exercise.id))
      if (duplicateExercise) {
        throw new Error(
          `An exercise with the id “${duplicateExercise.id}” already exists.`,
        )
      }
      const mergedLevels = customLevels.map((level) => ({ ...level }))
      for (const importedLevel of imported) {
        const existingIndex = mergedLevels.findIndex(
          (level) => level.id === importedLevel.id,
        )
        if (existingIndex >= 0) {
          mergedLevels[existingIndex] = {
            ...mergedLevels[existingIndex],
            exercises: [
              ...mergedLevels[existingIndex].exercises,
              ...importedLevel.exercises,
            ],
          }
        } else {
          mergedLevels.push({ ...importedLevel, custom: true })
        }
      }
      await saveLevels(mergedLevels)
      setStatus(
        `Imported ${imported.reduce(
          (total, level) => total + level.exercises.length,
          0,
        )} custom exercise${
          imported.flatMap((level) => level.exercises).length === 1 ? '' : 's'
        }.`,
      )
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : 'The selected file could not be imported.',
      )
    }
  }

  const stopPreview = useCallback(() => {
    previewRef.current?.transport.stop()
    setPreviewing(false)
  }, [])

  const togglePreview = async () => {
    clearMessages()
    if (previewing) {
      stopPreview()
      return
    }
    if (grid.events.length === 0) {
      setError('Add at least one hit before playing the preview.')
      return
    }
    try {
      let engine = previewRef.current
      if (!engine) {
        const context = createAudioContext()
        const player = new SamplePlayer(context)
        engine = { context, player, transport: new Transport(player) }
        previewRef.current = engine
      }
      if (!engine.player.isUnlocked) await engine.player.unlock()
      await engine.player.preload()
      engine.transport.start(previewExercise, 'playback', {
        onExerciseEnd: () => setPreviewing(false),
        onError: () => {
          setPreviewing(false)
          setError('Audio preview stopped because a sound could not be played.')
        },
      })
      setPreviewing(true)
      setStatus(
        'Preview includes one bar of count-in, click and the written notes.',
      )
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : 'Audio preview could not start.',
      )
    }
  }

  useEffect(
    () => () => {
      previewRef.current?.transport.stop()
      void previewRef.current?.context.close()
    },
    [],
  )

  const toggleMode = (mode: ExerciseMode) => {
    setSettings((current) => ({
      ...current,
      modes: current.modes.includes(mode)
        ? current.modes.filter((item) => item !== mode)
        : [...current.modes, mode],
    }))
  }

  return (
    <section className="mx-auto w-full max-w-5xl" aria-labelledby="page-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-bhda-accent">
            Teacher tool
          </p>
          <h1
            className="mt-3 text-3xl font-bold tracking-tight"
            id="page-title"
          >
            Exercise editor
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-bhda-text/70">
            Build a rhythm beat by beat, check the notation, then save it
            straight to this device.
          </p>
        </div>
        <Button onClick={resetDraft} type="button" variant="outline">
          <Plus aria-hidden="true" className="size-4" />
          New exercise
        </Button>
      </div>

      {(status || error) && (
        <p
          aria-live="polite"
          className="mt-6 rounded-xl border bg-bhda-surface px-4 py-3 text-sm leading-6"
        >
          {error ?? status}
        </p>
      )}

      <form
        className="mt-8 grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]"
        onSubmit={(event) => void handleSave(event)}
      >
        <aside className="rounded-xl border bg-bhda-surface p-5 shadow-sm">
          <h2 className="text-lg font-bold">Settings</h2>
          <div className="mt-5 space-y-5">
            <label className="block text-sm font-semibold">
              Exercise title
              <input
                className={FIELD_CLASS}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="e.g. Triplet turnaround"
                value={settings.title}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold">
                Tempo
                <input
                  className={FIELD_CLASS}
                  inputMode="numeric"
                  max={240}
                  min={30}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      tempo: Number(event.target.value),
                    }))
                  }
                  type="number"
                  value={settings.tempo}
                />
              </label>
              <label className="block text-sm font-semibold">
                Bars
                <select
                  className={FIELD_CLASS}
                  onChange={(event) =>
                    setGrid((current) =>
                      resizeGrid(
                        current,
                        Number(event.target.value) as 1 | 2 | 4,
                      ),
                    )
                  }
                  value={grid.bars}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                </select>
              </label>
            </div>

            <label className="block text-sm font-semibold">
              Timing tier
              <select
                className={FIELD_CLASS}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    tier: event.target.value as Tier,
                  }))
                }
                value={settings.tier}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>

            <label className="block text-sm font-semibold">
              Notation layout
              <select
                className={FIELD_CLASS}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    notationSystems: Number(event.target.value) as 1 | 2,
                  }))
                }
                value={settings.notationSystems}
              >
                <option value={2}>Two systems</option>
                <option value={1}>One system</option>
              </select>
            </label>

            <fieldset>
              <legend className="text-sm font-semibold">Enabled modes</legend>
              <div className="mt-3 space-y-3">
                {(
                  [
                    ['playAlong', 'Play Along'],
                    ['memorise', 'Memorise & Perform'],
                  ] as const
                ).map(([mode, label]) => (
                  <label className="flex items-center gap-3 text-sm" key={mode}>
                    <input
                      checked={settings.modes.includes(mode)}
                      className="size-4 accent-bhda-purple"
                      onChange={() => toggleMode(mode)}
                      type="checkbox"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="flex items-start gap-3 text-sm leading-6">
              <input
                checked={settings.listenFirstAllowed}
                className="mt-1 size-4 accent-bhda-purple"
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    listenFirstAllowed: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              Allow Listen First
            </label>

            <label className="block text-sm font-semibold">
              Custom level
              <select
                className={FIELD_CLASS}
                onChange={(event) => setLevelChoice(event.target.value)}
                value={levelChoice}
              >
                {customLevels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.title}
                  </option>
                ))}
                <option value={NEW_LEVEL_VALUE}>Create a new level…</option>
              </select>
            </label>
            {levelChoice === NEW_LEVEL_VALUE && (
              <label className="block text-sm font-semibold">
                New level name
                <input
                  className={FIELD_CLASS}
                  onChange={(event) => setNewLevelTitle(event.target.value)}
                  value={newLevelTitle}
                />
              </label>
            )}
          </div>
          <Button className="mt-6 w-full" type="submit">
            <Save aria-hidden="true" className="size-4" />
            {editingId ? 'Save changes' : 'Save exercise'}
          </Button>
        </aside>

        <div className="min-w-0 space-y-6">
          <div className="rounded-xl border bg-bhda-surface p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">Step grid</h2>
                <p className="mt-1 text-sm leading-6 text-bhda-text/60">
                  Set each beat to 16ths or triplet 8ths, then tap cells to add
                  hits.
                </p>
              </div>
              <p className="text-xs leading-5 text-bhda-text/55">
                Changing resolution removes hits that no longer fit that beat.
              </p>
            </div>
            <div className="mt-5">
              <ExerciseGrid
                grid={grid}
                onChange={setGrid}
                onResolutionChange={(beatIndex, resolution: BeatResolution) =>
                  setGrid((current) =>
                    setBeatResolution(current, beatIndex, resolution),
                  )
                }
              />
            </div>
          </div>

          <div className="rounded-xl border bg-bhda-surface p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Live notation preview</h2>
                <p className="mt-1 text-sm text-bhda-text/60">
                  Uses the same renderer and playback transport as the game.
                </p>
              </div>
              <Button
                onClick={() => void togglePreview()}
                type="button"
                variant="outline"
              >
                {previewing ? (
                  <Square aria-hidden="true" className="size-4" />
                ) : (
                  <Play aria-hidden="true" className="size-4" />
                )}
                {previewing ? 'Stop' : 'Play preview'}
              </Button>
            </div>
            <div className="mt-5 w-full max-w-full overflow-x-auto [contain:layout_paint]">
              {grid.events.length > 0 ? (
                <div className="min-w-[42rem]">
                  <Notation exercise={previewExercise} clock={notationClock} />
                </div>
              ) : (
                <div className="rounded-xl bg-bhda-text/5 px-5 py-12 text-center text-sm text-bhda-text/60">
                  Add a hit to see the engraved notation.
                </div>
              )}
            </div>
          </div>
        </div>
      </form>

      <section className="mt-10" aria-labelledby="manage-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold" id="manage-heading">
              Custom exercises
            </h2>
            <p className="mt-2 text-sm leading-6 text-bhda-text/60">
              Edit the library on this device, or move it with
              built-in-compatible JSON.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportAll} type="button" variant="outline">
              <Download aria-hidden="true" className="size-4" />
              Export all
            </Button>
            <Button asChild variant="outline">
              <label htmlFor="library-import">
                <Upload aria-hidden="true" className="size-4" />
                Import JSON
              </label>
            </Button>
            <input
              accept="application/json,.json"
              className="sr-only"
              id="library-import"
              onChange={(event) => void handleImport(event)}
              type="file"
            />
          </div>
        </div>

        {customLevels.length === 0 ? (
          <div className="mt-6 rounded-xl border bg-bhda-surface p-6 text-sm leading-6 shadow-sm">
            No custom exercises yet. Add hits to the grid above and save your
            first one.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {customLevels.map((level) => (
              <article
                className="rounded-xl border bg-bhda-surface p-5 shadow-sm"
                key={level.id}
              >
                <h3 className="text-lg font-bold">{level.title}</h3>
                <ol className="mt-3 divide-y">
                  {level.exercises.map((exercise) => (
                    <li
                      className="flex flex-col gap-3 py-4 first:pt-1 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                      key={exercise.id}
                    >
                      <div>
                        <p className="font-semibold">{exercise.title}</p>
                        <p className="mt-1 text-sm text-bhda-text/55">
                          {exercise.bars} bar{exercise.bars === 1 ? '' : 's'} ·{' '}
                          {exercise.tempo} bpm · {exercise.tier}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="icon" variant="outline">
                          <Link
                            aria-label={`Play ${exercise.title}`}
                            to={`/play/${exercise.id}`}
                          >
                            <Play aria-hidden="true" className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          aria-label={`Edit ${exercise.title}`}
                          onClick={() => handleEdit(level, exercise)}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <Pencil aria-hidden="true" className="size-4" />
                        </Button>
                        <Button
                          aria-label={`Duplicate ${exercise.title}`}
                          onClick={() => void handleDuplicate(level, exercise)}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <Copy aria-hidden="true" className="size-4" />
                        </Button>
                        <Button
                          aria-label={`Export ${exercise.title}`}
                          onClick={() => exportOne(level, exercise)}
                          size="icon"
                          type="button"
                          variant="outline"
                        >
                          <Download aria-hidden="true" className="size-4" />
                        </Button>
                        {deleteCandidate === exercise.id ? (
                          <>
                            <Button
                              onClick={() => void handleDelete(exercise.id)}
                              type="button"
                              variant="outline"
                            >
                              Confirm delete
                            </Button>
                            <Button
                              onClick={() => setDeleteCandidate(null)}
                              type="button"
                              variant="ghost"
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            aria-label={`Delete ${exercise.title}`}
                            onClick={() => setDeleteCandidate(exercise.id)}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
