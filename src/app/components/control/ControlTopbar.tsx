import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CircleCheck,
  ChevronDown,
  CloudSun,
  ShieldAlert,
} from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { notificationsClient, type AdminNotification } from '../../../services/notifications.service'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { LanguageSelector } from '../shared/LanguageSelector'

function notificationChannel(channel: string, isEnglish: boolean) {
  const labels: Record<string, [string, string]> = {
    email: ['Correo', 'Email'],
    push: ['Notificación', 'Notification'],
    sms: ['Mensaje', 'Message'],
    control: ['Operación', 'Operations'],
  }
  const [spanish, english] = labels[channel] ?? labels.control
  return isEnglish ? english : spanish
}

function notificationContent(item: AdminNotification, isEnglish: boolean) {
  if (!isEnglish) {
    return { title: item.title, body: item.body }
  }
  if (item.data?.type === 'customer_registered') {
    const customerName = typeof item.data.customerName === 'string' ? item.data.customerName : 'A new customer'
    return {
      title: 'New customer in the app',
      body: `${customerName} created a Hacienda de Letras account.`,
    }
  }
  if (item.data?.type !== 'quote_request_created') {
    return { title: item.title, body: item.body }
  }
  const customerName = typeof item.data.customerName === 'string' ? item.data.customerName : 'A customer'
  const eventType = typeof item.data.eventType === 'string' ? item.data.eventType : 'an event'
  const guestCount = Number(item.data.guestCount ?? 0)
  return {
    title: 'New quote request',
    body: `${customerName} is requesting information for ${eventType}${guestCount > 0 ? ` for ${guestCount} guests` : ''}.`,
  }
}

export function ControlTopbar() {
  const {
    locale,
    isEnglish,
    t,
  } = useAppPreferences()
  const { session, profile, roles, signOut } = useAuth()
  const adminName = profile?.display_name?.trim() || session?.user?.email || 'Usuario'
  const primaryRole = roles.find((role) => role !== 'customer') ?? roles[0]
  const roleLabels: Record<string, string> = {
    super_admin: 'Superadministrador',
    admin: 'Administrador',
    operations: 'Operaciones',
    marketing: 'Marketing',
    finance: 'Finanzas',
    viewer: 'Consulta',
    customer: 'Cliente',
  }
  const adminRole = primaryRole ? roleLabels[primaryRole] ?? primaryRole : 'Usuario'
  const navigate = useNavigate()
  const [timeLabel, setTimeLabel] = useState('')
  const [showAlerts, setShowAlerts] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [alerts, setAlerts] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alertsError, setAlertsError] = useState('')

  useEffect(() => {
    const updateTime = () => {
      setTimeLabel(
        new Intl.DateTimeFormat(locale, {
          hour: 'numeric',
          minute: '2-digit',
        }).format(new Date()),
      )
    }

    updateTime()
    const timer = window.setInterval(updateTime, 60000)

    return () => window.clearInterval(timer)
  }, [locale])

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date()),
    [locale],
  )

  const loadAlerts = useCallback(async () => {
    if (!session?.access_token) {
      setAlerts([])
      setUnreadCount(0)
      setAlertsError('')
      return
    }

    setAlertsLoading(true)
    setAlertsError('')
    try {
      const response = await notificationsClient.list(session.access_token)
      // Defensive filter: never show a read notification even if backend sends one
      setAlerts(response.data.filter((n) => n.status !== 'read' && !n.readAt))
      setUnreadCount(response.unreadCount)
    } catch {
      setAlerts([])
      setUnreadCount(0)
      setAlertsError(t('control.notificationsError'))
    } finally {
      setAlertsLoading(false)
    }
  }, [session?.access_token, t])

  useEffect(() => {
    void loadAlerts()
    const timer = window.setInterval(() => void loadAlerts(), 30000)
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadAlerts()
    }
    document.addEventListener('visibilitychange', refreshWhenVisible)
    window.addEventListener('focus', refreshWhenVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.removeEventListener('focus', refreshWhenVisible)
    }
  }, [loadAlerts])

  const openAlert = useCallback(async (item: AdminNotification) => {
    const unread = item.status !== 'read' && !item.readAt
    if (unread) {
      // Remove immediately from bandeja; polling will not bring it back
      setAlerts((current) => current.filter((entry) => entry.id !== item.id))
      setUnreadCount((current) => Math.max(0, current - 1))
      try {
        await notificationsClient.read(session?.access_token, item.id)
      } catch {
        void loadAlerts()
      }
    }
    if (item.deepLink) {
      setShowAlerts(false)
      navigate(item.deepLink)
    }
  }, [loadAlerts, navigate, session?.access_token])

  return (
    <>
      <header className="control-topbar sticky top-0 z-40 border-b border-[rgba(200,171,136,0.45)] bg-[rgba(252,247,240,0.86)] backdrop-blur-2xl">
        <div className="control-topbar__inner mx-auto flex max-w-[1600px] items-center justify-between">
          <div className="control-topbar__identity flex min-w-0 items-center gap-3">
            <div className="control-topbar__logo hidden lg:block">
              <img
                src="/hacienda de letras logo 2.png"
                alt="Hacienda de Letras"
                className="h-full w-auto object-contain opacity-95"
              />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Hacienda de Letras
              </p>
              <p className="text-xs text-[var(--color-muted-strong)]">
                {isEnglish
                  ? t('control.operatingCenter')
                  : t('control.operatingCenter')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-md border border-white/50 bg-white/36 px-3 text-xs text-[var(--color-muted-strong)] lg:flex">
              <CloudSun size={16} className="text-[var(--color-gold)]" />
              <span>{t('control.localTime')}</span>
              <span className="h-4 w-px bg-[rgba(180,138,85,0.25)]" />
              <span className="capitalize">{dateLabel}</span>
              <span className="h-4 w-px bg-[rgba(180,138,85,0.25)]" />
              <span className="font-semibold text-[var(--color-burgundy)]">
                {timeLabel}
              </span>
            </div>

            <LanguageSelector compact />

            <button
              type="button"
              onClick={() => {
                setShowAlerts(true)
                void loadAlerts()
              }}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/55 bg-white/38 text-[var(--color-muted)]"
            >
              <Bell size={16} />
              {unreadCount > 0 ? (
                <span className="absolute right-2 top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-burgundy)] px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </button>



            <div className="relative hidden lg:block">
            <button
              type="button"
              onClick={() => setShowProfileMenu((current) => !current)}
              className="flex h-9 items-center gap-2 rounded-md border border-white/55 bg-white/38 px-2"
            >
              <div className="h-6 w-6 rounded-full bg-[linear-gradient(135deg,var(--color-gold-soft),var(--color-burgundy-soft))]" />
              <div>
                <p className="max-w-28 truncate text-xs font-medium text-[var(--color-ink)]">
                  {adminName}
                </p>
                <p className="max-w-28 truncate text-[9px] text-[var(--color-muted)]">
                  {adminRole}
                </p>
              </div>
              <ChevronDown size={16} className="text-[var(--color-muted)]" />
            </button>
            {showProfileMenu ? (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-56 overflow-hidden rounded-[1rem] border border-white/45 bg-[rgba(255,250,244,0.92)] p-2 shadow-[0_22px_60px_rgba(45,20,16,0.22)] backdrop-blur-2xl">
                <button type="button" onClick={() => { setShowProfileMenu(false); navigate('/control/configuracion') }} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm text-[var(--color-ink)] hover:bg-[var(--color-soft)]">{isEnglish ? 'My account' : 'Mi cuenta'}</button>
                <button type="button" onClick={() => { setShowProfileMenu(false); navigate('/control/configuracion') }} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm text-[var(--color-ink)] hover:bg-[var(--color-soft)]">{isEnglish ? 'Settings' : 'Configuración'}</button>
                <button type="button" onClick={() => { setShowProfileMenu(false); void signOut().then(() => navigate('/login')) }} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[var(--color-burgundy)] hover:bg-[var(--color-soft)]">{isEnglish ? 'Sign out' : 'Cerrar sesión'}</button>
              </div>
            ) : null}
            </div>


          </div>
        </div>
      </header>

      {showAlerts ? (
        <div className="fixed inset-0 z-[var(--control-z-alerts)] flex items-start justify-end bg-[rgba(33,18,14,0.28)] p-4 backdrop-blur-sm">
          <div className="mt-16 w-full max-w-[420px] overflow-hidden rounded-[1.5rem] border border-white/40 bg-[rgba(255,250,244,0.76)] shadow-[0_28px_80px_rgba(52,20,18,0.24)] backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-[rgba(200,171,136,0.35)] px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
                  {t('control.alertCenter')}
                </p>
                <h3
                  className="mt-1 text-[1.45rem] text-[var(--color-ink)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {isEnglish
                    ? t('control.notifications')
                    : t('control.notifications')}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowAlerts(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(200,171,136,0.36)] bg-white/45 text-[var(--color-burgundy)]"
                aria-label={isEnglish ? 'Close notifications' : 'Cerrar notificaciones'}
              >
                <ChevronDown size={16} className="rotate-45" />
              </button>
            </div>

            <div className="max-h-[min(70dvh,680px)] space-y-3 overflow-y-auto p-5">
              {alertsLoading ? (
                <div className="rounded-[1.1rem] border border-[rgba(200,171,136,0.36)] bg-[rgba(255,255,255,0.48)] px-4 py-8 text-center text-sm text-[var(--color-muted-strong)]">
                  {t('control.notificationsLoading')}
                </div>
              ) : null}

              {!alertsLoading && alertsError ? (
                <div className="rounded-[1.1rem] border border-[rgba(174,73,58,0.28)] bg-[rgba(255,247,243,0.68)] px-4 py-5 text-sm text-[#7b3026]">
                  {alertsError}
                </div>
              ) : null}

              {!alertsLoading && !alertsError && alerts.length === 0 ? (
                <div className="rounded-[1.1rem] border border-[rgba(200,171,136,0.36)] bg-[rgba(255,255,255,0.48)] px-4 py-8 text-center text-sm text-[var(--color-muted-strong)]">
                  {t('control.notificationsEmpty')}
                </div>
              ) : null}

              {!alertsLoading && !alertsError ? alerts.map((item) => {
                const translated = notificationContent(item, isEnglish)
                const content = (
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        item.status === 'failed'
                          ? 'bg-[rgba(104,17,38,0.12)] text-[var(--color-burgundy)]'
                          : 'bg-[rgba(180,138,85,0.14)] text-[var(--color-gold)]'
                      }`}
                    >
                      {item.status === 'failed' ? (
                        <ShieldAlert size={18} />
                      ) : (
                        <CircleCheck size={18} strokeWidth={1.7} />
                      )}
                    </span>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--color-muted)]">
                        {notificationChannel(item.channel, isEnglish)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
                        {translated.title}
                      </p>
                      <p className="mt-2 text-[12px] leading-6 text-[var(--color-muted-strong)]">
                        {translated.body}
                      </p>
                    </div>
                  </div>
                )
                const unread = item.status !== 'read' && !item.readAt
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void openAlert(item)}
                    className={`block w-full rounded-[1.1rem] border p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/70 ${
                      unread
                        ? 'border-[rgba(104,17,38,0.28)] bg-[rgba(255,255,255,0.68)] shadow-[0_10px_24px_rgba(104,17,38,0.08)]'
                        : 'border-[rgba(200,171,136,0.28)] bg-[rgba(255,255,255,0.38)] opacity-80'
                    }`}
                  >
                    {content}
                  </button>
                )
              }) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
