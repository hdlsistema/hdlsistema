import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, UserRound } from 'lucide-react'
import { appPath } from '../../utils/appRoutes'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { useProfileAvatar } from '../../hooks/useProfileAvatar'
import { useAuth } from '../../../contexts/AuthContext'
import { customerClient } from '../../../services/customer.service'
import { useMobileGuestAccess } from './MobileGuestAccessContext'

export function AppHeader() {
  const { isEnglish } = useAppPreferences()
  const { session } = useAuth()
  const { guardLink } = useMobileGuestAccess()
  const avatarUrl = useProfileAvatar()
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const notificationsPath = `${appPath('/perfil')}#notifications`
  const profilePath = appPath('/perfil')

  const refreshNotifications = useCallback(async () => {
    if (!session?.access_token) {
      setUnreadNotifications(0)
      return
    }
    try {
      const response = await customerClient.notifications(session.access_token, 1)
      setUnreadNotifications(response.unreadCount)
    } catch {
      // La campana no interrumpe la navegación si la red está temporalmente fuera.
    }
  }, [session?.access_token])

  useEffect(() => {
    void refreshNotifications()
    const refresh = () => void refreshNotifications()
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('hdl:push-received', refresh)
    window.addEventListener('hdl:notifications-changed', refresh)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.removeEventListener('hdl:push-received', refresh)
      window.removeEventListener('hdl:notifications-changed', refresh)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [refreshNotifications])

  return (
    <header className="native-app-header sticky top-0 z-50 border-b border-[#d6af71]/48 bg-[linear-gradient(135deg,rgba(59,6,21,.97),rgba(105,13,43,.93)_58%,rgba(74,8,27,.97))] px-[var(--app-pad)] pt-[var(--safe-top)] text-white shadow-[0_14px_34px_rgba(42,4,16,.24),inset_0_-1px_0_rgba(236,198,137,.18)] backdrop-blur-[24px]">
      <div className="grid min-h-[62px] grid-cols-[44px_1fr_44px] items-center gap-2">
        <Link
          to={notificationsPath}
          onClick={(event) => guardLink(event, notificationsPath)}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e7c68f]/42 bg-white/8 text-[#fff7e9] shadow-[0_10px_24px_rgba(14,1,5,.24),inset_0_1px_0_rgba(255,255,255,.14)] backdrop-blur-xl"
          aria-label={isEnglish ? 'Notifications' : 'Notificaciones'}
        >
          <Bell size={18} strokeWidth={1.55} />
          {unreadNotifications > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#5d0a22] bg-[#d8ad62] px-1 text-[9px] font-bold leading-none text-[#4c0b1e]">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          ) : null}
        </Link>
        <Link to={appPath('/home')} className="flex min-w-0 flex-1 items-center justify-center">
          <img
            src="/Logo-HDL-2.svg"
            alt="Hacienda de Letras"
            className="h-[48px] w-[78px] object-contain brightness-0 invert"
          />
        </Link>
        <Link
          to={profilePath}
          onClick={(event) => guardLink(event, profilePath)}
          className="inline-flex h-10 w-10 items-center justify-center justify-self-end overflow-hidden rounded-full border border-[#e7c68f]/52 bg-white/10 text-[#fff7e9] shadow-[0_10px_24px_rgba(14,1,5,.28),inset_0_1px_0_rgba(255,255,255,.18)] backdrop-blur-xl"
          aria-label={isEnglish ? 'Profile' : 'Perfil'}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={isEnglish ? 'Profile photo' : 'Foto de perfil'}
              className="h-full w-full object-cover"
            />
          ) : (
            <UserRound size={18} strokeWidth={1.45} />
          )}
        </Link>
      </div>
    </header>
  )
}
