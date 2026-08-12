import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import type { StripeElementsOptions } from '@stripe/stripe-js'
import { CheckCircle2, CreditCard, Home, MapPin, PackageCheck, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import {
  customerClient,
  type CustomerAddress,
  type CustomerAddressPayload,
  type CustomerCart,
  type CustomerOrder,
  type CustomerPaymentSession,
} from '../../../services/customer.service'
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

function translatedStatus(status: string | null | undefined, t: (key: string, fallback?: string) => string) {
  const value = status || 'pending'
  return t(`common.status.${value}`, value)
}

const emptyAddress: CustomerAddressPayload = {
  label: '',
  recipientName: '',
  phone: '',
  email: '',
  line1: '',
  line2: '',
  neighborhood: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'MX',
  references: '',
  isDefault: false,
}

function cartRequiresShipping(cart: CustomerCart | null) {
  return Boolean(cart?.items.some((item) => item.itemType === 'wine'))
}

function normalizeAddress(address: CustomerAddressPayload): CustomerAddressPayload {
  return {
    label: address.label?.trim() || null,
    recipientName: address.recipientName.trim(),
    phone: address.phone?.trim() || null,
    email: address.email?.trim() || null,
    line1: address.line1.trim(),
    line2: address.line2?.trim() || null,
    neighborhood: address.neighborhood?.trim() || null,
    city: address.city.trim(),
    state: address.state.trim(),
    postalCode: address.postalCode.trim(),
    country: address.country?.trim() || 'MX',
    references: address.references?.trim() || null,
    isDefault: Boolean(address.isDefault),
  }
}

function addressFromSaved(address: CustomerAddress): CustomerAddressPayload {
  return normalizeAddress({
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    email: address.email,
    line1: address.line1,
    line2: address.line2,
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    references: address.references,
    isDefault: address.isDefault,
  })
}

function validateAddress(address: CustomerAddressPayload) {
  const required = ['recipientName', 'line1', 'city', 'state', 'postalCode'] as const
  return required.filter((key) => !String(address[key] ?? '').trim())
}

function EmbeddedStripePaymentForm({
  clientSecret,
  orderId,
  amount,
  onMessage,
}: {
  clientSecret: string
  orderId: string
  amount: number
  onMessage: (message: string) => void
}) {
  const { session } = useAuth()
  const { t, locale } = useAppPreferences()
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
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
    if (!stripe || !elements || processing) return
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
    <section className="min-w-0 rounded-[1.15rem] bg-[rgba(255,250,242,0.92)] p-4 shadow-[var(--shadow-card)] backdrop-blur-xl">
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
      <div className="min-w-0 overflow-hidden rounded-[1rem] border border-[rgba(217,189,138,0.34)] bg-white/88 p-3">
        <PaymentElement />
      </div>
      <PrimaryButton onClick={submitPayment} disabled={!stripe || !elements || processing} className="mt-4">
        {processing ? t('app.premium.checkout.processing') : `${t('app.premium.checkout.pay')} ${money(amount, locale)}`}
      </PrimaryButton>
    </section>
  )
}

export function CheckoutScreen() {
  const { t, locale, language } = useAppPreferences()
  const { session } = useAuth()
  const [searchParams] = useSearchParams()
  const requestedOrderId = searchParams.get('orderId') ?? ''
  const [cart, setCart] = useState<CustomerCart | null>(null)
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [addressForm, setAddressForm] = useState<CustomerAddressPayload>(emptyAddress)
  const [saveAddress, setSaveAddress] = useState(true)
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
        if (requestedOrderId) {
          const orderResponse = await customerClient.order(session.access_token, requestedOrderId)
          if (!active) return
          setOrder(orderResponse.data)
          setCart(null)
          try {
            const paymentResponse = await customerClient.retryPayment(session.access_token, requestedOrderId, {
              idempotencyKey: `checkout-retry-${requestedOrderId}-${Date.now()}`,
            })
            if (!active) return
            setPaymentSession(paymentResponse.data)
            setMessage(t('app.premium.checkout.orderReady'))
          } catch {
            if (!active) return
            setPaymentSession(null)
            setMessage(t('app.premium.checkout.paymentUnavailable'))
          }
          return
        }
	        const [cartResponse, addressResponse] = await Promise.all([
	          customerClient.cart(session.access_token),
	          customerClient.addresses(session.access_token),
	        ])
	        if (!active) return
	        setCart(cartResponse.data)
	        setAddresses(addressResponse.data)
	        const defaultAddress = addressResponse.data.find((item) => item.isDefault) ?? addressResponse.data[0] ?? null
	        if (defaultAddress) setSelectedAddressId(defaultAddress.id)
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
  }, [requestedOrderId, session?.access_token, t])

  const createOrder = async () => {
    if (!session?.access_token || submitting) return
    const needsShipping = cartRequiresShipping(cart)
    const selectedAddress = addresses.find((item) => item.id === selectedAddressId)
    const shippingAddress = selectedAddress ? addressFromSaved(selectedAddress) : normalizeAddress(addressForm)
    if (needsShipping) {
      const missing = validateAddress(shippingAddress)
      if (missing.length) {
        setMessage(t('app.premium.checkout.addressRequired'))
        return
      }
    }
    setSubmitting(true)
    setMessage('')
    try {
      const response = await customerClient.createOrder(session.access_token, {
        idempotencyKey: `checkout-${Date.now()}`,
	        discountCode: discountCode.trim() || undefined,
	        language,
	        shippingAddress: needsShipping ? shippingAddress : undefined,
	        saveAddress: needsShipping && !selectedAddress ? saveAddress : false,
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
  const requiresShipping = cartRequiresShipping(cart)
  const stripeOptions = useMemo(() => paymentSession?.clientSecret
    ? {
        clientSecret: paymentSession.clientSecret,
        developerTools: {
          assistant: {
            enabled: false,
          },
        },
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
      } as unknown as StripeElementsOptions
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
	              <StatusBadge tone="warning">{translatedStatus(order.status, t)}</StatusBadge>
	            </div>
	            {order.shippingAddress ? (
	              <div className="rounded-[0.9rem] bg-[var(--color-surface-warm)] p-3 text-[12px] leading-5 text-[var(--color-muted)]">
	                <strong className="block text-[var(--color-ink)]">{t('app.premium.checkout.deliveryAddress')}</strong>
	                {order.shippingAddress.recipientName}<br />
	                {order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}<br />
	                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
	              </div>
	            ) : null}
	            {order.requiresShipping ? (
	              <div className="flex flex-wrap justify-between gap-3 text-[13px] text-[var(--color-muted)]">
	                <span>{t('app.premium.profile.shippingStatus')}</span>
	                <StatusBadge tone="warning">{translatedStatus(order.shippingStatus, t)}</StatusBadge>
	              </div>
	            ) : null}
	          </div>
          {paymentSession && stripeOptions && isStripePublishableKeyConfigured() && stripePromise ? (
            <div className="mt-5">
              <Elements stripe={stripePromise} options={stripeOptions}>
                <EmbeddedStripePaymentForm
	                  clientSecret={paymentSession.clientSecret}
	                  orderId={order.id}
                    amount={paymentSession.amount}
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

	          {requiresShipping ? (
	            <section className="rounded-[1.15rem] bg-[rgba(255,250,242,0.92)] p-4 shadow-[var(--shadow-card)] backdrop-blur-xl">
	              <div className="flex items-start gap-3">
	                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-warm)] text-[var(--color-burgundy)]">
	                  <MapPin size={18} />
	                </span>
	                <div>
	                  <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">{t('app.premium.checkout.deliveryAddress')}</h2>
	                  <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">{t('app.premium.checkout.deliveryCopy')}</p>
	                </div>
	              </div>

	              {addresses.length ? (
	                <div className="mt-4 grid gap-2">
	                  {addresses.map((address) => (
	                    <button
	                      key={address.id}
	                      type="button"
	                      onClick={() => setSelectedAddressId(address.id)}
	                      className={`w-full rounded-[1rem] border px-4 py-3 text-left transition ${selectedAddressId === address.id ? 'border-[var(--color-burgundy)] bg-[#fff4f6]' : 'border-[rgba(220,202,181,0.72)] bg-white/76'}`}
	                    >
	                      <span className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-ink)]">
	                        <Home size={15} className="text-[var(--color-burgundy)]" />
	                        {address.label || address.recipientName}
	                        {address.isDefault ? <StatusBadge tone="success">{t('app.premium.profile.defaultAddress')}</StatusBadge> : null}
	                      </span>
	                      <span className="mt-1 block text-[11px] leading-5 text-[var(--color-muted)]">
	                        {address.line1}, {address.city}, {address.state} {address.postalCode}
	                      </span>
	                    </button>
	                  ))}
	                  <button type="button" onClick={() => setSelectedAddressId('')} className="min-h-11 rounded-full border border-[rgba(104,13,36,0.2)] bg-white/70 px-4 text-[12px] font-semibold text-[var(--color-burgundy)]">
	                    {t('app.premium.checkout.useNewAddress')}
	                  </button>
	                </div>
	              ) : null}

	              {!selectedAddressId ? (
	                <div className="mt-4 grid gap-3">
	                  {[
	                    ['label', t('app.premium.profile.addressLabel')],
	                    ['recipientName', t('app.premium.profile.recipientName')],
	                    ['phone', t('app.premium.profile.phone')],
	                    ['email', t('app.premium.profile.email')],
	                    ['line1', t('app.premium.profile.addressLine1')],
	                    ['line2', t('app.premium.profile.addressLine2')],
	                    ['neighborhood', t('app.premium.profile.neighborhood')],
	                    ['city', t('app.premium.profile.city')],
	                    ['state', t('app.premium.profile.state')],
	                    ['postalCode', t('app.premium.profile.postalCode')],
	                  ].map(([key, placeholder]) => (
	                    <input
	                      key={key}
	                      value={String(addressForm[key as keyof CustomerAddressPayload] ?? '')}
	                      onChange={(event) => setAddressForm((current) => ({ ...current, [key]: event.target.value }))}
	                      placeholder={placeholder}
	                      className="min-h-12 w-full rounded-[0.95rem] border border-[rgba(170,125,67,0.28)] bg-white/88 px-4 text-[13px] text-[var(--color-ink)] outline-none"
	                    />
	                  ))}
	                  <textarea
	                    value={addressForm.references ?? ''}
	                    onChange={(event) => setAddressForm((current) => ({ ...current, references: event.target.value }))}
	                    placeholder={t('app.premium.profile.references')}
	                    className="min-h-[96px] w-full rounded-[0.95rem] border border-[rgba(170,125,67,0.28)] bg-white/88 px-4 py-3 text-[13px] text-[var(--color-ink)] outline-none"
	                  />
	                  <button
	                    type="button"
	                    onClick={() => setSaveAddress((value) => !value)}
	                    className="flex min-h-11 items-center gap-3 rounded-full bg-white/74 px-4 text-left text-[12px] text-[var(--color-muted)]"
	                  >
	                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${saveAddress ? 'border-[var(--color-burgundy)] bg-[var(--color-burgundy)] text-white' : 'border-[rgba(104,13,36,0.25)] text-transparent'}`}>
	                      <CheckCircle2 size={14} />
	                    </span>
	                    {t('app.premium.checkout.saveAddress')}
	                  </button>
	                </div>
	              ) : null}
	            </section>
	          ) : null}

	          <section className="rounded-[1.15rem] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
            <div className="space-y-2 text-[13px] text-[var(--color-muted)]">
              <div className="flex justify-between gap-3"><span>{t('app.premium.cart.subtotal')}</span><strong>{money(totals?.subtotal, locale)}</strong></div>
              <div className="flex justify-between gap-3"><span>{t('app.premium.cart.discounts')}</span><strong>{money(totals?.discountTotal, locale)}</strong></div>
              <div className="flex justify-between gap-3"><span>{t('app.premium.cart.taxes')}</span><strong>{money(totals?.taxTotal, locale)}</strong></div>
	              <div className="flex justify-between gap-3"><span>{t('app.premium.cart.shipping')}</span><strong>{money(totals?.shippingTotal, locale)}</strong></div>
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
	              <p>{requiresShipping ? t('app.premium.checkout.shippingCostCopy') : t('app.pickupOnly')}</p>
	            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[var(--color-burgundy)]" />
              <p>{t('app.checkoutTotals')}</p>
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
