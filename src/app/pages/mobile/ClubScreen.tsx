import { useCallback, useEffect, useState } from 'react'
import { Crown, Gift, Grape, Star } from 'lucide-react'
import { PrimaryButton, SectionHeading } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicContent } from '../../hooks/usePublicContent'
import { formatCurrency, numberField, textField } from '../../utils/publicContent'
import { useAuth } from '../../../contexts/AuthContext'
import {
  customerClient,
  type CustomerLoyaltySummary,
  type CustomerMembership,
  type CustomerMembershipBenefit,
} from '../../../services/customer.service'

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return locale === 'en-US' ? 'To be confirmed' : 'Por confirmar'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return locale === 'en-US' ? 'To be confirmed' : 'Por confirmar'
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
}

export function ClubScreen() {
  const { isEnglish, locale } = useAppPreferences()
  const { session } = useAuth()
  const { records: plans, loading, error, retry } = usePublicContent('membership-plans')
  const [membership, setMembership] = useState<CustomerMembership>(null)
  const [benefits, setBenefits] = useState<CustomerMembershipBenefit[]>([])
  const [loyalty, setLoyalty] = useState<CustomerLoyaltySummary | null>(null)
  const [loadingMembership, setLoadingMembership] = useState(true)
  const [membershipError, setMembershipError] = useState('')

  const token = session?.access_token

  const loadMembership = useCallback(async () => {
    if (!token) return
    setLoadingMembership(true)
    setMembershipError('')
    try {
      const [membershipResponse, benefitsResponse, loyaltyResponse] = await Promise.all([
        customerClient.membership(token),
        customerClient.membershipBenefits(token),
        customerClient.membershipLoyalty(token),
      ])
      setMembership(membershipResponse.data)
      setBenefits(benefitsResponse.data)
      setLoyalty(loyaltyResponse.data)
    } catch {
      setMembership(null)
      setBenefits([])
      setLoyalty(null)
      setMembershipError(isEnglish ? 'Membership data could not be loaded.' : 'No fue posible cargar tu membresía.')
    } finally {
      setLoadingMembership(false)
    }
  }, [isEnglish, token])

  useEffect(() => {
    void loadMembership()
  }, [loadMembership])

  const featuredPlan = plans[0]

  return (
    <div className="space-y-6 pb-3">
      <section className="relative overflow-hidden rounded-[1.55rem] bg-[linear-gradient(135deg,#520d20,#8d2038)] p-6 text-white shadow-[0_24px_48px_rgba(85,13,32,0.24)]">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-white/10" />
        <div className="absolute -bottom-16 right-14 h-40 w-40 rounded-full border border-white/10" />
        <div className="relative">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#d6b16e] bg-white/5 text-[#f1d39a]">
            <Crown size={22} />
          </span>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#efcd91]">Wine Club</p>
          <h1 className="mt-2 max-w-[290px] text-[2.55rem] leading-[0.88]" style={{ fontFamily: 'var(--font-display)' }}>
            {isEnglish ? 'Your membership' : 'Tu membresía'}
          </h1>
          <p className="mt-4 max-w-[300px] text-[13px] leading-5 text-white/80">
            {isEnglish
              ? 'Real plan, benefits and points when your customer account has an active membership.'
              : 'Plan, beneficios y puntos reales cuando tu cuenta cliente tenga una membresía activa.'}
          </p>
        </div>
      </section>

      <section className="rounded-[1.35rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 shadow-[0_16px_34px_rgba(74,32,28,0.07)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{isEnglish ? 'Current status' : 'Estado actual'}</p>
            <h2 className="mt-1 text-[1.9rem] leading-none text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>
              {loadingMembership
                ? (isEnglish ? 'Loading...' : 'Cargando...')
                : membership?.plan?.name ?? (isEnglish ? 'No membership yet' : 'Sin membresía aún')}
            </h2>
          </div>
          {membership ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf5ed] px-3 py-1.5 text-[10px] font-semibold text-[#3f6f4b]">
              <Star size={12} fill="currentColor" />
              {membership.status}
            </span>
          ) : null}
        </div>

        {membershipError ? (
          <button type="button" onClick={() => void loadMembership()} className="mt-4 text-[12px] font-semibold text-[var(--color-burgundy)]">
            {membershipError} {isEnglish ? 'Retry' : 'Reintentar'}
          </button>
        ) : membership ? (
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              [String(loyalty?.pointsBalance ?? membership.pointsBalance ?? 0), isEnglish ? 'Points' : 'Puntos'],
              [formatDate(membership.renewalDate, locale), isEnglish ? 'Renewal' : 'Renovación'],
              [formatDate(membership.expiresAt, locale), isEnglish ? 'Expiration' : 'Expira'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-[1rem] bg-[#fff8f1] p-3 text-center">
                <p className="break-words text-[14px] font-semibold text-[var(--color-burgundy)]">{value}</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-[var(--color-muted)]">{label}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[12px] leading-5 text-[var(--color-muted)]">
            {isEnglish
              ? 'You do not have an active membership yet. Paid enrollment will be connected in a later phase.'
              : 'Aún no tienes membresía activa. La inscripción con cobro se conectará en una fase posterior.'}
          </p>
        )}
      </section>

      {membership ? (
        <section className="space-y-4">
          <SectionHeading eyebrow={isEnglish ? 'Real benefits' : 'Beneficios reales'} title={isEnglish ? 'Assigned benefits' : 'Beneficios asignados'} />
          {benefits.length === 0 ? (
            <div className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">
              {isEnglish ? 'No benefits have been assigned yet.' : 'Aún no hay beneficios asignados.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {benefits.map((benefit) => (
                <article key={benefit.id} className="min-w-0 rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_13px_28px_rgba(74,32,28,0.05)]">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f7ece2] text-[var(--color-burgundy)]"><Gift size={18} /></span>
                  <h3 className="mt-3 break-words text-[14px] font-semibold leading-tight text-[var(--color-ink)]">{benefit.benefitCode}</h3>
                  <p className="mt-2 text-[11px] leading-4 text-[var(--color-muted)]">{benefit.description ?? (isEnglish ? 'Benefit details pending.' : 'Detalle del beneficio pendiente.')}</p>
                  <p className="mt-2 text-[10px] text-[var(--color-muted)]">{benefit.usedCount}{benefit.usageLimit ? `/${benefit.usageLimit}` : ''}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <SectionHeading eyebrow={isEnglish ? 'Available plans' : 'Planes disponibles'} title={isEnglish ? 'Published plans' : 'Planes publicados'} />
          {loading ? (
            <p className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">{isEnglish ? 'Loading published plans...' : 'Cargando planes publicados...'}</p>
          ) : error ? (
            <button type="button" onClick={retry} className="rounded-[1.2rem] border border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] p-5 text-left text-[12px] text-[var(--color-alert)]">{error} {isEnglish ? 'Retry' : 'Reintentar'}</button>
          ) : plans.length === 0 ? (
            <p className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">{isEnglish ? 'No published plans available.' : 'No hay planes publicados disponibles.'}</p>
          ) : (
            <div className="grid gap-3">
              {plans.map((plan) => (
                <article key={plan.id} className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_13px_28px_rgba(74,32,28,0.05)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">{textField(plan, 'billing_period') || (isEnglish ? 'Period pending' : 'Periodo pendiente')}</p>
                  <h3 className="mt-1 text-[1.55rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{textField(plan, 'name', isEnglish ? 'Membership plan' : 'Plan de membresía')}</h3>
                  <p className="mt-2 text-[13px] font-semibold text-[var(--color-burgundy)]">{formatCurrency(numberField(plan, 'price'), locale)}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="overflow-hidden rounded-[1.3rem] border border-[rgba(220,202,181,0.78)] bg-[linear-gradient(145deg,#fffaf5,#f2dfca)] p-5 shadow-[0_16px_34px_rgba(74,32,28,0.06)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white">
            <Grape size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">{isEnglish ? 'Enrollment' : 'Inscripción'}</p>
            <h3 className="mt-1 text-[1.45rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
              {isEnglish ? 'Payment flow pending' : 'Flujo de pago pendiente'}
            </h3>
          </div>
        </div>
        <p className="mt-4 text-[12px] leading-5 text-[var(--color-muted)]">
          {isEnglish
            ? 'Automatic enrollment, renewal and paid cancellation policies belong to the next commerce phase.'
            : 'La inscripción automática, renovación y reglas con cobro pertenecen a la siguiente fase de comercio.'}
        </p>
      </section>

      <PrimaryButton disabled>{isEnglish ? 'Enrollment available soon' : 'Inscripción disponible próximamente'}</PrimaryButton>
      {featuredPlan ? <p className="text-center text-[11px] text-[var(--color-muted)]">{textField(featuredPlan, 'name')}</p> : null}
    </div>
  )
}
