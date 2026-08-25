import { useCallback, useEffect, useState } from 'react'
import { BadgeCheck, Crown, Gift, Grape } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import {
  customerClient,
  type CustomerLoyaltySummary,
  type CustomerMembership,
  type CustomerMembershipBenefit,
} from '../../../services/customer.service'
import { AppSectionHeader, BackButton, EmptyState, ErrorState, HeroEditorial, LoadingState, PrimaryButton, StatusBadge } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicContent } from '../../hooks/usePublicContent'
import { formatCurrency, numberField, textField } from '../../utils/publicContent'

function formatDate(value: string | null | undefined, locale: string, fallback: string) {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
}

export function ClubScreen() {
  const { t, locale } = useAppPreferences()
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
      setMembershipError(t('app.premium.club.loadError'))
    } finally {
      setLoadingMembership(false)
    }
  }, [t, token])

  useEffect(() => {
    void loadMembership()
  }, [loadMembership])

  return (
    <div className="app-page space-y-6">
      <BackButton />

      <HeroEditorial
        eyebrow={t('app.premium.club.eyebrow')}
        title={t('app.premium.club.title')}
        subtitle={t('app.premium.club.subtitle')}
        image="/hacienda 2.jpg"
        alt={t('app.premium.club.title')}
      />

      <section className="rounded-[1.15rem] bg-[rgba(255,250,242,0.88)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{t('app.premium.club.currentStatus')}</p>
            <h2 className="mt-1 text-[1.8rem] leading-none text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>
              {loadingMembership
                ? t('common.loading')
                : membership?.plan?.name ?? t('app.premium.club.noMembership')}
            </h2>
          </div>
          {membership ? <StatusBadge tone="success"><BadgeCheck size={12} /> {membership.status}</StatusBadge> : null}
        </div>

        {membershipError ? (
          <button type="button" onClick={() => void loadMembership()} className="mt-4 text-[12px] font-semibold text-[var(--color-burgundy)]">
            {membershipError} {t('app.premium.retry')}
          </button>
        ) : membership ? (
	          <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(92px,1fr))] gap-2">
            {[
              [String(loyalty?.pointsBalance ?? membership.pointsBalance ?? 0), t('app.premium.profile.points')],
              [formatDate(membership.renewalDate, locale, t('common.toBeConfirmed')), t('app.premium.club.renewal')],
              [formatDate(membership.expiresAt, locale, t('common.toBeConfirmed')), t('app.premium.club.expiration')],
            ].map(([value, label]) => (
              <div key={label} className="rounded-[1rem] bg-[var(--color-surface-warm)] p-3 text-center">
                <p className="break-words text-[13px] font-semibold text-[var(--color-burgundy)]">{value}</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-[var(--color-muted)]">{label}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[12px] leading-5 text-[var(--color-muted)]">{t('app.premium.club.paymentPending')}</p>
        )}
      </section>

      {membership ? (
        <section className="space-y-4">
          <AppSectionHeader eyebrow={t('app.premium.club.benefits')} title={t('app.premium.club.benefits')} />
          {benefits.length === 0 ? (
            <EmptyState title={t('app.premium.club.benefits')} description={t('app.premium.informationSoon')} />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(136px,1fr))] gap-3">
              {benefits.map((benefit) => (
                <article key={benefit.id} className="rounded-[1.05rem] bg-[rgba(255,250,242,0.86)] p-4 shadow-[var(--shadow-card)]">
                  <Gift size={18} className="text-[var(--color-burgundy)]" />
                  <h3 className="mt-3 break-words text-[14px] font-semibold leading-tight text-[var(--color-ink)]">{benefit.benefitCode}</h3>
                  <p className="mt-2 text-[11px] leading-4 text-[var(--color-muted)]">{benefit.description ?? t('app.premium.informationSoon')}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <AppSectionHeader eyebrow={t('app.premium.club.plans')} title={t('app.premium.club.plans')} />
          {loading ? (
            <LoadingState label={t('common.loading')} />
          ) : error ? (
            <ErrorState message={error} retryLabel={t('app.premium.retry')} onRetry={retry} />
          ) : plans.length === 0 ? (
            <EmptyState title={t('app.premium.club.plans')} description={t('app.premium.informationSoon')} />
          ) : (
            <div className="grid gap-3">
              {plans.map((plan) => {
                const price = numberField(plan, 'price')
                return (
                  <article key={plan.id} className="rounded-[1.12rem] bg-[rgba(255,250,242,0.88)] p-5 shadow-[var(--shadow-card)]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">{textField(plan, 'billing_period') || t('app.premium.informationSoon')}</p>
                    <h3 className="mt-2 text-[1.55rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{textField(plan, 'name', t('app.premium.club.plans'))}</h3>
                    <p className="mt-3 text-[13px] font-semibold text-[var(--color-burgundy)]">{price > 0 ? formatCurrency(price, locale) : t('app.premium.pricePending')}</p>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      <section className="rounded-[1.15rem] bg-[var(--color-burgundy-deep)] p-5 text-white shadow-[var(--shadow-float)]">
        <Grape size={21} className="text-[#d7bd8e]" />
        <h3 className="mt-3 text-[1.55rem] leading-none" style={{ fontFamily: 'var(--font-display)' }}>{t('app.premium.club.enrollmentSoon')}</h3>
        <p className="mt-3 text-[12px] leading-5 text-white/72">{t('app.premium.club.paymentPending')}</p>
      </section>

      <PrimaryButton disabled>
        <Crown size={16} />
        {t('app.premium.club.enrollmentSoon')}
      </PrimaryButton>
    </div>
  )
}
