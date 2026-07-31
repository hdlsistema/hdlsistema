type PromoCardProps = {
  title: string
  description: string
}

export function PromoCard({ title, description }: PromoCardProps) {
  return (
    <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </h3>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{description}</p>
    </article>
  )
}
