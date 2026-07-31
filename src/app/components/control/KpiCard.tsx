type KpiCardProps = {
  title: string
  value: string
  note: string
}

export function KpiCard({ title, value, note }: KpiCardProps) {
  return (
    <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel-strong)] p-5 shadow-[var(--shadow-card)]">
      <p className="text-sm text-[var(--color-muted)]">{title}</p>
      <p
        className="mt-3 text-3xl leading-none text-[var(--color-ink)]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--color-positive)]">{note}</p>
    </article>
  )
}
