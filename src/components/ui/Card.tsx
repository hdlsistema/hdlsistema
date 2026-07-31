import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string
  subtitle?: string
  children?: ReactNode
}

export function Card({
  title,
  subtitle,
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <div className={`rounded-2xl border border-stone-200 bg-white p-5 shadow-sm ${className}`.trim()} {...props}>
      {title ? <h3 className="text-base font-semibold text-stone-900">{title}</h3> : null}
      {subtitle ? <p className="mt-1 text-sm text-stone-500">{subtitle}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  )
}
