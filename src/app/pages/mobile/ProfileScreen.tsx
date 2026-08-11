import {
  Bell,
  CalendarDays,
  ChevronRight,
  Gift,
  ImageUp,
  LogOut,
  Settings2,
  UserRound,
  WalletCards,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { supabase } from '../../../lib/supabase'
import { customerClient, type CustomerMe, type CustomerMembership, type CustomerReservation, type CustomerLoyaltySummary, type CustomerOrder } from '../../../services/customer.service'
import { AppToast, SectionHeading, StatusBadge } from '../../components/mobile/PremiumMobileUi'
import { AppSelect } from '../../components/mobile/AppSelect'
import { useAppPreferences } from '../../context/AppPreferencesContext'

export function ProfileScreen() {
  const { t, locale } = useAppPreferences()
  const { user, session, profile, refreshProfile, signOut } = useAuth()
  const [customerMe, setCustomerMe] = useState<CustomerMe | null>(null)
  const [reservations, setReservations] = useState<CustomerReservation[]>([])
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [membership, setMembership] = useState<CustomerMembership>(null)
  const [loyalty, setLoyalty] = useState<CustomerLoyaltySummary | null>(null)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [loadingCustomer, setLoadingCustomer] = useState(true)
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  const handleSignOut = async () => {
    await signOut()
  }

  const preferences = customerMe?.preferences
  const customer = customerMe?.customer
  const displayName = profile?.display_name || user?.email || t('app.premium.profile.title')
  const initials = useMemo(() => {
    const source = displayName.split(' ').filter(Boolean)
    return source.slice(0, 2).map((item) => item[0]).join('').toUpperCase() || 'HD'
  }, [displayName])

  useEffect(() => {
    const token = session?.access_token
    if (!token) return
    let active = true
    setLoadingCustomer(true)
    Promise.all([
      customerClient.me(token),
      customerClient.reservations(token, { perPage: 10 }),
      customerClient.orders(token),
      customerClient.membership(token),
      customerClient.membershipLoyalty(token),
    ])
      .then(([meResponse, reservationResponse, orderResponse, membershipResponse, loyaltyResponse]) => {
        if (!active) return
        setCustomerMe(meResponse.data)
        setReservations(reservationResponse.data)
        setOrders(orderResponse.data)
        setMembership(membershipResponse.data)
        setLoyalty(loyaltyResponse.data)
      })
      .catch(() => {
        if (active) setMessage(t('app.premium.profile.loadError'))
      })
      .finally(() => {
        if (active) setLoadingCustomer(false)
      })
    return () => {
      active = false
    }
  }, [session?.access_token, t])

  useEffect(() => {
    let active = true
    async function loadAvatar() {
      if (!profile?.avatar_url) {
        setAvatarUrl('')
        return
      }
      const { data } = await supabase.storage
        .from('avatars')
        .createSignedUrl(profile.avatar_url, 60 * 15)
      if (active) setAvatarUrl(data?.signedUrl ?? '')
    }
    loadAvatar()
    return () => {
      active = false
    }
  }, [profile?.avatar_url])

  useEffect(() => {
    const nextLanguage = preferences?.language ?? profile?.preferred_language ?? 'es'
    setLanguage(nextLanguage === 'en' ? 'en' : 'es')
  }, [preferences?.language, profile?.preferred_language])

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || isSaving) return
    const form = new FormData(event.currentTarget)
    setIsSaving(true)
    setMessage('')
    try {
      const response = await customerClient.updateMe(session?.access_token, {
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        displayName: String(form.get('displayName') ?? ''),
        phone: String(form.get('phone') ?? ''),
        preferredLanguage: language,
        marketingEmail: form.get('marketingEmail') === 'on',
        marketingPush: form.get('marketingPush') === 'on',
        transactionalPush: form.get('transactionalPush') === 'on',
      })
      setCustomerMe(response.data)
      await refreshProfile()
      setMessage(t('app.premium.profile.updated'))
    } catch {
      setMessage(t('app.premium.profile.updateError'))
    } finally {
      setIsSaving(false)
    }
  }

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage(t('app.premium.profile.invalidAvatar'))
      return
    }
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${user.id}/avatar.${extension}`
    setMessage('')
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) {
      setMessage(t('app.premium.profile.uploadAvatarError'))
      return
    }
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: path })
      .eq('id', user.id)
    if (updateError) {
      setMessage(t('app.premium.profile.updateAvatarError'))
      return
    }
    await refreshProfile()
    setMessage(t('app.premium.profile.avatarUpdated'))
  }

  const menuGroups = [
    {
      title: t('app.premium.profile.myActivity'),
      items: [
        { label: t('app.premium.reservation.myBookings'), detail: reservations.length ? `${reservations.length}` : t('app.premium.profile.noBookings'), icon: CalendarDays },
        { label: t('app.premium.profile.orders'), detail: orders.length ? `${orders.length}` : t('app.premium.profile.noOrders'), icon: WalletCards },
        { label: t('app.premium.profile.myBenefits'), detail: membership?.plan?.name ?? t('app.premium.profile.noMembership'), icon: Gift },
      ],
    },
    {
      title: t('app.premium.profile.myAccount'),
      items: [
        { label: t('app.premium.profile.personalData'), detail: customer?.customerNumber ?? t('app.premium.profile.customerProfile'), icon: UserRound },
        { label: t('app.premium.profile.notifications'), detail: preferences?.transactionalPush ? t('app.premium.profile.transactionalEnabled') : t('app.premium.profile.pendingSetup'), icon: Bell },
        { label: t('app.premium.profile.settings'), detail: t('app.premium.profile.privacyAccess'), icon: Settings2 },
      ],
    },
  ]

  return (
    <div className="app-page space-y-6">
      <section className="overflow-hidden rounded-[1.45rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 shadow-[0_18px_38px_rgba(74,32,28,0.08)]">
        <div className="flex items-center gap-3">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(145deg,#6a1028,#a34452)] text-[1.45rem] text-white shadow-[0_12px_28px_rgba(104,13,36,0.2)] min-[390px]:h-20 min-[390px]:w-20 min-[390px]:text-[1.7rem]" style={{ fontFamily: 'var(--font-display)' }}>
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
            <span className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#d2aa61] text-white">
              <WalletCards size={13} />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{t('app.premium.profile.myAccount')}</p>
            <h1 className="mt-1 break-words text-[clamp(28px,7vw,34px)] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
              {displayName}
            </h1>
            <p className="mt-2 text-[12px] text-[var(--color-muted)]">
              {loadingCustomer ? t('app.premium.profile.loading') : customer?.customerNumber ?? t('app.premium.profile.customerPending')}
            </p>
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-[1rem] border border-[rgba(104,13,36,0.2)] bg-white px-4 py-3 text-[12px] font-semibold text-[var(--color-burgundy)]">
          <ImageUp size={15} />
          {t('app.premium.profile.updateAvatar')}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadAvatar} />
        </label>

        <form className="mt-5 grid gap-3" onSubmit={saveProfile}>
          <input name="firstName" defaultValue={customerMe?.profile.firstName ?? profile?.first_name ?? ''} placeholder={t('app.premium.profile.firstName')} className="w-full min-w-0 rounded-[0.9rem] border border-[#dccab5] bg-white px-4 py-3 text-[14px] outline-none" />
          <input name="lastName" defaultValue={customerMe?.profile.lastName ?? profile?.last_name ?? ''} placeholder={t('app.premium.profile.lastName')} className="w-full min-w-0 rounded-[0.9rem] border border-[#dccab5] bg-white px-4 py-3 text-[14px] outline-none" />
          <input name="displayName" defaultValue={customerMe?.profile.displayName ?? profile?.display_name ?? ''} placeholder={t('app.premium.profile.displayName')} className="w-full min-w-0 rounded-[0.9rem] border border-[#dccab5] bg-white px-4 py-3 text-[14px] outline-none" />
          <input name="phone" defaultValue={customerMe?.profile.phone ?? profile?.phone ?? ''} placeholder={t('app.premium.profile.phone')} className="w-full min-w-0 rounded-[0.9rem] border border-[#dccab5] bg-white px-4 py-3 text-[14px] outline-none" />
          <AppSelect
            value={language}
            onChange={(value) => setLanguage(value === 'en' ? 'en' : 'es')}
            ariaLabel="Idioma"
            options={[
              { value: 'es', label: 'Español' },
              { value: 'en', label: 'English' },
            ]}
          />
          <label className="flex items-center gap-3 rounded-[0.9rem] border border-[#dccab5] bg-white px-4 py-3 text-[12px] text-[var(--color-ink)]">
            <input name="marketingEmail" type="checkbox" defaultChecked={preferences?.marketingEmail ?? true} />
            {t('app.premium.profile.marketingEmail')}
          </label>
          <label className="flex items-center gap-3 rounded-[0.9rem] border border-[#dccab5] bg-white px-4 py-3 text-[12px] text-[var(--color-ink)]">
            <input name="marketingPush" type="checkbox" defaultChecked={preferences?.marketingPush ?? true} />
            {t('app.premium.profile.marketingPush')}
          </label>
          <label className="flex items-center gap-3 rounded-[0.9rem] border border-[#dccab5] bg-white px-4 py-3 text-[12px] text-[var(--color-ink)]">
            <input name="transactionalPush" type="checkbox" defaultChecked={preferences?.transactionalPush ?? true} />
            {t('app.premium.profile.transactionalNotifications')}
          </label>
          <button disabled={isSaving} type="submit" className="rounded-[1rem] bg-[var(--color-burgundy)] px-4 py-3 text-[13px] font-semibold text-white disabled:opacity-60">
            {isSaving ? t('app.premium.profile.saving') : t('app.premium.profile.save')}
          </button>
          <AppToast message={message} />
        </form>

        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(124px,1fr))] gap-3">
          {[
            [String(reservations.length), t('app.premium.profile.reservations')],
            [String(orders.length), t('app.premium.profile.orders')],
            [String(loyalty?.pointsBalance ?? membership?.pointsBalance ?? 0), t('app.premium.profile.points')],
          ].map(([value, label]) => (
            <div key={label} className="rounded-[1rem] bg-[#fff8f1] p-3">
              <p className="text-[1.55rem] leading-none text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
              <p className="mt-1 text-[10px] text-[var(--color-muted)]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {membership ? (
      <section className="rounded-[1.3rem] bg-[linear-gradient(135deg,#5b0e22,#8d2038)] p-5 text-white shadow-[0_18px_38px_rgba(93,15,35,0.2)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#efcf93]">{membership.status}</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-[1.8rem] leading-none" style={{ fontFamily: 'var(--font-display)' }}>{membership.plan?.name ?? t('app.nav.club')}</p>
            <p className="mt-2 text-[11px] text-white/75">{membership.renewalDate ? `${t('app.premium.profile.renewal')}: ${new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(membership.renewalDate))}` : t('app.premium.profile.renewalPending')}</p>
          </div>
          <span className="rounded-full border border-white/20 px-3 py-1.5 text-[10px]">{t('app.premium.profile.viewClub')}</span>
        </div>
      </section>
      ) : (
        <section className="rounded-[1.3rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)] shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
          {t('app.premium.profile.noMembershipYet')}
        </section>
      )}

      {menuGroups.map((group) => (
        <section key={group.title} className="space-y-3">
          <SectionHeading title={group.title} />
          <div className="overflow-hidden rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
            {group.items.map((item, index) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`flex w-full items-center gap-3 px-4 py-4 text-left ${index > 0 ? 'border-t border-[rgba(220,202,181,0.52)]' : ''}`}
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f8eee5] text-[var(--color-burgundy)]">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-[var(--color-ink)]">{item.label}</span>
                    <span className="mt-1 block overflow-wrap-anywhere text-[11px] text-[var(--color-muted)]" style={{ overflowWrap: 'anywhere' }}>{item.detail}</span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-[var(--color-muted)]" />
                </button>
              )
            })}
          </div>
        </section>
      ))}

      <section className="space-y-3">
        <SectionHeading title={t('app.premium.profile.orders')} />
        {orders.length === 0 ? (
          <div className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)] shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
            {t('app.premium.profile.noOrdersYet')}
          </div>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <article key={order.id} className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[var(--color-ink)]">{order.orderNumber}</p>
                    <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                    {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(order.createdAt))}
                    </p>
                  </div>
                  <StatusBadge tone="warning">
                    {order.status}
                  </StatusBadge>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[var(--color-muted)]">
                  <span>{order.items.length} {order.items.length === 1 ? t('app.premium.cart.item') : t('app.premium.cart.items')}</span>
                  <strong className="text-[var(--color-burgundy)]">
                    {new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }).format(Number(order.total ?? 0))}
                  </strong>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-[var(--color-muted)]">
                  {order.paymentStatus === 'pending_payment'
                    ? t('app.premium.profile.paymentPending')
                    : order.paymentStatus}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <button type="button" onClick={() => void handleSignOut()} className="flex w-full items-center justify-center gap-2 rounded-[1rem] border border-[rgba(104,13,36,0.2)] bg-white px-4 py-3 text-[13px] font-semibold text-[var(--color-burgundy)]">
        <LogOut size={16} />
        {t('app.premium.profile.signOut')}
      </button>
    </div>
  )
}
