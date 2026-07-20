import type { ReactNode } from 'react'

interface PageIntroProps {
  children?: ReactNode
  description: string
  eyebrow: string
  title: string
}

export function PageIntro({
  children,
  description,
  eyebrow,
  title,
}: PageIntroProps) {
  return (
    <section className="mx-auto w-full max-w-3xl" aria-labelledby="page-title">
      <p className="text-sm font-semibold uppercase tracking-widest text-bhda-purple">
        {eyebrow}
      </p>
      <h1
        className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
        id="page-title"
      >
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-black/70">
        {description}
      </p>
      <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm sm:p-8">
        {children ?? (
          <p className="text-sm leading-6 text-black/70">
            This area is ready for the next build stage.
          </p>
        )}
      </div>
    </section>
  )
}
