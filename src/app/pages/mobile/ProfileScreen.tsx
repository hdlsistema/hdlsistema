import {
  Bell,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Gift,
  ImageUp,
  LogOut,
  MapPin,
  Pencil,
  PackageCheck,
  QrCode,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Trash2,
  Truck,
  UserRound,
  WalletCards,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { supabase } from '../../../lib/supabase'
import {
  customerClient,
  type CustomerAccessPass,
  type CustomerAddress,
  type CustomerAddressPayload,
  type CustomerAvailabilitySlot,
  type CustomerMe,
  type CustomerMembership,
  type CustomerNotification,
  type CustomerReservation,
  type CustomerLoyaltySummary,
  type CustomerOrder,
  type CustomerPaymentMethod,
} from '../../../services/customer.service'
import { AccessTicketSheet, ticketStatusLabel } from '../../components/mobile/AccessTicketSheet'
import { AppToast, SectionHeading, StatusBadge } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { notifyProfileAvatarUpdated, useProfileAvatar } from '../../hooks/useProfileAvatar'
import { appPath } from '../../utils/appRoutes'
import {
  emptyCustomerAddress,
  isCustomerAddressComplete,
  normalizeCustomerAddress,
} from '../../utils/customerAddress'
import { AppSelect } from '../../components/mobile/AppSelect'

function isPendingPaymentOrder(order: CustomerOrder) {
  return order.status === 'pending_payment' || order.paymentStatus === 'pending_payment' || order.paymentStatus === 'pending'
}

function translatedStatus(status: string | null | undefined, t: (key: string, fallback?: string) => string) {
  const value = status || 'pending'
  return t(`common.status.${value}`, t('common.status.unknown'))
}

function orderTimeline(order: CustomerOrder, t: (key: string, fallback?: string) => string) {
  const shipping = order.shippingStatus ?? 'not_required'
  const paid = order.status === 'paid' || order.paymentStatus === 'paid' || order.paidAt
  return [
    { key: 'confirmed', label: t('app.premium.profile.timelineConfirmed'), done: Boolean(paid) },
    { key: 'preparing', label: t('app.premium.profile.timelinePreparing'), done: ['pending_preparation', 'preparing', 'awaiting_tracking', 'tracking_assigned', 'shipped', 'delivered'].includes(shipping) },
    { key: 'tracking', label: t('app.premium.profile.timelineTracking'), done: ['tracking_assigned', 'shipped', 'delivered'].includes(shipping) },
    { key: 'shipped', label: t('app.premium.profile.timelineShipped'), done: ['shipped', 'delivered'].includes(shipping) },
    { key: 'delivered', label: t('app.premium.profile.timelineDelivered'), done: shipping === 'delivered' },
  ]
}

function normalizeSlot(slot: CustomerAvailabilitySlot) {
  return {
    id: slot.id,
    experienceId: slot.experienceId ?? slot.experience_id ?? '',
    startAt: slot.startAt ?? slot.start_at ?? '',
    available: Number(slot.available ?? 0),
  }
}

function formatDateTime(value: string | null | undefined, locale: string, fallback: string) {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function reservationSchedule(reservation: CustomerReservation, locale: string, fallback: string) {
  if (reservation.reservationType === 'restaurant' && reservation.reservationDate) {
    const date = new Date(`${reservation.reservationDate}T12:00:00`)
    if (!Number.isNaN(date.getTime())) {
      const formatted = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
      return reservation.reservationTime ? `${formatted} · ${reservation.reservationTime.slice(0, 5)}` : formatted
    }
  }
  if (reservation.reservationType === 'cabin' && reservation.checkIn) {
    const start = new Date(`${reservation.checkIn}T12:00:00`)
    const end = reservation.checkOut ? new Date(`${reservation.checkOut}T12:00:00`) : null
    if (!Number.isNaN(start.getTime())) {
      const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
      return end && !Number.isNaN(end.getTime())
        ? `${formatter.format(start)} – ${formatter.format(end)}`
        : formatter.format(start)
    }
  }
  return formatDateTime(reservation.startAt, locale, fallback)
}

function reservationAccessPasses(reservation: CustomerReservation, passes: CustomerAccessPass[]) {
  const embeddedPasses = [
    ...(reservation.accessPasses ?? []),
    ...(reservation.accessPass ? [reservation.accessPass] : []),
  ]
  const relatedPasses = passes.filter((pass) => (
    (pass.reservationId && pass.reservationId === reservation.id)
    || (pass.reservationNumber && pass.reservationNumber === reservation.reservationNumber)
  ))
  const byId = new Map<string, CustomerAccessPass>()
  for (const pass of [...embeddedPasses, ...relatedPasses]) {
    if (isProfileAccessPass(pass)) byId.set(pass.id, pass)
  }
  return [...byId.values()]
}

function makeIdempotencyKey(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function isProfileAccessPass(pass: CustomerAccessPass) {
  return !pass.revokedAt && Boolean(pass.qrPayload || pass.qrToken)
}

function PreferenceControl({ name, label, detail, defaultChecked }: { name: string; label: string; detail: string; defaultChecked: boolean }) {
  return (
    <label className="group flex cursor-pointer items-center gap-3 rounded-[0.95rem] border border-[#dccab5] bg-white px-4 py-3 text-[var(--color-ink)] shadow-[0_6px_16px_rgba(74,32,28,0.035)]">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border border-[rgba(104,13,43,0.32)] bg-[#fffaf3] text-transparent transition peer-checked:border-[#690d2b] peer-checked:bg-[#690d2b] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#d9bd8a] peer-focus-visible:ring-offset-2">
        <CheckCircle2 size={15} strokeWidth={2.2} />
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold">{label}</span>
        <span className="mt-0.5 block text-[10px] leading-4 text-[var(--color-muted)]">{detail}</span>
      </span>
    </label>
  )
}

export function ProfileScreen() {
  const navigate = useNavigate()
  const { t, locale, language: appLanguage, setLanguage: setAppLanguage } = useAppPreferences()
  const { user, session, profile, refreshProfile, signOut } = useAuth()
  const [customerMe, setCustomerMe] = useState<CustomerMe | null>(null)
  const [reservations, setReservations] = useState<CustomerReservation[]>([])
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [accessPasses, setAccessPasses] = useState<CustomerAccessPass[]>([])
  const [availabilitySlots, setAvailabilitySlots] = useState<ReturnType<typeof normalizeSlot>[]>([])
  const [notifications, setNotifications] = useState<CustomerNotification[]>([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [addressForm, setAddressForm] = useState<CustomerAddressPayload>(() => emptyCustomerAddress())
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [membership, setMembership] = useState<CustomerMembership>(null)
  const [loyalty, setLoyalty] = useState<CustomerLoyaltySummary | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<CustomerPaymentMethod[]>([])
  const avatarUrl = useProfileAvatar()
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [loadingCustomer, setLoadingCustomer] = useState(true)
  const [profileLanguage, setProfileLanguage] = useState<'es' | 'en'>(appLanguage)
  const [selectedTicket, setSelectedTicket] = useState<CustomerAccessPass | null>(null)
  const [reservationBusyId, setReservationBusyId] = useState<string | null>(null)
  const pendingOrdersCount = orders.filter(isPendingPaymentOrder).length
  const profileAccessPasses = useMemo(
    () => accessPasses.filter(isProfileAccessPass),
    [accessPasses],
  )

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
    Promise.allSettled([
      customerClient.me(token),
      customerClient.reservations(token, { perPage: 10 }),
      customerClient.availability(token).catch(() => ({ ok: true as const, data: [] as CustomerAvailabilitySlot[] })),
	      customerClient.orders(token),
      customerClient.accessPasses(token).catch(() => ({ ok: true as const, data: [] as CustomerAccessPass[] })),
	      customerClient.notifications(token),
	      customerClient.addresses(token),
	      customerClient.membership(token),
	      customerClient.membershipLoyalty(token),
	      customerClient.paymentMethods(token).catch(() => ({ ok: true as const, data: [] as CustomerPaymentMethod[] })),
	    ])
	      .then(([meResponse, reservationResponse, availabilityResponse, orderResponse, accessPassResponse, notificationResponse, addressResponse, membershipResponse, loyaltyResponse, paymentMethodResponse]) => {
	        if (!active) return
	        if (meResponse.status === 'fulfilled') setCustomerMe(meResponse.value.data)
	        if (reservationResponse.status === 'fulfilled') setReservations(reservationResponse.value.data)
	        if (availabilityResponse.status === 'fulfilled') setAvailabilitySlots(availabilityResponse.value.data.map(normalizeSlot))
	        if (orderResponse.status === 'fulfilled') setOrders(orderResponse.value.data)
        if (accessPassResponse.status === 'fulfilled') setAccessPasses(accessPassResponse.value.data)
	        if (notificationResponse.status === 'fulfilled') {
	          setNotifications(notificationResponse.value.data)
	          setUnreadNotifications(notificationResponse.value.unreadCount)
	        }
	        if (addressResponse.status === 'fulfilled') setAddresses(addressResponse.value.data)
	        if (membershipResponse.status === 'fulfilled') setMembership(membershipResponse.value.data)
	        if (loyaltyResponse.status === 'fulfilled') setLoyalty(loyaltyResponse.value.data)
	        if (paymentMethodResponse.status === 'fulfilled') setPaymentMethods(paymentMethodResponse.value.data)
	        if ([meResponse, reservationResponse, orderResponse, notificationResponse, addressResponse, membershipResponse, loyaltyResponse].some((result) => result.status === 'rejected')) {
	          setMessage(t('app.premium.profile.loadError'))
	        }
      })
      .finally(() => {
        if (active) setLoadingCustomer(false)
      })
    return () => {
      active = false
    }
  }, [session?.access_token, t])

  useEffect(() => {
    const token = session?.access_token
    if (!token) return
    let active = true
    const refreshCommerce = () => {
      if (document.visibilityState === 'hidden') return
      void Promise.allSettled([
        customerClient.reservations(token, { perPage: 10 }),
        customerClient.availability(token).catch(() => ({ ok: true as const, data: [] as CustomerAvailabilitySlot[] })),
        customerClient.orders(token),
        customerClient.accessPasses(token).catch(() => ({ ok: true as const, data: [] as CustomerAccessPass[] })),
        customerClient.notifications(token),
      ]).then(([reservationResponse, availabilityResponse, orderResponse, accessPassResponse, notificationResponse]) => {
        if (!active) return
        if (reservationResponse.status === 'fulfilled') setReservations(reservationResponse.value.data)
        if (availabilityResponse.status === 'fulfilled') setAvailabilitySlots(availabilityResponse.value.data.map(normalizeSlot))
        if (orderResponse.status === 'fulfilled') setOrders(orderResponse.value.data)
        if (accessPassResponse.status === 'fulfilled') setAccessPasses(accessPassResponse.value.data)
        if (notificationResponse.status === 'fulfilled') {
          setNotifications(notificationResponse.value.data)
          setUnreadNotifications(notificationResponse.value.unreadCount)
        }
      })
    }
    const onVisible = () => { if (document.visibilityState === 'visible') refreshCommerce() }
    window.addEventListener('focus', refreshCommerce)
    window.addEventListener('hdl:push-received', refreshCommerce)
    document.addEventListener('visibilitychange', onVisible)
    const interval = window.setInterval(refreshCommerce, 45_000)
    return () => {
      active = false
      window.removeEventListener('focus', refreshCommerce)
      window.removeEventListener('hdl:push-received', refreshCommerce)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(interval)
    }
  }, [session?.access_token])

  useEffect(() => {
    const nextLanguage = preferences?.language ?? profile?.preferred_language ?? 'es'
    setProfileLanguage(nextLanguage === 'en' ? 'en' : 'es')
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
        preferredLanguage: profileLanguage,
        marketingEmail: form.get('marketingEmail') === 'on',
        marketingPush: form.get('marketingPush') === 'on',
        transactionalPush: form.get('transactionalPush') === 'on',
      })
      setCustomerMe(response.data)
      setAppLanguage(profileLanguage)
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
    notifyProfileAvatarUpdated()
    setMessage(t('app.premium.profile.avatarUpdated'))
  }

  const resetAddressForm = () => {
    setAddressForm(emptyCustomerAddress())
    setEditingAddressId(null)
  }

  const editAddress = (address: CustomerAddress) => {
    setEditingAddressId(address.id)
    setAddressForm(normalizeCustomerAddress(address))
  }

  const saveAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session?.access_token || isSaving) return
    const payload = normalizeCustomerAddress(addressForm)
    if (!isCustomerAddressComplete(payload)) {
      setMessage(t('app.premium.profile.addressRequired'))
      return
    }
    setIsSaving(true)
    setMessage('')
    try {
      const response = editingAddressId
        ? await customerClient.updateAddress(session.access_token, editingAddressId, payload)
        : await customerClient.createAddress(session.access_token, payload)
      setAddresses((current) => {
        if (editingAddressId) return current.map((item) => (item.id === editingAddressId ? response.data : item))
        return [response.data, ...current]
      })
      resetAddressForm()
      setMessage(t('app.premium.profile.addressSaved'))
    } catch {
      setMessage(t('app.premium.profile.addressSaveError'))
    } finally {
      setIsSaving(false)
    }
  }

  const deleteAddress = async (address: CustomerAddress) => {
    if (!session?.access_token || isSaving) return
    setIsSaving(true)
    setMessage('')
    try {
      await customerClient.deleteAddress(session.access_token, address.id)
      setAddresses((current) => current.filter((item) => item.id !== address.id))
      if (editingAddressId === address.id) resetAddressForm()
      setMessage(t('app.premium.profile.addressDeleted'))
    } catch {
      setMessage(t('app.premium.profile.addressDeleteError'))
    } finally {
      setIsSaving(false)
    }
  }

  const setDefaultAddress = async (address: CustomerAddress) => {
    if (!session?.access_token || isSaving) return
    setIsSaving(true)
    setMessage('')
    try {
      const response = await customerClient.updateAddress(session.access_token, address.id, { isDefault: true })
      setAddresses((current) => current.map((item) => ({ ...item, isDefault: item.id === response.data.id })))
      setMessage(t('app.premium.profile.defaultAddressUpdated'))
    } catch {
      setMessage(t('app.premium.profile.addressSaveError'))
    } finally {
      setIsSaving(false)
    }
  }

  const openNotification = async (notification: CustomerNotification) => {
    if (session?.access_token && notification.deepLink) {
      try {
        const response = await customerClient.clickNotification(session.access_token, notification.id)
        setNotifications((current) => current.map((item) => item.id === notification.id ? response.data : item))
        if (!notification.readAt) setUnreadNotifications((current) => Math.max(current - 1, 0))
        window.dispatchEvent(new CustomEvent('hdl:notifications-changed'))
      } catch {
        // El destino sigue disponible aunque falle la métrica no crítica.
      }
    } else if (session?.access_token && !notification.readAt) {
      try {
        const response = await customerClient.readNotification(session.access_token, notification.id)
        setNotifications((current) => current.map((item) => item.id === notification.id ? response.data : item))
        setUnreadNotifications((current) => Math.max(0, current - 1))
        window.dispatchEvent(new CustomEvent('hdl:notifications-changed'))
      } catch {
        // Reading the destination remains available if the read receipt fails.
      }
    }
    if (notification.deepLink?.startsWith('/app')) {
      const destination = new URL(notification.deepLink, window.location.origin)
      const appRoute = destination.pathname.replace(/^\/app/, '') || '/'
      navigate(`${appPath(appRoute)}${destination.search}${destination.hash}`)
    }
  }

  const refreshReservationsAndAccesses = async () => {
    const token = session?.access_token
    if (!token) return
    const [reservationResponse, availabilityResponse, accessPassResponse] = await Promise.allSettled([
      customerClient.reservations(token, { perPage: 10 }),
      customerClient.availability(token).catch(() => ({ ok: true as const, data: [] as CustomerAvailabilitySlot[] })),
      customerClient.accessPasses(token).catch(() => ({ ok: true as const, data: [] as CustomerAccessPass[] })),
    ])
    if (reservationResponse.status === 'fulfilled') setReservations(reservationResponse.value.data)
    if (availabilityResponse.status === 'fulfilled') setAvailabilitySlots(availabilityResponse.value.data.map(normalizeSlot))
    if (accessPassResponse.status === 'fulfilled') setAccessPasses(accessPassResponse.value.data)
  }

  const cancelProfileReservation = async (reservation: CustomerReservation) => {
    if (!session?.access_token || reservationBusyId) return
    setReservationBusyId(reservation.id)
    setMessage('')
    try {
      await customerClient.cancelReservation(session.access_token, reservation.id, t('app.premium.reservation.cancel'))
      setMessage(t('app.premium.reservation.cancelled'))
      await refreshReservationsAndAccesses()
    } catch {
      setMessage(t('app.premium.reservation.cancelError'))
    } finally {
      setReservationBusyId(null)
    }
  }

  const rescheduleProfileReservation = async (reservation: CustomerReservation, slotId: string) => {
    if (!session?.access_token || !slotId || reservationBusyId) return
    setReservationBusyId(reservation.id)
    setMessage('')
    try {
      await customerClient.rescheduleReservation(session.access_token, reservation.id, {
        experienceSlotId: slotId,
        idempotencyKey: makeIdempotencyKey('profile_reschedule'),
      })
      setMessage(t('app.premium.reservation.rescheduled'))
      await refreshReservationsAndAccesses()
    } catch {
      setMessage(t('app.premium.reservation.rescheduleError'))
    } finally {
      setReservationBusyId(null)
    }
  }

  const menuGroups = [
    {
      title: t('app.premium.profile.myActivity'),
      items: [
        { label: t('app.premium.reservation.myBookings'), detail: reservations.length ? `${reservations.length}` : t('app.premium.profile.noBookings'), icon: CalendarDays, to: '#reservations' },
        { label: t('app.premium.profile.orders'), detail: pendingOrdersCount ? `${pendingOrdersCount} ${t('app.premium.profile.pendingPaymentShort')}` : orders.length ? `${orders.length}` : t('app.premium.profile.noOrders'), icon: WalletCards, to: appPath('/carrito') },
        { label: t('app.premium.profile.myBenefits'), detail: membership?.plan?.name ?? t('app.premium.profile.noMembership'), icon: Gift, to: appPath('/membresias') },
      ],
    },
    {
      title: t('app.premium.profile.myAccount'),
      items: [
        { label: t('app.premium.profile.personalData'), detail: customer?.customerNumber ?? t('app.premium.profile.customerProfile'), icon: UserRound, to: '#profile-form' },
        { label: t('app.premium.profile.notifications'), detail: unreadNotifications ? `${unreadNotifications} ${t('app.premium.profile.unread')}` : preferences?.transactionalPush ? t('app.premium.profile.transactionalEnabled') : t('app.premium.profile.pendingSetup'), icon: Bell, to: '#notifications' },
        { label: t('app.premium.profile.privacyAndAccount'), detail: t('app.premium.profile.privacyAndAccountDetail'), icon: Settings2, to: appPath('/privacidad-cuenta') },
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
            <h1 className="mt-1 break-words text-[clamp(23px,6vw,29px)] font-medium leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
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

        <form id="profile-form" className="mt-5 grid gap-3 scroll-mt-24" onSubmit={saveProfile}>
          <input name="firstName" defaultValue={customerMe?.profile.firstName ?? profile?.first_name ?? ''} placeholder={t('app.premium.profile.firstName')} className="w-full min-w-0 rounded-[0.9rem] border border-[#dccab5] bg-white px-4 py-3 text-[14px] outline-none" />
          <input name="lastName" defaultValue={customerMe?.profile.lastName ?? profile?.last_name ?? ''} placeholder={t('app.premium.profile.lastName')} className="w-full min-w-0 rounded-[0.9rem] border border-[#dccab5] bg-white px-4 py-3 text-[14px] outline-none" />
          <input name="displayName" defaultValue={customerMe?.profile.displayName ?? profile?.display_name ?? ''} placeholder={t('app.premium.profile.displayName')} className="w-full min-w-0 rounded-[0.9rem] border border-[#dccab5] bg-white px-4 py-3 text-[14px] outline-none" />
          <input name="phone" defaultValue={customerMe?.profile.phone ?? profile?.phone ?? ''} placeholder={t('app.premium.profile.phone')} className="w-full min-w-0 rounded-[0.9rem] border border-[#dccab5] bg-white px-4 py-3 text-[14px] outline-none" />
          <div className="grid grid-cols-2 gap-2 rounded-full border border-[#dccab5] bg-white/78 p-1">
            {(['es', 'en'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setProfileLanguage(value)}
                className={`min-h-10 rounded-full text-[12px] font-semibold transition ${profileLanguage === value ? 'bg-[var(--color-burgundy)] text-white' : 'text-[var(--color-muted-strong)]'}`}
              >
                {value === 'es' ? 'Español' : 'English'}
              </button>
            ))}
          </div>
          <div className="mt-1">
            <p className="text-[11px] font-semibold text-[var(--color-ink)]">{t('app.premium.profile.communicationPreferences')}</p>
            <p className="mt-1 text-[10px] leading-4 text-[var(--color-muted)]">{t('app.premium.profile.communicationPreferencesCopy')}</p>
          </div>
          <PreferenceControl
            key={`marketing-email-${String(preferences?.marketingEmail)}`}
            name="marketingEmail"
            label={t('app.premium.profile.marketingEmail')}
            detail={t('app.premium.profile.marketingEmailDetail')}
            defaultChecked={preferences?.marketingEmail ?? true}
          />
          <PreferenceControl
            key={`marketing-push-${String(preferences?.marketingPush)}`}
            name="marketingPush"
            label={t('app.premium.profile.marketingPush')}
            detail={t('app.premium.profile.marketingPushDetail')}
            defaultChecked={preferences?.marketingPush ?? true}
          />
          <PreferenceControl
            key={`transactional-push-${String(preferences?.transactionalPush)}`}
            name="transactionalPush"
            label={t('app.premium.profile.transactionalNotifications')}
            detail={t('app.premium.profile.transactionalNotificationsDetail')}
            defaultChecked={preferences?.transactionalPush ?? true}
          />
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
	      <Link to={appPath('/membresias')} className="block rounded-[1.3rem] bg-[linear-gradient(135deg,#5b0e22,#8d2038)] p-5 text-white shadow-[0_18px_38px_rgba(93,15,35,0.2)]">
	        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#efcf93]">{membership.status}</p>
	        <div className="mt-2 flex items-end justify-between gap-3">
	          <div>
            <p className="text-[1.8rem] leading-none" style={{ fontFamily: 'var(--font-display)' }}>{membership.plan?.name ?? t('app.nav.club')}</p>
            <p className="mt-2 text-[11px] text-white/75">{membership.renewalDate ? `${t('app.premium.profile.renewal')}: ${new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(membership.renewalDate))}` : t('app.premium.profile.renewalPending')}</p>
	          </div>
	          <span className="rounded-full border border-white/20 px-3 py-1.5 text-[10px]">{t('app.premium.profile.viewClub')}</span>
	        </div>
	      </Link>
	      ) : (
	        <Link to={appPath('/membresias')} className="block rounded-[1.3rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)] shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
	          {t('app.premium.profile.noMembershipYet')}
	        </Link>
	      )}

      <section className="space-y-3 scroll-mt-24" id="accesses">
        <SectionHeading eyebrow={t('app.premium.events.ticket', 'Accesos')} title={t('app.premium.ticket.myAccesses', 'Mis boletos y accesos')} />
        {profileAccessPasses.length === 0 ? (
          <div className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)] shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
            {t('app.premium.ticket.noEventPasses', 'Los boletos pagados aparecerán aquí con su código QR de entrada.')}
          </div>
        ) : (
          <div className="grid gap-3">
            {profileAccessPasses.slice(0, 8).map((pass) => (
              <article key={pass.id} className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">{pass.passNumber ?? pass.reservationNumber ?? pass.orderNumber}</p>
                    <h3 className="mt-1 break-words text-[16px] font-semibold leading-tight text-[var(--color-ink)]">{pass.title ?? t('app.premium.ticket.access', 'Acceso')}</h3>
                    <p className="mt-1 text-[11px] leading-4 text-[var(--color-muted)]">
                      {pass.startsAt ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(pass.startsAt)) : t('common.toBeConfirmed')}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#f8eee5] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-burgundy)]">
                    {ticketStatusLabel(pass, t)}
                  </span>
                </div>
                <button type="button" onClick={() => setSelectedTicket(pass)} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-burgundy)] px-4 text-[12px] font-semibold text-white">
                  <QrCode size={15} />
                  {t('app.premium.ticket.show', 'Ver boleto QR')}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 scroll-mt-24" id="reservations">
        <div className="flex items-start justify-between gap-3">
          <SectionHeading eyebrow={t('app.premium.reservation.myBookings')} title={t('app.premium.reservation.yourBookings')} />
          <button type="button" onClick={() => void refreshReservationsAndAccesses()} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-burgundy)] shadow-[0_10px_22px_rgba(74,32,28,0.08)]" aria-label={t('app.premium.reservation.refresh')}>
            <RefreshCw size={15} />
          </button>
        </div>
        {reservations.length === 0 ? (
          <div className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)] shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
            {t('app.premium.reservation.noReservations')}
          </div>
        ) : (
          <div className="grid gap-3">
            {reservations.slice(0, 10).map((reservation) => {
              const passes = reservationAccessPasses(reservation, profileAccessPasses)
              const canManage = ['pending', 'confirmed'].includes(reservation.status)
              const rescheduleSlots = availabilitySlots
                .filter((slot) => slot.experienceId === reservation.experienceId && slot.id !== reservation.slotId)
                .slice(0, 8)
              return (
                <article key={reservation.id} className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">{reservation.reservationNumber}</p>
                      <h3 className="mt-1 break-words text-[15px] font-semibold leading-tight text-[var(--color-ink)]">{reservation.title ?? reservation.experienceTitle}</h3>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] leading-4 text-[var(--color-muted)]">
                        <Clock3 size={12} className="shrink-0" />
                        {reservationSchedule(reservation, locale, t('common.toBeConfirmed'))}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#f8eee5] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-burgundy)]">
                      {translatedStatus(reservation.status, t)}
                    </span>
                  </div>

                  {passes.length > 0 ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {passes.map((pass, index) => (
                        <button key={pass.id} type="button" onClick={() => setSelectedTicket(pass)} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--color-burgundy)] px-3 text-[11px] font-semibold text-white">
                          <QrCode size={13} />
                          {passes.length > 1 ? `QR ${index + 1} de ${passes.length}` : t('app.premium.ticket.show', 'Ver boleto QR')}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {reservation.paymentStatus === 'pending' && reservation.paymentOrderId ? (
                    <Link to={`${appPath('/checkout')}?orderId=${encodeURIComponent(reservation.paymentOrderId)}`} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-burgundy)] px-4 text-[11px] font-semibold text-white">
                      {t('app.premium.reservation.completePayment', 'Completar pago')}
                      <ChevronRight size={14} />
                    </Link>
                  ) : null}

                  {canManage ? (
                    <div className="mt-3 grid gap-2">
                      {reservation.reservationType === 'experience' && rescheduleSlots.length > 0 ? (
                        <AppSelect
                          value=""
                          onChange={(value) => value && void rescheduleProfileReservation(reservation, value)}
                          disabled={reservationBusyId === reservation.id}
                          options={[
                            { value: '', label: t('app.premium.reservation.rescheduleTo') },
                            ...rescheduleSlots.map((slot) => ({
                              value: slot.id,
                              label: `${formatDateTime(slot.startAt, locale, t('common.toBeConfirmed'))} · ${slot.available}`,
                            })),
                          ]}
                        />
                      ) : null}
                      <button type="button" onClick={() => void cancelProfileReservation(reservation)} disabled={reservationBusyId === reservation.id} className="rounded-[0.9rem] border border-[rgba(157,71,63,0.28)] px-3 py-2 text-[11px] font-semibold text-[var(--color-alert)] disabled:opacity-50">
                        {reservationBusyId === reservation.id ? t('app.premium.reservation.processing') : t('app.premium.reservation.cancel')}
                      </button>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {menuGroups.map((group) => (
        <section key={group.title} className="space-y-3">
          <SectionHeading title={group.title} />
          <div className="overflow-hidden rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
            {group.items.map((item, index) => {
              const Icon = item.icon
              const isHash = item.to.startsWith('#')
              const rowClass = `flex w-full items-center gap-3 px-4 py-4 text-left ${index > 0 ? 'border-t border-[rgba(220,202,181,0.52)]' : ''}`
              const rowContent = (
                <>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f8eee5] text-[var(--color-burgundy)]">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-[var(--color-ink)]">{item.label}</span>
                    <span className="mt-1 block overflow-wrap-anywhere text-[11px] text-[var(--color-muted)]" style={{ overflowWrap: 'anywhere' }}>{item.detail}</span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-[var(--color-muted)]" />
                </>
              )
              // Hash targets don't scroll in Capacitor WebView via React Router Link
              return isHash ? (
                <button
                  key={item.label}
                  type="button"
                  className={rowClass}
                  onClick={() => document.getElementById(item.to.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  {rowContent}
                </button>
              ) : (
                <Link key={item.label} to={item.to} className={rowClass}>
                  {rowContent}
                </Link>
              )
            })}
          </div>
        </section>
      ))}

      <section className="space-y-3" id="payment-methods">
        <SectionHeading
          title={t('app.premium.profile.paymentMethods')}
          subtitle={t('app.premium.profile.paymentMethodsCopy')}
        />
        {paymentMethods.length === 0 ? (
          <div className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)] shadow-[0_14px_30px_rgba(74,32,28,0.05)]">
            {t('app.premium.profile.paymentMethodsEmpty')}
          </div>
        ) : (
          <div className="grid gap-3">
            {paymentMethods.map((method) => (
              <article key={method.id} className="flex items-center gap-3 rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.05)]">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f8eee5] text-[var(--color-burgundy)]"><WalletCards size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold capitalize text-[var(--color-ink)]">{method.brand ?? method.type} •••• {method.last4 ?? '----'}</p>
                  <p className="mt-1 text-[11px] text-[var(--color-muted)]">{t('app.premium.profile.paymentMethodExpires')} {String(method.expMonth ?? '').padStart(2, '0')}/{method.expYear ?? '----'}</p>
                </div>
                <ShieldCheck size={17} className="shrink-0 text-[#252F37]" />
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3" id="addresses">
        <SectionHeading
          title={t('app.premium.profile.shippingAddresses')}
          subtitle={t('app.premium.profile.shippingAddressesCopy')}
        />
        <div className="space-y-3">
          {addresses.length === 0 ? (
            <p className="rounded-[1rem] border border-[rgba(220,202,181,0.72)] bg-white/78 p-4 text-[11px] leading-5 text-[var(--color-muted)]">
              {t('app.premium.profile.shippingAddressesEmpty')}
            </p>
          ) : null}
          {addresses.map((address) => (
            <article key={address.id} className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f8eee5] text-[var(--color-burgundy)]">
                  <MapPin size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[var(--color-ink)]">
                    {address.label || address.recipientName}
                    {address.isDefault ? <span className="ml-2 rounded-full bg-[#f8eee5] px-2 py-1 text-[10px] text-[var(--color-burgundy)]">{t('app.premium.profile.defaultAddress')}</span> : null}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)]">
                    {address.recipientName}<br />
                    {address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />
                    {address.city}, {address.state} {address.postalCode}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => editAddress(address)} className="inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-full border border-[rgba(104,13,36,0.18)] bg-white px-3 text-[10px] font-semibold leading-tight text-[var(--color-burgundy)]">
                  <Pencil className="shrink-0" size={13} />
                  <span className="min-w-0">{t('common.edit')}</span>
                </button>
                <button type="button" onClick={() => void deleteAddress(address)} disabled={isSaving} className="inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-full border border-[rgba(104,13,36,0.18)] bg-white px-3 text-[10px] font-semibold leading-tight text-[var(--color-burgundy)] disabled:opacity-50">
                  <Trash2 className="shrink-0" size={13} />
                  <span className="min-w-0">{t('common.delete')}</span>
                </button>
                <button type="button" onClick={() => void setDefaultAddress(address)} disabled={address.isDefault || isSaving} className="col-span-2 inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-full border border-[rgba(104,13,36,0.18)] bg-white px-4 text-[10px] font-semibold leading-tight text-[var(--color-burgundy)] disabled:opacity-50">
                  <CheckCircle2 className="shrink-0" size={13} />
                  <span className="min-w-0 break-words text-center">{t('app.premium.profile.makeDefault')}</span>
                </button>
              </div>
            </article>
          ))}
        </div>

        <form onSubmit={saveAddress} className="grid gap-3 rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white/90 p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
          <p className="text-[13px] font-semibold text-[var(--color-ink)]">
            {editingAddressId ? t('app.premium.profile.editAddress') : t('app.premium.profile.newShippingAddress')}
          </p>
          <p className="text-[11px] font-semibold leading-5 text-[var(--color-burgundy)]">{t('app.premium.profile.allAddressFieldsRequired')}</p>
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
              type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
              inputMode={key === 'postalCode' ? 'numeric' : undefined}
              autoComplete={key === 'email' ? 'email' : key === 'phone' ? 'tel' : key === 'postalCode' ? 'postal-code' : undefined}
              required
              aria-required="true"
              placeholder={`${placeholder} *`}
              className="min-h-12 rounded-[0.95rem] border border-[#dccab5] bg-white px-4 text-[13px] text-[var(--color-ink)] outline-none"
            />
          ))}
          <textarea
            value={addressForm.references ?? ''}
            onChange={(event) => setAddressForm((current) => ({ ...current, references: event.target.value }))}
            required
            aria-required="true"
            placeholder={`${t('app.premium.profile.references')} *`}
            className="min-h-[92px] rounded-[0.95rem] border border-[#dccab5] bg-white px-4 py-3 text-[13px] text-[var(--color-ink)] outline-none"
          />
          <button type="button" onClick={() => setAddressForm((current) => ({ ...current, isDefault: !current.isDefault }))} className="flex min-h-11 items-center gap-3 rounded-full bg-[#fff8f1] px-4 text-left text-[12px] text-[var(--color-muted)]">
            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${addressForm.isDefault ? 'border-[var(--color-burgundy)] bg-[var(--color-burgundy)] text-white' : 'border-[rgba(104,13,36,0.25)] text-transparent'}`}>
              <CheckCircle2 size={14} />
            </span>
            {t('app.premium.profile.defaultAddress')}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button disabled={isSaving || !isCustomerAddressComplete(addressForm)} type="submit" className="min-h-11 rounded-full bg-[var(--color-burgundy)] px-4 text-[12px] font-semibold text-white disabled:opacity-60">
              {isSaving ? t('app.premium.profile.saving') : t('app.premium.profile.saveAddress')}
            </button>
            <button type="button" onClick={resetAddressForm} className="min-h-11 rounded-full border border-[rgba(104,13,36,0.18)] bg-white text-[12px] font-semibold text-[var(--color-burgundy)]">
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3 scroll-mt-24" id="notifications">
        <div className="flex items-end justify-between gap-3">
          <SectionHeading title={t('app.premium.profile.notifications')} />
          {unreadNotifications ? <span className="rounded-full bg-[var(--color-burgundy)] px-2.5 py-1 text-[10px] font-semibold text-white">{unreadNotifications} {t('app.premium.profile.unread')}</span> : null}
        </div>
        {notifications.length === 0 ? (
          <div className="rounded-[1.25rem] border border-[rgba(220,202,181,0.72)] bg-white/88 p-5 text-[12px] text-[var(--color-muted)] shadow-[0_14px_30px_rgba(74,32,28,0.05)]">
            {t('app.premium.profile.notificationsEmpty')}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[1.25rem] border border-[rgba(220,202,181,0.72)] bg-white/90 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
            {notifications.slice(0, 8).map((notification, index) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => void openNotification(notification)}
                className={`flex w-full items-start gap-3 px-4 py-4 text-left ${index ? 'border-t border-[rgba(220,202,181,0.48)]' : ''} ${notification.readAt ? 'bg-white/55' : 'bg-[#fff8f1]'}`}
              >
                <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${notification.readAt ? 'bg-[#f5eee8] text-[var(--color-muted)]' : 'bg-[var(--color-burgundy)] text-white'}`}>
                  {String(notification.data?.status ?? '').includes('deliver') ? <PackageCheck size={16} /> : <Truck size={16} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-semibold text-[var(--color-ink)]">{notification.title}</span>
                  <span className="mt-1 block text-[11px] leading-5 text-[var(--color-muted)]">{notification.body}</span>
                  <span className="mt-1.5 block text-[10px] text-[var(--color-gold)]">{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notification.createdAt))}</span>
                </span>
                {notification.deepLink ? <ChevronRight size={15} className="mt-2 shrink-0 text-[var(--color-muted)]" /> : null}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 scroll-mt-24" id="orders">
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
	                  <StatusBadge tone={order.paymentStatus === 'paid' || order.status === 'paid' ? 'success' : 'warning'}>
	                    {translatedStatus(order.status, t)}
	                  </StatusBadge>
                </div>
	                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[var(--color-muted)]">
	                  <span>{order.items.length} {order.items.length === 1 ? t('app.premium.cart.item') : t('app.premium.cart.items')}</span>
	                  <strong className="text-[var(--color-burgundy)]">
	                    {new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }).format(Number(order.total ?? 0))}
	                  </strong>
	                </div>
	                <div className="mt-3 grid gap-2 rounded-[1rem] bg-[#fff8f1] p-3 text-[11px] leading-5 text-[var(--color-muted)]">
	                  {order.items.map((item) => (
	                    <div key={item.id} className="flex justify-between gap-3">
	                      <span className="min-w-0">{item.quantity} x {item.name}</span>
	                      <strong className="shrink-0 text-[var(--color-ink)]">{new Intl.NumberFormat(locale, { style: 'currency', currency: 'MXN' }).format(Number(item.subtotal ?? 0))}</strong>
	                    </div>
	                  ))}
	                </div>
	                {order.shippingAddress ? (
	                  <div className="mt-3 rounded-[1rem] border border-[rgba(220,202,181,0.62)] bg-white/80 p-3 text-[11px] leading-5 text-[var(--color-muted)]">
	                    <p className="mb-1 flex items-center gap-2 font-semibold text-[var(--color-ink)]"><MapPin size={14} /> {t('app.premium.checkout.deliveryAddress')}</p>
	                    {order.shippingAddress.recipientName}<br />
	                    {order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}<br />
	                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
	                  </div>
	                ) : null}
	                <p className="mt-2 text-[11px] leading-5 text-[var(--color-muted)]">
		                  {isPendingPaymentOrder(order)
		                    ? t('app.premium.profile.paymentPending')
		                    : translatedStatus(order.paymentStatus, t)}
		                </p>
	                {order.requiresShipping ? (
	                  <div className="mt-3 rounded-[1rem] border border-[rgba(220,202,181,0.62)] bg-white/82 p-3">
	                    <div className="flex items-center justify-between gap-3">
	                      <p className="flex items-center gap-2 text-[12px] font-semibold text-[var(--color-ink)]"><Truck size={15} /> {translatedStatus(order.shippingStatus, t)}</p>
	                      {order.shipment?.trackingUrl ? (
	                        <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-burgundy)]">
	                          {t('app.premium.profile.trackOrder')} <ExternalLink size={12} />
	                        </a>
	                      ) : null}
	                    </div>
	                    {(order.shipment?.carrier || order.shipment?.trackingNumber) ? (
	                      <p className="mt-2 text-[11px] text-[var(--color-muted)]">
	                        {order.shipment?.carrier ?? t('app.premium.profile.carrierPending')} · {order.shipment?.trackingNumber ?? t('app.premium.profile.trackingPending')}
	                      </p>
	                    ) : null}
	                    <div className="mt-3 grid gap-2">
	                      {orderTimeline(order, t).map((step) => (
	                        <div key={step.key} className="flex items-center gap-2 text-[11px] text-[var(--color-muted)]">
	                          <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${step.done ? 'border-[var(--color-burgundy)] bg-[var(--color-burgundy)] text-white' : 'border-[rgba(104,13,36,0.2)] bg-white text-transparent'}`}>
	                            <PackageCheck size={12} />
	                          </span>
	                          {step.label}
	                        </div>
	                      ))}
	                    </div>
	                  </div>
	                ) : null}
		                {isPendingPaymentOrder(order) ? (
		                  <Link to={`${appPath('/checkout')}?orderId=${encodeURIComponent(order.id)}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-burgundy)] px-4 text-[12px] font-semibold text-white">
	                    {t('app.premium.cart.continuePayment')}
	                    <ChevronRight size={15} />
	                  </Link>
	                ) : null}
	              </article>
            ))}
          </div>
        )}
      </section>

      <button type="button" onClick={() => void handleSignOut()} className="flex w-full items-center justify-center gap-2 rounded-[1rem] border border-[rgba(104,13,36,0.2)] bg-white px-4 py-3 text-[13px] font-semibold text-[var(--color-burgundy)]">
        <LogOut size={16} />
        {t('app.premium.profile.signOut')}
      </button>
      {selectedTicket ? (
        <AccessTicketSheet pass={selectedTicket} locale={locale} t={t} onClose={() => setSelectedTicket(null)} />
      ) : null}
    </div>
  )
}
