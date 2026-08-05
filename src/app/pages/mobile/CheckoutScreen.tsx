import { CheckCircle2, CreditCard, PackageCheck, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { customerClient, type CustomerCart, type CustomerOrder } from '../../../services/customer.service'
import { PrimaryButton, SectionHeading } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'

function money(value: number | string | null | undefined, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }).format(Number(value ?? 0))
}

export function CheckoutScreen() {
  const { isEnglish, language } = useAppPreferences()
  const { session } = useAuth()
  const locale = isEnglish ? 'en-US' : 'es-MX'
  const [cart, setCart] = useState<CustomerCart | null>(null)
  const [order, setOrder] = useState<CustomerOrder | null>(null)
  const [discountCode, setDiscountCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (!session?.access_token) return
      setLoading(true)
      setMessage('')
      try {
        const response = await customerClient.cart(session.access_token)
        if (active) setCart(response.data)
      } catch {
        if (active) setMessage(isEnglish ? 'Could not load checkout.' : 'No fue posible cargar checkout.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [session?.access_token, isEnglish])

  const createOrder = async () => {
    if (!session?.access_token || submitting) return
    setSubmitting(true)
    setMessage('')
    try {
      const response = await customerClient.createOrder(session.access_token, {
        idempotencyKey: `checkout-${Date.now()}`,
        discountCode: discountCode.trim() || undefined,
        language,
      })
      setOrder(response.data)
      setCart(null)
      setMessage(isEnglish
        ? 'Your order was created. Online payment will be available soon.'
        : 'Tu orden fue creada. El pago en línea estará disponible próximamente.')
    } catch {
      setMessage(isEnglish ? 'Could not create the order.' : 'No fue posible crear la orden.')
    } finally {
      setSubmitting(false)
    }
  }

  const totals = cart?.totals

  return (
    <div className="space-y-6 pb-3">
      <SectionHeading
        eyebrow={isEnglish ? 'Checkout' : 'Checkout'}
        title={isEnglish ? 'Confirm order' : 'Confirmar orden'}
      />

      {message ? (
        <p className="rounded-[1rem] border border-[rgba(220,202,181,0.78)] bg-white px-4 py-3 text-[12px] text-[var(--color-muted)]">
          {message}
        </p>
      ) : null}

      {order ? (
        <section className="rounded-[1.35rem] border border-[rgba(42,115,88,0.28)] bg-[rgba(42,115,88,0.08)] p-5 shadow-[0_14px_30px_rgba(42,115,88,0.08)]">
          <CheckCircle2 size={26} className="text-[#2a7358]" />
          <h1 className="mt-4 text-[2rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            {order.orderNumber}
          </h1>
          <p className="mt-2 text-[13px] leading-5 text-[var(--color-muted)]">
            {isEnglish
              ? 'Real order created with pending payment. No payment was collected.'
              : 'Orden real creada con pago pendiente. No se realizó ningún cobro.'}
          </p>
          <div className="mt-4 rounded-[1rem] bg-white p-4">
            <div className="flex justify-between gap-3 text-[13px] text-[var(--color-muted)]">
              <span>{isEnglish ? 'Status' : 'Estado'}</span>
              <strong className="text-[var(--color-burgundy)]">{order.status}</strong>
            </div>
            <div className="mt-2 flex justify-between gap-3 text-[13px] text-[var(--color-muted)]">
              <span>Total</span>
              <strong className="text-[var(--color-burgundy)]">{money(order.total, locale)}</strong>
            </div>
          </div>
          <Link
            to="/app/perfil"
            className="mt-5 flex min-h-[48px] items-center justify-center rounded-[1rem] bg-[var(--color-burgundy)] px-4 text-[13px] font-bold text-white"
          >
            {isEnglish ? 'View my orders' : 'Ver mis órdenes'}
          </Link>
        </section>
      ) : loading ? (
        <section className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[13px] text-[var(--color-muted)]">
          {isEnglish ? 'Loading checkout...' : 'Cargando checkout...'}
        </section>
      ) : !cart || cart.items.length === 0 ? (
        <section className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[13px] text-[var(--color-muted)]">
          {isEnglish ? 'Your cart is empty.' : 'Tu carrito está vacío.'}
          <Link to="/app/tienda" className="mt-4 block font-semibold text-[var(--color-burgundy)]">
            {isEnglish ? 'Return to store' : 'Volver a tienda'}
          </Link>
        </section>
      ) : (
        <>
          <section className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
            <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">{isEnglish ? 'Items' : 'Partidas'}</h2>
            <div className="mt-3 space-y-3">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 border-t border-[rgba(220,202,181,0.52)] pt-3 first:border-t-0 first:pt-0">
                  <div className="min-w-0">
                    <p className="break-words text-[13px] font-semibold text-[var(--color-ink)]">{item.name}</p>
                    <p className="mt-1 text-[11px] text-[var(--color-muted)]">{item.quantity} × {money(item.unitPrice, locale)}</p>
                  </div>
                  <strong className="shrink-0 text-[13px] text-[var(--color-burgundy)]">{money(item.subtotal, locale)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-[#fffaf5] p-4">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold)]">
                {isEnglish ? 'Promotion code' : 'Código promocional'}
              </span>
              <input
                value={discountCode}
                onChange={(event) => setDiscountCode(event.target.value.toUpperCase())}
                placeholder={isEnglish ? 'Optional' : 'Opcional'}
                className="mt-2 w-full rounded-[1rem] border border-[#dccab5] bg-white px-4 py-3 text-[13px] outline-none"
              />
            </label>
            <p className="mt-2 text-[11px] leading-5 text-[var(--color-muted)]">
              {isEnglish
                ? 'The backend validates whether the promotion is published, active and eligible.'
                : 'El backend valida que la promoción esté publicada, vigente y sea elegible.'}
            </p>
          </section>

          <section className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-4">
            <div className="space-y-2 text-[13px] text-[var(--color-muted)]">
              <div className="flex justify-between gap-3"><span>{isEnglish ? 'Subtotal' : 'Subtotal'}</span><strong>{money(totals?.subtotal, locale)}</strong></div>
              <div className="flex justify-between gap-3"><span>{isEnglish ? 'Discounts' : 'Descuentos'}</span><strong>{money(totals?.discountTotal, locale)}</strong></div>
              <div className="flex justify-between gap-3"><span>{isEnglish ? 'Taxes' : 'Impuestos'}</span><strong>{money(totals?.taxTotal, locale)}</strong></div>
              <div className="flex justify-between gap-3"><span>{isEnglish ? 'Pickup' : 'Recolección'}</span><strong>{money(totals?.shippingTotal, locale)}</strong></div>
            </div>
            <div className="mt-4 flex items-end justify-between border-t border-[rgba(220,202,181,0.78)] pt-4">
              <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold)]">Total</span>
              <strong className="text-[1.7rem] leading-none text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{money(totals?.total, locale)}</strong>
            </div>
          </section>

          <section className="grid gap-3 rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 text-[12px] text-[var(--color-muted)]">
            <div className="flex items-start gap-3">
              <CreditCard size={17} className="mt-0.5 shrink-0 text-[var(--color-burgundy)]" />
              <p>{isEnglish ? 'No cards are requested and no payment is processed in this phase.' : 'No se solicitan tarjetas y no se procesa pago en esta fase.'}</p>
            </div>
            <div className="flex items-start gap-3">
              <PackageCheck size={17} className="mt-0.5 shrink-0 text-[var(--color-burgundy)]" />
              <p>{isEnglish ? 'Fulfillment is limited to pickup at Hacienda until shipping rules are approved.' : 'La entrega se limita a recolección en Hacienda hasta aprobar reglas de envío.'}</p>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[var(--color-burgundy)]" />
              <p>{isEnglish ? 'Totals are recalculated by the backend before creating the order.' : 'Los totales se recalculan en backend antes de crear la orden.'}</p>
            </div>
          </section>

          <PrimaryButton onClick={createOrder} disabled={submitting}>
            {submitting ? (isEnglish ? 'Creating order...' : 'Creando orden...') : (isEnglish ? 'Create order' : 'Crear orden')}
          </PrimaryButton>
        </>
      )}
    </div>
  )
}
