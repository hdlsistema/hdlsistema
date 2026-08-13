import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAppPreferences } from '../../context/AppPreferencesContext'

export type ControlNavItem = {
  to: string
  label: string
  icon: LucideIcon
}

type ControlSidebarProps = {
  groups: Array<{
    label: string
    items: ControlNavItem[]
  }>
  onNavigate?: () => void
}

export function ControlSidebar({ groups, onNavigate }: ControlSidebarProps) {
  const { t } = useAppPreferences()
  return (
    <aside id="control-navigation" className="control-sidebar sticky flex flex-col overflow-hidden border border-[rgba(216,182,128,0.18)] bg-[linear-gradient(180deg,#320812,#4f0f1f_48%,#681126)] text-white shadow-[var(--shadow-soft)]">
      <div className="control-sidebar__brand border-b border-white/10">
        <div className="flex items-center gap-3">
          <img
            src="/Logo-HDL-2.svg"
            alt="Hacienda de Letras"
            className="control-sidebar__logo w-auto object-contain brightness-[3.35] saturate-0"
          />
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-[#fff6ea]">Hacienda de Letras</p>
            <p className="mt-0.5 truncate text-[9px] uppercase tracking-[0.14em] text-[rgba(255,241,222,0.62)]">Centro de Control</p>
          </div>
        </div>
      </div>

      <nav className="control-sidebar__nav">
        {groups.map((group) => (
          <div key={group.label} className="control-sidebar__group">
            <p className="control-sidebar__group-label font-semibold uppercase text-[rgba(255,241,222,0.5)]">
              {group.label}
            </p>
            <div>
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={`${group.label}-${to}-${label}`}
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `control-sidebar__item flex items-center text-sm outline-none ring-0 shadow-none transition focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:shadow-none focus-visible:shadow-none ${
                      isActive
                        ? 'border border-[rgba(216,182,128,0.28)] bg-[rgba(180,138,85,0.24)] text-[#fff6ea]'
                        : 'text-[rgba(255,243,229,0.82)] hover:bg-[rgba(255,255,255,0.06)]'
                    }`
                  }
                >
                  <span className="control-sidebar__icon" aria-hidden="true"><Icon size={16} strokeWidth={1.65} /></span>
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <p className="control-sidebar__footer">{t('control.wineOfAguascalientes')}</p>
    </aside>
  )
}
