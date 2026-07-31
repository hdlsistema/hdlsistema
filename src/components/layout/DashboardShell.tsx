import type { LucideIcon } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { Sidebar, type SidebarItem } from './Sidebar'

type DashboardShellProps = {
  sectionLabel: string
  sectionTitle: string
  sectionDescription: string
  items: SidebarItem[]
  icon: LucideIcon
}

export function DashboardShell({
  sectionLabel,
  sectionTitle,
  sectionDescription,
  items,
  icon: Icon,
}: DashboardShellProps) {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
      <aside className="space-y-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex rounded-xl bg-stone-100 p-2 text-stone-700">
            <Icon size={18} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{sectionLabel}</p>
          <h2 className="mt-2 text-xl font-semibold text-stone-900">{sectionTitle}</h2>
          <p className="mt-2 text-sm text-stone-500">{sectionDescription}</p>
        </div>
        <Sidebar items={items} />
      </aside>
      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
