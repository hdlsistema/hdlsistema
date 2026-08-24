import { NavLink, Outlet } from 'react-router-dom'
import { Building2, Grape, Layers3 } from 'lucide-react'
import { Topbar } from './Topbar'

const sections = [
  { to: '/app', label: 'App Cliente', icon: Grape },
  { to: '/admin', label: 'Panel Operativo', icon: Building2 },
  { to: '/future', label: 'Etapa Posterior', icon: Layers3 },
]

export function AppShell() {
  return (
    <div className="min-h-screen bg-[var(--color-page)] text-stone-900">
      <Topbar />
      <div className="border-b border-stone-200 bg-white">
        <nav className="mx-auto flex max-w-7xl gap-3 px-4 py-3 sm:px-6 lg:px-8">
          {sections.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-stone-900 text-white' : 'border border-stone-200 text-stone-700 hover:bg-stone-50'
                }`
              }
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  )
}
