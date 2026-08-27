import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, SlidersHorizontal } from 'lucide-react'
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
  metadataText,
  numberField,
  textField,
} from '../../utils/publicContent'

function normalizeSearchText(value: string, locale: string) {
  return value
    .toLocaleLowerCase(locale)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const WINE_FILTER_TERMS: Record<number, string[]> = {
  1: ['tinto', 'tintos', 'red', 'reds'],
  2: ['blanco', 'blancos', 'white', 'whites'],
  3: ['rosado', 'rosados', 'rose', 'roses', 'rosé'],
  4: ['espumoso', 'espumosos', 'sparkling'],
}

export function StoreScreen() {
  const { t, isEnglish, locale } = useAppPreferences()
  const { session } = useAuth()
  const navigate = useNavigate()
  const { records: wines, loading, error, retry } = usePublicContent('wines')
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState(0)
  const [order, setOrder] = useState<'featured' | 'price_asc' | 'price_desc' | 'name'>('featured')
  const [sortSheetOpen, setSortSheetOpen] = useState(false)
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

  const selectedSortOption = sortOptions.find((option) => option.value === order) ?? sortOptions[0]

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
    const target = normalizeSearchText(search.trim(), activeLocale)
    const familyTerms = WINE_FILTER_TERMS[activeFilter] ?? []
    const filtered = wines.filter((wine) => {
      const searchable = [
        textField(wine, 'name'),
        textField(wine, 'subtitle'),
        textField(wine, 'category'),
        textField(wine, 'category_id'),
        textField(wine, 'origin'),
        textField(wine, 'grape_variety'),
        textField(wine, 'wine_type'),
        textField(wine, 'description'),
        metadataText(wine, 'category', 'family', 'style', 'type', 'wine_type', 'color', 'tags', 'origin', 'grape_variety'),
      ].join(' ')
      const normalizedSearchable = normalizeSearchText(searchable, activeLocale)
      const matchesSearch = !target || normalizedSearchable.includes(target)
      const matchesFamily =
        activeFilter === 0 ||
        familyTerms.some((term) => normalizedSearchable.includes(normalizeSearchText(term, activeLocale)))
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
  }, [activeFilter, isEnglish, order, search, wines])

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
    <div className="ipad-store-screen space-y-5 px-[var(--app-pad)] pb-2 pt-3">
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1
              className="text-[clamp(23px,6vw,29px)] font-medium leading-none text-[var(--color-ink)]"
              style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}
            >
              {t('app.premium.wines.title')}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setSortSheetOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(184,138,74,0.22)] bg-[var(--color-panel)] text-[var(--color-burgundy)] shadow-[0_8px_20px_rgba(74,32,28,0.08)]"
            aria-haspopup="dialog"
            aria-expanded={sortSheetOpen}
            aria-label={t('app.premium.wines.sort')}
          >
              <SlidersHorizontal size={16} />
          </button>
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
        <section className="ipad-wine-grid grid grid-cols-[repeat(auto-fit,minmax(136px,1fr))] gap-x-2.5 gap-y-5">
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

      {sortSheetOpen ? (
        <div
          className="fixed inset-0 z-[240] flex items-end bg-[#16070b]/45 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-8"
          role="presentation"
          onClick={() => setSortSheetOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={t('app.premium.wines.sort')}
            className="w-full rounded-[1.6rem] border border-[#b48a55]/35 bg-[#fffaf3] p-4 shadow-[0_24px_54px_rgba(58,21,25,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b48a55]">
                  {isEnglish ? 'Wine list' : 'Lista de vinos'}
                </p>
                <h2 className="mt-1 text-[18px] font-semibold leading-tight text-[#252f37]">
                  {t('app.premium.wines.sort')}
                </h2>
              </div>
              <span className="rounded-full border border-[#ead8c7] bg-white/75 px-3 py-1 text-[11px] font-semibold text-[#6b1428]">
                {selectedSortOption.label}
              </span>
            </div>
            <div className="grid gap-2">
              {sortOptions.map((option) => {
                const selected = option.value === order
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setOrder(option.value as typeof order)
                      setSortSheetOpen(false)
                    }}
                    className={`flex min-h-[48px] items-center justify-between gap-3 rounded-[1.05rem] border px-4 text-left text-[14px] font-semibold leading-snug transition ${
                      selected
                        ? 'border-[#6b1428] bg-[#6b1428] text-white shadow-[0_12px_24px_rgba(107,20,40,0.2)]'
                        : 'border-[#ead8c7] bg-white/82 text-[#332421]'
                    }`}
                  >
                    <span>{option.label}</span>
                    {selected ? <Check size={17} /> : null}
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
