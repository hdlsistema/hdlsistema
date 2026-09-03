import { CalendarDays, Grape, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { appPath } from '../../utils/appRoutes'
import { useMobileGuestAccess } from './MobileGuestAccessContext'

export function QuickActions() {
  const { isEnglish } = useAppPreferences()
  const { guardLink } = useMobileGuestAccess()

  const actions = [
    { label: isEnglish ? 'Buy wine' : 'Comprar vino', to: appPath('/vinos'), icon: ShoppingBag },
    { label: isEnglish ? 'Book experience' : 'Reservar experiencia', to: appPath('/reservacion'), icon: CalendarDays },
    { label: isEnglish ? 'Our events' : 'Nuestros eventos', to: appPath('/nuestros-eventos'), icon: CalendarDays },
    { label: 'Wine Club', to: appPath('/membresias'), icon: Grape },
  ]

  return (
    <section className="grid grid-cols-4 gap-2.5">
      {actions.map(({ label, to, icon: Icon }) => (
        <Link
          key={label}
          to={to}
          onClick={(event) => guardLink(event, to)}
          className="rounded-[1.15rem] border border-[rgba(220,202,181,0.82)] bg-white px-3 pb-3 pt-4 shadow-[var(--shadow-card)]"
        >
          <Icon size={24} strokeWidth={1.7} className="text-[var(--color-burgundy)]" />
          <p className="mt-4 min-h-[62px] text-[13px] font-medium leading-[1.25] text-[var(--color-ink)]">
            {label}
          </p>
          <span className="mt-1 inline-block text-[24px] leading-none text-[var(--color-muted)]">→</span>
        </Link>
      ))}
    </section>
  )
}
