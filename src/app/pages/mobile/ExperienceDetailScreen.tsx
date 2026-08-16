import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarDays, Clock3, MapPin, Users } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { publicContentClient, type ContentRecord } from '../../../services/content.service'
import { customerClient, type CustomerAvailabilitySlot } from '../../../services/customer.service'
import {
  AppSectionHeader,
  BackButton,
  EmptyState,
  ErrorState,
  HeroEditorial,
  LoadingState,
  PrimaryButton,
} from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { appPath } from '../../utils/appRoutes'
import { formatCurrency, formatPublicDate, formatPublicTimeRange, galleryImages, imageField, numberField, textField } from '../../utils/publicContent'

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
  const { t, locale } = useAppPreferences()
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
      setError(t('app.experienceNotFound'))
      setLoading(false)
      return
    }
    publicContentClient
      .getBySlug('experiences', experienceId, locale)
      .then((response) => {
        if (active) setExperience(response.data)
      })
      .catch(() => {
        if (active) setError(t('app.experienceUnavailable'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [experienceId, locale, t])

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
    return summary.split('.').map((item) => item.trim()).filter(Boolean).slice(0, 4)
  }, [experience])

  if (loading) return <div className="app-page"><LoadingState label={t('app.loadingExperience')} /></div>
  if (error || !experience) return <div className="app-page"><ErrorState message={error ?? t('app.experienceUnavailable')} /></div>

  const title = textField(experience, 'title', t('app.nav.experiences'))
  const description = textField(experience, 'description') || textField(experience, 'short_description') || t('app.premium.informationSoon')
  const durationMinutes = numberField(experience, 'duration_minutes')
  const capacity = numberField(experience, 'capacity')
  const price = numberField(experience, 'base_price')
  const location = textField(experience, 'location', 'Hacienda de Letras')
  const gallery = galleryImages(experience, 'experience_images', imageField(experience, ''))

  return (
    <div className="ipad-experience-detail app-page space-y-6">
      <BackButton label={t('app.premium.back')} />
      <HeroEditorial
        eyebrow={t('app.publishedExperience')}
        title={title}
        subtitle={description}
        image={imageField(experience, '')}
        alt={title}
      />

      <section className="grid grid-cols-[repeat(auto-fit,minmax(136px,1fr))] gap-3">
        {[
          { icon: Clock3, label: t('app.duration'), value: durationMinutes > 0 ? `${durationMinutes} ${t('app.minutes')}` : t('app.premium.informationSoon') },
          { icon: Users, label: t('app.capacity'), value: capacity > 0 ? `${capacity} ${t('app.people')}` : t('app.premium.availabilityPending') },
          { icon: MapPin, label: t('app.location'), value: location },
          { icon: CalendarDays, label: t('app.from'), value: price > 0 ? formatCurrency(price, locale) : t('app.premium.pricePending') },
        ].map((item) => {
          const Icon = item.icon
          return (
            <article key={item.label} className="rounded-[1.05rem] bg-[rgba(255,250,242,0.84)] p-4 shadow-[var(--shadow-card)]">
              <Icon size={17} className="text-[var(--color-burgundy)]" />
              <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--color-gold)]">{item.label}</p>
              <p className="mt-1 break-words text-[12px] font-semibold leading-4 text-[var(--color-ink)]">{item.value}</p>
            </article>
          )
        })}
      </section>

      <section className="space-y-3">
        <AppSectionHeader eyebrow={t('app.publishedDetails')} title={t('app.publishedDetails')} />
        {includedItems.length ? (
          <article className="rounded-[1.15rem] bg-[rgba(255,250,242,0.84)] p-5 text-[13px] leading-6 text-[var(--color-muted)] shadow-[var(--shadow-card)]">
            {includedItems.map((item) => <p key={item}>{item}</p>)}
          </article>
        ) : (
          <EmptyState title={t('app.premium.contentPreparing')} description={t('app.premium.informationSoon')} />
        )}
      </section>

      {gallery.length > 1 ? (
        <section className="space-y-3">
          <AppSectionHeader eyebrow={t('app.publishedDetails')} title={t('app.gallery')} />
          <div className="app-scrollbar-none flex gap-3 overflow-x-auto pb-1">
            {gallery.map((image) => (
              <img
                key={image.id}
                src={image.url}
                alt={image.alt || title}
                className="h-28 w-40 shrink-0 rounded-[1rem] object-cover shadow-[var(--shadow-card)]"
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <AppSectionHeader eyebrow={t('app.liveAvailability')} title={t('app.liveAvailability')} />
        {!session ? (
          <EmptyState title={t('common.error.session_required')} description={t('app.signInForAvailability')} />
        ) : loadingSlots ? (
          <LoadingState label={t('app.loadingSlots')} />
        ) : slots.length === 0 ? (
          <EmptyState title={t('app.premium.availabilityPending')} description={t('app.noSlots')} />
        ) : (
          <div className="grid gap-2">
            {slots.slice(0, 4).map((slot) => (
              <article key={slot.id} className="rounded-[1rem] bg-[rgba(255,250,242,0.84)] p-4 text-[12px] text-[var(--color-ink)] shadow-[var(--shadow-card)]">
                <p className="font-semibold">{formatPublicDate(slot.startAt, locale, t('common.datePending'))} · {formatPublicTimeRange(slot.startAt, slot.endAt, locale)}</p>
                <p className="mt-1 text-[11px] text-[var(--color-muted)]">{slot.available} {t('app.spots')} · {slot.price > 0 ? formatCurrency(slot.price, locale) : t('app.premium.pricePending')}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <PrimaryButton to={appPath('/reservacion')}>
        <CalendarDays size={16} />
        {t('app.reserveLive')}
      </PrimaryButton>
    </div>
  )
}
