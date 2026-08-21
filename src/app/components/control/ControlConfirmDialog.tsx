import { AlertTriangle, X } from 'lucide-react'
import type { ReactNode } from 'react'

type ControlConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  busy?: boolean
  children?: ReactNode
  onCancel: () => void
  onConfirm: () => void
}

export function ControlConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'default',
  busy,
  children,
  onCancel,
  onConfirm,
}: ControlConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[var(--control-z-confirm)] flex items-center justify-center bg-[#210711]/58 p-4 backdrop-blur-md">
      <button type="button" aria-label="Cerrar" onClick={onCancel} className="absolute inset-0 cursor-default" />
      <section className="relative w-full max-w-md overflow-hidden rounded-[1.35rem] border border-white/40 bg-[rgba(255,250,244,0.86)] p-5 shadow-[0_32px_90px_rgba(35,10,17,0.34)] backdrop-blur-2xl">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(104,17,38,0.10)] text-[var(--color-burgundy)]">
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted-strong)]">{message}</p>
          </div>
          <button type="button" onClick={onCancel} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted)]">
            <X size={18} />
          </button>
        </div>

        {children ? <div className="mt-5">{children}</div> : null}

        <div className="control-form-actions mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-10 rounded-full border border-[var(--color-line)] bg-white/55 px-4 text-sm font-medium text-[var(--color-muted-strong)] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`min-h-10 rounded-full px-5 text-sm font-semibold text-white disabled:opacity-55 ${
              tone === 'danger' ? 'bg-[#7f1731]' : 'bg-[var(--color-burgundy)]'
            }`}
          >
            {busy ? 'Guardando...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
