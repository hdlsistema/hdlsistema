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
import { useEffect, useMemo, useRef, useState, type ComponentType, type PointerEvent, type ReactNode } from 'react'
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
const isNativeMobileBuild = import.meta.env.VITE_HDL_APP_TARGET === 'mobile'

export function AppEdgePanel() {
  const { t, language, setLanguage } = useAppPreferences()
  const { isAuthenticated, profile, user, roles, signOut } = useAuth()
  const location = useLocation()
  const handleRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const pointerStart = useRef<{ x: number; offset: number } | null>(null)
  const [open, setOpen] = useState(false)
  const [dragOffset, setDragOffset] = useState<number | null>(null)

  const sections = useMemo(() => [
    {
      label: t('app.premium.edge.explore', 'Explora'),
      items: [
        { to: appPath('/home'), label: t('app.nav.home'), icon: Home },
        { to: appPath('/vinos'), label: t('app.nav.store'), icon: ShoppingBag },
        { to: appPath('/experiencias'), label: t('app.nav.experiences'), icon: Wine },
        { to: appPath('/eventos'), label: t('app.nav.events'), icon: Ticket },
      ],
    },
    {
      label: t('app.premium.edge.estate', 'Vive la Hacienda'),
      items: [
        { to: appPath('/reservacion'), label: t('app.premium.edge.reserve', 'Reservar'), icon: CalendarDays },
        { to: appPath('/mapa'), label: t('app.nav.map'), icon: MapPinned },
        { to: appPath('/membresias'), label: t('app.nav.club'), icon: Grape },
        { to: appPath('/sommelier'), label: t('app.nav.sommelier'), icon: Sparkles },
      ],
    },
    {
      label: t('app.premium.edge.account', 'Mi cuenta'),
      items: [
        { to: appPath('/perfil'), label: t('app.premium.profile.orders', 'Mis pedidos'), icon: ShoppingBag },
        { to: appPath('/reservacion'), label: t('app.nav.reservations'), icon: CalendarDays },
        { to: appPath('/perfil'), label: t('app.nav.profile'), icon: UserRound },
        { to: appPath('/perfil'), label: t('app.premium.profile.settings', 'Configuración'), icon: Settings2 },
      ],
    },
  ], [t])

  const displayName = profile?.display_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email || 'Mi cuenta'
  const roleLabel = roles.includes('customer') || roles.length === 0 ? 'Mi experiencia' : roles[0]
  const layerPosition = isNativeMobileBuild ? 'fixed' : 'absolute'
  const panelTransform = dragOffset === null ? (open ? 'translateX(0)' : 'translateX(100%)') : `translateX(${dragOffset}px)`
  const handleRight = dragOffset === null
    ? (open ? PANEL_WIDTH : '0')
    : `calc(${PANEL_WIDTH} - ${dragOffset}px)`

  const closePanel = (returnFocus = true) => {
    setDragOffset(null)
    setOpen(false)
    if (returnFocus) window.requestAnimationFrame(() => handleRef.current?.focus())
  }

  const openPanel = () => {
    setDragOffset(null)
    setOpen(true)
    window.requestAnimationFrame(() => panelRef.current?.focus())
  }

  const panelWidth = () => panelRef.current?.getBoundingClientRect().width ?? Math.min(window.innerWidth * 0.82, 330)

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    const initialOffset = open ? 0 : panelWidth()
    pointerStart.current = { x: event.clientX, offset: initialOffset }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!pointerStart.current) return
    const width = panelWidth()
    const nextOffset = Math.min(width, Math.max(0, pointerStart.current.offset + event.clientX - pointerStart.current.x))
    setDragOffset(nextOffset)
  }

  const onPointerUp = () => {
    if (!pointerStart.current) return
    const width = panelWidth()
    const finalOffset = dragOffset ?? pointerStart.current.offset
    pointerStart.current = null
    setDragOffset(null)
    if (finalOffset < width * 0.45) openPanel()
    else closePanel(false)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) closePanel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [open])

  return (
    <>
      <button
        ref={handleRef}
        type="button"
        aria-label={t('app.premium.edge.openNavigation', 'Abrir menú')}
        onClick={openPanel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`${layerPosition} top-[42%] z-[100] flex h-[62px] w-[18px] -translate-y-1/2 items-center justify-center rounded-l-[10px] border-y border-l border-[rgba(217,189,138,.76)] bg-[rgba(63,8,24,.78)] text-[#FFFDF8] shadow-[-8px_0_20px_rgba(48,34,29,.18)] backdrop-blur-md touch-none`}
        style={{ right: handleRight, transition: dragOffset === null ? 'right 260ms cubic-bezier(.2,.8,.2,1)' : 'none' }}
      >
        <span className="absolute left-[5px] top-[8px] h-[46px] w-px bg-[#D9BD8A]" aria-hidden="true" />
        <span className="mt-0.5 text-[8px] font-bold tracking-[.12em] [writing-mode:vertical-rl]">MENÚ</span>
      </button>

      {open ? (
        <button
          type="button"
          aria-label={t('app.premium.edge.closeNavigation', 'Cerrar menú')}
          onClick={() => closePanel()}
          className={`${layerPosition} inset-0 z-[80] cursor-default bg-[rgba(48,34,29,.38)] backdrop-blur-[2px]`}
        />
      ) : null}

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal={open}
        aria-label="Menú de Hacienda de Letras"
        tabIndex={-1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`${layerPosition} bottom-0 right-0 top-0 z-[90] min-h-0 overflow-y-auto border-l border-[rgba(217,189,138,.46)] bg-[rgba(255,253,248,.98)] shadow-[-20px_0_48px_rgba(48,34,29,.2)] outline-none backdrop-blur-xl`}
        style={{
          width: PANEL_WIDTH,
          transform: panelTransform,
          transition: dragOffset === null ? 'transform 260ms cubic-bezier(.2,.8,.2,1)' : 'none',
          pointerEvents: open || dragOffset !== null ? 'auto' : 'none',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
        }}
      >
        <div className="min-h-full px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+20px)]">
          <div className="relative border-b border-[#E8DDCE] pb-5 text-center">
            <button
              type="button"
              onClick={() => closePanel()}
              aria-label={t('app.premium.edge.closeNavigation', 'Cerrar menú')}
              className="absolute right-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D9BD8A] text-[#3F0818]"
            >
              <X size={18} strokeWidth={1.45} />
            </button>
            <img src="/hacienda de letras logo 2.png" alt="Hacienda de Letras" className="mx-auto h-auto w-[126px] object-contain" />
            <p className="mt-3 font-[var(--font-display)] text-[21px] leading-none text-[#30221D]">Hacienda de Letras</p>
            <p className="mt-2 text-[11px] text-[#786B63]">{roleLabel}</p>
          </div>

          {isAuthenticated ? (
            <div className="mt-4 flex items-center gap-3 border-b border-[#E8DDCE] pb-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D9BD8A] bg-[#FBF7F0] text-[#690D2B]">
                <UserRound size={18} strokeWidth={1.45} />
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-[13px] font-semibold text-[#30221D]">{displayName}</span>
                <span className="block truncate text-[10px] text-[#786B63]">{roleLabel}</span>
              </span>
            </div>
          ) : null}

          <div className="space-y-6 pt-5">
            {sections.map((section) => (
              <EdgeSection key={section.label} label={section.label}>
                {section.items.map((item) => (
                  <EdgeNavItem
                    key={`${section.label}-${item.to}-${item.label}`}
                    item={item}
                    active={location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)}
                    onNavigate={() => closePanel(false)}
                  />
                ))}
              </EdgeSection>
            ))}
          </div>

          <div className="mt-6 border-t border-[#E8DDCE] pt-4">
            <EdgeLanguageSwitcher language={language} setLanguage={setLanguage} />
            <Link to={appPath('/perfil')} onClick={() => closePanel(false)} className="mt-3 flex min-h-11 items-center gap-3 px-1 text-[13px] text-[#30221D]">
              <HelpCircle size={18} strokeWidth={1.5} className="text-[#786B63]" />
              Ayuda / contacto
            </Link>
            {isAuthenticated ? (
              <button type="button" onClick={() => { void signOut(); closePanel(false) }} className="mt-2 flex min-h-11 w-full items-center gap-3 px-1 text-left text-[13px] text-[#821B3B]">
                <LogOut size={18} strokeWidth={1.5} />
                Cerrar sesión
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  )
}

function EdgeSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#B78A4C]">{label}</p>
      <div className="mt-2 space-y-0.5">{children}</div>
    </section>
  )
}

function EdgeNavItem({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  const Icon = item.icon
  return (
    <Link to={item.to} onClick={onNavigate} className={`flex min-h-[44px] items-center gap-3 rounded-lg px-2 text-[14px] ${active ? 'bg-[#F4EAE4] text-[#690D2B]' : 'text-[#30221D]'}`}>
      <Icon size={19} strokeWidth={1.45} className={active ? 'text-[#B78A4C]' : 'text-[#786B63]'} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      <ChevronRight size={15} strokeWidth={1.45} className="text-[#B78A4C]" />
    </Link>
  )
}

function EdgeLanguageSwitcher({ language, setLanguage }: { language: AppLanguage; setLanguage: (value: AppLanguage) => void }) {
  return (
    <div className="flex min-h-10 items-center justify-between rounded-lg bg-[#F6EFE5] px-3">
      <Globe2 size={16} strokeWidth={1.45} className="text-[#B78A4C]" />
      <div className="flex items-center gap-3 text-[11px] font-bold">
        <button type="button" onClick={() => setLanguage('es')} className={language === 'es' ? 'text-[#690D2B]' : 'text-[#786B63]'}>ES</button>
        <span className="h-4 w-px bg-[#D9BD8A]" />
        <button type="button" onClick={() => setLanguage('en')} className={language === 'en' ? 'text-[#690D2B]' : 'text-[#786B63]'}>EN</button>
      </div>
    </div>
  )
}
