import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, MapPin, Navigation } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { customerCommercialClient } from '../../../services/commercial.service'
import { BackButton, EmptyState, ErrorState, StatusBadge } from '../../components/mobile/PremiumMobileUi'
import { CrystalDateField } from '../../components/shared/CrystalDateField'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicCommercialServices } from '../../hooks/usePublicCommercialServices'
import { OfficialDirectionsSheet } from '../../components/mobile/OfficialDirectionsSheet'
import { officialRestaurantPoi } from '../../utils/officialLocations'
import { acceptedContractMetadata, contractTermsFromMetadata } from '../../utils/reservationContract'
import { useMobileGuestAccess } from '../../components/mobile/MobileGuestAccessContext'
import { appPath } from '../../utils/appRoutes'

function nextIdempotencyKey(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function RestaurantsScreen() {
  const { locale, isEnglish } = useAppPreferences()
  const { session, isAuthenticated } = useAuth()
  const { requestAuth } = useMobileGuestAccess()
  const [selected, setSelected] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [people, setPeople] = useState(2)
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [directionsSlug, setDirectionsSlug] = useState('')
  const [contractAccepted, setContractAccepted] = useState(false)
  const { services, loading, error, retry } = usePublicCommercialServices()
  const restaurants = services.restaurants
  const selectedRestaurant = selected || restaurants[0]?.id || ''
  const selectedRestaurantRecord = restaurants.find((item) => item.id === selectedRestaurant) ?? null
  const restaurantTimes = useMemo(() => {
    const configured = selectedRestaurantRecord?.metadata?.reservationTimes
    if (!Array.isArray(configured)) return []
    return [...new Set(configured.filter((value): value is string => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)))]
      .sort()
      .map((value) => ({ value, label: value }))
  }, [selectedRestaurantRecord])
  const canRequest = Boolean(selectedRestaurantRecord?.reservationEnabled && restaurantTimes.length > 0)
  const directionsRestaurant = restaurants.find((item) => item.slug === directionsSlug) ?? null
  const restaurantContractTerms = useMemo(() => contractTermsFromMetadata(selectedRestaurantRecord?.metadata, {
    title: isEnglish ? 'Restaurant booking conditions' : 'Condiciones de restaurante',
    terms: isEnglish
      ? [
        'The request is subject to operational confirmation by Hacienda de Letras.',
        'Arrival time, table availability and service conditions are confirmed through the registered contact.',
        'Changes must be requested in advance with the restaurant team.',
      ]
      : [
        'La solicitud queda sujeta a confirmación operativa de Hacienda de Letras.',
        'El horario de llegada, disponibilidad de mesa y condiciones de servicio se confirman por el contacto registrado.',
        'Cualquier cambio debe solicitarse con anticipación al equipo del restaurante.',
      ],
    confirmationMessage: isEnglish ? 'I accept the restaurant booking conditions.' : 'Acepto las condiciones de la reservación.',
    requiresAcceptance: true,
    version: 'restaurant-terms-v1',
  }), [isEnglish, selectedRestaurantRecord?.metadata])

  useEffect(() => {
    if (time && !restaurantTimes.some((option) => option.value === time)) setTime('')
  }, [restaurantTimes, time])

  useEffect(() => {
    setContractAccepted(false)
  }, [selectedRestaurant])

  const submit = async () => {
    if (!isAuthenticated) {
      setMessage('')
      requestAuth({ from: appPath('/restaurantes') })
      return
    }
    if (!selectedRestaurant || !date || !time || !canRequest) {
      setMessage(isEnglish ? 'Select a restaurant, date and time.' : 'Selecciona restaurante, fecha y horario.')
      return
    }
    if (restaurantContractTerms.requiresAcceptance && !contractAccepted) {
      setMessage(isEnglish ? 'Accept the booking conditions before continuing.' : 'Acepta las condiciones de reservación antes de continuar.')
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      await customerCommercialClient.createRestaurantReservation(session?.access_token, {
        restaurantLocationId: selectedRestaurant,
        reservationDate: date,
        reservationTime: time,
        peopleCount: people,
        customerNotes: notes || null,
        metadata: {
          acceptedTerms: acceptedContractMetadata(restaurantContractTerms, 'mobile_restaurant_reservation'),
        },
        language: locale.startsWith('en') ? 'en' : 'es',
        idempotencyKey: nextIdempotencyKey('restaurant'),
      })
      setMessage(isEnglish ? 'Request received. We will confirm your table through app notifications and your registered contact.' : 'Solicitud registrada. Te confirmaremos la mesa por notificación en la app y por tu contacto registrado.')
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
        <p className="text-[10px] font-semibold uppercase text-[var(--color-gold)]">{isEnglish ? 'Dining' : 'Gastronomía'}</p>
        <h1 className="mt-1 text-[clamp(26px,7vw,34px)] font-medium leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
          {isEnglish ? 'Restaurants' : 'Restaurantes'}
        </h1>
        <p className="mt-3 text-[13px] leading-5 text-[var(--color-muted)]">{isEnglish ? 'Bookings are subject to operational confirmation.' : 'Reservaciones sujetas a confirmación operativa.'}</p>
      </header>

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-[18px] border border-[rgba(180,138,85,0.32)] bg-[var(--color-panel)] p-5 text-[var(--color-burgundy)]">{isEnglish ? 'Loading...' : 'Cargando...'}</div>
        ) : error ? (
          <ErrorState message={error} retryLabel={isEnglish ? 'Try again' : 'Reintentar'} onRetry={retry} />
        ) : restaurants.length === 0 ? (
          <EmptyState title={isEnglish ? 'No restaurants published' : 'Sin restaurantes publicados'} description={isEnglish ? 'New dining spaces will appear when they are available.' : 'Pronto estarán disponibles nuevos espacios gastronómicos.'} />
        ) : restaurants.map((item) => (
          <article key={item.id} className={`w-full overflow-hidden rounded-[18px] border ${selectedRestaurant === item.id ? 'border-[var(--color-burgundy)] bg-[#FFF5EA]' : 'border-[rgba(180,138,85,0.32)] bg-[#FFFDF8]'}`}>
            <button type="button" onClick={() => setSelected(item.id)} className="block w-full text-left">
              {item.coverImageUrl ? (
                <span className="block h-40 bg-[var(--color-ink)]">
                  <img src={item.coverImageUrl} alt={item.name} className="h-full w-full object-cover" />
                </span>
              ) : null}
              <span className="flex items-start justify-between gap-3 p-4 pb-3">
                <span>
                  <span className="block text-[20px] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{item.name}</span>
                  <span className="mt-2 flex items-start gap-2 text-[12px] leading-5 text-[var(--color-muted)]"><MapPin size={14} className="mt-0.5 shrink-0" />{item.address || (isEnglish ? 'Details pending confirmation' : 'Datos pendientes de confirmación')}</span>
                </span>
                <StatusBadge>{item.reservationEnabled ? (isEnglish ? 'Bookable' : 'Reservable') : (isEnglish ? 'Draft' : 'Borrador')}</StatusBadge>
              </span>
            </button>
            <div className="px-4 pb-4">
              <button type="button" onClick={() => setDirectionsSlug(item.slug)} className="app-burgundy-cta flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,var(--color-burgundy),var(--color-burgundy-deep))] px-4 text-[12px] font-semibold text-white">
                <Navigation size={15} />
                {isEnglish ? 'How to get there' : 'Cómo llegar'}
              </button>
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-[20px] border border-[rgba(180,138,85,0.32)] bg-[var(--color-panel)] p-4">
        <div className="grid grid-cols-2 gap-3">
          <CrystalDateField value={date} onChange={setDate} label={isEnglish ? 'Date' : 'Fecha'} placeholder={isEnglish ? 'Choose date' : 'Elegir fecha'} buttonClassName="rounded-[16px] border-[rgba(180,138,85,0.42)] bg-white/70 text-[12px]" />
          <div>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{isEnglish ? 'Time' : 'Hora'}</span>
            <CrystalSelect value={time} onChange={setTime} disabled={!canRequest} options={[{ value: '', label: restaurantTimes.length ? (isEnglish ? 'Choose time' : 'Elegir hora') : (isEnglish ? 'No configured times' : 'Sin horarios configurados') }, ...restaurantTimes]} buttonClassName="rounded-[16px] border-[rgba(180,138,85,0.42)] bg-white/70 text-[12px]" />
          </div>
        </div>
        <label className="mt-3 block rounded-[16px] border border-[rgba(180,138,85,0.42)] bg-white/70 px-3 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--color-gold)]">{isEnglish ? 'Guests' : 'Personas'}</span>
          <input type="number" min={1} max={40} value={people} onChange={(event) => setPeople(Number(event.target.value))} className="mt-2 w-full bg-transparent text-[13px] outline-none" />
        </label>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={isEnglish ? 'Occasion or special request' : 'Ocasión o solicitud especial'} className="mt-3 min-h-24 w-full rounded-[16px] border border-[rgba(180,138,85,0.42)] bg-white/70 px-3 py-3 text-[13px] text-[var(--color-ink)] outline-none" />
        <div className="mt-3 rounded-[16px] border border-[rgba(180,138,85,0.32)] bg-[rgba(247,242,234,0.74)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">{isEnglish ? 'Terms' : 'Condiciones'}</p>
          <h3 className="mt-1 text-[15px] font-semibold text-[var(--color-ink)]">{restaurantContractTerms.title}</h3>
          <ul className="mt-2 grid gap-2 text-[11px] leading-4 text-[var(--color-muted)]">
            {restaurantContractTerms.terms.map((term) => <li key={term} className="rounded-[12px] bg-white/66 px-3 py-2">{term}</li>)}
          </ul>
          {restaurantContractTerms.requiresAcceptance ? (
            <button
              type="button"
              onClick={() => setContractAccepted((current) => !current)}
              className={`mt-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-[14px] px-3 text-left text-[12px] font-semibold transition ${contractAccepted ? 'bg-[var(--color-burgundy)] text-white' : 'bg-white/72 text-[var(--color-ink)] shadow-[inset_0_0_0_1px_rgba(180,138,85,0.22)]'}`}
            >
              <span className="min-w-0 break-words">{restaurantContractTerms.confirmationMessage}</span>
              <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${contractAccepted ? 'bg-white/18 text-white' : 'bg-[rgba(37,47,55,0.08)] text-[var(--color-muted)]'}`}>
                {contractAccepted ? <Check size={14} /> : null}
              </span>
            </button>
          ) : null}
        </div>
        {!canRequest && selectedRestaurantRecord ? <p className="mt-3 text-[12px] leading-5 text-[var(--color-muted)]">{isEnglish ? 'This restaurant does not have available request times yet.' : 'Este restaurante aún no tiene horarios disponibles para solicitar.'}</p> : null}
        <button type="button" onClick={submit} disabled={submitting || !canRequest} className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--color-burgundy)] px-5 text-[14px] font-semibold text-white disabled:opacity-60">
          {submitting ? <Loader2 className="animate-spin" size={18} /> : (isEnglish ? 'Request table' : 'Solicitar mesa')}
        </button>
        {message ? <p className="mt-3 text-[12px] leading-5 text-[var(--color-burgundy)]">{message}</p> : null}
      </section>

      {directionsRestaurant ? (
        <OfficialDirectionsSheet
          poi={officialRestaurantPoi(directionsRestaurant)}
          displayName={directionsRestaurant.name}
          onClose={() => setDirectionsSlug('')}
        />
      ) : null}
    </div>
  )
}
