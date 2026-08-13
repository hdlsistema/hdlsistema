import { Link } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import { appPath } from '../../utils/appRoutes'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { useProfileAvatar } from '../../hooks/useProfileAvatar'

export function AppHeader() {
  const { isEnglish } = useAppPreferences()
  const avatarUrl = useProfileAvatar()
  return (
    <header className="native-app-header sticky top-0 z-50 border-b border-[#d6af71]/48 bg-[linear-gradient(135deg,rgba(59,6,21,.97),rgba(105,13,43,.93)_58%,rgba(74,8,27,.97))] px-[var(--app-pad)] pt-[var(--safe-top)] text-white shadow-[0_14px_34px_rgba(42,4,16,.24),inset_0_-1px_0_rgba(236,198,137,.18)] backdrop-blur-[24px]">
      <div className="grid min-h-[62px] grid-cols-[44px_1fr_44px] items-center gap-2">
        <span aria-hidden="true" />
        <Link to={appPath('/home')} className="flex min-w-0 flex-1 items-center justify-center">
          <img
            src="/Logo-HDL-2.svg"
            alt="Hacienda de Letras"
            className="h-[48px] w-[78px] object-contain brightness-0 invert"
          />
        </Link>
        <Link
          to={appPath('/perfil')}
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
