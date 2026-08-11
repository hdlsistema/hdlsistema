import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ImageIcon,
  Loader2,
  Minus,
  Plus,
  Search,
  ShoppingBag,
} from 'lucide-react'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { appPath } from '../../utils/appRoutes'

type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger'

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function AppSectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">
            {eyebrow}
          </p>
        ) : null}
        <h2
          className="mt-1 text-[clamp(28px,7vw,34px)] leading-[0.98] text-[var(--color-ink)]"
          style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 max-w-[31rem] text-[14px] leading-5 text-[var(--color-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export const SectionHeading = AppSectionHeader

export function HeroEditorial({
  eyebrow,
  title,
  subtitle,
  image,
  alt,
  action,
  meta,
  compact = false,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  image?: string
  alt?: string
  action?: ReactNode
  meta?: ReactNode
  compact?: boolean
}) {
  return (
    <section
      className={cx(
        'relative isolate min-w-0 overflow-hidden rounded-[1.25rem] bg-[var(--color-burgundy-deep)] text-white shadow-[var(--shadow-float)]',
        compact ? 'min-h-[220px]' : 'min-h-[clamp(360px,72vh,480px)]',
      )}
    >
      {image ? (
        <img src={image} alt={alt ?? title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(140deg,#4d1022,#8f4538_58%,#d8bb89)]" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,7,8,0.18),rgba(26,7,8,0.78))]" />
      <div className="relative flex min-h-[inherit] flex-col justify-end px-[var(--app-pad)] pb-6 pt-8">
        {eyebrow ? (
          <p className="max-w-full text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ead0a2]">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className="mt-2 max-w-[19rem] text-[clamp(32px,9vw,42px)] leading-[0.95] text-white"
          style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 max-w-[20rem] text-[14px] leading-5 text-white/84">
            {subtitle}
          </p>
        ) : null}
        {meta ? <div className="mt-4">{meta}</div> : null}
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </section>
  )
}

export function ImageFallback({
  src,
  alt,
  fallback = '/Logo-HDL-2.svg',
  className,
  contain = false,
}: {
  src?: string | null
  alt: string
  fallback?: string
  className?: string
  contain?: boolean
}) {
  const imageSrc = src || fallback
  return (
    <img
      src={imageSrc}
      alt={alt}
      className={cx(contain ? 'object-contain' : 'object-cover', className)}
      onError={(event) => {
        event.currentTarget.src = fallback
      }}
    />
  )
}

export function EditorialImagePlaceholder({
  label,
  className,
}: {
  label?: string
  className?: string
}) {
  const { t } = useAppPreferences()
  return (
    <div className={cx('flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(145deg,#EEE2D2,#E5D6C4)] text-center', className)}>
      <ImageIcon size={18} strokeWidth={1.5} className="text-[#B88A4A]" aria-hidden="true" />
      <span className="mt-2 max-w-[8rem] px-3 text-[10px] font-semibold leading-4 text-[#9B7042]">
        {label ?? t('app.premium.imagePending')}
      </span>
    </div>
  )
}

export function SearchField({ placeholder, value, onChange }: {
  placeholder: string
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <label className="flex min-h-[48px] items-center gap-3 rounded-[1rem] bg-[rgba(255,250,242,0.84)] px-4 text-[13px] shadow-[inset_0_0_0_1px_rgba(170,125,67,0.22)] backdrop-blur">
      <Search size={17} className="shrink-0 text-[var(--color-burgundy)]" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)]"
      />
    </label>
  )
}

export function PillRow({ items, activeIndex = 0, onSelect }: {
  items: string[]
  activeIndex?: number
  onSelect?: (index: number) => void
}) {
  return (
    <div className="app-scrollbar-none flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
      {items.map((item, index) => {
        const active = index === activeIndex
        return (
          <button
            key={item}
            type="button"
            onClick={() => onSelect?.(index)}
            className={cx(
              'min-h-8 shrink-0 rounded-full px-3 text-[12px] font-semibold transition-colors',
              active
                ? 'bg-[#690D2B] text-white'
                : 'bg-[#FFF9F1] text-[#776053] shadow-[inset_0_0_0_1px_rgba(184,138,74,0.18)]',
            )}
          >
            {item}
          </button>
        )
      })}
    </div>
  )
}

export function PriceBlock({
  label,
  value,
  pending,
}: {
  label?: string
  value: string
  pending?: boolean
}) {
  return (
    <div className="min-w-0">
      {label ? <p className="text-[10px] text-[var(--color-muted)]">{label}</p> : null}
      <p
        className={cx(
          'mt-1 truncate text-[1.42rem] leading-none',
          pending ? 'text-[var(--color-muted)]' : 'text-[var(--color-burgundy)]',
        )}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {value}
      </p>
    </div>
  )
}

export function PrimaryButton({
  children,
  to,
  onClick,
  disabled = false,
  tone = 'primary',
  className,
}: {
  children: ReactNode
  to?: string
  onClick?: () => void
  disabled?: boolean
  tone?: ButtonTone
  className?: string
}) {
  const classes = cx(
    'app-primary-button',
    `app-primary-button--${tone}`,
    'inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-[0.95rem] px-4 py-3 text-center text-[14px] font-semibold leading-5 transition-transform',
    tone === 'primary' && 'bg-[var(--color-burgundy)] text-white shadow-[0_12px_24px_rgba(84,17,36,0.16)]',
    tone === 'secondary' && 'bg-[var(--color-surface-warm)] text-[var(--color-burgundy)] shadow-[inset_0_0_0_1px_rgba(170,125,67,0.22)]',
    tone === 'ghost' && 'bg-transparent text-[var(--color-burgundy)] shadow-[inset_0_0_0_1px_rgba(84,17,36,0.16)]',
    tone === 'danger' && 'bg-[rgba(154,68,59,0.1)] text-[var(--color-alert)] shadow-[inset_0_0_0_1px_rgba(154,68,59,0.22)]',
    disabled && 'cursor-not-allowed opacity-60',
    !disabled && 'active:scale-[0.99]',
    className,
  )

  if (to) {
    return (
      <Link to={to} className={classes} aria-disabled={disabled}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  )
}

export function BackButton({ label }: { label?: string }) {
  const navigate = useNavigate()
  const { isEnglish } = useAppPreferences()
  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[rgba(255,250,242,0.86)] px-3 text-[12px] font-semibold text-[var(--color-burgundy)] shadow-[inset_0_0_0_1px_rgba(170,125,67,0.22)]"
    >
      <ArrowLeft size={15} />
      {label ?? (isEnglish ? 'Back' : 'Volver')}
    </button>
  )
}

export function FloatingCartButton({ count = 0 }: { count?: number }) {
  const { t } = useAppPreferences()
  return (
    <Link
      to={appPath('/carrito')}
      className="absolute bottom-[calc(var(--safe-bottom)+4.6rem)] right-[var(--app-pad)] z-40 inline-flex h-[3.25rem] min-h-[3.25rem] w-[3.25rem] min-w-[3.25rem] items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white shadow-[var(--shadow-float)]"
      aria-label={t('app.premium.openCart')}
    >
      <ShoppingBag size={19} />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-gold)] px-1 text-[10px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  )
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  decreaseLabel,
  increaseLabel,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  decreaseLabel: string
  increaseLabel: string
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-warm)] p-1 shadow-[inset_0_0_0_1px_rgba(170,125,67,0.2)]">
      <button
        type="button"
        aria-label={decreaseLabel}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-burgundy)] disabled:opacity-40"
      >
        <Minus size={15} />
      </button>
      <span className="min-w-8 text-center text-[13px] font-semibold text-[var(--color-ink)]">{value}</span>
      <button
        type="button"
        aria-label={increaseLabel}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white disabled:opacity-40"
      >
        <Plus size={15} />
      </button>
    </div>
  )
}

export function StatusBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}) {
  return (
    <span
      className={cx(
        'inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 text-[10px] font-semibold',
        tone === 'neutral' && 'bg-[var(--color-surface-warm)] text-[var(--color-muted-strong)]',
        tone === 'success' && 'bg-[rgba(63,117,79,0.12)] text-[var(--color-vineyard)]',
        tone === 'warning' && 'bg-[rgba(170,125,67,0.14)] text-[var(--color-gold)]',
        tone === 'danger' && 'bg-[rgba(154,68,59,0.12)] text-[var(--color-alert)]',
      )}
    >
      {children}
    </span>
  )
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[72px] items-center gap-3 rounded-[16px] bg-[#FFF9F1] px-4 text-[12px] text-[#776053] shadow-[inset_0_0_0_1px_rgba(184,138,74,0.14)]">
      <Loader2 size={16} className="shrink-0 animate-spin text-[#690D2B]" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ message, retryLabel, onRetry }: {
  message: string
  retryLabel?: string
  onRetry?: () => void
}) {
  const { t } = useAppPreferences()
  return (
    <div className="flex min-h-[74px] items-center gap-3 rounded-[16px] bg-[#FFF9F1] px-4 text-[12px] leading-5 text-[#776053] shadow-[inset_0_0_0_1px_rgba(154,68,59,0.18)]">
      <AlertCircle size={16} className="shrink-0 text-[#9A443B]" />
      <p className="min-w-0 flex-1">{message || t('app.premium.contentUnavailable')}</p>
      {onRetry && retryLabel ? (
        <button type="button" onClick={onRetry} className="shrink-0 font-semibold text-[#690D2B]">
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-[16px] bg-[#FFF9F1] p-4 text-center shadow-[inset_0_0_0_1px_rgba(184,138,74,0.14)]">
      <ImageIcon size={18} className="mx-auto text-[#B88A4A]" />
      <h3 className="mt-2 text-[1.2rem] leading-none text-[#2D1811]" style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </h3>
      {description ? <p className="mt-2 text-[12px] leading-5 text-[#776053]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-[16px] bg-[rgba(184,138,74,0.14)]', className)} />
}

export function AppToast({ message, tone = 'neutral' }: { message: string; tone?: 'neutral' | 'success' | 'danger' }) {
  if (!message) return null
  return (
    <div
      role="status"
      className={cx(
        'rounded-[1rem] px-4 py-3 text-[12px] leading-5 shadow-[var(--shadow-soft)]',
        tone === 'neutral' && 'bg-[var(--color-panel)] text-[var(--color-muted)]',
        tone === 'success' && 'bg-[rgba(63,117,79,0.1)] text-[var(--color-vineyard)]',
        tone === 'danger' && 'bg-[rgba(154,68,59,0.1)] text-[var(--color-alert)]',
      )}
    >
      {message}
    </div>
  )
}

export function BottomSheet({ children }: { children: ReactNode }) {
  return (
    <section className="sticky bottom-[calc(var(--safe-bottom)+4.8rem)] z-20 rounded-[1.2rem] bg-[rgba(255,250,242,0.92)] p-4 shadow-[var(--shadow-float)] backdrop-blur-xl">
      {children}
    </section>
  )
}

export function AppModal({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[1.2rem] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-float)]">
      {children}
    </div>
  )
}

export function CompactAddButton({
  to,
  onClick,
  ariaLabel,
  disabled = false,
}: {
  to?: string
  onClick?: () => void
  ariaLabel?: string
  disabled?: boolean
}) {
  const { t } = useAppPreferences()
  const label = ariaLabel ?? t('app.premium.addToCart')
  const content = <Plus size={18} aria-hidden="true" />
  const className = cx(
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition',
    disabled ? 'bg-[rgba(119,96,83,0.42)]' : 'bg-[var(--color-burgundy)] shadow-[0_10px_20px_rgba(84,17,36,0.16)]',
  )

  if (to && !disabled) {
    return <Link to={to} aria-label={label} title={label} className={className}>{content}</Link>
  }
  return <button type="button" onClick={onClick} disabled={disabled || !onClick} aria-label={label} title={label} className={className}>{content}</button>
}

export type WineItem = {
  id: string | number
  name: string
  kind?: string
  price?: string
  image?: string
  varietal?: string
  harvest?: string
  description?: string
}

export function WineCard({
  wine,
  badge,
  onAdd,
  addDisabled = false,
  addLabel,
}: {
  wine: WineItem
  badge?: string
  onAdd?: () => void
  addDisabled?: boolean
  addLabel?: string
}) {
  const detailPath = appPath(`/vinos/${wine.id}`)
  return (
    <article className="group min-w-0">
      <Link to={detailPath} className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[14px] bg-[linear-gradient(145deg,#EEE2D2,#E5D6C4)]">
        {badge ? (
          <span className="absolute left-2.5 top-2.5 z-10 max-w-[calc(100%-1.25rem)] truncate rounded-full bg-[#FFF9F1]/92 px-2 py-1 text-[8px] font-bold uppercase text-[#690D2B]">
            {badge}
          </span>
        ) : null}
        {wine.image ? (
          <ImageFallback src={wine.image} alt={wine.name} className="h-full w-full" />
        ) : (
          <EditorialImagePlaceholder />
        )}
      </Link>
      <div className="pt-2">
        <Link to={detailPath}>
          {wine.kind || wine.varietal ? (
            <p className="line-clamp-1 text-[10px] font-semibold uppercase text-[#B88A4A]">
              {[wine.kind, wine.varietal].filter(Boolean).join(' · ')}
            </p>
          ) : null}
          <h3 className="mt-0.5 line-clamp-2 min-h-[39px] text-[18px] leading-[1.06] text-[#2D1811]" style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}>
            {wine.name}
          </h3>
        </Link>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[12px] font-semibold text-[#690D2B]">
            {wine.price}
          </span>
          <CompactAddButton onClick={onAdd} disabled={addDisabled} ariaLabel={addLabel} />
        </div>
      </div>
    </article>
  )
}

export function EditorialCard({
  to,
  image,
  title,
  eyebrow,
  description,
  meta,
  actionLabel,
}: {
  to: string
  image?: string
  title: string
  eyebrow?: string
  description?: string
  meta?: ReactNode
  actionLabel?: string
}) {
  return (
    <Link to={to} className="app-editorial-card grid min-h-[148px] min-w-0 overflow-hidden rounded-[16px] border border-[rgba(184,138,74,0.16)] bg-[#FFF9F1]">
      <div className="min-w-0 p-4">
        {eyebrow ? <p className="line-clamp-1 text-[9px] font-semibold uppercase text-[#B88A4A]">{eyebrow}</p> : null}
        <h3 className="mt-1 line-clamp-2 text-[clamp(18px,5vw,21px)] leading-[1.05] text-[#2D1811]" style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}>
          {title}
        </h3>
        {description ? <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-[#776053]">{description}</p> : null}
        {meta ? <div className="mt-3">{meta}</div> : null}
        {actionLabel ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#690D2B]">
            {actionLabel}
            <ArrowRight size={14} />
          </p>
        ) : null}
      </div>
      <div className="app-editorial-card__media relative h-full min-h-[148px] overflow-hidden">
        {image ? (
          <ImageFallback src={image} alt={title} className="h-full w-full" />
        ) : (
          <EditorialImagePlaceholder />
        )}
      </div>
    </Link>
  )
}

export const ExperienceCard = EditorialCard
export const EventCard = EditorialCard
export const MembershipCard = EditorialCard

export function InlineSuccess({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-start gap-2 rounded-[1rem] bg-[rgba(63,117,79,0.1)] px-4 py-3 text-[12px] leading-5 text-[var(--color-vineyard)]">
      <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
      {children}
    </p>
  )
}
