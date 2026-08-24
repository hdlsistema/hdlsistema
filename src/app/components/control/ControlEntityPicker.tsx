import { Check, ChevronDown, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFloatingControlMenu } from '../shared/useFloatingControlMenu'

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
  const containerRef = useRef<HTMLDivElement | null>(null)
  const anchorRef = useRef<HTMLSpanElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const floatingMenu = useFloatingControlMenu(anchorRef, open, 240, 220, menuRef)
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

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', closeOutside)
    window.addEventListener('keydown', closeWithEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('keydown', closeWithEscape)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
        {label}{required ? ' *' : ''}
      </span>
      <span ref={anchorRef} className="flex min-h-10 items-center rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-3 focus-within:border-[var(--color-line-strong)] focus-within:ring-[3px] focus-within:ring-[rgba(170,125,67,0.12)]">
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
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-2 text-[11px] text-[var(--color-ink)] outline-none disabled:opacity-50"
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

      {open && !disabled ? createPortal(
        <div
          ref={menuRef}
          data-control-floating-menu
          data-placement={floatingMenu.placement}
          style={{ ...floatingMenu.style, overflowY: 'auto' }}
          onMouseDown={(event) => event.preventDefault()}
          className="overscroll-contain rounded-lg border border-[var(--color-line)] bg-[#F7F2EA] p-1 shadow-[0_16px_30px_rgba(45,22,14,0.16)]"
        >
          {visible.map((option) => (
            <button
              key={option.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option.id)}
              className="flex w-full items-start gap-2 rounded-md px-2 py-1 text-left hover:bg-[var(--color-soft)]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[9px] font-semibold leading-[1.15] text-[var(--color-ink)]">{option.label}</span>
                {option.description ? <span className="mt-0.5 block truncate text-[8px] leading-[1.1] text-[var(--color-muted)]">{option.description}</span> : null}
              </span>
              {option.id === value ? <Check size={12} className="mt-0.5 shrink-0 text-[var(--color-burgundy)]" /> : null}
            </button>
          ))}
          {visible.length === 0 ? <span className="block px-3 py-4 text-center text-[10px] text-[var(--color-muted)]">{emptyMessage}</span> : null}
          {onAction ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setOpen(false)
                onAction()
              }}
              className="mt-1 flex min-h-8 w-full items-center gap-2 rounded-lg border-t border-[var(--color-line)] px-2 text-left text-[9px] font-semibold text-[var(--color-burgundy)] hover:bg-[var(--color-soft)]"
            >
              <Plus size={13} /> {actionLabel ?? 'Crear nuevo'}
            </button>
          ) : null}
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
