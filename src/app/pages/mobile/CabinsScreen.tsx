import { useEffect, useMemo, useState } from 'react'
import { Check, Clock3, Coffee, Grape, Loader2, MapPin, Moon, Navigation, Users, Utensils } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { customerCommercialClient } from '../../../services/commercial.service'
import { BackButton, EmptyState, ErrorState, PrimaryButton, StatusBadge } from '../../components/mobile/PremiumMobileUi'
import { CrystalDateField } from '../../components/shared/CrystalDateField'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicCommercialServices } from '../../hooks/usePublicCommercialServices'
import { OfficialDirectionsSheet } from '../../components/mobile/OfficialDirectionsSheet'
import { appPath } from '../../utils/appRoutes'
import { HACIENDA_ADDRESS, OFFICIAL_CABINS_POI } from '../../utils/officialLocations'
import { formatCurrency } from '../../utils/publicContent'
import { acceptedContractMetadata, contractTermsFromMetadata, formatRuleTime, formatWindowLabel, operationalRulesFromMetadata } from '../../utils/reservationContract'

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

const MAIN_COURSE_OPTIONS = [
  { value: 'filete-res', label: 'Filete de res' },
  { value: 'pechuga-rellena', label: 'Pechuga rellena' },
  { value: 'pasta-cremosa', label: 'Pasta cremosa' },
  { value: 'opcion-vegetariana', label: 'Opción vegetariana' },
]

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function CabinsScreen() {
  const { locale, isEnglish } = useAppPreferences()
  const { session, isAuthenticated } = useAuth()
  const [selected, setSelected] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [notes, setNotes] = useState('')
  const [people, setPeople] = useState(2)
  const [mainCourseValue, setMainCourseValue] = useState(MAIN_COURSE_OPTIONS[0].value)
  const [contractAccepted, setContractAccepted] = useState(false)
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
  const selectedPackageFingerprint = normalizeText([
    selectedPackageRecord?.slug,
    selectedPackageRecord?.name,
    selectedPackageRecord?.subtitle,
    selectedPackageRecord?.description,
  ].filter(Boolean).join(' '))
  const isWinePackage = selectedPackageFingerprint.includes('vino')
    || selectedPackageFingerprint.includes('wine')
    || selectedPackageFingerprint.includes('cata')
    || selectedPackageFingerprint.includes('recorrido')
  const isRomanticPackage = selectedPackageFingerprint.includes('romantic')
    || selectedPackageFingerprint.includes('romantico')
    || selectedPackageFingerprint.includes('cena')
  const mainCourseSelection = MAIN_COURSE_OPTIONS.find((option) => option.value === mainCourseValue) ?? MAIN_COURSE_OPTIONS[0]
  const selectedMetadata = selectedPackageRecord?.metadata as Record<string, unknown> | null | undefined
  const cabinContractTerms = useMemo(() => contractTermsFromMetadata(selectedMetadata, {
    title: isEnglish ? 'Cabin booking conditions' : 'Condiciones de cabaña',
    terms: isEnglish
      ? [
        'The request is subject to availability and operational confirmation by Hacienda de Letras.',
        'Arrival, departure, breakfast and additional services follow the conditions published at the time of booking.',
        'Changes must be requested in advance with the guest service team.',
      ]
      : [
        'La solicitud queda sujeta a disponibilidad y confirmación operativa de Hacienda de Letras.',
        'Entrada, salida, desayuno y servicios adicionales se atienden conforme a las condiciones publicadas al momento de reservar.',
        'Cualquier cambio debe solicitarse con anticipación al equipo de atención.',
      ],
    confirmationMessage: isEnglish ? 'I accept the cabin booking conditions.' : 'Acepto las condiciones de la reservación.',
    requiresAcceptance: true,
    version: 'cabin-terms-v1',
  }), [isEnglish, selectedMetadata])
  const operationalRules = useMemo(() => operationalRulesFromMetadata(selectedMetadata, {
    checkInTime: '15:00',
    checkOutTime: '13:00',
    breakfastWindow: '09:00-11:00',
    minimumNoticeHours: 5,
    ...(isWinePackage ? { vineyardTourTime: '16:00', tastingTime: '17:00' } : {}),
    ...(isRomanticPackage ? { dinnerTime: '19:00', dinnerDurationMinutes: 180 } : {}),
  }), [isRomanticPackage, isWinePackage, selectedMetadata])

  useEffect(() => {
    setPeople((current) => Math.min(Math.max(current, minGuests), maxGuests))
  }, [maxGuests, minGuests])

  useEffect(() => {
    setContractAccepted(false)
  }, [selectedPackage])

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
    if (isRomanticPackage && !mainCourseSelection) {
      setMessage(isEnglish ? 'Select a main course option.' : 'Selecciona el plato fuerte para cocina.')
      return
    }
    if (cabinContractTerms.requiresAcceptance && !contractAccepted) {
      setMessage(isEnglish ? 'Accept the reservation terms to continue.' : 'Acepta las condiciones de reservación para continuar.')
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      const rulesForReservation = {
        ...operationalRules,
        ...(isRomanticPackage ? { mainCourse: mainCourseSelection } : {}),
      }
      const customerNotes = [
        notes.trim(),
        isRomanticPackage ? `Plato fuerte: ${mainCourseSelection.label}. Cena a las ${formatRuleTime(operationalRules.dinnerTime ?? '19:00')}; duración aproximada de ${Math.round((operationalRules.dinnerDurationMinutes ?? 180) / 60)} horas.` : '',
      ].filter(Boolean).join('\n')
      await customerCommercialClient.createCabinReservation(session?.access_token, {
        cabinPackageId: selectedPackage,
        checkIn,
        checkOut,
        peopleCount: people,
        customerNotes: customerNotes || null,
        metadata: {
          operationalRules: rulesForReservation,
          acceptedTerms: acceptedContractMetadata(cabinContractTerms, 'mobile_cabin_reservation'),
          ...(isRomanticPackage ? { mainCourse: { label: 'Plato fuerte', option: mainCourseSelection.label, value: mainCourseSelection.value } } : {}),
        },
        language: locale.startsWith('en') ? 'en' : 'es',
        idempotencyKey: nextIdempotencyKey('cabin'),
      })
      setMessage(isEnglish ? 'Request received. Hacienda de Letras will confirm availability through app notifications and your registered contact.' : 'Solicitud registrada. Hacienda de Letras confirmará disponibilidad por notificación en la app y por tu contacto registrado.')
    } catch {
      setMessage(isEnglish ? 'We could not submit the request.' : 'No fue posible registrar la solicitud.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5 px-[var(--app-pad)] pb-8 pt-5">
      <BackButton />

      <header>
        <p className="text-[10px] font-semibold uppercase text-[var(--color-gold)]">{isEnglish ? 'Lodging' : 'Hospedaje'}</p>
        <h1 className="mt-1 text-[clamp(26px,7vw,34px)] font-medium leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
          {isEnglish ? 'Cabins' : 'Cabañas'}
        </h1>
        <p className="mt-3 text-[13px] leading-5 text-[var(--color-muted)]">
          {isEnglish ? 'Lodging packages with availability confirmed by Hacienda de Letras.' : 'Paquetes para vivir Hacienda de Letras con solicitud y confirmación operativa.'}
        </p>
      </header>

      <section className="rounded-[18px] border border-[rgba(184,138,74,.3)] bg-[linear-gradient(145deg,rgba(255,250,242,.96),rgba(244,230,207,.9))] p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-[var(--color-burgundy)] text-[#F7F2EA]"><MapPin size={18} strokeWidth={1.6} /></span>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[.16em] text-[var(--color-gold)]">{isEnglish ? 'Exact location' : 'Ubicación exacta'}</p>
            <p className="mt-1 text-[12px] leading-5 text-[#5F493D]">{HACIENDA_ADDRESS}</p>
          </div>
        </div>
        <button type="button" onClick={() => setShowDirections(true)} className="app-burgundy-cta mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,var(--color-burgundy),var(--color-burgundy-deep))] px-4 text-[12px] font-semibold text-white">
          <Navigation size={15} />
          {isEnglish ? 'How to get to the cabins' : 'Cómo llegar a las cabañas'}
        </button>
      </section>

      {loading ? (
        <div className="rounded-[18px] border border-[rgba(180,138,85,0.32)] bg-[var(--color-panel)] p-5 text-[var(--color-burgundy)]">{isEnglish ? 'Loading...' : 'Cargando...'}</div>
      ) : error ? (
        <ErrorState message={error} retryLabel={isEnglish ? 'Try again' : 'Reintentar'} onRetry={retry} />
      ) : packages.length === 0 ? (
        <EmptyState title={isEnglish ? 'No packages published' : 'Sin paquetes publicados'} description={isEnglish ? 'New cabin packages will appear when they are available.' : 'Pronto estarán disponibles nuevos paquetes de cabaña.'} />
      ) : (
        <div className="space-y-3">
          {packages.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectPackage(item.id)}
              className={`min-w-0 max-w-full overflow-hidden rounded-[18px] border text-left ${selectedPackage === item.id ? 'border-[var(--color-burgundy)] bg-[#FFF5EA]' : 'border-[rgba(180,138,85,0.32)] bg-[#FFFDF8]'}`}
            >
              {item.coverImageUrl ? (
                <span className="block h-40 bg-[var(--color-ink)]">
                  <img src={item.coverImageUrl} alt={item.name} className="h-full w-full object-cover" />
                </span>
              ) : null}
              <span className="block p-4">
                <span className="flex min-w-0 flex-col items-start gap-3 min-[360px]:flex-row min-[360px]:justify-between">
                  <span className="min-w-0">
                    <span className="block text-[20px] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{item.name}</span>
                    {item.subtitle ? <span className="mt-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A6A42]">{item.subtitle}</span> : null}
                  </span>
                  <span className="shrink-0 text-left min-[360px]:text-right">
                    <StatusBadge>{formatCurrency(item.price, locale)}</StatusBadge>
                    <span className="mt-1.5 block text-[9px] uppercase tracking-[0.08em] text-[#8C7365]">{isEnglish ? 'per couple' : 'por pareja'}</span>
                  </span>
                </span>
                <span className="mt-3 block text-[12px] leading-5 text-[var(--color-muted)]">{item.description}</span>
                <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-[#E8D7C2] py-2.5 text-[10px] font-semibold text-[#6B4A3B]">
                  <span className="inline-flex items-center gap-1.5"><Moon size={13} />{item.nights ?? 1} {isEnglish ? 'night' : 'noche'}</span>
                  <span className="inline-flex items-center gap-1.5"><Users size={13} />{item.minGuests === item.maxGuests ? item.minGuests : `${item.minGuests ?? 1}–${item.maxGuests ?? 1}`} {isEnglish ? 'guests' : 'personas'}</span>
                  <span>{isEnglish ? 'Breakfast included' : 'Desayuno incluido'}</span>
                </span>
                <span className="mt-3 flex flex-wrap gap-2">
                  {(item.inclusions ?? []).map((value) => (
                    <span key={value} className="inline-flex items-center gap-1 rounded-full bg-[#E8D8C8] px-2.5 py-1 text-[10px] text-[var(--color-burgundy)]">
                      <Check size={12} /> {value}
                    </span>
                  ))}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <section className="rounded-[20px] border border-[rgba(180,138,85,0.32)] bg-[var(--color-panel)] p-4">
        <div className="grid grid-cols-2 gap-3">
          <CrystalDateField
            value={checkIn}
            onChange={selectCheckIn}
            label={isEnglish ? 'Arrival' : 'Llegada'}
            placeholder={isEnglish ? 'Select' : 'Elegir'}
            buttonClassName="rounded-[16px] border-[rgba(180,138,85,0.42)] bg-white/70 px-3 text-[12px] text-[var(--color-ink)]"
          />
          <CrystalDateField
            value={checkOut}
            onChange={setCheckOut}
            label={isEnglish ? 'Departure' : 'Salida'}
            placeholder={isEnglish ? 'Select' : 'Elegir'}
            buttonClassName="rounded-[16px] border-[rgba(180,138,85,0.42)] bg-white/70 px-3 text-[12px] text-[var(--color-ink)]"
          />
        </div>
        {selectedPackageRecord && nightCount > 0 ? (
          <div className="mt-3 rounded-[16px] border border-[rgba(180,138,85,0.42)] bg-[linear-gradient(145deg,rgba(255,255,255,.84),rgba(244,234,228,.72))] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#4B2C22]"><Moon size={15} />{nightCount} {nightCount === 1 ? (isEnglish ? 'night' : 'noche') : (isEnglish ? 'nights' : 'noches')}</span>
              <strong className="text-[16px] text-[var(--color-burgundy)]">{formatCurrency(estimatedTotal, locale)}</strong>
            </div>
            <p className="mt-1 text-[10px] leading-4 text-[var(--color-muted)]">
              {isEnglish
                ? `Estimated total for ${packageUnits} ${packageUnits === 1 ? 'package period' : 'package periods'}. Availability is confirmed when the request is reviewed.`
                : `Total estimado por ${packageUnits} ${packageUnits === 1 ? 'periodo del paquete' : 'periodos del paquete'}. La disponibilidad se confirma al revisar la solicitud.`}
            </p>
          </div>
        ) : null}
        {selectedPackageRecord ? (
          <div className="mt-3 rounded-[16px] border border-[rgba(180,138,85,0.34)] bg-[#F7F2EA]/70 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--color-gold)]">{isEnglish ? 'Stay rules' : 'Reglas de estancia'}</p>
            <div className="mt-3 grid gap-2 text-[11px] leading-4 text-[var(--color-muted)]">
              <span className="inline-flex items-start gap-2">
                <Clock3 size={14} className="mt-0.5 shrink-0 text-[var(--color-burgundy)]" />
                <span><strong className="text-[var(--color-ink)]">{isEnglish ? 'Check-in' : 'Entrada'}:</strong> {formatRuleTime(operationalRules.checkInTime)} · <strong className="text-[var(--color-ink)]">{isEnglish ? 'Check-out' : 'Salida'}:</strong> {formatRuleTime(operationalRules.checkOutTime)} {isEnglish ? 'next day' : 'del día siguiente'}.</span>
              </span>
              <span className="inline-flex items-start gap-2">
                <Coffee size={14} className="mt-0.5 shrink-0 text-[var(--color-burgundy)]" />
                <span><strong className="text-[var(--color-ink)]">{isEnglish ? 'Breakfast' : 'Desayuno'}:</strong> {formatWindowLabel(operationalRules.breakfastWindow)}</span>
              </span>
              <span className="inline-flex items-start gap-2">
                <Utensils size={14} className="mt-0.5 shrink-0 text-[var(--color-burgundy)]" />
                <span>{isEnglish ? `Kitchen and set-up require at least ${operationalRules.minimumNoticeHours ?? 5} hours of notice.` : `Cocina y montaje requieren mínimo ${operationalRules.minimumNoticeHours ?? 5} horas de anticipación.`}</span>
              </span>
              {isWinePackage ? (
                <span className="inline-flex items-start gap-2">
                  <Grape size={14} className="mt-0.5 shrink-0 text-[var(--color-burgundy)]" />
                  <span><strong className="text-[var(--color-ink)]">{isEnglish ? 'Wine package' : 'Paquete vino'}:</strong> {isEnglish ? `tour at ${formatRuleTime(operationalRules.vineyardTourTime)} and tasting at ${formatRuleTime(operationalRules.tastingTime)}, after cabin entry.` : `recorrido a las ${formatRuleTime(operationalRules.vineyardTourTime)} y cata a las ${formatRuleTime(operationalRules.tastingTime)}, después de la entrada a cabaña.`}</span>
                </span>
              ) : null}
              {isRomanticPackage ? (
                <span className="inline-flex items-start gap-2">
                  <Utensils size={14} className="mt-0.5 shrink-0 text-[var(--color-burgundy)]" />
                  <span><strong className="text-[var(--color-ink)]">{isEnglish ? 'Romantic dinner' : 'Cena romántica'}:</strong> {formatRuleTime(operationalRules.dinnerTime)}, {isEnglish ? 'approximately' : 'duración aproximada de'} {Math.round((operationalRules.dinnerDurationMinutes ?? 180) / 60)} {isEnglish ? 'hours.' : 'horas.'}</span>
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
        {isRomanticPackage ? (
          <div className="mt-3 rounded-[16px] border border-[rgba(180,138,85,0.42)] bg-white/70 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--color-gold)]">{isEnglish ? 'Main course' : 'Plato fuerte'}</p>
            <p className="mt-1 text-[11px] leading-4 text-[var(--color-muted)]">{isEnglish ? 'Required for kitchen planning.' : 'Requerido para planeación de cocina.'}</p>
            <div className="mt-3 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
              {MAIN_COURSE_OPTIONS.map((option) => {
                const active = mainCourseValue === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMainCourseValue(option.value)}
                    className={`min-h-11 rounded-[14px] border px-3 text-left text-[12px] font-semibold ${active ? 'border-[var(--color-burgundy)] bg-[var(--color-burgundy)] text-white shadow-[0_12px_26px_rgba(45,5,17,0.22)]' : 'border-[rgba(180,138,85,0.36)] bg-[#FFFDF8] text-[var(--color-burgundy)]'}`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
        <label className="mt-3 block rounded-[16px] border border-[rgba(180,138,85,0.42)] bg-white/70 px-3 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--color-gold)]">{isEnglish ? 'Guests' : 'Personas'}</span>
          <input
            type="number"
            min={minGuests}
            max={maxGuests}
            value={people}
            onChange={(event) => setPeople(Math.min(Math.max(Number(event.target.value) || minGuests, minGuests), maxGuests))}
            className="mt-2 w-full bg-transparent text-[13px] outline-none"
          />
          <span className="mt-1 block text-[10px] text-[var(--color-muted)]">{isEnglish ? `Allowed for this package: ${minGuests} to ${maxGuests}.` : `Permitido para este paquete: ${minGuests} a ${maxGuests}.`}</span>
        </label>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={isEnglish ? 'Notes for Hacienda de Letras' : 'Notas para Hacienda de Letras'} className="mt-3 min-h-24 w-full rounded-[16px] border border-[rgba(180,138,85,0.42)] bg-white/70 px-3 py-3 text-[13px] text-[var(--color-ink)] outline-none" />
        {cabinContractTerms.requiresAcceptance ? (
          <label className="mt-3 flex items-start gap-3 rounded-[16px] border border-[rgba(180,138,85,0.42)] bg-[#F7F2EA]/80 px-3 py-3">
            <input
              type="checkbox"
              checked={contractAccepted}
              onChange={(event) => setContractAccepted(event.target.checked)}
              className="mt-1 h-5 w-5 rounded border-[rgba(74,7,25,0.32)] accent-[var(--color-burgundy)]"
            />
            <span className="text-[11px] leading-5 text-[var(--color-muted)]">
              <strong className="block text-[12px] text-[var(--color-ink)]">{cabinContractTerms.title}</strong>
              {cabinContractTerms.terms.join(' ')}
            </span>
          </label>
        ) : null}
        <button type="button" onClick={submit} disabled={submitting} className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--color-burgundy)] px-5 text-[14px] font-semibold text-white disabled:opacity-60">
          {submitting ? <Loader2 className="animate-spin" size={18} /> : (isEnglish ? 'Request cabin' : 'Solicitar cabaña')}
        </button>
        {message ? <p className="mt-3 text-[12px] leading-5 text-[var(--color-burgundy)]">{message}</p> : null}
      </section>

      {!isAuthenticated ? <PrimaryButton to={appPath('/login')}>{isEnglish ? 'Sign in' : 'Iniciar sesión'}</PrimaryButton> : null}

      {showDirections ? <OfficialDirectionsSheet poi={OFFICIAL_CABINS_POI} onClose={() => setShowDirections(false)} /> : null}
    </div>
  )
}
