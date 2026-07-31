type SectionTitleProps = {
  eyebrow?: string
  title: string
  subtitle?: string
}

export function SectionTitle({ eyebrow, title, subtitle }: SectionTitleProps) {
  return (
    <header className="space-y-2">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">{eyebrow}</p>
      ) : null}
      <h1
        className="text-3xl leading-none text-[var(--color-ink)] sm:text-[2.35rem]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h1>
      {subtitle ? <p className="max-w-3xl text-sm text-[var(--color-muted)]">{subtitle}</p> : null}
    </header>
  )
}
