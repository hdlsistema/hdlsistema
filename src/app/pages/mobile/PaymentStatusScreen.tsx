import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { customerClient, type CustomerPaymentStatus } from '../../../services/customer.service'
import { PrimaryButton, SectionHeading } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'

type PaymentStatusMode = 'processing' | 'success' | 'failed'

function money(value: number | string | null | undefined, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }).format(Number(value ?? 0))
}

function titleFor(mode: PaymentStatusMode, isEnglish: boolean) {
  if (mode === 'success') return isEnglish ? 'Payment confirmed' : 'Pago confirmado'
  if (mode === 'failed') return isEnglish ? 'Payment could not be completed' : 'No se pudo completar el pago'
  return isEnglish ? 'Processing payment' : 'Procesando pago'
}

export function PaymentStatusScreen({ mode }: { mode: PaymentStatusMode }) {
  const { isEnglish } = useAppPreferences()
  const locale = isEnglish ? 'en-US' : 'es-MX'
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
        if (mode === 'processing') {
          if (response.data.orderStatus === 'paid' || response.data.paymentStatus === 'paid') {
            navigate(`/app/pago/exitoso?orderId=${encodeURIComponent(orderId)}`, { replace: true })
          } else if (['failed', 'cancelled'].includes(response.data.paymentStatus)) {
            navigate(`/app/pago/fallido?orderId=${encodeURIComponent(orderId)}`, { replace: true })
          }
        }
      } catch {
        if (active) setMessage(isEnglish ? 'Could not verify payment status.' : 'No fue posible verificar el estado del pago.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [session?.access_token, orderId, mode, navigate, isEnglish])

  const icon = mode === 'success'
    ? <CheckCircle2 size={28} className="text-[#2a7358]" />
    : mode === 'failed'
      ? <AlertCircle size={28} className="text-[var(--color-alert)]" />
      : <Loader2 size={28} className="animate-spin text-[var(--color-burgundy)]" />

  return (
    <div className="space-y-6 pb-3">
      <SectionHeading eyebrow={isEnglish ? 'Payment' : 'Pago'} title={titleFor(mode, isEnglish)} />

      <section className="rounded-[1.35rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 shadow-[0_16px_34px_rgba(74,32,28,0.07)]">
        {icon}
        <p className="mt-4 text-[13px] leading-5 text-[var(--color-muted)]">
          {mode === 'success'
            ? (isEnglish ? 'Your payment is being validated against the backend and Stripe webhook.' : 'Tu pago se valida contra el backend y el webhook de Stripe.')
            : mode === 'failed'
              ? (isEnglish ? 'No charge is marked as paid by the app. You can retry from checkout if the order is still pending.' : 'La app no marca cobros como pagados. Puedes reintentar desde checkout si la orden sigue pendiente.')
              : (isEnglish ? 'We are checking the real payment status with the backend.' : 'Estamos consultando el estado real del pago con el backend.')}
        </p>

        {loading ? (
          <p className="mt-4 rounded-[1rem] bg-[#fffaf5] px-4 py-3 text-[12px] text-[var(--color-muted)]">
            {isEnglish ? 'Checking status...' : 'Consultando estado...'}
          </p>
        ) : message ? (
          <p className="mt-4 rounded-[1rem] border border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] px-4 py-3 text-[12px] text-[var(--color-alert)]">
            {message}
          </p>
        ) : status ? (
          <div className="mt-4 space-y-2 rounded-[1rem] bg-[#fffaf5] p-4 text-[13px] text-[var(--color-muted)]">
            <div className="flex justify-between gap-3"><span>{isEnglish ? 'Order' : 'Orden'}</span><strong>{status.orderNumber}</strong></div>
            <div className="flex justify-between gap-3"><span>{isEnglish ? 'Order status' : 'Estado de orden'}</span><strong>{status.orderStatus}</strong></div>
            <div className="flex justify-between gap-3"><span>{isEnglish ? 'Payment status' : 'Estado de pago'}</span><strong>{status.paymentStatus}</strong></div>
            <div className="flex justify-between gap-3"><span>Total</span><strong>{money(status.amount, locale)}</strong></div>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3">
          {status?.canRetry ? (
            <Link to="/app/checkout" className="flex min-h-[48px] items-center justify-center gap-2 rounded-[1rem] bg-[var(--color-burgundy)] px-4 text-[13px] font-bold text-white">
              <RotateCcw size={16} />
              {isEnglish ? 'Retry payment' : 'Reintentar pago'}
            </Link>
          ) : null}
          <PrimaryButton to="/app/perfil">
            {isEnglish ? 'View my orders' : 'Ver mis órdenes'}
          </PrimaryButton>
        </div>
      </section>
    </div>
  )
}
