import type { ReactNode } from 'react'

type NativeSectionProps = {
  title: string
  actionLabel?: string
  children: ReactNode
}

export function NativeSection({ title, actionLabel, children }: NativeSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[22px] font-semibold leading-none text-[var(--color-burgundy)]">{title}</h3>
        {actionLabel ? <span className="text-[14px] text-[var(--color-gold)]">{actionLabel}</span> : null}
      </div>
      {children}
    </section>
  )
}
