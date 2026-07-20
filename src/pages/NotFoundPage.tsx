import { Link } from 'react-router-dom'
import { PageIntro } from '@/components/PageIntro'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <PageIntro
      description="That page does not exist, but your rhythm practice is still waiting for you."
      eyebrow="Page not found"
      title="Let’s get you back on beat"
    >
      <Button asChild>
        <Link to="/">Back to level select</Link>
      </Button>
    </PageIntro>
  )
}
