import { CheckCircle2, ShieldCheck, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { customerPrivacyClient } from '../../../services/privacy.service'
import { AppSectionHeader, BackButton } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { appPath } from '../../utils/appRoutes'

function deletionErrorMessage(error: unknown, isEnglish: boolean) {
  if (error && typeof error === 'object' && 'status' in error && Number((error as { status?: unknown }).status) === 429) {
    return isEnglish ? 'Too many attempts. Please try again later.' : 'Has realizado varios intentos. Intenta nuevamente más tarde.'
  }
  if (error && typeof error === 'object' && 'status' in error && Number((error as { status?: unknown }).status) === 503) {
    return isEnglish ? 'We could not send the confirmation email. Please try again later.' : 'No fue posible enviar el correo de confirmación. Intenta nuevamente más tarde.'
  }
  return isEnglish ? 'We could not start account deletion. Check your connection and try again.' : 'No fue posible iniciar la eliminación de cuenta. Revisa tu conexión e intenta nuevamente.'
}

export function DeleteAccountScreen() {
  const { isEnglish } = useAppPreferences()
  const { user, session, profile } = useAuth()
  const [acknowledged, setAcknowledged] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [requestNumber, setRequestNumber] = useState('')
  const [duplicate, setDuplicate] = useState(false)
  const [confirmationEmailStatus, setConfirmationEmailStatus] = useState<string | null>(null)
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
      setConfirmationEmailStatus(response.confirmationEmailStatus ?? null)
      setConfirmOpen(false)
    } catch (submitError) {
      setConfirmOpen(false)
      setError(deletionErrorMessage(submitError, isEnglish))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-page space-y-6">
      <BackButton to={appPath('/privacidad-cuenta')} label={isEnglish ? 'Privacy and account' : 'Privacidad y cuenta'} />

      <section className="rounded-[1.45rem] border border-[#e4c3ba] bg-white p-5 shadow-[0_18px_38px_rgba(74,32,28,0.08)]">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7e5e1] text-[#963e32]"><Trash2 size={21} /></span>
        <div className="mt-5"><AppSectionHeader eyebrow={isEnglish ? 'Privacy and account' : 'Privacidad y cuenta'} title={isEnglish ? 'Delete my account' : 'Eliminar mi cuenta'} subtitle={isEnglish ? 'Start a secure request to delete your account and associated data when applicable.' : 'Inicia una solicitud segura para eliminar tu cuenta y los datos asociados cuando corresponda.'} /></div>
        <div className="mt-5 rounded-[1rem] bg-[#fff8f1] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">{isEnglish ? 'Identified account' : 'Cuenta identificada'}</p>
          <p className="mt-2 break-all text-[13px] font-semibold text-[var(--color-ink)]">{user?.email}</p>
          <p className="mt-2 text-[11px] leading-5 text-[var(--color-muted)]">{isEnglish ? 'The process will be linked automatically to your current session and email.' : 'El proceso quedará vinculado automáticamente a tu sesión y correo actual.'}</p>
        </div>
      </section>

      <section className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
        <h2 className="text-[1.45rem] text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{isEnglish ? 'What will happen' : 'Qué ocurrirá'}</h2>
        <ul className="mt-4 space-y-3 text-[12px] leading-5 text-[var(--color-muted)]">
          <li>{isEnglish ? 'We will send a confirmation email to the address registered on this account.' : 'Enviaremos un correo de confirmación al correo registrado en esta cuenta.'}</li>
          <li>{isEnglish ? 'After you confirm from email, your account will enter deletion processing.' : 'Después de confirmar desde el correo, tu cuenta entrará en proceso de eliminación.'}</li>
          <li>{isEnglish ? 'Profile, preferences, saved addresses, devices and personal data that no longer need to be retained will be deleted or anonymized.' : 'Perfil, preferencias, direcciones guardadas, dispositivos y datos personales que ya no deban conservarse serán eliminados o anonimizados.'}</li>
          <li>{isEnglish ? 'The maximum processing time is 30 calendar days unless a different legal retention period applies.' : 'El plazo máximo de procesamiento es de 30 días naturales, salvo información que deba conservarse legal o fiscalmente.'}</li>
        </ul>
        <div className="mt-5 flex items-start gap-3 rounded-[1rem] border border-[#e8d5ba] bg-[#fff8e9] p-4">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#a07845]" />
          <p className="text-[11px] leading-5 text-[#71583f]">{isEnglish ? 'Certain information may be retained only when required for legal, tax, security or fraud-prevention purposes.' : 'Cierta información podrá conservarse únicamente cuando exista una obligación legal, fiscal, de seguridad o de prevención de fraude.'}</p>
        </div>
      </section>

      <label className="flex cursor-pointer items-start gap-3 rounded-[1.1rem] border border-[#e2c4bd] bg-[#fff5f2] p-4 text-[12px] leading-5 text-[#714e47]">
        <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-burgundy)]" />
        <span>{isEnglish ? 'I understand the consequences, limited retention and email confirmation step, and I want to start permanent account deletion.' : 'Entiendo las consecuencias, la conservación limitada y el paso de confirmación por correo, y deseo iniciar la eliminación definitiva de mi cuenta.'}</span>
      </label>
      {error ? <p role="alert" className="rounded-[1rem] border border-[#e3b8ad] bg-[#fff2ef] p-4 text-[12px] leading-5 text-[#944431]">{error}</p> : null}
      <button type="button" disabled={!acknowledged} onClick={() => setConfirmOpen(true)} className="min-h-13 w-full rounded-[1rem] bg-[#8e2e35] px-5 py-4 text-[13px] font-semibold text-white shadow-[0_14px_28px_rgba(108,36,30,0.18)] disabled:cursor-not-allowed disabled:opacity-50">{isEnglish ? 'Permanently delete my account' : 'Eliminar definitivamente mi cuenta'}</button>

      {confirmOpen ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#250810]/65 p-3 pb-[calc(14px+var(--safe-bottom))] backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="mobile-delete-confirm-title">
          <div className="w-full max-w-[520px] rounded-[1.5rem] border border-[#e2cdb3] bg-[#fffaf3] p-5 shadow-[0_30px_90px_rgba(32,7,11,0.35)]">
            <div className="flex items-start justify-between gap-4"><span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f2dfda] text-[#8c2638]"><Trash2 size={20} /></span><button type="button" aria-label={isEnglish ? 'Close' : 'Cerrar'} onClick={() => setConfirmOpen(false)} disabled={submitting} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dccab5] text-[var(--color-burgundy)]"><X size={17} /></button></div>
            <h2 id="mobile-delete-confirm-title" className="mt-4 text-[1.9rem] leading-none text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{isEnglish ? 'Confirm permanent deletion' : 'Confirma la eliminación definitiva'}</h2>
            <p className="mt-3 text-[12px] leading-6 text-[#6f5a4d]">{isEnglish ? 'We will send a secure confirmation link to' : 'Enviaremos un enlace seguro de confirmación a'} <strong className="break-all text-[#2b1712]">{user?.email}</strong>. {isEnglish ? 'Deletion processing starts only after you confirm from that email.' : 'El procesamiento comenzará únicamente cuando confirmes desde ese correo.'}</p>
            <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setConfirmOpen(false)} disabled={submitting} className="min-h-12 rounded-xl border border-[#d8bf9c] bg-white text-[12px] font-semibold text-[var(--color-burgundy)]">{isEnglish ? 'Cancel' : 'Cancelar'}</button><button type="button" onClick={() => void submitRequest()} disabled={submitting} className="min-h-12 rounded-xl bg-[var(--color-burgundy)] px-3 text-[12px] font-semibold text-white disabled:opacity-60">{submitting ? (isEnglish ? 'Sending…' : 'Enviando…') : (isEnglish ? 'Send email' : 'Enviar correo')}</button></div>
          </div>
        </div>
      ) : null}

      {requestNumber ? (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-[#250810]/56 p-3 pb-[calc(14px+var(--safe-bottom))] backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="mobile-delete-success-title">
          <section className="w-full max-w-[520px] rounded-[1.55rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,253,248,.94),rgba(244,234,224,.88))] p-5 text-[#252F37] shadow-[0_30px_90px_rgba(32,7,11,0.35),inset_0_1px_0_rgba(255,255,255,.82)] backdrop-blur-2xl">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#252F37] text-white">
              <CheckCircle2 size={23} strokeWidth={1.6} />
            </span>
            <h2 id="mobile-delete-success-title" className="mt-4 text-[2rem] leading-none text-[#252F37]" style={{ fontFamily: 'var(--font-display)' }}>
              {duplicate && !confirmationEmailStatus
                ? (isEnglish ? 'Deletion in process' : 'Eliminación en proceso')
                : duplicate
                  ? (isEnglish ? 'Confirmation email resent' : 'Correo reenviado')
                  : (isEnglish ? 'Check your email' : 'Revisa tu correo')}
            </h2>
            <p className="mt-3 text-[12px] leading-6 text-[#5f514b]">
              {duplicate && !confirmationEmailStatus
                ? (isEnglish
                    ? 'This account already has a confirmed deletion order in process. New sessions are blocked while it is completed.'
                    : 'Esta cuenta ya tiene una orden de eliminación confirmada en proceso. Las nuevas sesiones quedan bloqueadas mientras se completa.')
                : (isEnglish
                    ? 'We sent a confirmation email to the address registered on your account. Open it and tap “Confirm account deletion” to start deletion processing.'
                    : 'Enviamos un correo de confirmación al correo registrado en tu cuenta. Ábrelo y toca “Confirmar eliminación de cuenta” para iniciar el procesamiento.')}
            </p>
            <div className="mt-5 rounded-[1rem] border border-[rgba(37,47,55,0.18)] bg-white/72 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(37,47,55,0.72)]">{isEnglish ? 'Tracking number' : 'Folio de seguimiento'}</p>
              <p className="mt-2 break-all text-[16px] font-semibold text-[#252F37]">{requestNumber}</p>
            </div>
            <Link to={appPath('/perfil')} className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#252F37] px-5 text-[12px] font-semibold text-white">
              {isEnglish ? 'Back to Profile' : 'Volver a Perfil'}
            </Link>
          </section>
        </div>
      ) : null}
    </div>
  )
}
