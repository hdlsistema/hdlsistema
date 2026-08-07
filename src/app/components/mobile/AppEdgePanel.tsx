import {
  CalendarDays,
  ChevronRight,
  Globe2,
  Grape,
  HelpCircle,
  Home,
  LogOut,
  MapPinned,
  Settings2,
  ShoppingBag,
  Sparkles,
  Ticket,
  UserRound,
  Wine,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { useAppPreferences, type AppLanguage } from '../../context/AppPreferencesContext'
import { appPath } from '../../utils/appRoutes'

type NavItem = {
  to: string
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
}

const PANEL_WIDTH = 'min(82vw, 330px)'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'HL'
}

export function AppEdgePanel() {
  const { t, language, setLanguage } = useAppPreferences()
  const { isAuthenticated, profile, user, roles, signOut } = useAuth()
  const location = useLocation()
  const handleRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const [open, setOpen] = useState(false)

  const sections = useMemo(() => {
    const explore: NavItem[] = [
      { to: appPath('/home'), label: t('app.nav.home'), icon: Home },
      { to: appPath('/vinos'), label: t('app.nav.store'), icon: ShoppingBag },
      { to: appPath('/experiencias'), label: t('app.nav.experiences'), icon: Wine },
      { to: appPath('/eventos'), label: t('app.nav.events'), icon: Ticket },
    ]
    const estate: NavItem[] = [
      { to: appPath('/reservacion'), label: t('app.premium.edge.reserve', 'Reservar'), icon: CalendarDays },
      { to: appPath('/mapa'), label: t('app.nav.map'), icon: MapPinned },
      { to: appPath('/membresias'), label: t('app.nav.club'), icon: Grape },
      { to: appPath('/sommelier'), label: t('app.nav.sommelier'), icon: Sparkles },
    ]
    const account: NavItem[] = [
      { to: appPath('/perfil'), label: t('app.premium.profile.orders', 'Mis pedidos'), icon: ShoppingBag },
      { to: appPath('/reservacion'), label: t('app.nav.reservations'), icon: CalendarDays },
      { to: appPath('/perfil'), label: t('app.nav.profile'), icon: UserRound },
      { to: appPath('/perfil'), label: t('app.premium.profile.settings', 'Configuración'), icon: Settings2 },
    ]
    return [
      { label: t('app.premium.edge.explore', 'Explora'), items: explore },
      { label: t('app.premium.edge.estate', 'Vive la hacienda'), items: estate },
      { label: t('app.premium.edge.account', 'Mi cuenta'), items: account },
    ]
  }, [t])

  const displayName = profile?.display_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email || ''
  const accountLabel = roles.includes('customer') || roles.length === 0 ? t('app.premium.edge.myAccount', 'Mi cuenta') : roles[0]

  const closePanel = () => {
    setOpen(false)
    window.requestAnimationFrame(() => handleRef.current?.focus())
  }

  const openPanel = () => {
    setOpen(true)
    window.requestAnimationFrame(() => panelRef.current?.focus())
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) closePanel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const panelVisible = open

  return (
    <>
      <button
        ref={handleRef}
        type="button"
        aria-label={t('app.premium.edge.openNavigation', 'Abrir navegación')}
        onClick={openPanel}
        className="absolute right-0 top-[42%] z-[70] flex h-[92px] w-[42px] items-center justify-center rounded-l-[18px] border-y border-l border-[rgba(216,187,134,0.52)] bg-[rgba(255,249,241,0.66)] text-[#690D2B] shadow-[-12px_0_34px_rgba(45,28,21,0.16)] backdrop-blur-[18px] transition-[transform,width,background-color] duration-200 hover:w-[48px] hover:bg-[rgba(255,249,241,0.82)]"
        style={{
          transform: panelVisible ? `translateX(calc(-1 * ${PANEL_WIDTH}))` : 'translateX(0)',
        }}
      >
        <span className="absolute left-2 top-4 h-16 w-px rounded-full bg-[#D8BB86]/80" />
        <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-bold uppercase tracking-[0.22em]">
          MENU
        </span>
      </button>

      {panelVisible ? (
        <button
          type="button"
          aria-label={t('app.premium.edge.closeNavigation', 'Cerrar navegación')}
          onClick={closePanel}
          className="absolute inset-0 z-[60] cursor-default"
          style={{
            background: 'rgba(43,28,22,0.20)',
            backdropFilter: 'blur(2px)',
          }}
        />
      ) : null}

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal={open}
        aria-label={t('app.premium.edge.navigationLabel', 'Hacienda de Letras')}
        tabIndex={-1}
        className="absolute bottom-0 right-0 top-0 z-[80] flex touch-pan-y flex-col overflow-y-auto overscroll-contain border-l border-[rgba(184,138,74,0.20)] bg-[rgba(255,249,241,0.97)] shadow-[-20px_0_60px_rgba(45,28,21,0.14)] outline-none backdrop-blur-[18px]"
        style={{
          width: PANEL_WIDTH,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 260ms cubic-bezier(.2,.8,.2,1)',
          pointerEvents: panelVisible ? 'auto' : 'none',
        }}
      >
        <div className="px-[var(--app-pad)] pb-[calc(env(safe-area-inset-bottom)+22px)] pt-[calc(env(safe-area-inset-top)+24px)]">
          <EdgePanelHeader onClose={closePanel} />

          {isAuthenticated ? (
            <EdgeProfile name={displayName} detail={accountLabel} />
          ) : null}

          <div className="mt-7 space-y-7">
            {sections.map((section) => (
              <EdgeSection key={section.label} label={section.label}>
                {section.items.map((item) => (
                  <EdgeNavItem
                    key={`${section.label}-${item.to}-${item.label}`}
                    item={item}
                    active={location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)}
                    onNavigate={closePanel}
                  />
                ))}
              </EdgeSection>
            ))}
          </div>

          <div className="mt-8 border-t border-[rgba(184,138,74,0.14)] pt-5">
            <EdgeLanguageSwitcher language={language} setLanguage={setLanguage} />
            <Link
              to={appPath('/perfil')}
              onClick={closePanel}
              className="mt-4 flex h-11 items-center gap-3 rounded-[12px] px-2 text-[13px] font-medium text-[#51443D] transition-colors hover:bg-[rgba(184,138,74,0.08)]"
            >
              <HelpCircle size={18} strokeWidth={1.7} className="text-[#756A63]" />
              <span>{t('app.premium.edge.help', 'Ayuda / contacto')}</span>
            </Link>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  void signOut()
                  closePanel()
                }}
                className="mt-1 flex h-11 w-full items-center gap-3 rounded-[12px] px-2 text-left text-[13px] font-medium text-[#A9433B] transition-colors hover:bg-[rgba(169,67,59,0.08)]"
              >
                <LogOut size={18} strokeWidth={1.7} />
                <span>{t('auth.logout', 'Cerrar sesión')}</span>
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  )
}

function EdgePanelHeader({ onClose }: { onClose: () => void }) {
  const { t } = useAppPreferences()
  return (
    <div className="sticky top-0 z-10 mx-[calc(var(--app-pad)*-1)] -mt-6 bg-[rgba(255,249,241,0.97)] px-[var(--app-pad)] pb-4 pt-6 text-center">
      <button
        type="button"
        onClick={onClose}
        aria-label={t('app.premium.edge.closeNavigation', 'Cerrar navegación')}
        className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(184,138,74,0.22)] text-[#690D2B] transition-colors hover:bg-[rgba(105,13,43,0.07)]"
      >
        <X size={19} strokeWidth={1.8} />
      </button>
      <img src="/hacienda de letras logo 2.png" alt="Hacienda de Letras" className="mx-auto h-auto w-[108px] object-contain" />
      <p className="mt-4 text-[14px] font-medium text-[#2D1811]">Hacienda de Letras</p>
      <p className="mt-1 text-[11px] text-[#776053]">{t('app.premium.edge.myExperience', 'Mi experiencia')}</p>
    </div>
  )
}

function EdgeProfile({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="mt-7 flex items-center gap-3 border-y border-[rgba(184,138,74,0.14)] py-4">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#690D2B] text-[13px] font-semibold text-[#F9EFE1]">
        {initials(name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-medium text-[#2D1811]">{name}</span>
        <span className="mt-0.5 block truncate text-[11px] text-[#776053]">{detail}</span>
      </span>
    </div>
  )
}

function EdgeSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="px-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#B88A4A]">{label}</p>
      <div className="mt-2 space-y-1">{children}</div>
    </section>
  )
}

function EdgeNavItem({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={`flex h-[50px] items-center gap-3 rounded-[12px] px-2 text-[14px] font-medium transition-colors ${
        active ? 'bg-[rgba(105,13,43,0.07)] text-[#690D2B]' : 'text-[#51443D] hover:bg-[rgba(184,138,74,0.08)]'
      }`}
    >
      <Icon size={20} strokeWidth={1.65} className={active ? 'text-[#B88A4A]' : 'text-[#756A63]'} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      <ChevronRight size={15} strokeWidth={1.7} className={active ? 'text-[#B88A4A]' : 'text-[#B8A99E]'} />
    </Link>
  )
}

function EdgeLanguageSwitcher({
  language,
  setLanguage,
}: {
  language: AppLanguage
  setLanguage: (value: AppLanguage) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-[12px] bg-[rgba(184,138,74,0.07)] px-3 py-2">
      <Globe2 size={16} strokeWidth={1.6} className="text-[#B88A4A]" />
      <div className="flex items-center gap-2 text-[12px] font-semibold">
        <button
          type="button"
          onClick={() => setLanguage('es')}
          className={language === 'es' ? 'text-[#690D2B]' : 'text-[#776053]'}
        >
          ES
        </button>
        <span className="h-4 w-px bg-[rgba(184,138,74,0.26)]" />
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={language === 'en' ? 'text-[#690D2B]' : 'text-[#776053]'}
        >
          EN
        </button>
      </div>
    </div>
  )
}
