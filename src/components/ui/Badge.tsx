import type { HTMLAttributes } from 'react'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  label: string
}

export function Badge({ label, className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-700 ${className}`.trim()}
      {...props}
    >
      {label}
    </span>
  )
}
