import { useParams } from 'react-router-dom'
import { PageIntro } from '@/components/PageIntro'

export function PlayPage() {
  const { exerciseId = 'Unknown exercise' } = useParams()

  return (
    <PageIntro
      description="The notation, count-in and playing controls will live on this screen."
      eyebrow="Play"
      title={`Exercise: ${exerciseId}`}
    >
      <h2 className="text-base font-semibold">Exercise player placeholder</h2>
      <p className="mt-2 text-sm leading-6 text-black/70">
        This route is ready for the timing, audio and notation systems.
      </p>
    </PageIntro>
  )
}
