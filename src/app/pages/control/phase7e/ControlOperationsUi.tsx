import type { FormEvent, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { CrystalSelect } from '../../../components/shared/CrystalSelect'

export function Metric({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: string; note?: string }) {
  return (
    <article className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs text-[var(--color-muted)]">{label}</p>
          <p className="mt-3 text-3xl leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
          {note ? <p className="mt-2 truncate text-xs text-[var(--color-muted)]">{note}</p> : null}
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-soft)] text-[var(--color-burgundy)]">
          <Icon size={18} />
        </span>
      </div>
    </article>
  )
}

export function StateBlock({ title, text }: { title?: string; text: string }) {
  return (
    <div className="p-8 text-center">
      {title ? <p className="text-lg font-semibold text-[var(--color-ink)]">{title}</p> : null}
      <p className="mt-2 text-sm text-[var(--color-muted)]">{text}</p>
    </div>
  )
}

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  min,
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  min?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</span>
      <input
        type={type}
        min={min}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 text-sm text-[var(--color-ink)] outline-none"
      />
    </label>
  )
}

export function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</span>
      <CrystalSelect value={value} onChange={onChange}>
        {children}
      </CrystalSelect>
    </label>
  )
}

export function ModalForm({
  title,
  onClose,
  onSubmit,
  saving,
  children,
}: {
  title: string
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  saving: boolean
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#210711]/68 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 cursor-default" />
      <form onSubmit={onSubmit} className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-page)] p-6 shadow-[0_35px_90px_rgba(29,5,12,0.38)]">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-2xl text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
          <button type="button" onClick={onClose} className="min-h-10 rounded-xl border border-[var(--color-line)] px-4 text-sm font-semibold text-[var(--color-muted-strong)]">Cerrar</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-[var(--color-line)] px-5 text-sm font-semibold text-[var(--color-muted-strong)]">Cancelar</button>
          <button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-[var(--color-burgundy)] px-5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  )
}

export function ActionButton({ children, disabled, onClick }: { children: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--color-line)] px-3 text-xs font-semibold text-[var(--color-burgundy)] disabled:opacity-50"
    >
      {children}
    </button>
  )
}
