import { useEffect, useState } from 'react'
import { Check, Loader2, MapPin, MoonStar, Navigation, Users } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { customerCommercialClient } from '../../../services/commercial.service'
import { EmptyState, ErrorState, PrimaryButton, StatusBadge } from '../../components/mobile/PremiumMobileUi'
import { CrystalDateField } from '../../components/shared/CrystalDateField'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicCommercialServices } from '../../hooks/usePublicCommercialServices'
import { OfficialDirectionsSheet } from '../../components/mobile/OfficialDirectionsSheet'
import { appPath } from '../../utils/appRoutes'
import { HACIENDA_ADDRESS, OFFICIAL_CABINS_POI } from '../../utils/officialLocations'
import { formatCurrency } from '../../utils/publicContent'

function nextIdempotencyKey(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function addDays(value: string, days: number) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return ''
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function nightsBetween(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0
  const start = Date.parse(`${checkIn}T00:00:00.000Z`)
  const end = Date.parse(`${checkOut}T00:00:00.000Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return Math.round((end - start) / 86_400_000)
}

export function CabinsScreen() {
  const { locale, isEnglish } = useAppPreferences()
  const { session, isAuthenticated } = useAuth()
  const [selected, setSelected] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [notes, setNotes] = useState('')
  const [people, setPeople] = useState(2)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [showDirections, setShowDirections] = useState(false)
  const { services, loading, error, retry } = usePublicCommercialServices()
  const packages = services.cabins
  const selectedPackage = selected || packages[0]?.id || ''
  const selectedPackageRecord = packages.find((item) => item.id === selectedPackage)
  const nightCount = nightsBetween(checkIn, checkOut)
  const includedNights = Math.max(selectedPackageRecord?.nights ?? 1, 1)
  const packageUnits = nightCount > 0 ? Math.ceil(nightCount / includedNights) : 0
  const estimatedTotal = (selectedPackageRecord?.price ?? 0) * packageUnits
  const minGuests = Math.max(selectedPackageRecord?.minGuests ?? 1, 1)
  const maxGuests = Math.max(selectedPackageRecord?.maxGuests ?? minGuests, minGuests)

  useEffect(() => {
    setPeople((current) => Math.min(Math.max(current, minGuests), maxGuests))
  }, [maxGuests, minGuests])

  const selectPackage = (packageId: string) => {
    setSelected(packageId)
    if (!checkIn) return
    const nextPackage = packages.find((item) => item.id === packageId)
    setCheckOut(addDays(checkIn, Math.max(nextPackage?.nights ?? 1, 1)))
  }

  const selectCheckIn = (value: string) => {
    setCheckIn(value)
    if (!value) {
      setCheckOut('')
      return
    }
    if (!checkOut || nightsBetween(value, checkOut) < 1) {
      setCheckOut(addDays(value, includedNights))
    }
  }

  const submit = async () => {
    if (!isAuthenticated) {
      setMessage(isEnglish ? 'Sign in to request a cabin.' : 'Inicia sesión para solicitar una cabaña.')
      return
    }
    if (!selectedPackage || !checkIn || !checkOut) {
      setMessage(isEnglish ? 'Select a package, arrival and departure dates.' : 'Selecciona paquete, fecha de llegada y fecha de salida.')
      return
    }
    if (nightCount < 1) {
      setMessage(isEnglish ? 'Departure must be after arrival.' : 'La fecha de salida debe ser posterior a la llegada.')
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      await customerCommercialClient.createCabinReservation(session?.access_token, {
        cabinPackageId: selectedPackage,
        checkIn,
        checkOut,
        peopleCount: people,
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

      <section className="rounded-[18px] border border-[rgba(184,138,74,.3)] bg-[linear-gradient(145deg,rgba(255,250,242,.96),rgba(244,230,207,.9))] p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-[#690D2B] text-[#F4D9AA]"><MapPin size={18} strokeWidth={1.6} /></span>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#B88A4A]">{isEnglish ? 'Exact location' : 'Ubicación exacta'}</p>
            <p className="mt-1 text-[12px] leading-5 text-[#5F493D]">{HACIENDA_ADDRESS}</p>
          </div>
        </div>
        <button type="button" onClick={() => setShowDirections(true)} className="app-burgundy-cta mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#7d1435,#57071d)] px-4 text-[12px] font-semibold text-white">
          <Navigation size={15} />
          {isEnglish ? 'How to get to the cabins' : 'Cómo llegar a las cabañas'}
        </button>
      </section>

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
              onClick={() => selectPackage(item.id)}
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
                  <span className="inline-flex items-center gap-1.5"><Users size={13} />{item.minGuests === item.maxGuests ? item.minGuests : `${item.minGuests ?? 1}–${item.maxGuests ?? 1}`} {isEnglish ? 'guests' : 'personas'}</span>
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
        <div className="grid grid-cols-2 gap-3">
          <CrystalDateField
            value={checkIn}
            onChange={selectCheckIn}
            label={isEnglish ? 'Arrival' : 'Llegada'}
            placeholder={isEnglish ? 'Select' : 'Elegir'}
            buttonClassName="rounded-[16px] border-[#E2CCAE] bg-white/70 px-3 text-[12px] text-[#2D1811]"
          />
          <CrystalDateField
            value={checkOut}
            onChange={setCheckOut}
            label={isEnglish ? 'Departure' : 'Salida'}
            placeholder={isEnglish ? 'Select' : 'Elegir'}
            buttonClassName="rounded-[16px] border-[#E2CCAE] bg-white/70 px-3 text-[12px] text-[#2D1811]"
          />
        </div>
        {selectedPackageRecord && nightCount > 0 ? (
          <div className="mt-3 rounded-[16px] border border-[#E2CCAE] bg-[linear-gradient(145deg,rgba(255,255,255,.84),rgba(244,234,228,.72))] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#4B2C22]"><MoonStar size={15} />{nightCount} {nightCount === 1 ? (isEnglish ? 'night' : 'noche') : (isEnglish ? 'nights' : 'noches')}</span>
              <strong className="text-[16px] text-[#690D2B]">{formatCurrency(estimatedTotal, locale)}</strong>
            </div>
            <p className="mt-1 text-[10px] leading-4 text-[#776053]">
              {isEnglish
                ? `Estimated total for ${packageUnits} ${packageUnits === 1 ? 'package period' : 'package periods'}. Availability is confirmed when the request is reviewed.`
                : `Total estimado por ${packageUnits} ${packageUnits === 1 ? 'periodo del paquete' : 'periodos del paquete'}. La disponibilidad se confirma al revisar la solicitud.`}
            </p>
          </div>
        ) : null}
        <label className="mt-3 block rounded-[16px] border border-[#E2CCAE] bg-white/70 px-3 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#B88A4A]">{isEnglish ? 'Guests' : 'Personas'}</span>
          <input
            type="number"
            min={minGuests}
            max={maxGuests}
            value={people}
            onChange={(event) => setPeople(Math.min(Math.max(Number(event.target.value) || minGuests, minGuests), maxGuests))}
            className="mt-2 w-full bg-transparent text-[13px] outline-none"
          />
          <span className="mt-1 block text-[10px] text-[#776053]">{isEnglish ? `Allowed for this package: ${minGuests} to ${maxGuests}.` : `Permitido para este paquete: ${minGuests} a ${maxGuests}.`}</span>
        </label>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={isEnglish ? 'Notes for Hacienda de Letras' : 'Notas para Hacienda de Letras'} className="mt-3 min-h-24 w-full rounded-[16px] border border-[#E2CCAE] bg-white/70 px-3 py-3 text-[13px] text-[#2D1811] outline-none" />
        <button type="button" onClick={submit} disabled={submitting} className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full bg-[#8A1238] px-5 text-[14px] font-semibold text-white disabled:opacity-60">
          {submitting ? <Loader2 className="animate-spin" size={18} /> : (isEnglish ? 'Request cabin' : 'Solicitar cabaña')}
        </button>
        {message ? <p className="mt-3 text-[12px] leading-5 text-[#690D2B]">{message}</p> : null}
      </section>

      {!isAuthenticated ? <PrimaryButton to={appPath('/login')}>{isEnglish ? 'Sign in' : 'Iniciar sesión'}</PrimaryButton> : null}

      {showDirections ? <OfficialDirectionsSheet poi={OFFICIAL_CABINS_POI} onClose={() => setShowDirections(false)} /> : null}
    </div>
  )
}
