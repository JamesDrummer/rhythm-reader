import { CircleHelp, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <header className="border-b bg-bhda-background">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
        <Link
          className="rounded-sm text-base font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhda-purple focus-visible:ring-offset-4 focus-visible:ring-offset-bhda-background"
          to="/"
        >
          Rhythm Reader
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-1">
          <Button asChild size="icon" variant="ghost">
            <Link aria-label="Open help" title="Help" to="/help">
              <CircleHelp aria-hidden="true" className="size-5" />
            </Link>
          </Button>
          <Button asChild size="icon" variant="ghost">
            <Link aria-label="Open settings" title="Settings" to="/settings">
              <Settings aria-hidden="true" className="size-5" />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
