import { AlertCircle, CheckCircle2, Loader2, RotateCcw, Ticket, Truck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { customerClient, type CustomerPaymentStatus } from '../../../services/customer.service'
import { AppToast, PrimaryButton, SectionHeading, StatusBadge } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import {
  canRetryPayment,
  reconcilePaymentMode,
  type PaymentStatusMode,
} from '../../payments/paymentRouting'
import { appPath } from '../../utils/appRoutes'

function money(value: number | string | null | undefined, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }).format(Number(value ?? 0))
}

function translatedStatus(status: string | null | undefined, t: (key: string, fallback?: string) => string) {
  const value = status || 'pending'
  return t(`common.status.${value}`, t('common.status.unknown'))
}

function titleFor(mode: PaymentStatusMode, t: (key: string) => string) {
  if (mode === 'success') return t('app.premium.payment.titleSuccess')
  if (mode === 'failed') return t('app.premium.payment.titleFailed')
  return t('app.premium.payment.titleProcessing')
}

function copyFor(mode: PaymentStatusMode, t: (key: string) => string) {
  if (mode === 'success') return t('app.premium.payment.successCopy')
  if (mode === 'failed') return t('app.premium.payment.failedCopy')
  return t('app.premium.payment.checking')
}

export function PaymentStatusScreen({ mode }: { mode: PaymentStatusMode }) {
  const { t, locale } = useAppPreferences()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const orderId = params.get('orderId') ?? ''
  const [status, setStatus] = useState<CustomerPaymentStatus | null>(null)
  const [loading, setLoading] = useState(Boolean(orderId))
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (!session?.access_token || !orderId) {
        setLoading(false)
        return
      }
      setLoading(true)
      setMessage('')
      try {
        const response = await customerClient.paymentStatus(session.access_token, orderId)
        if (!active) return
        setStatus(response.data)
        const reconciledMode = reconcilePaymentMode(mode, response.data)
        if (reconciledMode !== mode) {
          const route = reconciledMode === 'success'
            ? '/pago/exitoso'
            : reconciledMode === 'failed'
              ? '/pago/fallido'
              : '/pago/procesando'
          navigate(`${appPath(route)}?orderId=${encodeURIComponent(orderId)}`, { replace: true })
        }
      } catch {
        if (active) setMessage(t('app.premium.payment.verifyError'))
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [session?.access_token, orderId, mode, navigate, t])

  const resolvedMode = reconcilePaymentMode(mode, status)
  const canRetry = canRetryPayment(status)
  const hasStatus = Boolean(status)
  const hasAccessFulfillment = Boolean(status?.hasAccessFulfillment || status?.fulfillmentKind === 'access' || status?.fulfillmentKind === 'mixed')
  const icon = resolvedMode === 'success'
    ? <CheckCircle2 size={30} className="text-[var(--color-vineyard)]" />
    : resolvedMode === 'failed'
      ? <AlertCircle size={30} className="text-[var(--color-alert)]" />
      : <Loader2 size={30} className="animate-spin text-[var(--color-burgundy)]" />

  return (
    <div className="app-page space-y-6">
      <SectionHeading eyebrow={t('app.premium.payment.eyebrow')} title={titleFor(resolvedMode, t)} />

      <section className="rounded-[1.25rem] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-warm)]">
            {icon}
          </span>
          <p className="min-w-0 text-[13px] leading-5 text-[var(--color-muted)]">
            {copyFor(resolvedMode, t)}
          </p>
        </div>

        {loading ? (
          <p className="mt-4 rounded-[1rem] bg-[var(--color-surface-warm)] px-4 py-3 text-[12px] text-[var(--color-muted)]">
            {t('app.premium.payment.checkingStatus')}
          </p>
        ) : message ? (
          <AppToast message={message} tone="danger" />
        ) : status ? (
          <div className="mt-4 space-y-2 rounded-[1rem] bg-[var(--color-surface-warm)] p-4 text-[13px] text-[var(--color-muted)]">
	            <div className="flex flex-wrap justify-between gap-3"><span>{t('app.premium.payment.order')}</span><strong>{status.orderNumber}</strong></div>
		            <div className="flex flex-wrap justify-between gap-3"><span>{t('app.premium.payment.orderStatus')}</span><StatusBadge>{translatedStatus(status.orderStatus, t)}</StatusBadge></div>
		            <div className="flex flex-wrap justify-between gap-3"><span>{t('app.premium.payment.paymentStatus')}</span><StatusBadge tone={status.paymentStatus === 'paid' ? 'success' : 'warning'}>{translatedStatus(status.paymentStatus, t)}</StatusBadge></div>
	            <div className="flex flex-wrap justify-between gap-3"><span>{t('common.total')}</span><strong>{money(status.amount, locale)}</strong></div>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3">
          {resolvedMode === 'success' && hasAccessFulfillment ? (
            <PrimaryButton to={`${appPath('/reservacion')}#boletos`}>
              <Ticket size={16} />
              {t('app.premium.payment.viewTickets', 'Ver boletos y códigos QR')}
            </PrimaryButton>
          ) : null}
          {canRetry ? (
            <Link to={`${appPath('/checkout')}${orderId ? `?orderId=${encodeURIComponent(orderId)}` : ''}`} className="flex min-h-[48px] items-center justify-center gap-2 rounded-[0.95rem] bg-[var(--color-burgundy)] px-4 text-[13px] font-bold text-white">
              <RotateCcw size={16} />
              {t('app.premium.payment.retryPayment')}
            </Link>
          ) : null}
          <PrimaryButton to={appPath('/perfil')} tone={canRetry || (resolvedMode === 'success' && hasAccessFulfillment) ? 'ghost' : 'primary'}>
            {resolvedMode === 'success' && hasStatus && !hasAccessFulfillment ? <Truck size={16} /> : null}
            {resolvedMode === 'success' && hasStatus && !hasAccessFulfillment
              ? t('app.premium.payment.viewOrderShipping', 'Ver pedido y envío')
              : t('app.premium.payment.viewOrders')}
          </PrimaryButton>
        </div>
      </section>
    </div>
  )
}
