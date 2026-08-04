import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarDays, Clock3, MapPin, Users } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { publicContentClient, type ContentRecord } from '../../../services/content.service'
import { customerClient, type CustomerAvailabilitySlot } from '../../../services/customer.service'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { formatCurrency, formatPublicDate, formatPublicTimeRange, imageField, numberField, textField } from '../../utils/publicContent'

function normalizeSlot(slot: CustomerAvailabilitySlot) {
  return {
    id: slot.id,
    startAt: slot.startAt ?? slot.start_at ?? '',
    endAt: slot.endAt ?? slot.end_at ?? '',
    available: Number(slot.available ?? 0),
    price: Number(slot.price ?? 0),
  }
}

export function ExperienceDetailScreen() {
  const { experienceId } = useParams()
  const { isEnglish } = useAppPreferences()
  const { session } = useAuth()
  const [experience, setExperience] = useState<ContentRecord | null>(null)
  const [slots, setSlots] = useState<ReturnType<typeof normalizeSlot>[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    if (!experienceId) {
      setExperience(null)
      setError(isEnglish ? 'Experience not found.' : 'Experiencia no encontrada.')
      setLoading(false)
      return
    }

    publicContentClient
      .getBySlug('experiences', experienceId, 'es-MX')
      .then((response) => {
        if (active) setExperience(response.data)
      })
      .catch(() => {
        if (!active) return
        setExperience(null)
        setError(isEnglish ? 'Experience not available.' : 'Experiencia no disponible.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [experienceId, isEnglish])

  useEffect(() => {
    let active = true
    const token = session?.access_token

    if (!experience?.id || !token) {
      setSlots([])
      return
    }

    setLoadingSlots(true)
    customerClient
      .availability(token, { experienceId: experience.id })
      .then((response) => {
        if (active) setSlots(response.data.map(normalizeSlot))
      })
      .catch(() => {
        if (active) setSlots([])
      })
      .finally(() => {
        if (active) setLoadingSlots(false)
      })

    return () => {
      active = false
    }
  }, [experience?.id, session?.access_token])

  const includedItems = useMemo(() => {
    const summary = experience ? textField(experience, 'short_description') || textField(experience, 'description') : ''
    return summary
      .split('.')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4)
  }, [experience])

  if (loading) {
    return (
      <div className="rounded-[1.3rem] border border-[rgba(220,202,181,0.78)] bg-white p-6 text-[13px] text-[var(--color-muted)]">
        {isEnglish ? 'Loading experience...' : 'Cargando experiencia...'}
      </div>
    )
  }

  if (error || !experience) {
    return (
      <div className="rounded-[1.3rem] border border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] p-6 text-[13px] text-[var(--color-alert)]">
        {error}
      </div>
    )
  }

  const title = textField(experience, 'title', isEnglish ? 'Experience' : 'Experiencia')
  const description = textField(experience, 'description') || textField(experience, 'short_description')
  const durationMinutes = numberField(experience, 'duration_minutes')
  const capacity = numberField(experience, 'capacity')
  const price = numberField(experience, 'base_price')
  const location = textField(experience, 'location', 'Hacienda de Letras')

  return (
    <div className="space-y-6 pb-3">
      <section className="relative min-h-[340px] overflow-hidden rounded-[1.55rem] shadow-[0_24px_50px_rgba(49,19,19,0.2)]">
        <img src={imageField(experience, '/turismo.jpeg')} alt={title} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(27,8,11,0.05),rgba(27,8,11,0.84))]" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.14] px-3 py-1.5 text-[10px] backdrop-blur-sm">
            <CalendarDays size={12} />
            {isEnglish ? 'Published experience' : 'Experiencia publicada'}
          </span>
          <h1 className="mt-3 text-[2.6rem] leading-[0.88]" style={{ fontFamily: 'var(--font-display)' }}>
            {title}
          </h1>
          <p className="mt-3 text-[13px] leading-5 text-white/[0.82]">{description}</p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {[
          { icon: Clock3, label: isEnglish ? 'Duration' : 'Duración', value: durationMinutes > 0 ? `${durationMinutes} ${isEnglish ? 'minutes' : 'minutos'}` : (isEnglish ? 'To be confirmed' : 'Por confirmar') },
          { icon: Users, label: isEnglish ? 'Capacity' : 'Cupo', value: capacity > 0 ? `${capacity} ${isEnglish ? 'people' : 'personas'}` : (isEnglish ? 'To be confirmed' : 'Por confirmar') },
          { icon: MapPin, label: isEnglish ? 'Location' : 'Ubicación', value: location },
          { icon: CalendarDays, label: isEnglish ? 'From' : 'Desde', value: formatCurrency(price) },
        ].map((item) => {
          const Icon = item.icon
          return (
            <article key={item.label} className="min-w-0 rounded-[1.15rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_12px_28px_rgba(74,32,28,0.05)]">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f7ece2] text-[var(--color-burgundy)]">
                <Icon size={17} />
              </span>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--color-gold)]">{item.label}</p>
              <p className="mt-1 break-words text-[13px] font-semibold leading-5 text-[var(--color-ink)]">{item.value}</p>
            </article>
          )
        })}
      </section>

      {includedItems.length > 0 ? (
        <section className="rounded-[1.3rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 shadow-[0_16px_34px_rgba(74,32,28,0.06)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{isEnglish ? 'Published details' : 'Detalles publicados'}</p>
          <div className="mt-4 space-y-3">
            {includedItems.map((item) => (
              <p key={item} className="text-[13px] leading-5 text-[var(--color-ink)]">{item}</p>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-[1.3rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 shadow-[0_16px_34px_rgba(74,32,28,0.06)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{isEnglish ? 'Live availability' : 'Disponibilidad en vivo'}</p>
        {!session ? (
          <p className="mt-3 text-[12px] leading-5 text-[var(--color-muted)]">
            {isEnglish ? 'Sign in to see customer availability and reserve.' : 'Inicia sesión para consultar disponibilidad customer y reservar.'}
          </p>
        ) : loadingSlots ? (
          <p className="mt-3 text-[12px] text-[var(--color-muted)]">{isEnglish ? 'Loading slots...' : 'Cargando horarios...'}</p>
        ) : slots.length === 0 ? (
          <p className="mt-3 text-[12px] leading-5 text-[var(--color-muted)]">{isEnglish ? 'No slots are available right now.' : 'No hay horarios disponibles por ahora.'}</p>
        ) : (
          <div className="mt-4 grid gap-2">
            {slots.slice(0, 4).map((slot) => (
              <article key={slot.id} className="rounded-[0.95rem] bg-[#fffaf5] p-3 text-[12px] text-[var(--color-ink)]">
                <p className="font-semibold">{formatPublicDate(slot.startAt)} · {formatPublicTimeRange(slot.startAt, slot.endAt)}</p>
                <p className="mt-1 text-[11px] text-[var(--color-muted)]">{slot.available} {isEnglish ? 'spots' : 'lugares'} · {formatCurrency(slot.price)}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <Link
        to="/app/reservacion"
        state={{ experienceId: experience.id, experienceTitle: title }}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[var(--color-burgundy)] px-5 text-[13px] font-bold text-white shadow-[0_13px_26px_rgba(104,17,38,0.2)]"
      >
        <CalendarDays size={16} />
        {isEnglish ? 'Reserve with live availability' : 'Reservar con disponibilidad real'}
      </Link>
    </div>
  )
}
