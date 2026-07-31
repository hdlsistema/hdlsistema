import { useMemo, useState } from 'react'
import { Check, CreditCard, Minus, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { PrimaryButton, SectionHeading } from '../../components/mobile/PremiumMobileUi'
import { wines } from '../../data/wines'
import { useAppPreferences } from '../../context/AppPreferencesContext'

function parsePrice(value: string) {
  return Number(value.replace(/[^0-9.]/g, '')) || 0
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
}

export function CartScreen() {
  const { isEnglish } = useAppPreferences()
  const initialItems = wines.slice(0, 3)
  const [items, setItems] = useState(() => initialItems.map((wine, index) => ({ wine, quantity: index === 0 ? 2 : 1 })))
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + parsePrice(item.wine.price) * item.quantity, 0),
    [items],
  )
  const shipping = subtotal > 1200 ? 0 : 120
  const discount = subtotal >= 900 ? 50 : 0
  const total = subtotal + shipping - discount

  const updateQuantity = (id: string | number, delta: number) => {
    setItems((current) =>
      current.map((item) =>
        item.wine.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item,
      ),
    )
  }

  const removeItem = (id: string | number) => {
    setItems((current) => current.filter((item) => item.wine.id !== id))
  }

  return (
    <div className="space-y-6 pb-3">
      <SectionHeading eyebrow={isEnglish ? 'Your selection' : 'Tu selección'} title={isEnglish ? `My cart (${items.length})` : `Mi carrito (${items.length})`} />

      <section className="space-y-3">
        {items.map(({ wine, quantity }) => (
          <article
            key={wine.id}
            className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-3 shadow-[0_14px_30px_rgba(74,32,28,0.06)]"
          >
            <div className="flex h-[108px] items-center justify-center rounded-[0.95rem] bg-[linear-gradient(145deg,#fbf4ea,#f0ddc7)]">
              <img src={wine.image} alt={wine.name} className="max-h-[92px] w-auto object-contain drop-shadow-md" />
            </div>

            <div className="flex min-w-0 flex-col justify-between py-1">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3
                    className="break-words text-[1.15rem] leading-[1.02] text-[var(--color-ink)]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {wine.name}
                  </h3>
                  <p className="mt-1 text-[11px] text-[var(--color-muted)]">{wine.kind} · 750 ml</p>
                </div>
                <button
                  type="button"
                  aria-label={isEnglish ? `Remove ${wine.name}` : `Eliminar ${wine.name}`}
                  onClick={() => removeItem(wine.id)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-muted)]"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="flex items-end justify-between gap-3">
                <p className="text-[15px] font-semibold text-[var(--color-burgundy)]">{wine.price}</p>
                <div className="flex items-center gap-1 rounded-full border border-[rgba(104,13,36,0.13)] bg-[#fffaf5] p-1">
                  <button
                    type="button"
                    aria-label={isEnglish ? 'Decrease quantity' : 'Disminuir cantidad'}
                    onClick={() => updateQuantity(wine.id, -1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-burgundy)]"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-[12px] font-semibold text-[var(--color-ink)]">{quantity}</span>
                  <button
                    type="button"
                    aria-label={isEnglish ? 'Increase quantity' : 'Aumentar cantidad'}
                    onClick={() => updateQuantity(wine.id, 1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">{isEnglish ? 'Benefit code' : 'Código de beneficio'}</p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            placeholder={isEnglish ? 'Coupon or membership' : 'Cupón o membresía'}
            className="min-w-0 flex-1 rounded-[0.9rem] border border-[rgba(220,202,181,0.78)] bg-[#fffaf5] px-3 py-3 text-[12px] text-[var(--color-ink)] outline-none"
          />
          <button type="button" className="rounded-[0.9rem] border border-[var(--color-burgundy)] px-4 text-[12px] font-semibold text-[var(--color-burgundy)]">
            {isEnglish ? 'Apply' : 'Aplicar'}
          </button>
        </div>
      </section>

      <section className="rounded-[1.35rem] border border-[rgba(220,202,181,0.78)] bg-[linear-gradient(145deg,#fffaf5,#f3e2cf)] p-5 shadow-[0_18px_38px_rgba(74,32,28,0.08)]">
        <div className="space-y-3 text-[13px]">
          <div className="flex items-center justify-between gap-4 text-[var(--color-muted)]">
            <span>{isEnglish ? 'Subtotal' : 'Subtotal'}</span>
            <span className="font-semibold text-[var(--color-ink)]">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[var(--color-muted)]">
            <span>{isEnglish ? 'Shipping' : 'Envío'}</span>
            <span className="font-semibold text-[var(--color-ink)]">{shipping === 0 ? (isEnglish ? 'Free' : 'Sin costo') : formatCurrency(shipping)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[var(--color-muted)]">
            <span>{isEnglish ? 'Benefit applied' : 'Beneficio aplicado'}</span>
            <span className="font-semibold text-[#477553]">-{formatCurrency(discount)}</span>
          </div>
        </div>

        <div className="my-4 h-px bg-[rgba(104,13,36,0.12)]" />

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] text-[var(--color-muted)]">{isEnglish ? 'Total' : 'Total'}</p>
            <p className="mt-1 text-[2rem] leading-none text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>
              {formatCurrency(total)}
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-[var(--color-burgundy)]">MXN</span>
        </div>
      </section>

      <section className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f7ece2] text-[var(--color-burgundy)]">
            <CreditCard size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[var(--color-ink)]">{isEnglish ? 'Visa ending in 1845' : 'Visa terminación 1845'}</p>
            <p className="mt-1 text-[11px] text-[var(--color-muted)]">{isEnglish ? 'Secure payment · Apple Pay available' : 'Pago protegido · Apple Pay disponible'}</p>
          </div>
          <ShieldCheck size={18} className="shrink-0 text-[#477553]" />
        </div>
      </section>

      {paymentConfirmed ? (
        <div className="flex items-center gap-3 rounded-[1rem] bg-[#edf5ed] px-4 py-3 text-[13px] font-semibold text-[#3f6f4b]">
          <Check size={17} />
          {isEnglish ? 'Payment authorized. Your order was registered.' : 'Pago autorizado. Tu pedido fue registrado.'}
        </div>
      ) : null}

      <PrimaryButton onClick={() => setPaymentConfirmed(true)} disabled={items.length === 0 || paymentConfirmed}>
        {isEnglish
          ? (paymentConfirmed ? 'Purchase confirmed' : 'Complete purchase')
          : (paymentConfirmed ? 'Compra confirmada' : 'Finalizar compra')}
      </PrimaryButton>
    </div>
  )
}
