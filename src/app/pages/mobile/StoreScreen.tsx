import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { customerClient } from '../../../services/customer.service'
import { appActivityEventKey, trackAppActivity } from '../../../services/appActivity.service'
import { CrystalSelect } from '../../components/shared/CrystalSelect'
import {
  AppSectionHeader,
  AppToast,
  EmptyState,
  ErrorState,
  HeroEditorial,
  LoadingState,
  PillRow,
  SearchField,
  StatusBadge,
  WineCard,
} from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicContent } from '../../hooks/usePublicContent'
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
        metadata: { route: '/app/tienda' },
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
      metadata: { route: '/app/tienda', filter },
      eventKey: appActivityEventKey('wine_filter_used', undefined, `${filter}-${Date.now()}`),
    })
  }

  return (
    <div className="space-y-6 pb-2">
      <HeroEditorial
        compact
        eyebrow={t('app.premium.wines.eyebrow')}
        title={t('app.premium.wines.title')}
        subtitle={t('app.premium.wines.subtitle')}
        image="/Slide-1.webp"
        alt={t('app.premium.wines.title')}
      />

      <SearchField
        placeholder={t('app.premium.wines.search')}
        value={search}
        onChange={setSearch}
      />

      <section className="space-y-3">
        <PillRow items={filters} activeIndex={activeFilter} onSelect={selectFilter} />
        <AppToast
          message={message}
          tone={message === t('app.premium.addCartError') ? 'danger' : 'success'}
        />
        <div className="flex min-h-12 items-center gap-3 rounded-[1rem] bg-[rgba(255,250,242,0.84)] px-4 shadow-[inset_0_0_0_1px_rgba(170,125,67,0.22)]">
          <SlidersHorizontal size={16} className="text-[var(--color-burgundy)]" />
          <span className="sr-only">{t('app.premium.wines.sort')}</span>
          <CrystalSelect
            value={order}
            onChange={(value) => setOrder(value as typeof order)}
            options={sortOptions}
            className="min-w-0 flex-1"
            buttonClassName="min-h-10 border-transparent bg-transparent px-0 text-[12px] shadow-none"
            menuClassName="left-auto right-0 min-w-[15rem]"
          />
        </div>
      </section>

      <section className="space-y-4">
        <AppSectionHeader
          eyebrow="Hacienda de Letras"
          title={t('app.premium.wines.title')}
          action={<StatusBadge>{filteredWines.length}</StatusBadge>}
        />
        {loading ? (
          <LoadingState label={t('app.premium.wines.loading')} />
        ) : error ? (
          <ErrorState message={error} retryLabel={t('app.premium.retry')} onRetry={retry} />
        ) : filteredWines.length === 0 ? (
          <EmptyState
            title={t('app.premium.wines.empty')}
            description={t('app.premium.contentPreparing')}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
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
                    kind: textField(wine, 'subtitle') || textField(wine, 'origin') || textField(wine, 'wine_type'),
                    price: price > 0
                      ? formatCurrency(price, locale)
                      : t('app.premium.pricePending'),
                    image: imageField(wine, '/Logo-HDL-2.svg'),
                    varietal: textField(wine, 'grape_variety'),
                    description: textField(wine, 'short_description') || textField(wine, 'description'),
                  }}
                  badge={
                    soldOut
                      ? t('app.premium.soldOut')
                      : index === 0
                        ? t('app.premium.featured')
                        : textField(wine, 'status') || t('app.premium.available')
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
          </div>
        )}
      </section>
    </div>
  )
}
