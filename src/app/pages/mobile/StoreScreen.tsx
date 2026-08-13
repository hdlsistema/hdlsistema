import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { customerClient } from '../../../services/customer.service'
import { appActivityEventKey, trackAppActivity } from '../../../services/appActivity.service'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import {
  AppToast,
  EmptyState,
  ErrorState,
  SearchField,
  Skeleton,
  WineCard,
} from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicContent } from '../../hooks/usePublicContent'
import { appPath } from '../../utils/appRoutes'
import {
  contentRouteId,
  formatCurrency,
  imageField,
  numberField,
  textField,
} from '../../utils/publicContent'

export function StoreScreen() {
  const { t, isEnglish, locale } = useAppPreferences()
  const { session } = useAuth()
  const navigate = useNavigate()
  const { records: wines, loading, error, retry } = usePublicContent('wines')
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState(0)
  const [order, setOrder] = useState<'featured' | 'price_asc' | 'price_desc' | 'name'>('featured')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const filters = useMemo(
    () => [
      t('app.premium.wines.all'),
      t('app.premium.wines.reds'),
      t('app.premium.wines.whites'),
      t('app.premium.wines.roses'),
      t('app.premium.wines.sparkling'),
    ],
    [t],
  )

  const sortOptions = useMemo(
    () => [
      { value: 'featured', label: t('app.premium.wines.featuredFirst') },
      { value: 'price_asc', label: t('app.premium.wines.priceAsc') },
      { value: 'price_desc', label: t('app.premium.wines.priceDesc') },
      { value: 'name', label: t('app.premium.wines.name') },
    ],
    [t],
  )

  useEffect(() => {
    const queryLength = search.trim().length
    if (queryLength < 2) return
    const timer = window.setTimeout(() => {
      trackAppActivity({
        eventName: 'wine_search',
        entityType: 'wine',
        accessToken: session?.access_token,
        metadata: { route: appPath('/vinos') },
        eventKey: appActivityEventKey('wine_search', undefined, String(Date.now())),
      })
    }, 500)
    return () => window.clearTimeout(timer)
  }, [search, session?.access_token])

  const filteredWines = useMemo(() => {
    const activeLocale = isEnglish ? 'en-US' : 'es-MX'
    const target = search.trim().toLocaleLowerCase(activeLocale)
    const family = filters[activeFilter]?.toLocaleLowerCase(activeLocale)
    const filtered = wines.filter((wine) => {
      const searchable = [
        textField(wine, 'name'),
        textField(wine, 'subtitle'),
        textField(wine, 'origin'),
        textField(wine, 'grape_variety'),
        textField(wine, 'wine_type'),
        textField(wine, 'description'),
      ].join(' ').toLocaleLowerCase(activeLocale)
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
      if (order === 'name') {
        return textField(a, 'name').localeCompare(
          textField(b, 'name'),
          isEnglish ? 'en-US' : 'es-MX',
        )
      }
      return Number(b.featured ?? 0) - Number(a.featured ?? 0)
    })
  }, [activeFilter, filters, isEnglish, order, search, wines])

  const addWineToCart = async (wineId: string) => {
    if (!session?.access_token) {
      navigate(appPath('/login'))
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
      setMessage(t('app.premium.addCartSuccess'))
    } catch {
      setMessage(t('app.premium.addCartError'))
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
      metadata: { route: appPath('/vinos'), filter },
      eventKey: appActivityEventKey('wine_filter_used', undefined, `${filter}-${Date.now()}`),
    })
  }

  return (
    <div className="space-y-5 px-[var(--app-pad)] pb-2 pt-3">
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1
              className="text-[clamp(23px,6vw,29px)] font-medium leading-none text-[#2D1811]"
              style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}
            >
              {t('app.premium.wines.title')}
            </h1>
          </div>
          <div className="relative shrink-0">
            <CrystalSelect
              value={order}
              onChange={(value) => setOrder(value as typeof order)}
              options={sortOptions}
              className="w-11"
              buttonClassName="h-10 min-h-10 w-11 justify-center rounded-full border-[rgba(184,138,74,0.2)] bg-[#FFF9F1] px-0 text-[#690D2B] shadow-none"
              menuClassName="left-auto right-0 min-w-[15rem]"
            />
            <SlidersHorizontal
              size={16}
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#690D2B]"
            />
            <span className="sr-only">{t('app.premium.wines.sort')}</span>
          </div>
        </div>
        <SearchField
          placeholder={t('app.premium.wines.search')}
          value={search}
          onChange={setSearch}
        />
        <CrystalSelect
          value={String(activeFilter)}
          onChange={(value) => selectFilter(Number(value))}
          options={filters.map((label, index) => ({ value: String(index), label }))}
          ariaLabel={isEnglish ? 'Filter wines by style' : 'Filtrar vinos por estilo'}
          buttonClassName="min-h-12 rounded-[1.15rem] border-white/60 bg-white/62 px-4 text-[13px] font-semibold text-[#513d34] shadow-[0_16px_34px_rgba(76,34,25,0.1)] backdrop-blur-2xl"
          menuClassName="rounded-[1.2rem] border-white/70 bg-[linear-gradient(180deg,rgba(255,252,247,0.97),rgba(245,235,225,0.95))]"
        />
        <AppToast
          message={message}
          tone={message === t('app.premium.addCartError') ? 'danger' : 'success'}
        />
      </section>

      {loading ? (
        <section className="grid grid-cols-[repeat(auto-fit,minmax(136px,1fr))] gap-2.5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="aspect-[4/5]" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </section>
      ) : error ? (
        <ErrorState
          message={t('app.premium.contentUnavailable')}
          retryLabel={t('app.premium.retry')}
          onRetry={retry}
        />
      ) : filteredWines.length === 0 ? (
        <EmptyState
          title={t('app.premium.wines.empty')}
          description={t('app.premium.contentPreparing')}
        />
      ) : (
        <section className="grid grid-cols-[repeat(auto-fit,minmax(136px,1fr))] gap-x-2.5 gap-y-5">
          {filteredWines.map((wine, index) => {
            const stockControlled = Boolean(wine.stock_control_enabled)
            const soldOut = stockControlled && numberField(wine, 'stock_quantity') <= 0
            const price = numberField(wine, 'price')
            return (
              <WineCard
                key={wine.id}
                wine={{
                  id: contentRouteId(wine),
                  name: textField(wine, 'name', t('app.nav.store')),
                  kind: textField(wine, 'wine_type') || textField(wine, 'origin') || textField(wine, 'subtitle'),
                  price: price > 0 ? formatCurrency(price, locale) : t('app.premium.pricePending'),
                  image: imageField(wine, ''),
                  varietal: textField(wine, 'grape_variety'),
                  description: textField(wine, 'short_description') || textField(wine, 'description'),
                }}
                badge={
                  soldOut
                    ? t('app.premium.soldOut')
                    : index === 0
                      ? t('app.premium.featured')
                      : undefined
                }
                onAdd={() => addWineToCart(String(wine.id))}
                addDisabled={soldOut || addingId === String(wine.id)}
                addLabel={
                  soldOut
                    ? t('app.premium.soldOut')
                    : addingId === String(wine.id)
                      ? t('app.premium.adding')
                      : t('app.premium.addToCart')
                }
              />
            )
          })}
        </section>
      )}
    </div>
  )
}
