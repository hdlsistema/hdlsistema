import { ArrowRight, RefreshCw, ShoppingBag, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { customerClient, type CustomerCart, type CustomerCartItem, type CustomerOrder } from '../../../services/customer.service'
import {
  AppToast,
  EmptyState,
  LoadingState,
  PrimaryButton,
  QuantitySelector,
  SectionHeading,
  StatusBadge,
} from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { appPath } from '../../utils/appRoutes'

function money(value: number | string | null | undefined, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }).format(Number(value ?? 0))
}

function itemKind(item: CustomerCartItem, t: (key: string) => string) {
  return item.itemType === 'wine' ? t('app.premium.cart.wine') : t('app.premium.cart.ticket')
}

function isRecoverableOrder(order: CustomerOrder) {
  const terminalStatuses = new Set(['paid', 'fulfilled', 'refunded', 'cancelled'])
  return !terminalStatuses.has(order.status) && !terminalStatuses.has(order.paymentStatus)
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
}

export function CartScreen() {
  const { t, locale } = useAppPreferences()
  const { session } = useAuth()
  const [cart, setCart] = useState<CustomerCart | null>(null)
  const [pendingOrders, setPendingOrders] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const loadCart = useCallback(async () => {
    if (!session?.access_token) return
    setLoading(true)
    setMessage('')
    try {
      const [cartResponse, ordersResponse] = await Promise.all([
        customerClient.cart(session.access_token),
        customerClient.orders(session.access_token).catch(() => ({ data: [] as CustomerOrder[] })),
      ])
      setCart(cartResponse.data)
      setPendingOrders(ordersResponse.data.filter(isRecoverableOrder))
    } catch {
      setMessage(t('app.premium.cart.loadError'))
    } finally {
      setLoading(false)
    }
  }, [session?.access_token, t])

  useEffect(() => {
    void loadCart()
  }, [loadCart])

  const updateQuantity = async (item: CustomerCartItem, quantity: number) => {
    if (!session?.access_token || quantity < 1 || busyId) return
    setBusyId(item.id)
    setMessage('')
    try {
      const response = await customerClient.updateCartItem(session.access_token, item.id, {
        quantity,
        idempotencyKey: `cart-update-${item.id}-${Date.now()}`,
      })
      setCart(response.data)
    } catch {
      setMessage(t('app.premium.cart.updateError'))
    } finally {
      setBusyId(null)
    }
  }

  const removeItem = async (item: CustomerCartItem) => {
    if (!session?.access_token || busyId) return
    setBusyId(item.id)
    setMessage('')
    try {
      const response = await customerClient.removeCartItem(session.access_token, item.id)
      setCart(response.data)
    } catch {
      setMessage(t('app.premium.cart.removeError'))
    } finally {
      setBusyId(null)
    }
  }

  const clearCart = async () => {
    if (!session?.access_token || busyId) return
    setBusyId('cart')
    setMessage('')
    try {
      const response = await customerClient.clearCart(session.access_token)
      setCart(response.data)
    } catch {
      setMessage(t('app.premium.cart.clearError'))
    } finally {
      setBusyId(null)
    }
  }

  const items = cart?.items ?? []
  const totals = cart?.totals
  const hasPendingOrders = pendingOrders.length > 0

  return (
    <div className="app-page space-y-6">
      <SectionHeading
        eyebrow={t('app.premium.cart.eyebrow')}
        title={t('app.premium.cart.title')}
        action={
          <button
            type="button"
            onClick={() => void loadCart()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-warm)] text-[var(--color-burgundy)] shadow-[inset_0_0_0_1px_rgba(170,125,67,0.22)]"
            title={t('app.premium.cart.reload')}
            aria-label={t('app.premium.cart.reload')}
          >
            <RefreshCw size={16} />
          </button>
        }
      />

      <AppToast message={message} tone="danger" />

      {loading ? (
        <LoadingState label={t('app.premium.cart.loading')} />
      ) : items.length === 0 && !hasPendingOrders ? (
        <EmptyState
          title={t('app.premium.cart.emptyTitle')}
          description={t('app.premium.cart.emptyCopy')}
          action={<PrimaryButton to={appPath('/vinos')}>{t('app.premium.cart.explore')}</PrimaryButton>}
        />
      ) : (
        <>
          {hasPendingOrders ? (
            <section className="grid gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">{t('app.premium.cart.pendingOrders')}</p>
                <h2 className="mt-1 text-[26px] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
                  {t('app.premium.cart.pendingOrdersTitle')}
                </h2>
                <p className="mt-2 text-[12px] leading-5 text-[var(--color-muted)]">{t('app.premium.cart.pendingOrdersCopy')}</p>
              </div>
              {pendingOrders.map((order) => (
                <article key={order.id} className="rounded-[1.15rem] bg-[rgba(255,249,241,0.9)] p-4 shadow-[var(--shadow-card)] backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-[15px] font-semibold leading-5 text-[var(--color-ink)]">{order.orderNumber}</p>
                      <p className="mt-2 text-[12px] text-[var(--color-muted)]">{formatDate(order.createdAt, locale)}</p>
                      <p className="mt-2 text-[12px] text-[var(--color-muted)]">
                        {order.items.length} {order.items.length === 1 ? t('app.premium.cart.item') : t('app.premium.cart.items')}
                      </p>
                    </div>
                    <StatusBadge tone="warning">{t('common.status.pending_payment')}</StatusBadge>
                  </div>
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                    <strong className="text-[1.6rem] leading-none text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{money(order.total, locale)}</strong>
                    <PrimaryButton to={`${appPath('/checkout')}?orderId=${encodeURIComponent(order.id)}`} className="min-h-11 px-4 text-[12px]">
                      {t('app.premium.cart.continuePayment')}
                      <ArrowRight size={15} />
                    </PrimaryButton>
                  </div>
                </article>
              ))}
            </section>
          ) : null}

          {items.length > 0 ? (
            <section className="grid gap-3">
              {items.map((item) => (
                <article key={item.id} className="rounded-[1.15rem] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-[15px] font-semibold leading-5 text-[var(--color-ink)]">{item.name}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">
                        {itemKind(item, t)}
                      </p>
                      <p className="mt-2 text-[12px] text-[var(--color-muted)]">
                        {money(item.unitPrice, locale)} x {item.quantity}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeItem(item)}
                      disabled={busyId === item.id}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-warm)] text-[var(--color-burgundy)] disabled:opacity-50"
                      title={t('app.premium.cart.removeError')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <QuantitySelector
                      value={item.quantity}
                      onChange={(quantity) => void updateQuantity(item, quantity)}
                      decreaseLabel={t('app.premium.decreaseQuantity')}
                      increaseLabel={t('app.premium.increaseQuantity')}
                    />
                    <p className="text-[15px] font-bold text-[var(--color-burgundy)]">{money(item.subtotal, locale)}</p>
                  </div>
                </article>
              ))}
            </section>
          ) : null}

          {items.length > 0 ? (
            <section className="rounded-[1.2rem] bg-[linear-gradient(145deg,#fffaf5,#f0dcc7)] p-4 shadow-[var(--shadow-soft)]">
            <div className="space-y-2 text-[13px] text-[var(--color-muted)]">
              <div className="flex justify-between gap-3"><span>{t('app.premium.cart.subtotal')}</span><strong>{money(totals?.subtotal, locale)}</strong></div>
              <div className="flex justify-between gap-3"><span>{t('app.premium.cart.discounts')}</span><strong>{money(totals?.discountTotal, locale)}</strong></div>
              <div className="flex justify-between gap-3"><span>{t('app.premium.cart.taxes')}</span><strong>{money(totals?.taxTotal, locale)}</strong></div>
              <div className="flex justify-between gap-3"><span>{t('app.premium.cart.pickup')}</span><strong>{money(totals?.shippingTotal, locale)}</strong></div>
            </div>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-2 border-t border-[rgba(170,125,67,0.22)] pt-4">
              <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold)]">{t('common.total')}</span>
              <strong className="text-[1.7rem] leading-none text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{money(totals?.total, locale)}</strong>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-[var(--color-muted)]">
              {t('app.premium.cart.onlinePaymentReady')}
            </p>
            </section>
          ) : null}

          {items.length > 0 ? (
            <div className="grid gap-3">
            <PrimaryButton to={appPath('/checkout')}>
              {t('app.premium.cart.continue')}
              <ArrowRight size={15} />
            </PrimaryButton>
            <button
              type="button"
              onClick={() => void clearCart()}
              disabled={busyId === 'cart'}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[0.95rem] bg-[var(--color-panel)] px-4 text-[13px] font-semibold text-[var(--color-burgundy)] shadow-[inset_0_0_0_1px_rgba(84,17,36,0.14)] disabled:opacity-50"
            >
              <ShoppingBag size={15} />
              {t('app.premium.cart.clear')}
            </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
