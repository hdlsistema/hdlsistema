import { ArrowRight, Minus, Plus, RefreshCw, ShoppingBag, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { customerClient, type CustomerCart, type CustomerCartItem } from '../../../services/customer.service'
import { PrimaryButton, SectionHeading } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'

function money(value: number | string | null | undefined, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }).format(Number(value ?? 0))
}

export function CartScreen() {
  const { isEnglish } = useAppPreferences()
  const { session } = useAuth()
  const locale = isEnglish ? 'en-US' : 'es-MX'
  const [cart, setCart] = useState<CustomerCart | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const loadCart = useCallback(async () => {
    if (!session?.access_token) return
    setLoading(true)
    setMessage('')
    try {
      const response = await customerClient.cart(session.access_token)
      setCart(response.data)
    } catch {
      setMessage(isEnglish ? 'Could not load cart.' : 'No fue posible cargar el carrito.')
    } finally {
      setLoading(false)
    }
  }, [isEnglish, session?.access_token])

  useEffect(() => {
    loadCart()
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
      setMessage(isEnglish ? 'Could not update quantity.' : 'No fue posible actualizar la cantidad.')
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
      setMessage(isEnglish ? 'Could not remove item.' : 'No fue posible eliminar la partida.')
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
      setMessage(isEnglish ? 'Could not clear cart.' : 'No fue posible vaciar el carrito.')
    } finally {
      setBusyId(null)
    }
  }

  const items = cart?.items ?? []
  const totals = cart?.totals

  return (
    <div className="space-y-6 pb-3">
      <SectionHeading
        eyebrow={isEnglish ? 'Store' : 'Tienda'}
        title={isEnglish ? 'My cart' : 'Mi carrito'}
        action={
          <button
            type="button"
            onClick={loadCart}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(104,13,36,0.18)] bg-white text-[var(--color-burgundy)]"
            title={isEnglish ? 'Reload cart' : 'Recargar carrito'}
          >
            <RefreshCw size={16} />
          </button>
        }
      />

      {message ? (
        <p className="rounded-[1rem] border border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] px-4 py-3 text-[12px] text-[var(--color-alert)]">
          {message}
        </p>
      ) : null}

      {loading ? (
        <section className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[13px] text-[var(--color-muted)]">
          {isEnglish ? 'Loading cart...' : 'Cargando carrito...'}
        </section>
      ) : items.length === 0 ? (
        <section className="rounded-[1.35rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#f8eee5] text-[var(--color-burgundy)]">
            <ShoppingBag size={20} />
          </span>
          <h1 className="mt-4 text-[1.85rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            {isEnglish ? 'Your cart is empty.' : 'Tu carrito está vacío.'}
          </h1>
          <p className="mt-3 text-[13px] leading-6 text-[var(--color-muted)]">
            {isEnglish
              ? 'Add published wines from the store. Checkout creates a real order with payment pending.'
              : 'Agrega vinos publicados desde la tienda. El checkout crea una orden real con pago pendiente.'}
          </p>
          <Link
            to="/app/tienda"
            className="mt-5 flex min-h-[48px] items-center justify-center rounded-[1rem] bg-[var(--color-burgundy)] px-4 text-[13px] font-bold text-white"
          >
            {isEnglish ? 'Explore wines' : 'Explorar vinos'}
          </Link>
        </section>
      ) : (
        <>
          <section className="space-y-3">
            {items.map((item) => (
              <article key={item.id} className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-[15px] font-semibold leading-5 text-[var(--color-ink)]">{item.name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--color-gold)]">
                      {item.itemType === 'wine' ? (isEnglish ? 'Wine' : 'Vino') : (isEnglish ? 'Ticket' : 'Boleto')}
                    </p>
                    <p className="mt-2 text-[12px] text-[var(--color-muted)]">{money(item.unitPrice, locale)} × {item.quantity}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item)}
                    disabled={busyId === item.id}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f8eee5] text-[var(--color-burgundy)] disabled:opacity-50"
                    title={isEnglish ? 'Remove item' : 'Eliminar partida'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item, item.quantity - 1)}
                      disabled={item.quantity <= 1 || busyId === item.id}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#dccab5] bg-white text-[var(--color-burgundy)] disabled:opacity-40"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="min-w-8 text-center text-[13px] font-bold text-[var(--color-ink)]">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item, item.quantity + 1)}
                      disabled={busyId === item.id}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#dccab5] bg-white text-[var(--color-burgundy)] disabled:opacity-40"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <p className="text-[15px] font-bold text-[var(--color-burgundy)]">{money(item.subtotal, locale)}</p>
                </div>
              </article>
            ))}
          </section>

          <section className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-[#fffaf5] p-4">
            <div className="space-y-2 text-[13px] text-[var(--color-muted)]">
              <div className="flex justify-between gap-3"><span>{isEnglish ? 'Subtotal' : 'Subtotal'}</span><strong>{money(totals?.subtotal, locale)}</strong></div>
              <div className="flex justify-between gap-3"><span>{isEnglish ? 'Discounts' : 'Descuentos'}</span><strong>{money(totals?.discountTotal, locale)}</strong></div>
              <div className="flex justify-between gap-3"><span>{isEnglish ? 'Taxes' : 'Impuestos'}</span><strong>{money(totals?.taxTotal, locale)}</strong></div>
              <div className="flex justify-between gap-3"><span>{isEnglish ? 'Pickup at Hacienda' : 'Recolección en Hacienda'}</span><strong>{money(totals?.shippingTotal, locale)}</strong></div>
            </div>
            <div className="mt-4 flex items-end justify-between border-t border-[rgba(220,202,181,0.78)] pt-4">
              <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold)]">Total</span>
              <strong className="text-[1.7rem] leading-none text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{money(totals?.total, locale)}</strong>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-[var(--color-muted)]">
              {isEnglish
                ? 'Online payment is not active yet. Checkout creates a real order with pending payment.'
                : 'El pago en línea aún no está activo. El checkout crea una orden real con pago pendiente.'}
            </p>
          </section>

          <div className="grid gap-3">
            <PrimaryButton to="/app/checkout">
              {isEnglish ? 'Continue to checkout' : 'Continuar a checkout'}
            </PrimaryButton>
            <button
              type="button"
              onClick={clearCart}
              disabled={busyId === 'cart'}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[1rem] border border-[rgba(104,13,36,0.18)] bg-white px-4 text-[13px] font-semibold text-[var(--color-burgundy)] disabled:opacity-50"
            >
              {isEnglish ? 'Clear cart' : 'Vaciar carrito'}
              <ArrowRight size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
