import {
  BadgePercent,
  CalendarDays,
  ChevronRight,
  BedDouble,
  Globe2,
  Grape,
  HelpCircle,
  Home,
  LogOut,
  MapPinned,
  MessagesSquare,
  PackageCheck,
  PanelRightOpen,
  PartyPopper,
  Settings2,
  ShieldCheck,
  ShoppingBasket,
  Ticket,
  Trash2,
  UserRound,
  UtensilsCrossed,
  Wine,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ComponentType, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { useAppPreferences, type AppLanguage } from '../../context/AppPreferencesContext'
import { appPath } from '../../utils/appRoutes'
import { useMobileGuestAccess } from './MobileGuestAccessContext'

type NavItem = {
  to: string
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
}

const PANEL_WIDTH = 'min(88vw, 356px)'
const isNativeMobileBuild = import.meta.env.VITE_HDL_APP_TARGET === 'mobile'

export function AppEdgePanel() {
  const { t, language, setLanguage } = useAppPreferences()
  const { isAuthenticated, profile, user, roles, signOut } = useAuth()
  const { guardLink } = useMobileGuestAccess()
  const location = useLocation()
  const handleRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const pointerStart = useRef<{ x: number; offset: number } | null>(null)
  const [open, setOpen] = useState(false)
  const [dragOffset, setDragOffset] = useState<number | null>(null)
  const isEnglish = language === 'en'

  const sections = useMemo(() => [
    {
      label: t('app.premium.edge.explore', 'Explora'),
      items: [
        { to: appPath('/home'), label: t('app.nav.home'), icon: Home },
        { to: appPath('/vinos'), label: t('app.nav.store'), icon: ShoppingBasket },
        { to: appPath('/promociones'), label: isEnglish ? 'Promotions' : 'Promociones', icon: BadgePercent },
        { to: appPath('/experiencias'), label: t('app.nav.experiences'), icon: Wine },
        { to: appPath('/nuestros-eventos'), label: t('app.nav.events'), icon: Ticket },
      ],
    },
    {
      label: t('app.premium.edge.estate', 'Vive la Hacienda'),
      items: [
        { to: appPath('/reservacion'), label: t('app.premium.edge.reserve', 'Reservar'), icon: CalendarDays },
        { to: appPath('/cabanas'), label: isEnglish ? 'Cabins' : 'Cabañas', icon: BedDouble },
        { to: appPath('/restaurantes'), label: isEnglish ? 'Restaurants' : 'Restaurantes', icon: UtensilsCrossed },
        { to: appPath('/celebra'), label: isEnglish ? 'Celebrate at Hacienda' : 'Celebra en Hacienda', icon: PartyPopper },
        { to: appPath('/mapa'), label: t('app.nav.map'), icon: MapPinned },
        { to: appPath('/membresias'), label: t('app.nav.club'), icon: Grape },
        { to: appPath('/sommelier'), label: t('app.nav.sommelier'), icon: MessagesSquare },
      ],
    },
    {
      label: t('app.premium.edge.account', 'Mi cuenta'),
      items: [
        { to: appPath('/perfil#orders'), label: t('app.premium.profile.orders', 'Mis pedidos'), icon: PackageCheck },
        { to: appPath('/reservacion'), label: t('app.nav.reservations'), icon: CalendarDays },
        { to: appPath('/perfil'), label: t('app.nav.profile'), icon: UserRound },
        { to: appPath('/privacidad-cuenta'), label: t('app.premium.profile.privacyAndAccount', 'Privacidad y cuenta'), icon: ShieldCheck },
        { to: appPath('/eliminar-cuenta'), label: isEnglish ? 'Delete account' : 'Eliminar cuenta', icon: Trash2 },
        { to: appPath('/perfil'), label: t('app.premium.profile.settings', 'Configuración'), icon: Settings2 },
      ],
    },
  ], [isEnglish, t])

  const displayName = profile?.display_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email || (isEnglish ? 'My account' : 'Mi cuenta')
  const roleLabel = roles.includes('customer') || roles.length === 0 ? (isEnglish ? 'My experience' : 'Mi experiencia') : roles[0]
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

  const panelWidth = () => panelRef.current?.getBoundingClientRect().width ?? Math.min(window.innerWidth * 0.88, 356)

  const navigateFromPanel = (event: MouseEvent<HTMLElement>, to: string) => {
    guardLink(event, to)
    closePanel(false)
  }

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
        onPointerCancel={onPointerUp}
        className={`app-edge-panel-handle ${layerPosition} top-[40%] z-[100] flex h-[110px] w-[42px] -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-l-[20px] border-y border-l border-[#d9bd8a]/46 bg-[linear-gradient(155deg,rgba(37,47,55,.98),rgba(37,47,55,.88))] text-[#fff5e7] shadow-[-14px_10px_34px_rgba(37,47,55,.26),inset_0_1px_0_rgba(255,255,255,.14)] backdrop-blur-2xl touch-none`}
        style={{ right: handleRight, transition: dragOffset === null ? 'right 260ms cubic-bezier(.2,.8,.2,1)' : 'none' }}
      >
        <PanelRightOpen size={17} strokeWidth={1.4} aria-hidden="true" />
        <span className="text-[8px] font-bold uppercase tracking-[.18em] [writing-mode:vertical-rl]">{isEnglish ? 'Menu' : 'Menú'}</span>
      </button>

      {open ? (
        <button
          type="button"
          aria-label={t('app.premium.edge.closeNavigation', 'Cerrar menú')}
          onClick={() => closePanel()}
          className={`${layerPosition} inset-0 z-[80] cursor-default bg-[rgba(39,16,19,.34)] backdrop-blur-[5px]`}
        />
      ) : null}

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal={open}
        aria-label="Menú de Hacienda de Letras"
        tabIndex={-1}
        className={`${layerPosition} bottom-0 right-0 top-0 z-[90] min-h-0 overflow-y-auto border-l border-white/68 bg-[linear-gradient(155deg,rgba(255,253,249,.92),rgba(246,232,219,.84))] shadow-[-28px_0_70px_rgba(48,18,25,.22),inset_1px_0_0_rgba(255,255,255,.82)] outline-none backdrop-blur-[28px]`}
        style={{
          width: PANEL_WIDTH,
          transform: panelTransform,
          transition: dragOffset === null ? 'transform 260ms cubic-bezier(.2,.8,.2,1)' : 'none',
          pointerEvents: open || dragOffset !== null ? 'auto' : 'none',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
        }}
      >
        <div className="min-h-full px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+18px)]">
          <div className="relative border-b border-[#E8DDCE] pb-5 text-center">
            <button
              type="button"
              onClick={() => closePanel()}
              aria-label={t('app.premium.edge.closeNavigation', 'Cerrar menú')}
              className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/58 text-[#3F0818] shadow-[0_8px_22px_rgba(63,8,24,.08)] backdrop-blur-xl"
            >
              <X size={18} strokeWidth={1.45} />
            </button>
            <img src="/hacienda de letras logo 2.png" alt="Hacienda de Letras" className="mx-auto h-auto w-[126px] object-contain" />
            <p className="mt-3 font-[var(--font-display)] text-[19px] leading-none text-[#252F37]">Hacienda de Letras</p>
            <p className="mt-2 text-[11px] text-[#675f59]">{roleLabel}</p>
          </div>

          {isAuthenticated ? (
            <div className="mt-4 flex items-center gap-3 border-b border-[#E8DDCE] pb-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-gold)] bg-[var(--color-panel)] text-[var(--color-burgundy)]">
                <UserRound size={18} strokeWidth={1.45} />
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-[13px] font-semibold text-[#252F37]">{displayName}</span>
                <span className="block truncate text-[10px] text-[#675f59]">{roleLabel}</span>
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
                    onNavigate={navigateFromPanel}
                  />
                ))}
              </EdgeSection>
            ))}
          </div>

          <div className="mt-6 border-t border-[#E8DDCE] pt-4">
            <EdgeLanguageSwitcher language={language} setLanguage={setLanguage} />
            <Link to={appPath('/perfil')} onClick={(event) => navigateFromPanel(event, appPath('/perfil'))} className="mt-3 flex min-h-11 items-center gap-3 px-1 text-[13px] text-[#252F37]">
              <HelpCircle size={18} strokeWidth={1.5} className="text-[#675f59]" />
              {isEnglish ? 'Help / contact' : 'Ayuda / contacto'}
            </Link>
            {isAuthenticated ? (
              <button type="button" onClick={() => { void signOut(); closePanel(false) }} className="mt-2 flex min-h-11 w-full items-center gap-3 px-1 text-left text-[13px] text-[#821B3B]">
                <LogOut size={18} strokeWidth={1.5} />
                {isEnglish ? 'Sign out' : 'Cerrar sesión'}
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
      <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#B48A55]">{label}</p>
      <div className="mt-2 space-y-1">{children}</div>
    </section>
  )
}

function EdgeNavItem({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: (event: MouseEvent<HTMLElement>, to: string) => void }) {
  const Icon = item.icon
  return (
    <Link to={item.to} onClick={(event) => onNavigate(event, item.to)} className={`flex min-h-[46px] items-center gap-3 rounded-[14px] px-2.5 text-[13px] transition ${active ? 'border border-[rgba(180,138,85,0.36)] bg-[rgba(247,242,234,0.72)] text-[var(--color-burgundy)] shadow-[0_9px_24px_rgba(37,47,55,.08)]' : 'text-[var(--color-ink)]'}`}>
      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${active ? 'border-[#d8b986] bg-[#6a102a] text-white' : 'border-white/80 bg-white/55 text-[#80644d]'}`}><Icon size={16} strokeWidth={1.45} /></span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      <ChevronRight size={15} strokeWidth={1.45} className="text-[#B48A55]" />
    </Link>
  )
}

function EdgeLanguageSwitcher({ language, setLanguage }: { language: AppLanguage; setLanguage: (value: AppLanguage) => void }) {
  return (
    <div className="flex min-h-10 items-center justify-between rounded-lg bg-[#F6EFE5] px-3">
      <Globe2 size={16} strokeWidth={1.45} className="text-[#B48A55]" />
      <div className="flex items-center gap-3 text-[11px] font-bold">
        <button type="button" onClick={() => setLanguage('es')} className={language === 'es' ? 'text-[var(--color-burgundy)]' : 'text-[var(--color-muted)]'}>ES</button>
        <span className="h-4 w-px bg-[#B48A55]" />
        <button type="button" onClick={() => setLanguage('en')} className={language === 'en' ? 'text-[var(--color-burgundy)]' : 'text-[var(--color-muted)]'}>EN</button>
      </div>
    </div>
  )
}
