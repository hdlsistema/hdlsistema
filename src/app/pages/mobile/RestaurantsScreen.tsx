import { useEffect, useMemo, useState } from 'react'
import { Loader2, MapPin, Navigation } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { customerCommercialClient } from '../../../services/commercial.service'
import { EmptyState, ErrorState, StatusBadge } from '../../components/mobile/PremiumMobileUi'
import { CrystalDateField } from '../../components/shared/CrystalDateField'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicCommercialServices } from '../../hooks/usePublicCommercialServices'
import { OfficialDirectionsSheet } from '../../components/mobile/OfficialDirectionsSheet'
import { officialRestaurantPoi } from '../../utils/officialLocations'

function nextIdempotencyKey(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function RestaurantsScreen() {
  const { locale, isEnglish } = useAppPreferences()
  const { session, isAuthenticated } = useAuth()
  const [selected, setSelected] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [people, setPeople] = useState(2)
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [directionsSlug, setDirectionsSlug] = useState('')
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

  useEffect(() => {
    if (time && !restaurantTimes.some((option) => option.value === time)) setTime('')
  }, [restaurantTimes, time])

  const submit = async () => {
    if (!isAuthenticated) {
      setMessage(isEnglish ? 'Sign in to request a booking.' : 'Inicia sesión para solicitar una reservación.')
      return
    }
    if (!selectedRestaurant || !date || !time || !canRequest) {
      setMessage(isEnglish ? 'Select a restaurant, date and time.' : 'Selecciona restaurante, fecha y horario.')
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
        language: locale.startsWith('en') ? 'en' : 'es',
        idempotencyKey: nextIdempotencyKey('restaurant'),
      })
      setMessage(isEnglish ? 'Request received. Our team will confirm your table.' : 'Solicitud registrada. El equipo confirmará tu mesa.')
    } catch {
      setMessage(isEnglish ? 'We could not submit the request.' : 'No fue posible registrar la solicitud.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5 px-[var(--app-pad)] pb-8 pt-5">
      <header>
        <p className="text-[10px] font-semibold uppercase text-[#B88A4A]">{isEnglish ? 'Dining' : 'Gastronomía'}</p>
        <h1 className="mt-1 text-[clamp(26px,7vw,34px)] font-medium leading-none text-[#2D1811]" style={{ fontFamily: 'var(--font-display)' }}>
          {isEnglish ? 'Restaurants' : 'Restaurantes'}
        </h1>
        <p className="mt-3 text-[13px] leading-5 text-[#776053]">{isEnglish ? 'Bookings are subject to operational confirmation.' : 'Reservaciones sujetas a confirmación operativa.'}</p>
      </header>

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-[18px] border border-[#EBDCC8] bg-[#FFF9F1] p-5 text-[#690D2B]">{isEnglish ? 'Loading...' : 'Cargando...'}</div>
        ) : error ? (
          <ErrorState message={error} retryLabel={isEnglish ? 'Try again' : 'Reintentar'} onRetry={retry} />
        ) : restaurants.length === 0 ? (
          <EmptyState title={isEnglish ? 'No restaurants published' : 'Sin restaurantes publicados'} description={isEnglish ? 'Hacienda de Letras will publish restaurants once they are available.' : 'Hacienda de Letras publicará restaurantes desde el Centro de Control.'} />
        ) : restaurants.map((item) => (
          <article key={item.id} className={`w-full overflow-hidden rounded-[18px] border ${selectedRestaurant === item.id ? 'border-[#8A1238] bg-[#FFF5EA]' : 'border-[#EBDCC8] bg-[#FFFDF8]'}`}>
            <button type="button" onClick={() => setSelected(item.id)} className="block w-full text-left">
              {item.coverImageUrl ? (
                <span className="block h-40 bg-[#2D1811]">
                  <img src={item.coverImageUrl} alt={item.name} className="h-full w-full object-cover" />
                </span>
              ) : null}
              <span className="flex items-start justify-between gap-3 p-4 pb-3">
                <span>
                  <span className="block text-[20px] leading-none text-[#2D1811]" style={{ fontFamily: 'var(--font-display)' }}>{item.name}</span>
                  <span className="mt-2 flex items-start gap-2 text-[12px] leading-5 text-[#776053]"><MapPin size={14} className="mt-0.5 shrink-0" />{item.address || (isEnglish ? 'Details pending confirmation' : 'Datos pendientes de confirmación')}</span>
                </span>
                <StatusBadge>{item.reservationEnabled ? (isEnglish ? 'Bookable' : 'Reservable') : (isEnglish ? 'Draft' : 'Borrador')}</StatusBadge>
              </span>
            </button>
            <div className="px-4 pb-4">
              <button type="button" onClick={() => setDirectionsSlug(item.slug)} className="app-burgundy-cta flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#7d1435,#57071d)] px-4 text-[12px] font-semibold text-white">
                <Navigation size={15} />
                {isEnglish ? 'How to get there' : 'Cómo llegar'}
              </button>
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-[20px] border border-[#EBDCC8] bg-[#FFF9F1] p-4">
        <div className="grid grid-cols-2 gap-3">
          <CrystalDateField value={date} onChange={setDate} label={isEnglish ? 'Date' : 'Fecha'} placeholder={isEnglish ? 'Choose date' : 'Elegir fecha'} buttonClassName="rounded-[16px] border-[#E2CCAE] bg-white/70 text-[12px]" />
          <div>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{isEnglish ? 'Time' : 'Hora'}</span>
            <CrystalSelect value={time} onChange={setTime} disabled={!canRequest} options={[{ value: '', label: restaurantTimes.length ? (isEnglish ? 'Choose time' : 'Elegir hora') : (isEnglish ? 'No configured times' : 'Sin horarios configurados') }, ...restaurantTimes]} buttonClassName="rounded-[16px] border-[#E2CCAE] bg-white/70 text-[12px]" />
          </div>
        </div>
        <label className="mt-3 block rounded-[16px] border border-[#E2CCAE] bg-white/70 px-3 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#B88A4A]">{isEnglish ? 'Guests' : 'Personas'}</span>
          <input type="number" min={1} max={40} value={people} onChange={(event) => setPeople(Number(event.target.value))} className="mt-2 w-full bg-transparent text-[13px] outline-none" />
        </label>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={isEnglish ? 'Occasion or special request' : 'Ocasión o solicitud especial'} className="mt-3 min-h-24 w-full rounded-[16px] border border-[#E2CCAE] bg-white/70 px-3 py-3 text-[13px] text-[#2D1811] outline-none" />
        {!canRequest && selectedRestaurantRecord ? <p className="mt-3 text-[12px] leading-5 text-[#776053]">{isEnglish ? 'This restaurant has no request times published from Control Center.' : 'Este restaurante aún no tiene horarios de solicitud publicados desde el Centro de Control.'}</p> : null}
        <button type="button" onClick={submit} disabled={submitting || !canRequest} className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full bg-[#8A1238] px-5 text-[14px] font-semibold text-white disabled:opacity-60">
          {submitting ? <Loader2 className="animate-spin" size={18} /> : (isEnglish ? 'Request table' : 'Solicitar mesa')}
        </button>
        {message ? <p className="mt-3 text-[12px] leading-5 text-[#690D2B]">{message}</p> : null}
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
