import { Clock, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SectionHeading } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'

export function CartScreen() {
  const { isEnglish } = useAppPreferences()

  return (
    <div className="space-y-6 pb-3">
      <SectionHeading
        eyebrow={isEnglish ? 'Store' : 'Tienda'}
        title={isEnglish ? 'Cart coming soon' : 'Carrito próximamente'}
      />

      <section className="rounded-[1.35rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#f8eee5] text-[var(--color-burgundy)]">
          <ShoppingBag size={20} />
        </span>
        <h1 className="mt-4 text-[1.85rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
          {isEnglish ? 'Persistent cart is not active yet.' : 'El carrito persistente aún no está activo.'}
        </h1>
        <p className="mt-3 text-[13px] leading-6 text-[var(--color-muted)]">
          {isEnglish
            ? 'Published wines can be explored now. Cart, checkout and payments will be connected in the next transactional phase.'
            : 'Los vinos publicados ya se pueden consultar. Carrito, checkout y pagos se conectarán en la siguiente fase transaccional.'}
        </p>
      </section>

      <section className="rounded-[1.15rem] border border-[rgba(220,202,181,0.78)] bg-[#fffaf5] p-4 text-[12px] leading-5 text-[var(--color-muted)]">
        <div className="flex items-start gap-3">
          <Clock size={17} className="mt-0.5 shrink-0 text-[var(--color-gold)]" />
          <p>
            {isEnglish
              ? 'No totals, shipping fees, benefits or payment actions are calculated until the checkout backend is approved.'
              : 'No se calculan totales, envíos, beneficios ni acciones de pago hasta que el backend de checkout quede aprobado.'}
          </p>
        </div>
      </section>

      <Link
        to="/app/tienda"
        className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-[var(--color-burgundy)] px-5 text-[13px] font-bold text-white shadow-[0_13px_26px_rgba(104,17,38,0.2)]"
      >
        {isEnglish ? 'Explore published wines' : 'Explorar vinos publicados'}
      </Link>
    </div>
  )
}
