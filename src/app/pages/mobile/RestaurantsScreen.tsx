import { useEffect, useState } from 'react'
import { CalendarDays, Clock, Loader2, MapPin } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { customerCommercialClient, publicCommercialClient, type PublicCommercialItem } from '../../../services/commercial.service'
import { StatusBadge } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'

function nextIdempotencyKey(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function RestaurantsScreen() {
  const { locale } = useAppPreferences()
  const { session, isAuthenticated } = useAuth()
  const [restaurants, setRestaurants] = useState<PublicCommercialItem[]>([])
  const [selected, setSelected] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [people, setPeople] = useState(2)
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    publicCommercialClient.services()
      .then((response) => {
        if (!active) return
        setRestaurants(response.data.restaurants)
        setSelected(response.data.restaurants[0]?.id ?? '')
      })
      .catch(() => {
        if (active) setMessage('No fue posible cargar restaurantes.')
      })
    return () => { active = false }
  }, [])

  const submit = async () => {
    if (!isAuthenticated) {
      setMessage('Inicia sesión para solicitar una reservación.')
      return
    }
    if (!selected || !date || !time) {
      setMessage('Selecciona restaurante, fecha y horario.')
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      await customerCommercialClient.createRestaurantReservation(session?.access_token, {
        restaurantLocationId: selected,
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
        {restaurants.map((item) => (
          <button key={item.id} type="button" onClick={() => setSelected(item.id)} className={`w-full rounded-[18px] border p-4 text-left ${selected === item.id ? 'border-[#8A1238] bg-[#FFF5EA]' : 'border-[#EBDCC8] bg-[#FFFDF8]'}`}>
            <span className="flex items-start justify-between gap-3">
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
          <label className="rounded-[16px] border border-[#E2CCAE] bg-white/70 px-3 py-3">
            <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#B88A4A]"><CalendarDays size={14} /> Fecha</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 w-full bg-transparent text-[13px] outline-none" />
          </label>
          <label className="rounded-[16px] border border-[#E2CCAE] bg-white/70 px-3 py-3">
            <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#B88A4A]"><Clock size={14} /> Hora</span>
            <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="mt-2 w-full bg-transparent text-[13px] outline-none" />
          </label>
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
