import { useState } from 'react'
import { Check, Loader2, MoonStar, Users } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { customerCommercialClient } from '../../../services/commercial.service'
import { EmptyState, ErrorState, PrimaryButton, StatusBadge } from '../../components/mobile/PremiumMobileUi'
import { CrystalDateField } from '../../components/shared/CrystalDateField'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicCommercialServices } from '../../hooks/usePublicCommercialServices'
import { appPath } from '../../utils/appRoutes'
import { formatCurrency } from '../../utils/publicContent'

function nextIdempotencyKey(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function CabinsScreen() {
  const { locale, isEnglish } = useAppPreferences()
  const { session, isAuthenticated } = useAuth()
  const [selected, setSelected] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const { services, loading, error, retry } = usePublicCommercialServices()
  const packages = services.cabins
  const selectedPackage = selected || packages[0]?.id || ''

  const submit = async () => {
    if (!isAuthenticated) {
      setMessage(isEnglish ? 'Sign in to request a cabin.' : 'Inicia sesión para solicitar una cabaña.')
      return
    }
    if (!selectedPackage || !checkIn) {
      setMessage(isEnglish ? 'Select a package and arrival date.' : 'Selecciona paquete y fecha de llegada.')
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      await customerCommercialClient.createCabinReservation(session?.access_token, {
        cabinPackageId: selectedPackage,
        checkIn,
        peopleCount: 2,
        customerNotes: notes || null,
        language: locale.startsWith('en') ? 'en' : 'es',
        idempotencyKey: nextIdempotencyKey('cabin'),
      })
      setMessage(isEnglish ? 'Request received. Hacienda de Letras will confirm availability.' : 'Solicitud registrada. Hacienda de Letras confirmará disponibilidad.')
    } catch {
      setMessage(isEnglish ? 'We could not submit the request.' : 'No fue posible registrar la solicitud.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5 px-[var(--app-pad)] pb-8 pt-5">
      <header>
        <p className="text-[10px] font-semibold uppercase text-[#B88A4A]">{isEnglish ? 'Lodging' : 'Hospedaje'}</p>
        <h1 className="mt-1 text-[clamp(26px,7vw,34px)] font-medium leading-none text-[#2D1811]" style={{ fontFamily: 'var(--font-display)' }}>
          {isEnglish ? 'Cabins' : 'Cabañas'}
        </h1>
        <p className="mt-3 text-[13px] leading-5 text-[#776053]">
          {isEnglish ? 'Lodging packages with availability confirmed by Hacienda de Letras.' : 'Paquetes para vivir Hacienda de Letras con solicitud y confirmación operativa.'}
        </p>
      </header>

      {loading ? (
        <div className="rounded-[18px] border border-[#EBDCC8] bg-[#FFF9F1] p-5 text-[#690D2B]">{isEnglish ? 'Loading...' : 'Cargando...'}</div>
      ) : error ? (
        <ErrorState message={error} retryLabel={isEnglish ? 'Try again' : 'Reintentar'} onRetry={retry} />
      ) : packages.length === 0 ? (
        <EmptyState title={isEnglish ? 'No packages published' : 'Sin paquetes publicados'} description={isEnglish ? 'Hacienda de Letras will publish cabin packages once they are available.' : 'Hacienda de Letras publicará paquetes de cabaña desde el Centro de Control.'} />
      ) : (
        <div className="space-y-3">
          {packages.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item.id)}
              className={`min-w-0 max-w-full overflow-hidden rounded-[18px] border text-left ${selectedPackage === item.id ? 'border-[#8A1238] bg-[#FFF5EA]' : 'border-[#EBDCC8] bg-[#FFFDF8]'}`}
            >
              {item.coverImageUrl ? (
                <span className="block h-40 bg-[#2D1811]">
                  <img src={item.coverImageUrl} alt={item.name} className="h-full w-full object-cover" />
                </span>
              ) : null}
              <span className="block p-4">
                <span className="flex min-w-0 flex-col items-start gap-3 min-[360px]:flex-row min-[360px]:justify-between">
                  <span className="min-w-0">
                    <span className="block text-[20px] leading-none text-[#2D1811]" style={{ fontFamily: 'var(--font-display)' }}>{item.name}</span>
                    {item.subtitle ? <span className="mt-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A6A42]">{item.subtitle}</span> : null}
                  </span>
                  <span className="shrink-0 text-left min-[360px]:text-right">
                    <StatusBadge>{formatCurrency(item.price, locale)}</StatusBadge>
                    <span className="mt-1.5 block text-[9px] uppercase tracking-[0.08em] text-[#8C7365]">{isEnglish ? 'per couple' : 'por pareja'}</span>
                  </span>
                </span>
                <span className="mt-3 block text-[12px] leading-5 text-[#776053]">{item.description}</span>
                <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-[#E8D7C2] py-2.5 text-[10px] font-semibold text-[#6B4A3B]">
                  <span className="inline-flex items-center gap-1.5"><MoonStar size={13} />{item.nights ?? 1} {isEnglish ? 'night' : 'noche'}</span>
                  <span className="inline-flex items-center gap-1.5"><Users size={13} />2 {isEnglish ? 'guests' : 'personas'}</span>
                  <span>{isEnglish ? 'Breakfast included' : 'Desayuno incluido'}</span>
                </span>
                <span className="mt-3 flex flex-wrap gap-2">
                  {(item.inclusions ?? []).map((value) => (
                    <span key={value} className="inline-flex items-center gap-1 rounded-full bg-[#F4EAE4] px-2.5 py-1 text-[10px] text-[#690D2B]">
                      <Check size={12} /> {value}
                    </span>
                  ))}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <section className="rounded-[20px] border border-[#EBDCC8] bg-[#FFF9F1] p-4">
        <CrystalDateField
          value={checkIn}
          onChange={setCheckIn}
          label={isEnglish ? 'Arrival date' : 'Fecha de llegada'}
          placeholder={isEnglish ? 'Select arrival' : 'Selecciona llegada'}
          buttonClassName="rounded-[16px] border-[#E2CCAE] bg-white/70 text-[12px] text-[#2D1811]"
        />
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={isEnglish ? 'Notes for Hacienda de Letras' : 'Notas para Hacienda de Letras'} className="mt-3 min-h-24 w-full rounded-[16px] border border-[#E2CCAE] bg-white/70 px-3 py-3 text-[13px] text-[#2D1811] outline-none" />
        <button type="button" onClick={submit} disabled={submitting} className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full bg-[#8A1238] px-5 text-[14px] font-semibold text-white disabled:opacity-60">
          {submitting ? <Loader2 className="animate-spin" size={18} /> : (isEnglish ? 'Request cabin' : 'Solicitar cabaña')}
        </button>
        {message ? <p className="mt-3 text-[12px] leading-5 text-[#690D2B]">{message}</p> : null}
      </section>

      {!isAuthenticated ? <PrimaryButton to={appPath('/login')}>{isEnglish ? 'Sign in' : 'Iniciar sesión'}</PrimaryButton> : null}
    </div>
  )
}
