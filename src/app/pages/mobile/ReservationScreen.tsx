import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CalendarDays, Clock3, Minus, Plus, RefreshCw, Users } from 'lucide-react'
import { PrimaryButton, SectionHeading } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicContent } from '../../hooks/usePublicContent'
import { contentRouteId, formatCurrency, imageField, numberField, textField } from '../../utils/publicContent'
import { useAuth } from '../../../contexts/AuthContext'
import { customerClient, type CustomerAvailabilitySlot, type CustomerReservation } from '../../../services/customer.service'

function normalizeSlot(slot: CustomerAvailabilitySlot) {
  return {
    id: slot.id,
    experienceId: slot.experienceId ?? slot.experience_id ?? '',
    experienceTitle: slot.experienceTitle ?? slot.experience_title ?? 'Experiencia',
    experienceSlug: slot.experienceSlug ?? slot.experience_slug ?? '',
    location: slot.location ?? null,
    durationMinutes: slot.durationMinutes ?? slot.duration_minutes ?? null,
    coverImageUrl: slot.coverImageUrl ?? slot.cover_image_url ?? null,
    startAt: slot.startAt ?? slot.start_at ?? '',
    endAt: slot.endAt ?? slot.end_at ?? '',
    available: Number(slot.available ?? 0),
    price: Number(slot.price ?? 0),
    isBookable: Boolean(slot.isBookable ?? slot.is_bookable ?? true),
  }
}

function formatDateTime(value: string | null | undefined, locale: string, fallback: string) {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function makeIdempotencyKey(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function ReservationScreen() {
  const { t, locale, language } = useAppPreferences()
  const { session } = useAuth()
  const location = useLocation()
  const requestedExperienceId = (location.state as { experienceId?: string } | null)?.experienceId
  const { records: experiences, loading, error, retry } = usePublicContent('experiences')
  const [selectedExperienceId, setSelectedExperienceId] = useState('')
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [people, setPeople] = useState(2)
  const [notes, setNotes] = useState('')
  const [slots, setSlots] = useState<ReturnType<typeof normalizeSlot>[]>([])
  const [reservations, setReservations] = useState<CustomerReservation[]>([])
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [loadingReservations, setLoadingReservations] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [operationError, setOperationError] = useState('')

  const featuredExperience =
    experiences.find((experience) => contentRouteId(experience) === requestedExperienceId || experience.id === requestedExperienceId) ?? experiences[0]

  useEffect(() => {
    if (featuredExperience && !selectedExperienceId) {
      setSelectedExperienceId(String(featuredExperience.id))
    }
  }, [featuredExperience, selectedExperienceId])

  const token = session?.access_token

  const loadSlots = useCallback(async () => {
    if (!token) return
    setLoadingSlots(true)
    setOperationError('')
    try {
      const response = await customerClient.availability(token, selectedExperienceId ? { experienceId: selectedExperienceId } : undefined)
      const nextSlots = response.data.map(normalizeSlot)
      setSlots(nextSlots)
      setSelectedSlotId((current) => current && nextSlots.some((slot) => slot.id === current) ? current : nextSlots[0]?.id ?? '')
    } catch {
      setSlots([])
      setOperationError(t('app.premium.reservation.availabilityError'))
    } finally {
      setLoadingSlots(false)
    }
  }, [selectedExperienceId, t, token])

  const loadReservations = useCallback(async () => {
    if (!token) return
    setLoadingReservations(true)
    try {
      const response = await customerClient.reservations(token, { perPage: 20 })
      setReservations(response.data)
    } catch {
      setReservations([])
    } finally {
      setLoadingReservations(false)
    }
  }, [token])

  useEffect(() => {
    void loadSlots()
  }, [loadSlots])

  useEffect(() => {
    void loadReservations()
  }, [loadReservations])

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.id === selectedSlotId) ?? null,
    [selectedSlotId, slots],
  )

  const createReservation = async () => {
    if (!token || !selectedSlot) return
    setSubmitting(true)
    setMessage('')
    setOperationError('')
    try {
      await customerClient.createReservation(token, {
        experienceSlotId: selectedSlot.id,
        peopleCount: people,
        customerNotes: notes || null,
        language,
        idempotencyKey: makeIdempotencyKey('reservation'),
      })
      setMessage(t('app.premium.reservation.created'))
      setNotes('')
      await Promise.all([loadSlots(), loadReservations()])
    } catch (err) {
      const status = err && typeof err === 'object' && 'status' in err ? Number((err as { status?: unknown }).status) : 0
      setOperationError(status === 409
        ? t('app.premium.reservation.capacityConflict')
        : t('app.premium.reservation.createError'))
    } finally {
      setSubmitting(false)
    }
  }

  const cancelReservation = async (reservation: CustomerReservation) => {
    if (!token) return
    setSubmitting(true)
    setOperationError('')
    try {
      await customerClient.cancelReservation(token, reservation.id, t('app.premium.reservation.cancel'))
      setMessage(t('app.premium.reservation.cancelled'))
      await Promise.all([loadSlots(), loadReservations()])
    } catch {
      setOperationError(t('app.premium.reservation.cancelError'))
    } finally {
      setSubmitting(false)
    }
  }

  const rescheduleReservation = async (reservation: CustomerReservation, slotId: string) => {
    if (!token || !slotId) return
    setSubmitting(true)
    setOperationError('')
    try {
      await customerClient.rescheduleReservation(token, reservation.id, {
        experienceSlotId: slotId,
        idempotencyKey: makeIdempotencyKey('reschedule'),
      })
      setMessage(t('app.premium.reservation.rescheduled'))
      await Promise.all([loadSlots(), loadReservations()])
    } catch {
      setOperationError(t('app.premium.reservation.rescheduleError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-page space-y-6">
      <section className="space-y-3">
        <SectionHeading eyebrow={t('app.premium.reservation.eyebrow')} title={t('app.premium.reservation.title')} />
        <p className="text-[13px] leading-5 text-[var(--color-muted)]">
          {t('app.premium.reservation.subtitle')}
        </p>
      </section>

      <section className="overflow-hidden rounded-[1.35rem] border border-[rgba(220,202,181,0.78)] bg-white shadow-[0_18px_38px_rgba(74,32,28,0.08)]">
        {loading ? (
          <div className="p-5 text-[12px] text-[var(--color-muted)]">{t('app.premium.reservation.loadingExperiences')}</div>
        ) : error ? (
          <div className="p-5 text-[12px] text-[var(--color-alert)]">
            <p>{error}</p>
            <button type="button" onClick={retry} className="mt-3 font-semibold text-[var(--color-burgundy)]">{t('common.retry')}</button>
          </div>
        ) : featuredExperience ? (
          <>
            <div className="relative min-h-[170px] overflow-hidden">
              <img src={imageField(featuredExperience, '/turismo.jpeg')} alt={textField(featuredExperience, 'title', 'Experiencia')} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(40,14,17,0.78))]" />
              <div className="absolute inset-x-0 bottom-0 p-[var(--app-pad)] text-white">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#f0cf92]">{t('app.premium.reservation.selectedExperience')}</p>
                <h2 className="mt-1 text-[clamp(24px,7vw,31px)] leading-none" style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}>
                  {textField(featuredExperience, 'title', 'Experiencia')}
                </h2>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <select
                value={selectedExperienceId}
                onChange={(event) => setSelectedExperienceId(event.target.value)}
                className="w-full rounded-[1rem] border border-[#dccab5] bg-white px-4 py-3 text-[13px] text-[var(--color-ink)] outline-none"
              >
                {experiences.map((experience) => (
                  <option key={experience.id} value={String(experience.id)}>{textField(experience, 'title', 'Experiencia')}</option>
                ))}
              </select>
              <p className="text-[12px] leading-5 text-[var(--color-muted)]">
                {textField(featuredExperience, 'short_description') || textField(featuredExperience, 'description')}
              </p>
              <p className="text-[14px] font-semibold text-[var(--color-burgundy)]">
                {formatCurrency(numberField(featuredExperience, 'base_price'), locale)} {t('app.premium.reservation.perPerson')}
              </p>
            </div>
          </>
        ) : (
          <div className="p-5 text-[12px] text-[var(--color-muted)]">{t('app.premium.reservation.noExperiences')}</div>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeading title={t('app.premium.reservation.chooseSlot')} />
        {loadingSlots ? (
          <div className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">{t('app.premium.reservation.loadingAvailability')}</div>
        ) : slots.length === 0 ? (
          <div className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">
            {t('app.premium.reservation.noSlots')}
          </div>
        ) : (
          <div className="grid gap-3">
            {slots.slice(0, 8).map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlotId(slot.id)}
                className={`rounded-[1.1rem] border p-4 text-left text-[12px] transition ${selectedSlotId === slot.id ? 'border-[var(--color-burgundy)] bg-[#fff4f6]' : 'border-[rgba(220,202,181,0.78)] bg-white'}`}
              >
                <span className="flex items-center gap-2 font-semibold text-[var(--color-ink)]"><Clock3 size={14} />{formatDateTime(slot.startAt, locale, t('common.toBeConfirmed'))}</span>
                <span className="mt-2 block text-[11px] text-[var(--color-muted)]">{slot.available} {t('app.premium.reservation.spotsAvailable')} · {formatCurrency(slot.price, locale)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f8eee5] text-[var(--color-burgundy)]"><Users size={18} /></span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[var(--color-ink)]">{t('app.premium.reservation.guests')}</p>
              <p className="mt-1 text-[11px] leading-4 text-[var(--color-muted)]">{t('app.premium.reservation.guestsHelp')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-[rgba(104,13,36,0.13)] bg-[#fffaf5] p-1">
            <button type="button" aria-label={t('app.premium.decreaseQuantity')} onClick={() => setPeople((current) => Math.max(1, current - 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-burgundy)]"><Minus size={14} /></button>
            <span className="w-6 text-center text-[12px] font-semibold text-[var(--color-ink)]">{people}</span>
            <button type="button" aria-label={t('app.premium.increaseQuantity')} onClick={() => setPeople((current) => Math.min(20, current + 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white"><Plus size={14} /></button>
          </div>
        </div>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={1000}
          rows={3}
          placeholder={t('app.premium.reservation.notePlaceholder')}
          className="mt-4 w-full min-w-0 rounded-[1rem] border border-[#dccab5] bg-white px-4 py-3 text-[14px] outline-none"
        />
      </section>

      {selectedSlot ? (
        <section className="rounded-[1.3rem] bg-[linear-gradient(145deg,#fffaf5,#f2dfca)] p-5 shadow-[0_16px_34px_rgba(74,32,28,0.07)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">{t('app.premium.reservation.summary')}</p>
            <div className="mt-4 space-y-2 text-[12px]">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[var(--color-muted)]">{t('app.premium.reservation.date')}</span><span className="text-right font-semibold text-[var(--color-ink)]">{formatDateTime(selectedSlot.startAt, locale, t('common.toBeConfirmed'))}</span></div>
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[var(--color-muted)]">{t('app.premium.reservation.guests')}</span><span className="font-semibold text-[var(--color-ink)]">{people}</span></div>
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[var(--color-muted)]">Total</span><span className="font-semibold text-[var(--color-ink)]">{formatCurrency(selectedSlot.price * people, locale)}</span></div>
          </div>
        </section>
      ) : null}

      {message ? <p className="rounded-[1rem] bg-[#edf5ed] p-3 text-[12px] text-[#3f6f4b]">{message}</p> : null}
      {operationError ? <p className="rounded-[1rem] bg-[rgba(157,71,63,0.08)] p-3 text-[12px] text-[var(--color-alert)]">{operationError}</p> : null}

      <PrimaryButton onClick={createReservation} disabled={!selectedSlot || submitting}>
        <CalendarDays size={16} />
        {submitting ? t('app.premium.reservation.processing') : t('app.premium.reservation.confirm')}
      </PrimaryButton>

      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <SectionHeading eyebrow={t('app.premium.reservation.myBookings')} title={t('app.premium.reservation.yourBookings')} />
          <button type="button" onClick={() => void loadReservations()} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--color-burgundy)]" aria-label={t('app.premium.reservation.refresh')}>
            <RefreshCw size={16} />
          </button>
        </div>
        {loadingReservations ? (
          <div className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">{t('app.premium.reservation.loadingReservations')}</div>
        ) : reservations.length === 0 ? (
          <div className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">{t('app.premium.reservation.noReservations')}</div>
        ) : (
          <div className="grid gap-3">
            {reservations.map((reservation) => (
              <article key={reservation.id} className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">{reservation.reservationNumber}</p>
                    <h3 className="mt-1 text-[16px] font-semibold leading-tight text-[var(--color-ink)]">{reservation.experienceTitle}</h3>
                    <p className="mt-1 text-[11px] text-[var(--color-muted)]">{formatDateTime(reservation.startAt, locale, t('common.toBeConfirmed'))}</p>
                  </div>
                  <span className="rounded-full bg-[#f8eee5] px-3 py-1 text-[10px] font-semibold text-[var(--color-burgundy)]">{reservation.status}</span>
                </div>
                {['pending', 'confirmed'].includes(reservation.status) ? (
                  <div className="mt-4 grid gap-2">
                    <select
                      defaultValue=""
                      onChange={(event) => event.target.value && void rescheduleReservation(reservation, event.target.value)}
                      className="w-full rounded-[0.9rem] border border-[#dccab5] bg-white px-3 py-2 text-[12px] outline-none"
                      disabled={submitting}
                    >
                      <option value="">{t('app.premium.reservation.rescheduleTo')}</option>
                      {slots.filter((slot) => slot.id !== reservation.slotId).slice(0, 8).map((slot) => (
                        <option key={slot.id} value={slot.id}>{formatDateTime(slot.startAt, locale, t('common.toBeConfirmed'))} · {slot.available}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => void cancelReservation(reservation)} disabled={submitting} className="rounded-[0.9rem] border border-[rgba(157,71,63,0.28)] px-3 py-2 text-[12px] font-semibold text-[var(--color-alert)]">
                      {t('app.premium.reservation.cancel')}
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
