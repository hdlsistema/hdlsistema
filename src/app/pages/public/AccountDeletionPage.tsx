import { CheckCircle2, ChevronLeft, FileCheck2, ShieldCheck, Trash2, UserRoundX, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { publicPrivacyClient } from '../../../services/privacy.service'

function publicErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'status' in error && Number((error as { status?: unknown }).status) === 429) {
    return 'Se alcanzó el límite de solicitudes. Intenta nuevamente más tarde.'
  }
  return 'No fue posible registrar la solicitud en este momento. Intenta nuevamente.'
}

export function AccountDeletionPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'Eliminar cuenta de Hacienda de Letras'
  }, [])

  function reviewRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!email.trim() || !acknowledged) return
    setConfirmOpen(true)
  }

  async function submitRequest() {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      await publicPrivacyClient.requestAccountDeletion({
        email: email.trim().toLowerCase(),
        name: name.trim() || null,
        confirmation: true,
        retentionAcknowledged: true,
        locale: 'es',
        companyWebsite: '',
      })
      setConfirmOpen(false)
      setCompleted(true)
    } catch (submitError) {
      setConfirmOpen(false)
      setError(publicErrorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f1e7] text-[#2b1712]">
      <header className="border-b border-[#e3d1ba] bg-[linear-gradient(135deg,#fffaf2,#efe1cf)] px-5 py-5 md:px-10">
        <div className="mx-auto flex max-w-[1040px] items-center justify-between gap-4">
          <Link to="/" aria-label="Hacienda de Letras" className="inline-flex items-center gap-3">
            <img src="/hacienda de letras logo1.png" alt="Hacienda de Letras" className="h-14 w-20 object-contain" />
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7d1328] sm:inline">Hacienda de Letras</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-[#d8bf9c] bg-white/60 px-4 py-2 text-[12px] font-semibold text-[#5B0B1F]">
            <ChevronLeft size={15} /> Volver al inicio
          </Link>
        </div>
      </header>

      <section className="px-5 py-10 md:px-10 md:py-16">
        <div className="mx-auto grid max-w-[1040px] gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
          <article className="rounded-[1.65rem] border border-[#dfcbb2] bg-white/80 p-6 shadow-[0_24px_70px_rgba(57,26,18,0.08)] backdrop-blur-xl md:p-9">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4e6db] text-[#5B0B1F]"><UserRoundX size={23} /></span>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b48a55]">Privacidad y cuenta</p>
            <h1 className="mt-3 text-[clamp(2.45rem,6vw,4rem)] leading-[0.95] text-[#5B0B1F]" style={{ fontFamily: 'var(--font-display)' }}>
              Eliminar cuenta de Hacienda de Letras
            </h1>
            <p className="mt-5 max-w-[42rem] text-sm leading-7 text-[#6f5a4d] md:text-base">
              Usa este formulario para iniciar la eliminación de tu cuenta y de los datos personales asociados cuando corresponda. No necesitas instalar la app ni iniciar sesión.
            </p>

            {completed ? (
              <div role="status" className="mt-8 rounded-[1.2rem] border border-[rgba(37,47,55,0.24)] bg-[rgba(37,47,55,0.07)] p-6">
                <CheckCircle2 size={29} className="text-[#252F37]" />
                <h2 className="mt-4 text-2xl text-[#252F37]" style={{ fontFamily: 'var(--font-display)' }}>Solicitud recibida</h2>
                <p className="mt-3 text-sm leading-6 text-[#252F37]">
                  Registramos tu solicitud para revisión. El envío no borra la cuenta de inmediato; el equipo validará la identidad y dará seguimiento al proceso.
                </p>
                <button type="button" onClick={() => { setCompleted(false); setEmail(''); setName(''); setAcknowledged(false) }} className="mt-5 rounded-full border border-[rgba(37,47,55,0.24)] bg-white px-5 py-2.5 text-xs font-semibold text-[#252F37]">
                  Registrar otra solicitud
                </button>
              </div>
            ) : (
              <form className="mt-8 space-y-5" onSubmit={reviewRequest}>
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#725a4c]">Correo asociado a la cuenta *</span>
                  <input type="email" autoComplete="email" required maxLength={180} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#dccab5] bg-white px-4 text-sm outline-none focus:border-[#8b2d43]" placeholder="correo@ejemplo.com" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#725a4c]">Nombre (opcional)</span>
                  <input type="text" autoComplete="name" maxLength={180} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#dccab5] bg-white px-4 text-sm outline-none focus:border-[#8b2d43]" placeholder="Tu nombre" />
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#eadbc9] bg-[#fffaf4] p-4 text-sm leading-6 text-[#645045]">
                  <input type="checkbox" required checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 accent-[#5B0B1F]" />
                  <span>Entiendo qué datos se eliminarán y que cierta información podrá conservarse únicamente cuando exista una obligación legal, fiscal, de seguridad o de prevención de fraude.</span>
                </label>
                {error ? <p role="alert" className="rounded-xl border border-[#e3b8ad] bg-[#fff2ef] p-4 text-sm text-[#944431]">{error}</p> : null}
                <button type="submit" disabled={!email.trim() || !acknowledged} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#5B0B1F] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(91,11,31,0.18)] disabled:cursor-not-allowed disabled:opacity-50">
                  <Trash2 size={17} /> Solicitar eliminación de cuenta
                </button>
              </form>
            )}
          </article>

          <aside className="space-y-5">
            <section className="rounded-[1.4rem] border border-[#dfcbb2] bg-[#fffaf4] p-6">
              <FileCheck2 size={22} className="text-[#a07845]" />
              <h2 className="mt-4 text-2xl text-[#2b1712]" style={{ fontFamily: 'var(--font-display)' }}>Qué datos se eliminarán</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#6f5a4d]">
                <li>Cuenta de acceso y perfil personal.</li>
                <li>Preferencias, direcciones guardadas y registros de dispositivos.</li>
                <li>Datos de actividad que ya no sean necesarios para operar o cumplir obligaciones aplicables.</li>
              </ul>
            </section>
            <section className="rounded-[1.4rem] border border-[#d8bf9c] bg-[#f2e5d5] p-6">
              <ShieldCheck size={22} className="text-[#5B0B1F]" />
              <h2 className="mt-4 text-xl text-[#5B0B1F]" style={{ fontFamily: 'var(--font-display)' }}>Conservación limitada</h2>
              <p className="mt-3 text-sm leading-7 text-[#654c3e]">
                Cierta información de compras, pagos, reservaciones, accesos o seguridad podrá conservarse únicamente cuando exista una obligación legal, fiscal, de seguridad o de prevención de fraude, y solo durante el plazo aplicable.
              </p>
              <Link to="/politica-de-privacidad" className="mt-4 inline-flex text-xs font-semibold text-[#5B0B1F] underline">Consultar Política de Privacidad</Link>
            </section>
          </aside>
        </div>
      </section>

      {confirmOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#250810]/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="confirm-deletion-title">
          <div className="w-full max-w-[520px] rounded-[1.5rem] border border-[#e2cdb3] bg-[#fffaf3] p-6 shadow-[0_30px_90px_rgba(32,7,11,0.35)] md:p-8">
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2dfda] text-[#8c2638]"><Trash2 size={22} /></span>
              <button type="button" aria-label="Cerrar" onClick={() => setConfirmOpen(false)} disabled={submitting} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dccab5] text-[#5B0B1F]"><X size={18} /></button>
            </div>
            <h2 id="confirm-deletion-title" className="mt-5 text-3xl text-[#5B0B1F]" style={{ fontFamily: 'var(--font-display)' }}>Confirma tu solicitud</h2>
            <p className="mt-3 text-sm leading-7 text-[#6f5a4d]">
              Se registrará una solicitud para la cuenta asociada a <strong className="text-[#2b1712]">{email.trim().toLowerCase()}</strong>. No se borrará inmediatamente; primero se validará y procesará de forma segura.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={submitting} className="min-h-12 rounded-xl border border-[#d8bf9c] bg-white text-sm font-semibold text-[#5B0B1F]">Cancelar</button>
              <button type="button" onClick={() => void submitRequest()} disabled={submitting} className="min-h-12 rounded-xl bg-[#5B0B1F] px-4 text-sm font-semibold text-white disabled:opacity-60">{submitting ? 'Enviando…' : 'Sí, enviar solicitud'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
