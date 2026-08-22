import { AlertTriangle, Loader2, X } from 'lucide-react'
import { cancelConfirmedEditorialAction, type EditorialConfirmState } from './EditorialConfirmDialog.logic'

type EditorialConfirmDialogProps = {
  state: EditorialConfirmState | null
  loading: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}

export function EditorialConfirmDialog({
  state,
  loading,
  error,
  onCancel,
  onConfirm,
}: EditorialConfirmDialogProps) {
  if (!state) return null

  const warning = state.tone === 'warning'

  return (
    <div className="fixed inset-0 z-[var(--control-z-confirm)] flex items-center justify-center bg-[rgba(40,24,18,0.42)] px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="editorial-confirm-title"
        className="w-full max-w-xl rounded-[1rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className={`mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border ${
                warning
                  ? 'border-[rgba(180,138,85,0.36)] bg-[rgba(180,138,85,0.14)] text-[var(--color-gold)]'
                  : 'border-[rgba(37,47,55,0.24)] bg-[rgba(37,47,55,0.08)] text-[var(--color-positive)]'
              }`}
            >
              <AlertTriangle size={17} />
            </span>
            <div>
              <h2 id="editorial-confirm-title" className="text-lg font-semibold text-[var(--color-ink)]">
                {state.title}
              </h2>
              <p className="mt-1 text-[13px] text-[var(--color-muted)]">{state.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => cancelConfirmedEditorialAction(onCancel)}
            disabled={loading}
            aria-label="Cancelar"
            title="Cancelar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white text-[var(--color-muted)] disabled:opacity-45"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 space-y-3 rounded-xl border border-[var(--color-line)] bg-white p-4">
          <div>
            <p className="text-[13px] font-semibold text-[var(--color-ink)]">Contenido afectado</p>
            <p className="mt-1 text-[13px] text-[var(--color-muted)]">{state.contentLabel}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-[13px] font-semibold text-[var(--color-ink)]">Ahora</p>
              <p className="mt-1 text-[13px] text-[var(--color-muted)]">{state.currentStatus}</p>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[var(--color-ink)]">Después</p>
              <p className="mt-1 text-[13px] text-[var(--color-muted)]">{state.afterStatus}</p>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[var(--color-ink)]">Visible para clientes</p>
              <p className="mt-1 text-[13px] text-[var(--color-muted)]">{state.visibleAfter ? 'Sí' : 'No'}</p>
            </div>
          </div>
          <p className="text-[13px] text-[var(--color-muted)]">{state.impact}</p>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] px-4 py-3 text-[13px] text-[var(--color-alert)]">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => cancelConfirmedEditorialAction(onCancel)}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white px-4 text-[13px] font-semibold text-[var(--color-ink)] disabled:opacity-45"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-[13px] font-semibold text-white disabled:opacity-55 ${
              warning ? 'bg-[var(--color-gold)]' : 'bg-[var(--color-burgundy)]'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : null}
            {loading ? 'Ejecutando acción' : state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
