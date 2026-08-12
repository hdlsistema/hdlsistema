import { useMemo, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { customerCommercialClient } from '../../../services/commercial.service'
import { EmptyState, ErrorState, StatusBadge } from '../../components/mobile/PremiumMobileUi'
import { CrystalDateField } from '../../components/shared/CrystalDateField'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicCommercialServices } from '../../hooks/usePublicCommercialServices'

function nextIdempotencyKey(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const restaurantTimes = ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30']
  .map((value) => ({ value, label: value }))

export function RestaurantsScreen() {
  const { locale } = useAppPreferences()
  const { session, isAuthenticated } = useAuth()
  const [selected, setSelected] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [people, setPeople] = useState(2)
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { services, loading, error, retry } = usePublicCommercialServices()
  const restaurants = useMemo(
    () => services.restaurants.filter((item) => !item.name.toLocaleLowerCase('es-MX').includes('centro')),
    [services.restaurants],
  )
  const selectedRestaurant = selected || restaurants[0]?.id || ''

  const submit = async () => {
    if (!isAuthenticated) {
      setMessage('Inicia sesión para solicitar una reservación.')
      return
    }
    if (!selectedRestaurant || !date || !time) {
      setMessage('Selecciona restaurante, fecha y horario.')
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
      setMessage('Solicitud registrada. El equipo confirmará tu mesa.')
    } catch {
      setMessage('No fue posible registrar la solicitud.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5 px-[var(--app-pad)] pb-8 pt-5">
      <header>
        <p className="text-[10px] font-semibold uppercase text-[#B88A4A]">Gastronomía</p>
        <h1 className="mt-1 text-[clamp(34px,9vw,44px)] leading-none text-[#2D1811]" style={{ fontFamily: 'var(--font-display)' }}>
          Restaurantes
        </h1>
        <p className="mt-3 text-[13px] leading-5 text-[#776053]">Reservaciones sujetas a confirmación operativa.</p>
      </header>

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-[18px] border border-[#EBDCC8] bg-[#FFF9F1] p-5 text-[#690D2B]">Cargando...</div>
        ) : error ? (
          <ErrorState message={error} retryLabel="Reintentar" onRetry={retry} />
        ) : restaurants.length === 0 ? (
          <EmptyState title="Sin restaurantes publicados" description="Hacienda de Letras publicará restaurantes desde el Centro de Control." />
        ) : restaurants.map((item) => (
          <button key={item.id} type="button" onClick={() => setSelected(item.id)} className={`w-full overflow-hidden rounded-[18px] border text-left ${selectedRestaurant === item.id ? 'border-[#8A1238] bg-[#FFF5EA]' : 'border-[#EBDCC8] bg-[#FFFDF8]'}`}>
            {item.coverImageUrl ? (
              <span className="block h-40 bg-[#2D1811]">
                <img src={item.coverImageUrl} alt={item.name} className="h-full w-full object-cover" />
              </span>
            ) : null}
            <span className="flex items-start justify-between gap-3 p-4">
              <span>
                <span className="block text-[20px] leading-none text-[#2D1811]" style={{ fontFamily: 'var(--font-display)' }}>{item.name}</span>
                <span className="mt-2 flex items-start gap-2 text-[12px] leading-5 text-[#776053]"><MapPin size={14} className="mt-0.5" />{item.address || 'Datos pendientes de confirmación'}</span>
              </span>
              <StatusBadge>{item.reservationEnabled ? 'Reservable' : 'Borrador'}</StatusBadge>
            </span>
          </button>
        ))}
      </div>

      <section className="rounded-[20px] border border-[#EBDCC8] bg-[#FFF9F1] p-4">
        <div className="grid grid-cols-2 gap-3">
          <CrystalDateField value={date} onChange={setDate} label="Fecha" placeholder="Elegir fecha" buttonClassName="rounded-[16px] border-[#E2CCAE] bg-white/70 text-[13px]" />
          <div>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">Hora</span>
            <CrystalSelect value={time} onChange={setTime} options={[{ value: '', label: 'Elegir hora' }, ...restaurantTimes]} buttonClassName="rounded-[16px] border-[#E2CCAE] bg-white/70 text-[13px]" />
          </div>
        </div>
        <label className="mt-3 block rounded-[16px] border border-[#E2CCAE] bg-white/70 px-3 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#B88A4A]">Personas</span>
          <input type="number" min={1} max={40} value={people} onChange={(event) => setPeople(Number(event.target.value))} className="mt-2 w-full bg-transparent text-[13px] outline-none" />
        </label>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ocasión o solicitud especial" className="mt-3 min-h-24 w-full rounded-[16px] border border-[#E2CCAE] bg-white/70 px-3 py-3 text-[14px] text-[#2D1811] outline-none" />
        <button type="button" onClick={submit} disabled={submitting} className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full bg-[#8A1238] px-5 text-[14px] font-semibold text-white disabled:opacity-60">
          {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Solicitar mesa'}
        </button>
        {message ? <p className="mt-3 text-[12px] leading-5 text-[#690D2B]">{message}</p> : null}
      </section>
    </div>
  )
}
