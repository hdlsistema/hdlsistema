import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { BottomTabs } from './BottomTabs'

export function MobileShell() {
  return (
    <div className="flex h-full min-h-[870px] flex-col bg-[var(--color-panel-strong)] max-md:min-h-screen max-md:min-h-[100dvh]">
      <div className="flex items-center justify-between px-6 pb-1 pt-4 text-[13px] font-semibold text-[var(--color-ink)]">
        <span>9:41</span>
        <div className="h-8 w-32 rounded-full bg-black" />
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-1 rounded-full bg-[var(--color-ink)]" />
          <span className="h-3.5 w-1 rounded-full bg-[var(--color-ink)]" />
          <span className="h-4.5 w-1 rounded-full bg-[var(--color-ink)]" />
          <span className="h-3.5 w-5 rounded-[4px] border border-[var(--color-ink)]" />
        </div>
      </div>
      <AppHeader />
      <main className="flex-1 space-y-5 overflow-y-auto px-5 pb-5 pt-0">
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  )
}
