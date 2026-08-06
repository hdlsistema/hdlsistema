import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Award, Grape, MapPin, Thermometer, Wine } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { publicContentClient, type ContentRecord } from '../../../services/content.service'
import { customerClient } from '../../../services/customer.service'
import {
  AppSectionHeader,
  AppToast,
  BackButton,
  EmptyState,
  ErrorState,
  ImageFallback,
  LoadingState,
  PriceBlock,
  PrimaryButton,
  QuantitySelector,
  StatusBadge,
} from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { formatCurrency, imageField, numberField, textField } from '../../utils/publicContent'

export function WineDetailScreen() {
  const { wineId } = useParams()
  const { t, locale } = useAppPreferences()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [wine, setWine] = useState<ContentRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    if (!wineId) {
      setWine(null)
      setError(t('app.wineNotFound'))
      setLoading(false)
      return
    }

    publicContentClient
      .getBySlug('wines', wineId, locale)
      .then((response) => {
        if (active) setWine(response.data)
      })
      .catch(() => {
        if (active) {
          setWine(null)
          setError(t('app.wineNotFound'))
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [locale, t, wineId])

  if (loading) return <LoadingState label={t('app.premium.wines.loading')} />
  if (error || !wine) return <ErrorState message={error ?? t('app.wineNotFound')} />

  const wineName = textField(wine, 'name', t('app.nav.store'))
  const wineSubtitle = textField(wine, 'subtitle') || textField(wine, 'origin') || t('app.premium.wines.detailEyebrow')
  const wineVarietal = textField(wine, 'grape_variety')
  const wineVintage = textField(wine, 'vintage')
  const price = numberField(wine, 'price')
  const stockControlled = Boolean(wine.stock_control_enabled)
  const soldOut = stockControlled && numberField(wine, 'stock_quantity') <= 0

  const addToCart = async () => {
    if (!session?.access_token) {
      navigate('/app/login')
      return
    }
    if (adding || soldOut) return
    setAdding(true)
    setMessage('')
    try {
      await customerClient.addCartItem(session.access_token, {
        itemType: 'wine',
        itemId: wine.id,
        quantity,
        idempotencyKey: `cart-detail-${wine.id}-${Date.now()}`,
      })
      setMessage(t('app.premium.addCartSuccess'))
    } catch {
      setMessage(t('app.premium.addCartError'))
    } finally {
      setAdding(false)
    }
  }

  const facts = [
    { icon: Grape, label: t('app.premium.wines.grape'), value: wineVarietal || t('app.premium.informationSoon') },
    { icon: Award, label: t('app.premium.wines.vintage'), value: wineVintage || t('app.premium.informationSoon') },
    { icon: MapPin, label: t('app.location'), value: textField(wine, 'origin') || t('app.premium.informationSoon') },
    { icon: Thermometer, label: t('app.premium.wines.service'), value: textField(wine, 'serving_temperature') || t('app.premium.informationSoon') },
  ]

  return (
    <div className="space-y-6 pb-2">
      <BackButton label={t('app.premium.back')} />

      <section className="overflow-hidden rounded-[1.35rem] bg-[rgba(255,250,242,0.92)] shadow-[var(--shadow-float)]">
        <div className="relative flex min-h-[330px] items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#fff7eb,#ead5bd)] p-6">
          <span className="absolute left-4 top-4 z-10">
            <StatusBadge tone={soldOut ? 'danger' : 'success'}>
              {soldOut ? t('app.premium.soldOut') : t('app.premium.available')}
            </StatusBadge>
          </span>
          <ImageFallback
            src={imageField(wine, '/Logo-HDL-2.svg')}
            alt={wineName}
            contain
            className="max-h-[285px] w-auto drop-shadow-[0_24px_20px_rgba(61,28,17,0.22)]"
          />
        </div>
        <div className="p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">{wineSubtitle}</p>
          <h1 className="mt-2 break-words text-[2.45rem] leading-[0.88] text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            {wineName}
          </h1>
          <p className="mt-3 text-[12px] leading-5 text-[var(--color-muted)]">
            {[wineVarietal, wineVintage].filter(Boolean).join(' · ') || t('app.premium.contentPreparing')}
          </p>

          <div className="mt-5 flex items-end justify-between gap-4">
            <PriceBlock
              label={t('app.premium.wines.price')}
              value={price > 0 ? formatCurrency(price, locale) : t('app.premium.pricePending')}
              pending={price <= 0}
            />
            <QuantitySelector
              value={quantity}
              onChange={setQuantity}
              decreaseLabel={t('app.premium.decreaseQuantity')}
              increaseLabel={t('app.premium.increaseQuantity')}
            />
          </div>

          <div className="mt-5">
            <PrimaryButton onClick={addToCart} disabled={adding || soldOut}>
              <Wine size={16} />
              {soldOut ? t('app.premium.soldOut') : adding ? t('app.premium.adding') : t('app.premium.addToCart')}
            </PrimaryButton>
            <div className="mt-3">
              <AppToast message={message} tone={message.includes('No ') || message.includes('Could') ? 'danger' : 'success'} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {facts.map((item) => {
          const Icon = item.icon
          return (
            <article key={item.label} className="min-w-0 rounded-[1.05rem] bg-[rgba(255,250,242,0.82)] p-4 shadow-[var(--shadow-card)]">
              <Icon size={17} className="text-[var(--color-burgundy)]" />
              <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--color-gold)]">{item.label}</p>
              <p className="mt-1 break-words text-[12px] font-semibold leading-4 text-[var(--color-ink)]">{item.value}</p>
            </article>
          )
        })}
      </section>

      <section className="space-y-3">
        <AppSectionHeader eyebrow={t('app.premium.wines.tasting')} title={t('app.premium.wines.tasting')} />
        <article className="rounded-[1.15rem] bg-[rgba(255,250,242,0.82)] p-5 text-[13px] leading-6 text-[var(--color-muted)] shadow-[var(--shadow-card)]">
          {textField(wine, 'tasting_notes') || textField(wine, 'description') || t('app.premium.contentPreparing')}
        </article>
      </section>

      {textField(wine, 'pairing_notes') ? (
        <section className="space-y-3">
          <AppSectionHeader eyebrow={t('app.premium.wines.pairing')} title={t('app.premium.wines.pairing')} />
          <article className="rounded-[1.15rem] bg-[rgba(255,250,242,0.82)] p-5 text-[13px] leading-6 text-[var(--color-muted)] shadow-[var(--shadow-card)]">
            {textField(wine, 'pairing_notes')}
          </article>
        </section>
      ) : (
        <EmptyState title={t('app.premium.wines.pairing')} description={t('app.premium.contentPreparing')} />
      )}
    </div>
  )
}
