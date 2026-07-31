type EmptyStateProps = {
  title: string
  description: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] bg-white/70 p-6">
      <h3 className="text-base font-semibold text-[var(--color-ink)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{description}</p>
    </div>
  )
}
