type EventCardProps = {
  title: string
  date: string
}

export function EventCard({ title, date }: EventCardProps) {
  return (
    <article className="rounded-[1.25rem] border border-[rgba(220,202,181,0.82)] bg-white p-4 shadow-[var(--shadow-card)]">
      <h3 className="text-xl text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </h3>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{date}</p>
    </article>
  )
}
