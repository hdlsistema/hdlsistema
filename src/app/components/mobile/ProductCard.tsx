import { Link } from 'react-router-dom'

type ProductCardProps = {
  id?: string
  image?: string
  title: string
  meta: string
  price: string
}

export function ProductCard({ id, image, title, meta, price }: ProductCardProps) {
  return (
    <article className="flex h-full min-w-0 flex-col rounded-[1.15rem] border border-[rgba(220,202,181,0.82)] bg-white p-2.5 shadow-[var(--shadow-card)]">
      {image ? (
        <img src={image} alt={title} className="mx-auto h-[102px] w-auto object-contain" />
      ) : (
        <div className="mx-auto h-[102px] w-[38px] rounded-t-[14px] rounded-b-[8px] bg-[linear-gradient(180deg,#2f160f_0_12%,#7c7366_12%_20%,#efe8db_20%_28%,#fdfbf7_28%_80%,#b18f5a_80%_86%,#6e1625_86%_100%)]" />
      )}
      <div className="mt-3 flex flex-1 flex-col">
        {id ? (
          <Link to={`/app/tienda/${id}`} className="block min-w-0 text-[11px] font-medium leading-[1.2] text-[var(--color-ink)]">
            {title}
          </Link>
        ) : (
          <h3 className="min-w-0 text-[11px] font-medium leading-[1.2] text-[var(--color-ink)]">{title}</h3>
        )}
        <p className="mt-1 text-[10px] leading-[1.2] text-[var(--color-muted)]">{meta}</p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-[var(--color-ink)]">{price}</p>
        <button
          type="button"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-[18px] leading-none text-white"
        >
          +
        </button>
      </div>
    </article>
  )
}
