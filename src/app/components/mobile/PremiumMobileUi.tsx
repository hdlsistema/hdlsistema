import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Plus, Search } from 'lucide-react'

type WineItem = {
  id: string | number
  name: string
  kind: string
  price: string
  image: string
  varietal?: string
  harvest?: string
}

type SectionHeadingProps = {
  eyebrow?: string
  title: string
  action?: ReactNode
}

export function SectionHeading({
  eyebrow,
  title,
  action,
}: SectionHeadingProps) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">
            {eyebrow}
          </p>
        ) : null}

        <h2
          className="text-[1.7rem] leading-[0.95] text-[var(--color-burgundy)]"
          style={{
            fontFamily: 'var(--font-display)',
            overflowWrap: 'anywhere',
          }}
        >
          {title}
        </h2>
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

type SearchFieldProps = {
  placeholder: string
}

export function SearchField({ placeholder }: SearchFieldProps) {
  return (
    <label className="flex items-center gap-3 rounded-[1.1rem] border border-[rgba(220,202,181,0.78)] bg-white px-4 py-3.5 shadow-[0_12px_28px_rgba(74,32,28,0.06)]">
      <Search
        size={17}
        className="shrink-0 text-[var(--color-burgundy)]"
      />

      <input
        type="search"
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)]"
      />
    </label>
  )
}

type PillRowProps = {
  items: string[]
  activeIndex?: number
}

export function PillRow({
  items,
  activeIndex = 0,
}: PillRowProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item, index) => {
        const isActive = index === activeIndex

        return (
          <button
            key={item}
            type="button"
            className="shrink-0 rounded-full border px-4 py-2 text-[12px] font-medium transition"
            style={{
              borderColor: isActive
                ? '#681126'
                : 'rgba(220, 202, 181, 0.8)',
              backgroundColor: isActive ? '#681126' : '#ffffff',
              color: isActive ? '#ffffff' : '#7d6a61',
              outline: 'none',
              boxShadow: 'none',
            }}
          >
            {item}
          </button>
        )
      })}
    </div>
  )
}

type CompactAddButtonProps = {
  to?: string
  onClick?: () => void
  ariaLabel?: string
}

export function CompactAddButton({
  to,
  onClick,
  ariaLabel = 'Agregar al carrito',
}: CompactAddButtonProps) {
  const content = (
    <Plus
      size={19}
      strokeWidth={2.2}
      color="#ffffff"
      aria-hidden="true"
    />
  )

  const sharedStyle = {
    width: 38,
    height: 38,
    minWidth: 38,
    minHeight: 38,
    flexShrink: 0,
    border: 'none',
    borderRadius: '999px',
    backgroundColor: '#681126',
    color: '#ffffff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    cursor: 'pointer',
    outline: 'none',
    boxShadow: '0 8px 18px rgba(104, 17, 38, 0.22)',
  } as const

  if (to) {
    return (
      <Link
        to={to}
        aria-label={ariaLabel}
        title={ariaLabel}
        style={sharedStyle}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      style={sharedStyle}
    >
      {content}
    </button>
  )
}

type WineCardProps = {
  wine: WineItem
  badge?: string
}

export function WineCard({
  wine,
  badge = 'Selección',
}: WineCardProps) {
  const detailPath = `/app/tienda/${wine.id}`

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-[1.35rem] border border-[rgba(220,202,181,0.78)] bg-white p-3 shadow-[0_16px_32px_rgba(74,32,28,0.07)]">
      <Link
        to={detailPath}
        className="relative flex h-[162px] items-center justify-center overflow-hidden rounded-[1.05rem] bg-[linear-gradient(145deg,#fbf4ea,#f1dfca)]"
      >
        <span
          className="absolute left-2.5 top-2.5 z-10 max-w-[calc(100%-20px)] truncate rounded-full bg-white/95 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--color-burgundy)] shadow-sm"
        >
          {badge}
        </span>

        <img
          src={wine.image}
          alt={wine.name}
          className="max-h-[134px] max-w-[76%] object-contain drop-shadow-[0_14px_12px_rgba(73,31,25,0.16)]"
        />
      </Link>

      <div className="flex flex-1 flex-col pt-3">
        <Link
          to={detailPath}
          className="block min-w-0"
        >
          <h3
            className="line-clamp-2 min-h-[38px] text-[16px] leading-[1.08] text-[var(--color-ink)]"
            style={{
              fontFamily: 'var(--font-display)',
              overflowWrap: 'anywhere',
            }}
          >
            {wine.name}
          </h3>

          <p className="mt-1 line-clamp-1 text-[11px] text-[var(--color-muted)]">
            {wine.kind}
            {wine.varietal ? ` · ${wine.varietal}` : ''}
          </p>
        </Link>

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span
            className="min-w-0 truncate text-[15px] font-bold text-[var(--color-burgundy)]"
            style={{
              lineHeight: 1,
            }}
          >
            {wine.price}
          </span>

          <CompactAddButton
            to="/app/carrito"
            ariaLabel={`Agregar ${wine.name} al carrito`}
          />
        </div>
      </div>
    </article>
  )
}

type PrimaryButtonProps = {
  children: ReactNode
  to?: string
  onClick?: () => void
  disabled?: boolean
}

export function PrimaryButton({
  children,
  to,
  onClick,
  disabled = false,
}: PrimaryButtonProps) {
  const sharedClassName =
    'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[1rem] px-5 py-3 text-center text-[14px] font-semibold transition hover:-translate-y-0.5'

  const sharedStyle = {
    backgroundColor: disabled ? '#b8a5a9' : '#681126',
    color: '#ffffff',
    border: 'none',
    outline: 'none',
    boxShadow: '0 14px 28px rgba(104, 13, 36, 0.18)',
    textDecoration: 'none',
    whiteSpace: 'normal',
    lineHeight: 1.2,
  } as const

  if (to) {
    return (
      <Link
        to={to}
        className={sharedClassName}
        style={sharedStyle}
      >
        <span style={{ color: '#ffffff' }}>
          {children}
        </span>

        <ArrowRight
          size={16}
          color="#ffffff"
          className="shrink-0"
        />
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={sharedClassName}
      style={{
        ...sharedStyle,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.65 : 1,
      }}
    >
      <span style={{ color: '#ffffff' }}>
        {children}
      </span>
    </button>
  )
}