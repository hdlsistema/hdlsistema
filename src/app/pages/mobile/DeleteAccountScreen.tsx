import { ArrowLeft, CheckCircle2, ShieldCheck, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { customerPrivacyClient } from '../../../services/privacy.service'
import { AppSectionHeader } from '../../components/mobile/PremiumMobileUi'
import { appPath } from '../../utils/appRoutes'

function deletionErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'status' in error && Number((error as { status?: unknown }).status) === 429) {
    return 'Has realizado varios intentos. Intenta nuevamente más tarde.'
  }
  return 'No fue posible registrar la solicitud. Revisa tu conexión e intenta nuevamente.'
}

export function DeleteAccountScreen() {
  const { user, session, profile } = useAuth()
  const [acknowledged, setAcknowledged] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [requestNumber, setRequestNumber] = useState('')
  const [duplicate, setDuplicate] = useState(false)
  const [error, setError] = useState('')

  async function submitRequest() {
    if (submitting || !acknowledged) return
    setSubmitting(true)
    setError('')
    try {
      const response = await customerPrivacyClient.requestAccountDeletion(session?.access_token, {
        name: profile?.display_name || null,
        confirmation: true,
        retentionAcknowledged: true,
        locale: profile?.preferred_language === 'en' ? 'en' : 'es',
      })
      setRequestNumber(response.data.requestNumber)
      setDuplicate(response.duplicate)
      setConfirmOpen(false)
    } catch (submitError) {
      setConfirmOpen(false)
      setError(deletionErrorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  if (requestNumber) {
    return (
      <div className="app-page space-y-6">
        <section className="rounded-[1.45rem] border border-[#bfd2bd] bg-[#f2f8ef] p-6 shadow-[0_18px_38px_rgba(74,32,28,0.08)]">
          <CheckCircle2 size={34} className="text-[#3f7747]" />
          <h1 className="mt-5 text-[2.3rem] leading-none text-[#315b37]" style={{ fontFamily: 'var(--font-display)' }}>{duplicate ? 'Tu solicitud sigue activa' : 'Solicitud recibida'}</h1>
          <p className="mt-4 text-[13px] leading-6 text-[#4d6650]">Tu cuenta permanece activa mientras validamos y procesamos la solicitud. No fue eliminada al enviar este formulario.</p>
          <div className="mt-5 rounded-[1rem] border border-[#d6e3d2] bg-white/80 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#66806a]">Folio de seguimiento</p>
            <p className="mt-2 break-all text-[16px] font-semibold text-[#315b37]">{requestNumber}</p>
          </div>
          <Link to={appPath('/perfil')} className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#315b37] px-5 text-[12px] font-semibold text-white">Volver a Perfil</Link>
        </section>
      </div>
    )
  }

  return (
    <div className="app-page space-y-6">
      <Link to={appPath('/privacidad-cuenta')} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgba(104,13,36,0.18)] bg-white px-4 text-[12px] font-semibold text-[var(--color-burgundy)]">
        <ArrowLeft size={15} /> Privacidad y cuenta
      </Link>

      <section className="rounded-[1.45rem] border border-[#e4c3ba] bg-white p-5 shadow-[0_18px_38px_rgba(74,32,28,0.08)]">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7e5e1] text-[#963e32]"><Trash2 size={21} /></span>
        <div className="mt-5"><AppSectionHeader eyebrow="Privacidad y cuenta" title="Eliminar mi cuenta" subtitle="Inicia una solicitud segura para eliminar tu cuenta y los datos asociados cuando corresponda." /></div>
        <div className="mt-5 rounded-[1rem] bg-[#fff8f1] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">Cuenta identificada</p>
          <p className="mt-2 break-all text-[13px] font-semibold text-[var(--color-ink)]">{user?.email}</p>
          <p className="mt-2 text-[11px] leading-5 text-[var(--color-muted)]">La solicitud quedará vinculada automáticamente a tu sesión actual.</p>
        </div>
      </section>

      <section className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
        <h2 className="text-[1.45rem] text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>Qué ocurrirá</h2>
        <ul className="mt-4 space-y-3 text-[12px] leading-5 text-[var(--color-muted)]">
          <li>Se revisará tu solicitud antes de eliminar la cuenta.</li>
          <li>Se eliminarán perfil, preferencias, direcciones y registros que ya no deban conservarse.</li>
          <li>No perderás el acceso inmediatamente al enviar.</li>
        </ul>
        <div className="mt-5 flex items-start gap-3 rounded-[1rem] border border-[#e8d5ba] bg-[#fff8e9] p-4">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#a07845]" />
          <p className="text-[11px] leading-5 text-[#71583f]">Cierta información podrá conservarse únicamente cuando exista una obligación legal, fiscal, de seguridad o de prevención de fraude.</p>
        </div>
      </section>

      <label className="flex cursor-pointer items-start gap-3 rounded-[1.1rem] border border-[#e2c4bd] bg-[#fff5f2] p-4 text-[12px] leading-5 text-[#714e47]">
        <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 accent-[#681126]" />
        <span>Entiendo el alcance, la conservación limitada y confirmo que deseo iniciar la solicitud de eliminación de mi cuenta.</span>
      </label>
      {error ? <p role="alert" className="rounded-[1rem] border border-[#e3b8ad] bg-[#fff2ef] p-4 text-[12px] leading-5 text-[#944431]">{error}</p> : null}
      <button type="button" disabled={!acknowledged} onClick={() => setConfirmOpen(true)} className="min-h-13 w-full rounded-[1rem] bg-[#8e2e35] px-5 py-4 text-[13px] font-semibold text-white shadow-[0_14px_28px_rgba(108,36,30,0.18)] disabled:cursor-not-allowed disabled:opacity-50">Solicitar eliminación de cuenta</button>

      {confirmOpen ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#250810]/65 p-3 pb-[calc(14px+var(--safe-bottom))] backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="mobile-delete-confirm-title">
          <div className="w-full max-w-[520px] rounded-[1.5rem] border border-[#e2cdb3] bg-[#fffaf3] p-5 shadow-[0_30px_90px_rgba(32,7,11,0.35)]">
            <div className="flex items-start justify-between gap-4"><span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f2dfda] text-[#8c2638]"><Trash2 size={20} /></span><button type="button" aria-label="Cerrar" onClick={() => setConfirmOpen(false)} disabled={submitting} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dccab5] text-[#681126]"><X size={17} /></button></div>
            <h2 id="mobile-delete-confirm-title" className="mt-4 text-[1.9rem] leading-none text-[#681126]" style={{ fontFamily: 'var(--font-display)' }}>Confirma antes de enviar</h2>
            <p className="mt-3 text-[12px] leading-6 text-[#6f5a4d]">¿Deseas registrar la solicitud para <strong className="break-all text-[#2b1712]">{user?.email}</strong>? La cuenta no se borrará de inmediato.</p>
            <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setConfirmOpen(false)} disabled={submitting} className="min-h-12 rounded-xl border border-[#d8bf9c] bg-white text-[12px] font-semibold text-[#681126]">Cancelar</button><button type="button" onClick={() => void submitRequest()} disabled={submitting} className="min-h-12 rounded-xl bg-[#681126] px-3 text-[12px] font-semibold text-white disabled:opacity-60">{submitting ? 'Enviando…' : 'Sí, enviar'}</button></div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
