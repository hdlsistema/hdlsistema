import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Grape, Thermometer, Utensils, Wine } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { publicContentClient, type ContentRecord } from '../../../services/content.service'
import { customerClient } from '../../../services/customer.service'
import {
  AppToast,
  EditorialImagePlaceholder,
  ErrorState,
  LoadingState,
  PrimaryButton,
  QuantitySelector,
} from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { appPath } from '../../utils/appRoutes'
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

  if (loading) return <div className="px-[var(--app-pad)] pt-3"><LoadingState label={t('app.premium.wines.loading')} /></div>
  if (error || !wine) return <div className="px-[var(--app-pad)] pt-3"><ErrorState message={error ?? t('app.wineNotFound')} /></div>

  const wineName = textField(wine, 'name', t('app.nav.store'))
  const wineSubtitle = textField(wine, 'subtitle') || textField(wine, 'origin') || t('app.premium.wines.detailEyebrow')
  const wineVarietal = textField(wine, 'grape_variety')
  const wineVintage = textField(wine, 'vintage')
  const price = numberField(wine, 'price')
  const stockControlled = Boolean(wine.stock_control_enabled)
  const soldOut = stockControlled && numberField(wine, 'stock_quantity') <= 0
  const coverImage = imageField(wine, '')

  const addToCart = async () => {
    if (!session?.access_token) {
      navigate(appPath('/login'))
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
    wineVarietal ? { icon: Grape, label: t('app.premium.wines.grape'), value: wineVarietal } : null,
    textField(wine, 'pairing_notes') ? { icon: Utensils, label: t('app.premium.wines.pairing'), value: textField(wine, 'pairing_notes') } : null,
    textField(wine, 'serving_temperature') ? { icon: Thermometer, label: t('app.premium.wines.service'), value: textField(wine, 'serving_temperature') } : null,
  ].filter(Boolean) as Array<{ icon: typeof Grape; label: string; value: string }>

  return (
    <div className="pb-2">
      <section className="relative -mt-px flex min-h-[clamp(360px,66vh,480px)] flex-col justify-end overflow-hidden bg-[#24150F] px-[var(--app-pad)] pb-6 text-white">
        {coverImage ? (
          <img src={coverImage} alt={wineName} className="absolute inset-0 h-full w-full object-cover opacity-78" />
        ) : (
          <EditorialImagePlaceholder className="absolute inset-0 opacity-80" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,10,7,0.22),rgba(20,10,7,0.86))]" />
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label={t('app.premium.back')}
	          className="absolute left-[var(--app-pad)] top-[calc(var(--safe-top)+12px)] z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/22 text-white backdrop-blur"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase text-[#D7B67A]">{wineSubtitle}</p>
	          <h1 className="mt-2 max-w-[18rem] text-[clamp(32px,9vw,42px)] leading-[0.95] text-white" style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}>
            {wineName}
          </h1>
          {wineVintage ? <p className="mt-2 text-[13px] text-white/82">{wineVintage}</p> : null}
          <p className="mt-3 text-[14px] font-semibold text-white">
            {price > 0 ? formatCurrency(price, locale) : t('app.premium.pricePending')}
          </p>
        </div>
      </section>

      <section className="space-y-5 px-[var(--app-pad)] py-6">
        {textField(wine, 'tasting_notes') || textField(wine, 'description') ? (
          <p className="text-[13px] leading-6 text-[#5D4638]">
            {textField(wine, 'tasting_notes') || textField(wine, 'description')}
          </p>
        ) : null}

        {facts.length > 0 ? (
          <div className="divide-y divide-[rgba(184,138,74,0.16)]">
            {facts.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="grid grid-cols-[26px_1fr] gap-3 py-3">
                  <Icon size={17} className="mt-0.5 text-[#B88A4A]" />
                  <div>
                    <p className="text-[9px] font-semibold uppercase text-[#B88A4A]">{item.label}</p>
                    <p className="mt-1 text-[12px] leading-5 text-[#2D1811]">{item.value}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-[12px] font-semibold uppercase text-[#B88A4A]">{t('app.premium.quantity')}</span>
          <QuantitySelector
            value={quantity}
            onChange={setQuantity}
            decreaseLabel={t('app.premium.decreaseQuantity')}
            increaseLabel={t('app.premium.increaseQuantity')}
          />
        </div>

        <PrimaryButton onClick={addToCart} disabled={adding || soldOut}>
          <Wine size={16} />
          {soldOut ? t('app.premium.soldOut') : adding ? t('app.premium.adding') : t('app.premium.addToCart')}
        </PrimaryButton>
        <AppToast message={message} tone={message.includes('No ') || message.includes('Could') ? 'danger' : 'success'} />
      </section>
    </div>
  )
}
