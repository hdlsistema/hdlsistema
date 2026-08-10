import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { CheckCircle2, CreditCard, PackageCheck, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { customerClient, type CustomerCart, type CustomerOrder, type CustomerPaymentSession } from '../../../services/customer.service'
import { appActivityEventKey, trackAppActivity } from '../../../services/appActivity.service'
import {
  AppToast,
  EmptyState,
  LoadingState,
  PrimaryButton,
  SectionHeading,
  StatusBadge,
} from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { isStripePublishableKeyConfigured, stripePromise } from '../../payments/stripe'
import { appPath } from '../../utils/appRoutes'

function money(value: number | string | null | undefined, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }).format(Number(value ?? 0))
}

function EmbeddedStripePaymentForm({
  clientSecret,
  orderId,
  onMessage,
}: {
  clientSecret: string
  orderId: string
  onMessage: (message: string) => void
}) {
  const { session } = useAuth()
  const { t } = useAppPreferences()
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
  const [accepted, setAccepted] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    trackAppActivity({
      eventName: 'checkout_payment_form_viewed',
      entityType: 'order',
      entityId: orderId,
      accessToken: session?.access_token,
      metadata: { route: appPath('/checkout') },
    })
  }, [orderId, session?.access_token])

  const submitPayment = async () => {
    if (!stripe || !elements || processing || !accepted) return
    trackAppActivity({
      eventName: 'checkout_payment_attempted',
      entityType: 'order',
      entityId: orderId,
      accessToken: session?.access_token,
      metadata: { route: appPath('/checkout'), result: 'started' },
      eventKey: appActivityEventKey('checkout_payment_attempted', orderId, String(Date.now())),
    })
    setProcessing(true)
    onMessage('')
    const submitResult = await elements.submit()
    if (submitResult.error) {
      onMessage(submitResult.error.message ?? t('app.premium.checkout.checkPaymentDetails'))
      setProcessing(false)
      return
    }

    const result = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
	        return_url: `${window.location.origin}${appPath('/pago/procesando')}?orderId=${encodeURIComponent(orderId)}`,
      },
      redirect: 'if_required',
    })

    if (result.error) {
      onMessage(result.error.message ?? t('app.premium.checkout.confirmError'))
      setProcessing(false)
      return
    }

    navigate(`${appPath('/pago/procesando')}?orderId=${encodeURIComponent(orderId)}`, { replace: true })
  }

  return (
    <section className="min-w-0 rounded-[1.15rem] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-warm)] text-[var(--color-burgundy)]">
          <CreditCard size={18} />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">
            {t('app.premium.checkout.secureCard')}
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">
            {t('app.premium.checkout.stripeCopy')}
          </p>
        </div>
      </div>
      <div className="min-w-0">
        <PaymentElement />
      </div>
      <label className="mt-4 flex items-start gap-3 rounded-[1rem] bg-[var(--color-surface-warm)] px-4 py-3 text-[12px] leading-5 text-[var(--color-muted)]">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="mt-1 accent-[var(--color-burgundy)]"
        />
        <span>{t('app.premium.checkout.acceptWebhook')}</span>
      </label>
      <PrimaryButton onClick={submitPayment} disabled={!stripe || !elements || !accepted || processing} className="mt-4">
        {processing ? t('app.premium.checkout.processing') : t('app.premium.checkout.payInApp')}
      </PrimaryButton>
    </section>
  )
}

export function CheckoutScreen() {
  const { t, locale, language } = useAppPreferences()
  const { session } = useAuth()
  const [cart, setCart] = useState<CustomerCart | null>(null)
  const [order, setOrder] = useState<CustomerOrder | null>(null)
  const [paymentSession, setPaymentSession] = useState<CustomerPaymentSession | null>(null)
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
        if (active) setMessage(t('app.premium.checkout.loadError'))
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [session?.access_token, t])

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
      try {
        const paymentResponse = await customerClient.paymentSession(session.access_token, response.data.id)
        setPaymentSession(paymentResponse.data)
        setMessage(t('app.premium.checkout.orderReady'))
      } catch {
        setPaymentSession(null)
        setMessage(t('app.premium.checkout.paymentUnavailable'))
      }
    } catch {
      setMessage(t('app.premium.checkout.createError'))
    } finally {
      setSubmitting(false)
    }
  }

  const totals = cart?.totals
  const stripeOptions = useMemo(() => paymentSession?.clientSecret
    ? {
        clientSecret: paymentSession.clientSecret,
        appearance: {
          theme: 'stripe' as const,
          variables: {
            colorPrimary: '#681126',
            colorText: '#2f1b16',
            colorDanger: '#9d473f',
            borderRadius: '14px',
            fontFamily: 'Inter, system-ui, sans-serif',
          },
        },
      }
    : null, [paymentSession?.clientSecret])

  return (
    <div className="app-page space-y-6">
      <SectionHeading
        eyebrow={t('app.premium.checkout.eyebrow')}
        title={t('app.premium.checkout.title')}
      />

      <AppToast message={message} tone={order ? 'success' : 'danger'} />

      {order ? (
        <section className="rounded-[1.25rem] bg-[linear-gradient(145deg,rgba(63,117,79,0.12),rgba(255,250,242,0.96))] p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={26} className="mt-0.5 shrink-0 text-[var(--color-vineyard)]" />
            <div className="min-w-0">
              <h1 className="break-words text-[2rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
                {order.orderNumber}
              </h1>
              <p className="mt-2 text-[13px] leading-5 text-[var(--color-muted)]">
                {t('app.premium.checkout.orderCreated')}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 rounded-[1rem] bg-white/82 p-4">
	            <div className="flex flex-wrap justify-between gap-3 text-[13px] text-[var(--color-muted)]">
              <span>{t('common.total')}</span>
              <strong className="text-[var(--color-burgundy)]">{money(order.total, locale)}</strong>
            </div>
	            <div className="flex flex-wrap justify-between gap-3 text-[13px] text-[var(--color-muted)]">
              <span>{t('common.status.pending_payment')}</span>
              <StatusBadge tone="warning">{order.status}</StatusBadge>
            </div>
          </div>
          {paymentSession && stripeOptions && isStripePublishableKeyConfigured() && stripePromise ? (
            <div className="mt-5">
              <Elements stripe={stripePromise} options={stripeOptions}>
                <EmbeddedStripePaymentForm
                  clientSecret={paymentSession.clientSecret}
                  orderId={order.id}
                  onMessage={setMessage}
                />
              </Elements>
            </div>
          ) : (
            <AppToast message={t('app.premium.checkout.stripeUnavailable')} tone="danger" />
          )}
          <Link
	            to={appPath('/perfil')}
            className="mt-4 flex min-h-[48px] items-center justify-center rounded-[0.95rem] bg-white px-4 text-[13px] font-bold text-[var(--color-burgundy)] shadow-[inset_0_0_0_1px_rgba(84,17,36,0.14)]"
          >
            {t('app.premium.checkout.viewOrders')}
          </Link>
        </section>
      ) : loading ? (
        <LoadingState label={t('common.loading')} />
      ) : !cart || cart.items.length === 0 ? (
        <EmptyState
          title={t('app.premium.checkout.empty')}
	          action={<PrimaryButton to={appPath('/vinos')}>{t('app.premium.checkout.returnStore')}</PrimaryButton>}
        />
      ) : (
        <>
          <section className="rounded-[1.15rem] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
            <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">{t('app.premium.checkout.items')}</h2>
            <div className="mt-3 space-y-3">
              {cart.items.map((item) => (
                <div key={item.id} className="flex min-w-0 justify-between gap-3 border-t border-[rgba(170,125,67,0.18)] pt-3 first:border-t-0 first:pt-0">
                  <div className="min-w-0">
                    <p className="break-words text-[13px] font-semibold text-[var(--color-ink)]">{item.name}</p>
                    <p className="mt-1 text-[11px] text-[var(--color-muted)]">{item.quantity} x {money(item.unitPrice, locale)}</p>
                  </div>
                  <strong className="shrink-0 text-right text-[13px] text-[var(--color-burgundy)]">{money(item.subtotal, locale)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.15rem] bg-[var(--color-surface-warm)] p-4 shadow-[inset_0_0_0_1px_rgba(170,125,67,0.14)]">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold)]">
                {t('app.premium.checkout.promotion')}
              </span>
              <input
                value={discountCode}
                onChange={(event) => setDiscountCode(event.target.value.toUpperCase())}
                placeholder={t('app.premium.checkout.optional')}
                className="mt-2 min-h-12 w-full rounded-[0.95rem] border border-[rgba(170,125,67,0.28)] bg-white px-4 text-[13px] outline-none"
              />
            </label>
            <p className="mt-2 text-[11px] leading-5 text-[var(--color-muted)]">
              {t('app.premium.checkout.promotionHelp')}
            </p>
          </section>

          <section className="rounded-[1.15rem] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
            <div className="space-y-2 text-[13px] text-[var(--color-muted)]">
              <div className="flex justify-between gap-3"><span>{t('app.premium.cart.subtotal')}</span><strong>{money(totals?.subtotal, locale)}</strong></div>
              <div className="flex justify-between gap-3"><span>{t('app.premium.cart.discounts')}</span><strong>{money(totals?.discountTotal, locale)}</strong></div>
              <div className="flex justify-between gap-3"><span>{t('app.premium.cart.taxes')}</span><strong>{money(totals?.taxTotal, locale)}</strong></div>
              <div className="flex justify-between gap-3"><span>{t('app.premium.cart.pickup')}</span><strong>{money(totals?.shippingTotal, locale)}</strong></div>
            </div>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-2 border-t border-[rgba(170,125,67,0.2)] pt-4">
              <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-gold)]">{t('common.total')}</span>
              <strong className="text-[1.7rem] leading-none text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{money(totals?.total, locale)}</strong>
            </div>
          </section>

          <section className="grid gap-3 rounded-[1.15rem] bg-[var(--color-panel)] p-4 text-[12px] text-[var(--color-muted)] shadow-[var(--shadow-card)]">
            <div className="flex items-start gap-3">
              <CreditCard size={17} className="mt-0.5 shrink-0 text-[var(--color-burgundy)]" />
              <p>{t('app.premium.checkout.stripeCopy')}</p>
            </div>
            <div className="flex items-start gap-3">
              <PackageCheck size={17} className="mt-0.5 shrink-0 text-[var(--color-burgundy)]" />
              <p>{t('app.pickupOnly')}</p>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[var(--color-burgundy)]" />
              <p>{t('app.backendTotals')}</p>
            </div>
          </section>

          <PrimaryButton onClick={createOrder} disabled={submitting}>
            {submitting ? t('app.premium.checkout.creatingOrder') : t('app.premium.checkout.createOrder')}
          </PrimaryButton>
        </>
      )}
    </div>
  )
}
