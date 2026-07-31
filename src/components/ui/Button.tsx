import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
}

export function Button({ label, className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-50 ${className}`.trim()}
      {...props}
    >
      {label}
    </button>
  )
}
