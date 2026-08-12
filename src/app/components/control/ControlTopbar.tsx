import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  CloudSun,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { notificationsClient, type AdminNotification } from '../../../services/notifications.service'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { LanguageSelector } from '../shared/LanguageSelector'

export function ControlTopbar() {
  const {
    adminName,
    adminRole,
    locale,
    isEnglish,
    t,
  } = useAppPreferences()
  const { session } = useAuth()
  const [timeLabel, setTimeLabel] = useState('')
  const [showAlerts, setShowAlerts] = useState(false)
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
      setAlerts(response.data)
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
  }, [loadAlerts])

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[rgba(200,171,136,0.45)] bg-[rgba(252,247,240,0.68)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-5">
            <div className="hidden overflow-hidden rounded-[1.5rem] border border-white/45 bg-[rgba(255,255,255,0.28)] px-5 py-3 shadow-[0_16px_34px_rgba(84,43,23,0.08)] lg:block">
              <img
                src="/hacienda de letras logo 2.png"
                alt="Hacienda de Letras"
                className="h-16 w-auto object-contain opacity-95"
              />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
                Hacienda de Letras
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted-strong)]">
                {isEnglish
                  ? t('control.operatingCenter')
                  : t('control.operatingCenter')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-full border border-white/40 bg-[rgba(255,255,255,0.38)] px-4 py-2.5 text-sm text-[var(--color-muted-strong)] shadow-[0_14px_34px_rgba(89,45,26,0.08)] backdrop-blur-2xl lg:flex">
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
              className="hidden h-11 w-11 items-center justify-center rounded-full border border-white/45 bg-[rgba(255,255,255,0.34)] text-[var(--color-muted)] shadow-[0_12px_28px_rgba(89,45,26,0.08)] backdrop-blur-2xl md:inline-flex"
            >
              <Search size={16} />
            </button>

            <button
              type="button"
              onClick={() => setShowAlerts(true)}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/45 bg-[rgba(255,255,255,0.34)] text-[var(--color-muted)] shadow-[0_12px_28px_rgba(89,45,26,0.08)] backdrop-blur-2xl"
            >
              <Bell size={16} />
              {unreadCount > 0 ? (
                <span className="absolute right-2 top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-burgundy)] px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </button>



            <div className="hidden items-center gap-3 rounded-full border border-white/45 bg-[rgba(255,255,255,0.34)] px-3 py-2 shadow-[0_12px_28px_rgba(89,45,26,0.08)] backdrop-blur-2xl lg:flex">
              <div className="h-10 w-10 rounded-full bg-[linear-gradient(135deg,var(--color-gold-soft),var(--color-burgundy-soft))]" />
              <div>
                <p className="text-sm font-medium text-[var(--color-ink)]">
                  {adminName}
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  {adminRole}
                </p>
              </div>
              <ChevronDown size={16} className="text-[var(--color-muted)]" />
            </div>


          </div>
        </div>
      </header>

      {showAlerts ? (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-[rgba(33,18,14,0.28)] p-4 backdrop-blur-sm">
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
              >
                <ChevronDown size={16} className="rotate-45" />
              </button>
            </div>

            <div className="space-y-3 p-5">
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
                        <Sparkles size={18} />
                      )}
                    </span>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--color-muted)]">
	                        {item.channel === 'email'
	                          ? 'Correo'
	                          : item.channel === 'push'
	                            ? 'Notificación'
	                            : item.channel === 'sms'
	                              ? 'Mensaje'
	                              : 'Operación'}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
                        {item.title}
                      </p>
                      <p className="mt-2 text-[12px] leading-6 text-[var(--color-muted-strong)]">
                        {item.body}
                      </p>
                    </div>
                  </div>
                )
                return item.deepLink ? (
                  <Link
                    key={item.id}
                    to={item.deepLink}
                    onClick={() => setShowAlerts(false)}
                    className="block rounded-[1.1rem] border border-[rgba(200,171,136,0.36)] bg-[rgba(255,255,255,0.48)] p-4"
                  >
                    {content}
                  </Link>
                ) : (
                  <article
                    key={item.id}
                    className="rounded-[1.1rem] border border-[rgba(200,171,136,0.36)] bg-[rgba(255,255,255,0.48)] p-4"
                  >
                    {content}
                  </article>
                )
              }) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
