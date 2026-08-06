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
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">
            {eyebrow}
          </p>
        ) : null}
        <h2
          className="mt-1 text-[1.62rem] leading-[0.98] text-[var(--color-ink)]"
          style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 max-w-[31rem] text-[12px] leading-5 text-[var(--color-muted)]">
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
        'relative isolate overflow-hidden rounded-[1.35rem] bg-[var(--color-burgundy-deep)] text-white shadow-[var(--shadow-float)]',
        compact ? 'min-h-[220px]' : 'min-h-[292px]',
      )}
    >
      {image ? (
        <img src={image} alt={alt ?? title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(140deg,#4d1022,#8f4538_58%,#d8bb89)]" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,7,8,0.18),rgba(26,7,8,0.78))]" />
      <div className="relative flex min-h-[inherit] flex-col justify-end p-5">
        {eyebrow ? (
          <p className="max-w-full text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ead0a2]">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className="mt-2 max-w-[19rem] text-[2.45rem] leading-[0.9] text-white"
          style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 max-w-[20rem] text-[12px] leading-5 text-white/82">
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
    <div className="app-scrollbar-none flex gap-2 overflow-x-auto pb-1">
      {items.map((item, index) => {
        const active = index === activeIndex
        return (
          <button
            key={item}
            type="button"
            onClick={() => onSelect?.(index)}
            className={cx(
              'min-h-10 shrink-0 rounded-full px-4 text-[12px] font-semibold transition-colors',
              active
                ? 'bg-[var(--color-burgundy)] text-white'
                : 'bg-[rgba(255,250,242,0.86)] text-[var(--color-muted-strong)] shadow-[inset_0_0_0_1px_rgba(170,125,67,0.22)]',
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
    'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[0.95rem] px-5 py-3 text-center text-[13px] font-semibold leading-5 transition-transform',
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
      to="/app/carrito"
      className="fixed bottom-[calc(var(--safe-bottom)+4.6rem)] right-4 z-40 inline-flex h-[3.25rem] min-h-[3.25rem] w-[3.25rem] min-w-[3.25rem] items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white shadow-[var(--shadow-float)] md:absolute"
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
    <div className="rounded-[1.15rem] bg-[rgba(255,250,242,0.78)] p-5 text-[12px] text-[var(--color-muted)] shadow-[inset_0_0_0_1px_rgba(170,125,67,0.16)]">
      <Loader2 size={17} className="mb-3 animate-spin text-[var(--color-burgundy)]" />
      {label}
    </div>
  )
}

export function ErrorState({ message, retryLabel, onRetry }: {
  message: string
  retryLabel?: string
  onRetry?: () => void
}) {
  return (
    <div className="rounded-[1.15rem] bg-[rgba(154,68,59,0.08)] p-5 text-[12px] leading-5 text-[var(--color-alert)] shadow-[inset_0_0_0_1px_rgba(154,68,59,0.18)]">
      <AlertCircle size={17} className="mb-3" />
      <p>{message}</p>
      {onRetry && retryLabel ? (
        <button type="button" onClick={onRetry} className="mt-3 font-semibold text-[var(--color-burgundy)]">
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
    <div className="rounded-[1.2rem] bg-[rgba(255,250,242,0.78)] p-5 text-center shadow-[inset_0_0_0_1px_rgba(170,125,67,0.16)]">
      <ImageIcon size={22} className="mx-auto text-[var(--color-gold)]" />
      <h3 className="mt-3 text-[1.35rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </h3>
      {description ? <p className="mt-2 text-[12px] leading-5 text-[var(--color-muted)]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-[1rem] bg-[rgba(170,125,67,0.14)]', className)} />
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
  const detailPath = `/app/tienda/${wine.id}`
  return (
    <article className="group min-w-0 overflow-hidden rounded-[1.18rem] bg-[rgba(255,250,242,0.9)] shadow-[var(--shadow-card)]">
      <Link to={detailPath} className="relative flex h-[172px] items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#f8ecd9,#ead8c2)] p-4">
        {badge ? (
          <span className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] truncate rounded-full bg-white/90 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--color-burgundy)]">
            {badge}
          </span>
        ) : null}
        <ImageFallback src={wine.image} alt={wine.name} contain className="max-h-[135px] max-w-[82%] drop-shadow-[0_16px_14px_rgba(61,28,17,0.16)]" />
      </Link>
      <div className="p-3.5">
        <Link to={detailPath}>
          <h3 className="line-clamp-2 min-h-[38px] text-[16px] leading-[1.08] text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}>
            {wine.name}
          </h3>
          {wine.kind || wine.varietal ? (
            <p className="mt-1 line-clamp-1 text-[11px] text-[var(--color-muted)]">
              {[wine.kind, wine.varietal].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </Link>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[14px] font-bold text-[var(--color-burgundy)]">
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
    <Link to={to} className="block overflow-hidden rounded-[1.22rem] bg-[rgba(255,250,242,0.9)] shadow-[var(--shadow-card)]">
      <div className="relative h-[210px] overflow-hidden bg-[var(--color-soft)]">
        <ImageFallback src={image} alt={title} className="h-full w-full" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(42,14,15,0.02),rgba(42,14,15,0.68))]" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          {eyebrow ? <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#e5c48d]">{eyebrow}</p> : null}
          <h3 className="mt-1 text-[1.65rem] leading-none text-white" style={{ fontFamily: 'var(--font-display)', overflowWrap: 'anywhere' }}>
            {title}
          </h3>
        </div>
      </div>
      <div className="p-4">
        {description ? <p className="line-clamp-2 text-[12px] leading-5 text-[var(--color-muted)]">{description}</p> : null}
        {meta ? <div className="mt-3">{meta}</div> : null}
        {actionLabel ? (
          <p className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--color-burgundy)]">
            {actionLabel}
            <ArrowRight size={14} />
          </p>
        ) : null}
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
