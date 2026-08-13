import { Check, ChevronDown, Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'

export type ControlEntityOption = {
  id: string
  label: string
  description?: string | null
  keywords?: string | null
}

type ControlEntityPickerProps = {
  label: string
  value: string
  options: ControlEntityOption[]
  onChange: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  required?: boolean
  disabled?: boolean
  actionLabel?: string
  onAction?: () => void
}

function normalized(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX')
}

export function ControlEntityPicker({
  label,
  value,
  options,
  onChange,
  placeholder = 'Buscar y seleccionar...',
  emptyMessage = 'Sin resultados',
  required,
  disabled,
  actionLabel,
  onAction,
}: ControlEntityPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = options.find((option) => option.id === value) ?? null
  const visible = useMemo(() => {
    const term = normalized(query.trim())
    if (!term) return options.slice(0, 40)
    return options
      .filter((option) => normalized(`${option.label} ${option.description ?? ''} ${option.keywords ?? ''}`).includes(term))
      .slice(0, 40)
  }, [options, query])

  const choose = (id: string) => {
    onChange(id)
    setQuery('')
    setOpen(false)
  }

  return (
    <label className="relative block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
        {label}{required ? ' *' : ''}
      </span>
      <span className="flex min-h-11 items-center rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-3 focus-within:border-[var(--color-burgundy)]">
        <Search size={15} className="shrink-0 text-[var(--color-muted)]" />
        <input
          value={open ? query : selected?.label ?? ''}
          onChange={(event) => {
            setQuery(event.target.value)
            if (value) onChange('')
            setOpen(true)
          }}
          onFocus={() => {
            setQuery('')
            setOpen(true)
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 140)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-2 text-sm text-[var(--color-ink)] outline-none disabled:opacity-50"
        />
        {selected && !disabled ? (
          <button
            type="button"
            aria-label={`Limpiar ${label}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose('')}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-soft)]"
          >
            <X size={14} />
          </button>
        ) : <ChevronDown size={15} className="text-[var(--color-muted)]" />}
      </span>

      {open && !disabled ? (
        <span className="absolute z-[170] mt-2 block max-h-72 w-full overflow-y-auto rounded-xl border border-[var(--color-line)] bg-white p-1 shadow-[0_22px_50px_rgba(45,22,14,0.2)]">
          {visible.map((option) => (
            <button
              key={option.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option.id)}
              className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-[var(--color-soft)]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">{option.label}</span>
                {option.description ? <span className="mt-0.5 block truncate text-xs text-[var(--color-muted)]">{option.description}</span> : null}
              </span>
              {option.id === value ? <Check size={15} className="mt-1 shrink-0 text-[var(--color-burgundy)]" /> : null}
            </button>
          ))}
          {visible.length === 0 ? <span className="block px-3 py-4 text-center text-xs text-[var(--color-muted)]">{emptyMessage}</span> : null}
          {onAction ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setOpen(false)
                onAction()
              }}
              className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-lg border-t border-[var(--color-line)] px-3 text-left text-xs font-semibold text-[var(--color-burgundy)] hover:bg-[var(--color-soft)]"
            >
              <Plus size={14} /> {actionLabel ?? 'Crear nuevo'}
            </button>
          ) : null}
        </span>
      ) : null}
    </label>
  )
}
