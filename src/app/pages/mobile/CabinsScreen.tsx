import { useEffect, useState } from 'react'
import { CalendarDays, Check, Loader2 } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { customerCommercialClient, publicCommercialClient, type PublicCommercialItem } from '../../../services/commercial.service'
import { PrimaryButton, StatusBadge } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { appPath } from '../../utils/appRoutes'
import { formatCurrency } from '../../utils/publicContent'

function nextIdempotencyKey(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function CabinsScreen() {
  const { locale } = useAppPreferences()
  const { session, isAuthenticated } = useAuth()
  const [packages, setPackages] = useState<PublicCommercialItem[]>([])
  const [selected, setSelected] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    publicCommercialClient.services()
      .then((response) => {
        if (!active) return
        setPackages(response.data.cabins)
        setSelected(response.data.cabins[0]?.id ?? '')
      })
      .catch(() => {
        if (active) setMessage('No fue posible cargar los paquetes.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const submit = async () => {
    if (!isAuthenticated) {
      setMessage('Inicia sesión para solicitar una cabaña.')
      return
    }
    if (!selected || !checkIn) {
      setMessage('Selecciona paquete y fecha de llegada.')
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      await customerCommercialClient.createCabinReservation(session?.access_token, {
        cabinPackageId: selected,
        checkIn,
        peopleCount: 2,
        customerNotes: notes || null,
        language: locale.startsWith('en') ? 'en' : 'es',
        idempotencyKey: nextIdempotencyKey('cabin'),
      })
      setMessage('Solicitud registrada. Hacienda de Letras confirmará disponibilidad.')
    } catch {
      setMessage('No fue posible registrar la solicitud.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5 px-[var(--app-pad)] pb-8 pt-5">
      <header>
        <p className="text-[10px] font-semibold uppercase text-[#B88A4A]">Hospedaje</p>
        <h1 className="mt-1 text-[clamp(34px,9vw,44px)] leading-none text-[#2D1811]" style={{ fontFamily: 'var(--font-display)' }}>
          Cabañas
        </h1>
        <p className="mt-3 text-[13px] leading-5 text-[#776053]">
          Paquetes para vivir Hacienda de Letras con solicitud y confirmación operativa.
        </p>
      </header>

      {loading ? (
        <div className="rounded-[18px] border border-[#EBDCC8] bg-[#FFF9F1] p-5 text-[#690D2B]">Cargando...</div>
      ) : (
        <div className="space-y-3">
          {packages.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item.id)}
              className={`w-full rounded-[18px] border p-4 text-left ${selected === item.id ? 'border-[#8A1238] bg-[#FFF5EA]' : 'border-[#EBDCC8] bg-[#FFFDF8]'}`}
            >
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="block text-[20px] leading-none text-[#2D1811]" style={{ fontFamily: 'var(--font-display)' }}>{item.name}</span>
                  <span className="mt-2 block text-[12px] leading-5 text-[#776053]">{item.description}</span>
                </span>
                <StatusBadge>{formatCurrency(item.price, locale)}</StatusBadge>
              </span>
              <span className="mt-3 flex flex-wrap gap-2">
                {(item.inclusions ?? []).slice(0, 5).map((value) => (
                  <span key={value} className="inline-flex items-center gap-1 rounded-full bg-[#F4EAE4] px-2.5 py-1 text-[10px] text-[#690D2B]">
                    <Check size={12} /> {value}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      )}

      <section className="rounded-[20px] border border-[#EBDCC8] bg-[#FFF9F1] p-4">
        <label className="block text-[10px] font-semibold uppercase tracking-[.18em] text-[#B88A4A]">Fecha de llegada</label>
        <div className="mt-2 flex items-center gap-2 rounded-[16px] border border-[#E2CCAE] bg-white/70 px-3 py-3">
          <CalendarDays size={18} className="text-[#8A1238]" />
          <input type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[14px] text-[#2D1811] outline-none" />
        </div>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notas para Hacienda de Letras" className="mt-3 min-h-24 w-full rounded-[16px] border border-[#E2CCAE] bg-white/70 px-3 py-3 text-[14px] text-[#2D1811] outline-none" />
        <button type="button" onClick={submit} disabled={submitting} className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full bg-[#8A1238] px-5 text-[14px] font-semibold text-white disabled:opacity-60">
          {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Solicitar cabaña'}
        </button>
        {message ? <p className="mt-3 text-[12px] leading-5 text-[#690D2B]">{message}</p> : null}
      </section>

      {!isAuthenticated ? <PrimaryButton to={appPath('/login')}>Iniciar sesión</PrimaryButton> : null}
    </div>
  )
}
