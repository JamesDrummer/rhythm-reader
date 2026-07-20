import { PageIntro } from '@/components/PageIntro'

export function LevelSelectPage() {
  return (
    <PageIntro
      description="Choose a level and build your rhythm-reading confidence one exercise at a time."
      eyebrow="Level select"
      title="Ready for your next rhythm?"
    >
      <h2 className="text-base font-semibold">Your levels will appear here</h2>
      <p className="mt-2 text-sm leading-6 text-black/70">
        The level library and your practice progress are coming in a later build
        stage.
      </p>
    </PageIntro>
  )
}
