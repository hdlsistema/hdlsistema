import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Award, Grape, MapPin, Sparkles, Wine } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { customerClient } from '../../../services/customer.service'
import { PrimaryButton, SectionHeading } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { publicContentClient, type ContentRecord } from '../../../services/content.service'
import { formatCurrency, imageField, numberField, textField } from '../../utils/publicContent'

export function WineDetailScreen() {
  const { wineId } = useParams()
  const { isEnglish } = useAppPreferences()
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
      setError(isEnglish ? 'Wine not found.' : 'Vino no encontrado.')
      setLoading(false)
      return
    }

    publicContentClient
      .getBySlug('wines', wineId, 'es-MX')
      .then((response) => {
        if (active) setWine(response.data)
      })
      .catch(() => {
        if (active) {
          setWine(null)
          setError(isEnglish ? 'Wine not available.' : 'Vino no disponible.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [isEnglish, wineId])

  if (loading) {
    return (
      <div className="rounded-[1.3rem] border border-[rgba(220,202,181,0.78)] bg-white p-6 text-[13px] text-[var(--color-muted)]">
        {isEnglish ? 'Loading wine...' : 'Cargando vino...'}
      </div>
    )
  }

  if (error || !wine) {
    return (
      <div className="rounded-[1.3rem] border border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] p-6 text-[13px] text-[var(--color-alert)]">
        {error}
      </div>
    )
  }

  const wineName = textField(wine, 'name', isEnglish ? 'Wine' : 'Vino')
  const wineImage = imageField(wine, '/Logo-HDL-2.svg')
  const wineSubtitle = textField(wine, 'subtitle') || textField(wine, 'origin')
  const wineVarietal = textField(wine, 'grape_variety')
  const wineVintage = textField(wine, 'vintage')
  const winePrice = formatCurrency(numberField(wine, 'price'))
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
      setMessage(isEnglish ? 'Added to cart.' : 'Agregado al carrito.')
    } catch {
      setMessage(isEnglish ? 'Could not add this wine.' : 'No fue posible agregar este vino.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-6 pb-3">
      <section className="overflow-hidden rounded-[1.5rem] border border-[rgba(220,202,181,0.78)] bg-white shadow-[0_20px_42px_rgba(74,32,28,0.09)]">
        <div className="relative flex min-h-[330px] items-center justify-center bg-[radial-gradient(circle_at_50%_42%,#fffaf3_0%,#f1dfc9_68%,#e9d3bb_100%)] p-6">
          <span className="absolute left-4 top-4 rounded-full bg-white/[0.92] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--color-burgundy)] shadow-sm">
            {isEnglish ? "Estate's selection" : 'Selección de la casa'}
          </span>
          <img src={wineImage} alt={wineName} className="max-h-[285px] w-auto object-contain drop-shadow-[0_24px_18px_rgba(67,26,22,0.22)]" />
        </div>

        <div className="p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{wineSubtitle}</p>
          <h1 className="mt-2 break-words text-[2.55rem] leading-[0.88] text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            {wineName}
          </h1>
          <p className="mt-3 text-[12px] leading-5 text-[var(--color-muted)]">
            {wineVarietal || (isEnglish ? 'Special selection' : 'Selección especial')}{wineVintage ? ` · ${wineVintage}` : ''}
          </p>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] text-[var(--color-muted)]">{isEnglish ? 'Price' : 'Precio'}</p>
              <p className="mt-1 text-[2.15rem] leading-none text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>
                {winePrice}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3 rounded-[1rem] border border-[rgba(220,202,181,0.78)] bg-[#fffaf5] px-4 py-3">
              <span className="text-[12px] font-semibold text-[var(--color-ink)]">{isEnglish ? 'Quantity' : 'Cantidad'}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#dccab5] bg-white text-[16px] font-bold text-[var(--color-burgundy)]"
                >
                  -
                </button>
                <span className="min-w-8 text-center text-[13px] font-bold text-[var(--color-ink)]">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(99, value + 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#dccab5] bg-white text-[16px] font-bold text-[var(--color-burgundy)]"
                >
                  +
                </button>
              </div>
            </div>
            <PrimaryButton onClick={addToCart} disabled={adding || soldOut}>
              {soldOut
                ? (isEnglish ? 'Sold out' : 'Agotado')
                : adding
                  ? (isEnglish ? 'Adding...' : 'Agregando...')
                  : (isEnglish ? 'Add to cart' : 'Agregar al carrito')}
            </PrimaryButton>
            {message ? <p className="mt-3 text-[12px] text-[var(--color-muted)]">{message}</p> : null}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
          {[
            { icon: Grape, label: isEnglish ? 'Grape' : 'Uva', value: wineVarietal || (isEnglish ? "Estate's selection" : 'Selección de la casa') },
            { icon: Award, label: isEnglish ? 'Vintage' : 'Cosecha', value: wineVintage || (isEnglish ? 'To be confirmed' : 'Por confirmar') },
            { icon: MapPin, label: isEnglish ? 'Origin' : 'Origen', value: textField(wine, 'origin') || (isEnglish ? 'To be confirmed' : 'Por confirmar') },
            { icon: Wine, label: isEnglish ? 'Service' : 'Servicio', value: textField(wine, 'serving_temperature') || (isEnglish ? 'To be confirmed' : 'Por confirmar') },
        ].filter((item) => item.value).map((item) => {
          const Icon = item.icon
          return (
            <article key={item.label} className="min-w-0 rounded-[1.15rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_12px_28px_rgba(74,32,28,0.05)]">
              <Icon size={17} className="text-[var(--color-burgundy)]" />
              <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--color-gold)]">{item.label}</p>
              <p className="mt-1 break-words text-[12px] font-semibold leading-4 text-[var(--color-ink)]">{item.value}</p>
            </article>
          )
        })}
      </section>

      <section className="space-y-3">
        <SectionHeading eyebrow={isEnglish ? 'Sensory profile' : 'Perfil sensorial'} title={isEnglish ? 'Tasting notes' : 'Notas de cata'} />
        <article className="rounded-[1.3rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[13px] leading-6 text-[var(--color-muted)] shadow-[0_16px_34px_rgba(74,32,28,0.06)]">
          {textField(wine, 'tasting_notes') || textField(wine, 'description') || (isEnglish ? 'Tasting notes to be confirmed.' : 'Notas de cata por confirmar.')}
        </article>
      </section>

      {textField(wine, 'pairing_notes') ? (
        <section className="space-y-3">
          <SectionHeading eyebrow={isEnglish ? 'Enjoy it better' : 'Disfrútalo mejor'} title={isEnglish ? 'Suggested pairing' : 'Maridaje sugerido'} />
          <article className="rounded-[1.3rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[13px] leading-6 text-[var(--color-muted)] shadow-[0_16px_34px_rgba(74,32,28,0.06)]">
            {textField(wine, 'pairing_notes')}
          </article>
        </section>
      ) : null}

      <section className="rounded-[1.3rem] bg-[linear-gradient(135deg,#5b0e22,#8d2038)] p-5 text-white shadow-[0_18px_38px_rgba(93,15,35,0.2)]">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d7b16d] text-[#f0cf92]">
            <Sparkles size={19} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#efcf93]">Sommelier</p>
            <h3 className="mt-1 text-[1.45rem] leading-none" style={{ fontFamily: 'var(--font-display)' }}>{isEnglish ? 'Coming soon' : 'Disponible próximamente'}</h3>
            <p className="mt-2 text-[11px] leading-4 text-white/[0.76]">{isEnglish ? 'Personal recommendations will be connected in a later phase.' : 'Las recomendaciones personalizadas se conectarán en una fase posterior.'}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
