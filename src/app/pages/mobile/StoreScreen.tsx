import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { Grape, Sparkles } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { customerClient } from '../../../services/customer.service'
import { appActivityEventKey, trackAppActivity } from '../../../services/appActivity.service'
import { PillRow, SearchField, SectionHeading, WineCard } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicContent } from '../../hooks/usePublicContent'
import { contentRouteId, formatCurrency, imageField, numberField, textField } from '../../utils/publicContent'

export function StoreScreen() {
  const { isEnglish, locale } = useAppPreferences()
  const { session } = useAuth()
  const navigate = useNavigate()
  const { records: wines, loading, error, retry } = usePublicContent('wines')
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState(0)
  const [order, setOrder] = useState<'featured' | 'price_asc' | 'price_desc' | 'name'>('featured')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const filters = useMemo(
    () => isEnglish
      ? ['All', 'Reds', 'Whites', 'Rosés', 'Sparkling']
      : ['Todos', 'Tintos', 'Blancos', 'Rosados', 'Espumosos'],
    [isEnglish],
  )

  useEffect(() => {
    const queryLength = search.trim().length
    if (queryLength < 2) return
    const timer = window.setTimeout(() => {
      trackAppActivity({
        eventName: 'wine_search',
        entityType: 'wine',
        accessToken: session?.access_token,
        metadata: { route: '/app/tienda', queryLength },
        eventKey: appActivityEventKey('wine_search', undefined, String(Date.now())),
      })
    }, 500)
    return () => window.clearTimeout(timer)
  }, [search, session?.access_token])

  const filteredWines = useMemo(() => {
    const target = search.trim().toLocaleLowerCase(isEnglish ? 'en-US' : 'es-MX')
    const family = filters[activeFilter]?.toLocaleLowerCase(isEnglish ? 'en-US' : 'es-MX')
    const filtered = wines.filter((wine) => {
      const searchable = [
        textField(wine, 'name'),
        textField(wine, 'subtitle'),
        textField(wine, 'origin'),
        textField(wine, 'grape_variety'),
        textField(wine, 'wine_type'),
        textField(wine, 'description'),
      ].join(' ').toLocaleLowerCase(isEnglish ? 'en-US' : 'es-MX')
      const matchesSearch = !target || searchable.includes(target)
      const matchesFamily =
        activeFilter === 0 ||
        searchable.includes(String(family).replace('é', 'e')) ||
        searchable.includes(String(family))
      return matchesSearch && matchesFamily
    })
    return [...filtered].sort((a, b) => {
      if (order === 'price_asc') return numberField(a, 'price') - numberField(b, 'price')
      if (order === 'price_desc') return numberField(b, 'price') - numberField(a, 'price')
      if (order === 'name') return textField(a, 'name').localeCompare(textField(b, 'name'), isEnglish ? 'en-US' : 'es-MX')
      return Number(b.featured ?? 0) - Number(a.featured ?? 0)
    })
  }, [activeFilter, filters, isEnglish, order, search, wines])

  const addWineToCart = async (wineId: string) => {
    if (!session?.access_token) {
      navigate('/app/login')
      return
    }
    if (addingId) return
    setAddingId(wineId)
    setMessage('')
    try {
      await customerClient.addCartItem(session.access_token, {
        itemType: 'wine',
        itemId: wineId,
        quantity: 1,
        idempotencyKey: `cart-${wineId}-${Date.now()}`,
      })
      setMessage(isEnglish ? 'Added to cart.' : 'Agregado al carrito.')
    } catch {
      setMessage(isEnglish ? 'Could not add this wine.' : 'No fue posible agregar este vino.')
    } finally {
      setAddingId(null)
    }
  }

  const selectFilter = (index: number) => {
    setActiveFilter(index)
    const filter = filters[index]
    if (!filter) return
    trackAppActivity({
      eventName: 'wine_filter_used',
      entityType: 'wine',
      accessToken: session?.access_token,
      metadata: { route: '/app/tienda', filter },
      eventKey: appActivityEventKey('wine_filter_used', undefined, `${filter}-${Date.now()}`),
    })
  }

  return (
    <div className="space-y-6 pb-3">
      <section className="overflow-hidden rounded-[1.45rem] border border-[rgba(220,202,181,0.78)] bg-[linear-gradient(135deg,#fffaf4,#f2dfc9)] p-5 shadow-[0_18px_38px_rgba(74,32,28,0.08)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)]">{isEnglish ? 'Wine boutique' : 'Boutique de vinos'}</p>
        <h1 className="mt-2 text-[2.15rem] leading-[0.92] text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>
          {isEnglish ? 'Our selection' : 'Nuestra selección'}
        </h1>
        <p className="mt-3 max-w-[290px] text-[13px] leading-5 text-[var(--color-muted)]">
          {isEnglish
            ? 'Labels with the identity of Aguascalientes, chosen to share, give and remember.'
            : 'Etiquetas con identidad de Aguascalientes, elegidas para compartir, regalar y recordar.'}
        </p>
      </section>

      <SearchField
        placeholder={isEnglish ? 'Search wine, grape or label' : 'Buscar vino, uva o etiqueta'}
        value={search}
        onChange={setSearch}
      />

      <section className="space-y-3">
        <PillRow
          items={filters}
          activeIndex={activeFilter}
          onSelect={selectFilter}
        />
        {message ? (
          <p className="rounded-[0.95rem] border border-[rgba(220,202,181,0.78)] bg-white px-4 py-3 text-[12px] text-[var(--color-muted)]">
            {message}
          </p>
        ) : null}
        <label className="block">
          <span className="sr-only">{isEnglish ? 'Sort wines' : 'Ordenar vinos'}</span>
          <select
            value={order}
            onChange={(event) => setOrder(event.target.value as typeof order)}
            className="w-full rounded-[1rem] border border-[rgba(220,202,181,0.78)] bg-white px-4 py-3 text-[12px] text-[var(--color-ink)] outline-none"
          >
            <option value="featured">{isEnglish ? 'Featured first' : 'Destacados primero'}</option>
            <option value="price_asc">{isEnglish ? 'Price: low to high' : 'Precio: menor a mayor'}</option>
            <option value="price_desc">{isEnglish ? 'Price: high to low' : 'Precio: mayor a menor'}</option>
            <option value="name">{isEnglish ? 'Name' : 'Nombre'}</option>
          </select>
        </label>
      </section>

      <section className="space-y-4">
        <SectionHeading
          eyebrow={isEnglish ? 'Hacienda de Letras Cellar' : 'Cava Hacienda de Letras'}
          title={isEnglish ? 'Available wines' : 'Vinos disponibles'}
        />
        {loading ? (
          <div className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">
            {isEnglish ? 'Loading published wines...' : 'Cargando vinos publicados...'}
          </div>
        ) : error ? (
          <div className="rounded-[1.2rem] border border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] p-5 text-[12px] text-[var(--color-alert)]">
            <p>{error}</p>
            <button type="button" onClick={retry} className="mt-3 font-semibold text-[var(--color-burgundy)]">
              {isEnglish ? 'Retry' : 'Reintentar'}
            </button>
          </div>
        ) : filteredWines.length === 0 ? (
          <div className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">
            {isEnglish ? 'No published wines match this search.' : 'No hay vinos publicados para esta búsqueda.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredWines.map((wine, index) => {
              const stockControlled = Boolean(wine.stock_control_enabled)
              const soldOut = stockControlled && numberField(wine, 'stock_quantity') <= 0
              return (
                <WineCard
                  key={wine.id}
                  wine={{
                    id: contentRouteId(wine),
                    name: textField(wine, 'name', isEnglish ? 'Wine' : 'Vino'),
                    kind: textField(wine, 'subtitle') || textField(wine, 'origin') || textField(wine, 'status'),
                    price: formatCurrency(numberField(wine, 'price'), locale),
                    image: imageField(wine, '/Logo-HDL-2.svg'),
                    varietal: textField(wine, 'grape_variety'),
                    harvest: textField(wine, 'vintage'),
                  }}
                  badge={
                    soldOut
                      ? (isEnglish ? 'Sold out' : 'Agotado')
                      : index === 0
                        ? (isEnglish ? 'Featured' : 'Destacado')
                        : textField(wine, 'status') || (isEnglish ? 'Available' : 'Disponible')
                  }
                  onAdd={() => addWineToCart(String(wine.id))}
                  addDisabled={soldOut || addingId === String(wine.id)}
                  addLabel={
                    soldOut
                      ? (isEnglish ? 'Wine sold out' : 'Vino agotado')
                      : addingId === String(wine.id)
                        ? (isEnglish ? 'Adding wine' : 'Agregando vino')
                        : (isEnglish ? 'Add to cart' : 'Agregar al carrito')
                  }
                />
              )
            })}
          </div>
        )}
      </section>

      <Link
        to="/app/club"
        className="relative block overflow-hidden rounded-[1.35rem] bg-[linear-gradient(135deg,#5c0f23,#8e1f37)] p-5 text-white shadow-[0_18px_38px_rgba(93,15,35,0.2)]"
      >
        <div className="absolute -right-10 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="relative flex items-center gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d9b56f] bg-white/5 text-[#f0cf92]">
            <Grape size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#efcf93]">Wine Club</p>
              <Sparkles size={12} className="text-[#efcf93]" />
            </div>
            <h2
              className="mt-1 text-[1.45rem] leading-none text-[#f3dfb4]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {isEnglish ? 'Benefits in every bottle' : 'Beneficios en cada botella'}
            </h2>
            <p className="mt-2 text-[11px] leading-4 text-[#f6ead3]">
              {isEnglish
                ? 'Pre-sales, special selections and exclusive experiences.'
                : 'Preventa, selecciones especiales y experiencias exclusivas.'}
            </p>
          </div>
        </div>
      </Link>
    </div>
  )
}
