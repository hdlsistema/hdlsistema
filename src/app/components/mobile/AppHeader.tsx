import { Link } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import { appPath } from '../../utils/appRoutes'

export function AppHeader() {
  return (
    <header className="native-app-header sticky top-0 z-50 border-b border-white/72 bg-[linear-gradient(135deg,rgba(255,253,249,.88),rgba(247,235,223,.72))] px-[var(--app-pad)] pt-[var(--safe-top)] shadow-[0_8px_30px_rgba(72,31,28,.055)] backdrop-blur-[24px]">
      <div className="grid min-h-[54px] grid-cols-[42px_1fr_42px] items-center gap-2">
        <span aria-hidden="true" />
        <Link to={appPath('/home')} className="flex min-w-0 flex-1 items-center justify-center">
          <img
            src="/hacienda de letras logo 2.png"
            alt="Hacienda de Letras"
            className="h-auto w-[92px] object-contain"
          />
        </Link>
        <Link
          to={appPath('/perfil')}
          className="inline-flex h-10 w-10 items-center justify-center justify-self-end rounded-full border border-white/78 bg-white/58 text-[#690D2B] shadow-[0_8px_20px_rgba(81,25,37,.07)] backdrop-blur-xl"
          aria-label="Perfil"
        >
          <UserRound size={18} strokeWidth={1.45} />
        </Link>
      </div>
    </header>
  )
}
