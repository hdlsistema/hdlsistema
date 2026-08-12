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
}

export function ControlSidebar({ groups }: ControlSidebarProps) {
  const { t } = useAppPreferences()
  return (
    <aside className="sticky top-6 flex flex-col overflow-hidden rounded-[1.35rem] border border-[rgba(216,182,128,0.18)] bg-[linear-gradient(180deg,#320812,#4f0f1f_48%,#681126)] text-white shadow-[var(--shadow-soft)]">
      <div className="border-b border-white/10 px-5 py-8">
        <div className="flex flex-col items-center text-center">
          <img
            src="/Logo-HDL-2.svg"
            alt="Hacienda de Letras"
            className="h-24 w-auto max-w-[250px] object-contain brightness-[3.35] saturate-0"
          />
          <p className="mt-3 text-[11px] uppercase tracking-[0.24em] text-[rgba(255,241,222,0.72)]">
            Operación y experiencias
          </p>
        </div>
      </div>

      <nav className="space-y-5 px-3 py-4">
        {groups.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(255,241,222,0.56)]">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={`${group.label}-${to}-${label}`}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm outline-none ring-0 shadow-none transition focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:shadow-none focus-visible:shadow-none ${
                      isActive
                        ? 'border border-[rgba(216,182,128,0.28)] bg-[rgba(180,138,85,0.24)] text-[#fff6ea]'
                        : 'text-[rgba(255,243,229,0.82)] hover:bg-[rgba(255,255,255,0.06)]'
                    }`
                  }
                >
                  <Icon size={17} strokeWidth={1.8} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 pt-0">
        <div className="relative overflow-hidden rounded-[1rem] border border-[rgba(216,182,128,0.22)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.16))]">
          <div
            className="h-32 bg-cover bg-center opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(66, 14, 24, 0.04), rgba(66, 14, 24, 0.18)), url('/bajosidebar.jpeg')",
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(104,17,38,0.08),rgba(46,8,17,0.34))]" />
          <div className="relative space-y-2 px-4 py-4">
            <p
              className="text-xl leading-tight text-[#fff4e7]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t('control.wineOfAguascalientes')}
            </p>
            <p className="text-sm text-[rgba(255,241,222,0.74)]">
              {t('control.tradition')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
