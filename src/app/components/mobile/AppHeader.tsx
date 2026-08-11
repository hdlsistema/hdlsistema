import { Link } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import { appPath } from '../../utils/appRoutes'

export function AppHeader() {
  return (
    <header className="native-app-header sticky top-0 z-50 border-b border-[rgba(232,221,206,0.74)] bg-[rgba(251,247,240,0.92)] px-[var(--app-pad)] pt-[var(--safe-top)] backdrop-blur-xl">
      <div className="grid min-h-[56px] grid-cols-[44px_1fr_44px] items-center gap-2">
        <span aria-hidden="true" />
        <Link to={appPath('/home')} className="flex min-w-0 flex-1 items-center justify-center">
          <img
            src="/hacienda de letras logo 2.png"
            alt="Hacienda de Letras"
            className="h-auto w-[98px] object-contain"
          />
        </Link>
        <Link
          to={appPath('/perfil')}
          className="inline-flex h-11 w-11 items-center justify-center justify-self-end text-[#690D2B]"
          aria-label="Perfil"
        >
          <UserRound size={20} strokeWidth={1.55} />
        </Link>
      </div>
    </header>
  )
}
