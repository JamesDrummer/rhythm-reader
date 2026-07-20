import { PageIntro } from '@/components/PageIntro'

export function EditorPage() {
  return (
    <PageIntro
      description="Build custom rhythm-reading exercises for your students using a simple grid editor."
      eyebrow="Teacher tool"
      title="Exercise editor"
    >
      <h2 className="text-base font-semibold">Editor placeholder</h2>
      <p className="mt-2 text-sm leading-6 text-black/70">
        Exercise settings, grid input and notation preview will be added here.
      </p>
    </PageIntro>
  )
}
