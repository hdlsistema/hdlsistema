import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

export type SidebarItem = {
  to: string
  label: string
  icon: LucideIcon
}

type SidebarProps = {
  items: SidebarItem[]
}

export function Sidebar({ items }: SidebarProps) {
  return (
    <nav className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
      <ul className="space-y-2">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  isActive ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-50'
                }`
              }
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
