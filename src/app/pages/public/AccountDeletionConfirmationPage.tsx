import { CheckCircle2, Loader2, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { publicPrivacyClient } from '../../../services/privacy.service'

type ConfirmationState =
  | { status: 'loading' }
  | {
      status: 'confirmed'
      requestNumber: string
      processingDueAt: string
      processingWindowDays: number
    }
  | { status: 'error'; message: string }

function dateLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'long',
    timeZone: 'America/Mexico_City',
  }).format(date)
}

export function AccountDeletionConfirmationPage() {
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])
  const [state, setState] = useState<ConfirmationState>({ status: 'loading' })

  useEffect(() => {
    document.title = 'Confirmación de eliminación de cuenta'
  }, [])

  useEffect(() => {
    let active = true
    if (!token) {
      setState({ status: 'error', message: 'El enlace de confirmación no es válido o expiró.' })
      return
    }
    publicPrivacyClient.confirmAccountDeletion(token)
      .then((response) => {
        if (!active) return
        setState({
          status: 'confirmed',
          requestNumber: response.data.requestNumber,
          processingDueAt: response.data.processingDueAt,
          processingWindowDays: response.data.processingWindowDays,
        })
      })
      .catch(() => {
        if (active) setState({ status: 'error', message: 'No fue posible confirmar la eliminación. El enlace puede haber expirado o ya fue usado.' })
      })
    return () => { active = false }
  }, [token])

  return (
    <main className="min-h-screen bg-[#f8f1e7] px-5 py-10 text-[#2b1712] md:px-10">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[760px] items-center justify-center">
        <article className="w-full rounded-[1.6rem] border border-[#dfcbb2] bg-white/88 p-6 shadow-[0_24px_70px_rgba(57,26,18,0.10)] backdrop-blur-xl md:p-9">
          {state.status === 'loading' ? (
            <div className="py-10 text-center">
              <Loader2 className="mx-auto animate-spin text-[#5B0B1F]" size={32} />
              <h1 className="mt-5 text-3xl text-[#5B0B1F]" style={{ fontFamily: 'var(--font-display)' }}>Confirmando eliminación</h1>
              <p className="mt-3 text-sm leading-6 text-[#6f5a4d]">Estamos validando el enlace seguro.</p>
            </div>
          ) : state.status === 'confirmed' ? (
            <>
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#252F37] text-white">
                <CheckCircle2 size={28} strokeWidth={1.6} />
              </span>
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b48a55]">Eliminación confirmada</p>
              <h1 className="mt-3 text-[clamp(2.3rem,6vw,3.5rem)] leading-none text-[#252F37]" style={{ fontFamily: 'var(--font-display)' }}>
                Tu cuenta está en proceso de eliminación
              </h1>
              <p className="mt-5 text-sm leading-7 text-[#554640]">
                Tu solicitud de eliminación fue confirmada y está en proceso. La eliminación de tu cuenta y de los datos personales asociados se completará en un plazo máximo de {state.processingWindowDays} días naturales. Conservaremos únicamente la información que debamos mantener por obligaciones legales o fiscales. Te enviaremos un correo cuando el proceso haya concluido.
              </p>
              <div className="mt-6 grid gap-3 rounded-[1.15rem] border border-[#dfcbb2] bg-[#fff8ef] p-4 sm:grid-cols-2">
                <Detail label="Folio" value={state.requestNumber} />
                <Detail label="Plazo máximo" value={dateLabel(state.processingDueAt)} />
              </div>
              <div className="mt-6 flex items-start gap-3 rounded-[1rem] border border-[#d8bf9c] bg-[#f2e5d5] p-4">
                <ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#5B0B1F]" />
                <p className="text-xs leading-6 text-[#654c3e]">A partir de esta confirmación, no será posible iniciar nuevas sesiones con esta cuenta mientras se procesa la eliminación.</p>
              </div>
            </>
          ) : (
            <>
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0ed] text-[#963e32]">
                <TriangleAlert size={28} strokeWidth={1.7} />
              </span>
              <h1 className="mt-6 text-3xl text-[#963e32]" style={{ fontFamily: 'var(--font-display)' }}>No pudimos confirmar el enlace</h1>
              <p className="mt-4 text-sm leading-7 text-[#6f5a4d]">{state.message}</p>
              <Link to="/eliminar-cuenta" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[#5B0B1F] px-5 text-sm font-semibold text-white">
                Iniciar nuevamente
              </Link>
            </>
          )}
        </article>
      </section>
    </main>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/74 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a6a50]">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-[#252F37]">{value}</p>
    </div>
  )
}
