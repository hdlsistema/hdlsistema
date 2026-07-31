type SectionTitleProps = {
  title: string
  subtitle?: string
}

export function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-semibold text-stone-900">{title}</h1>
      {subtitle ? <p className="text-sm text-stone-500">{subtitle}</p> : null}
    </header>
  )
}
