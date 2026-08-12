type SectionTitleProps = {
  eyebrow?: string
  title: string
  subtitle?: string
}

export function SectionTitle({ eyebrow, title, subtitle }: SectionTitleProps) {
  return (
    <header className="control-page-title">
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">{eyebrow}</p>
      ) : null}
      <h1
        className="text-[30px] font-semibold leading-none text-[var(--color-ink)]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h1>
      {subtitle ? <p className="max-w-3xl text-[13px] text-[var(--color-muted)]">{subtitle}</p> : null}
    </header>
  )
}
