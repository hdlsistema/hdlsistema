import { Link } from 'react-router-dom'
import { CalendarDays, Crown, Gift, Grape, Sparkles, Star, Ticket, Wine } from 'lucide-react'
import { PrimaryButton, SectionHeading } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'

export function ClubScreen() {
  const { isEnglish } = useAppPreferences()

  const benefits = [
    { icon: Wine, title: isEnglish ? 'Special selections' : 'Selecciones especiales', detail: isEnglish ? 'Labels reserved for members.' : 'Etiquetas reservadas para miembros.' },
    { icon: Ticket, title: isEnglish ? 'Priority access' : 'Acceso preferente', detail: isEnglish ? 'Pre-sales and spots for events.' : 'Preventa y cupos para eventos.' },
    { icon: CalendarDays, title: isEnglish ? 'Private experiences' : 'Experiencias privadas', detail: isEnglish ? 'Exclusive tastings and gatherings.' : 'Catas y encuentros exclusivos.' },
    { icon: Gift, title: isEnglish ? 'Personal benefits' : 'Beneficios personales', detail: isEnglish ? 'Anniversaries, birthdays and gifts.' : 'Aniversarios, cumpleaños y regalos.' },
  ]

  return (
    <div className="space-y-6 pb-3">
      <section className="relative overflow-hidden rounded-[1.55rem] bg-[linear-gradient(135deg,#520d20,#8d2038)] p-6 text-white shadow-[0_24px_48px_rgba(85,13,32,0.24)]">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-white/10" />
        <div className="absolute -bottom-16 right-14 h-40 w-40 rounded-full border border-white/10" />
        <div className="relative">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#d6b16e] bg-white/5 text-[#f1d39a]">
            <Crown size={22} />
          </span>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#efcd91]">Wine Club</p>
          <h1 className="mt-2 max-w-[290px] text-[2.55rem] leading-[0.88]" style={{ fontFamily: 'var(--font-display)' }}>
            {isEnglish ? 'Belonging is also enjoyed' : 'Pertenecer también se disfruta'}
          </h1>
          <p className="mt-4 max-w-[300px] text-[13px] leading-5 text-white/80">
            {isEnglish
              ? 'A closer relationship with Hacienda de Letras, with benefits that accompany every visit and every bottle.'
              : 'Una relación más cercana con Hacienda de Letras, con beneficios que acompañan cada visita y cada botella.'}
          </p>
        </div>
      </section>

      <section className="rounded-[1.35rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 shadow-[0_16px_34px_rgba(74,32,28,0.07)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{isEnglish ? 'Current membership' : 'Membresía actual'}</p>
            <h2 className="mt-1 text-[1.9rem] leading-none text-[var(--color-burgundy)]" style={{ fontFamily: 'var(--font-display)' }}>
              {isEnglish ? 'Gold Reserve' : 'Reserva Oro'}
            </h2>
            <p className="mt-2 text-[12px] text-[var(--color-muted)]">{isEnglish ? 'Annual plan · Active' : 'Plan anual · Activo'}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf5ed] px-3 py-1.5 text-[10px] font-semibold text-[#3f6f4b]">
            <Star size={12} fill="currentColor" />
            {isEnglish ? 'Active' : 'Activo'}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            ['850', isEnglish ? 'Points' : 'Puntos'],
            ['12', isEnglish ? 'Benefits' : 'Beneficios'],
            ['18 dic', isEnglish ? 'Renewal' : 'Renovación'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-[1rem] bg-[#fff8f1] p-3 text-center">
              <p className="text-[18px] font-semibold text-[var(--color-burgundy)]">{value}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-[var(--color-muted)]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          eyebrow={isEnglish ? 'Your membership' : 'Tu membresía'}
          title={isEnglish ? 'Exclusive benefits' : 'Beneficios exclusivos'}
        />
        <div className="grid grid-cols-2 gap-3">
          {benefits.map((benefit) => {
            const Icon = benefit.icon
            return (
              <article key={benefit.title} className="min-w-0 rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_13px_28px_rgba(74,32,28,0.05)]">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f7ece2] text-[var(--color-burgundy)]">
                  <Icon size={18} />
                </span>
                <h3 className="mt-3 break-words text-[14px] font-semibold leading-tight text-[var(--color-ink)]">{benefit.title}</h3>
                <p className="mt-2 text-[11px] leading-4 text-[var(--color-muted)]">{benefit.detail}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.3rem] border border-[rgba(220,202,181,0.78)] bg-[linear-gradient(145deg,#fffaf5,#f2dfca)] p-5 shadow-[0_16px_34px_rgba(74,32,28,0.06)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white">
            <Grape size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">{isEnglish ? 'Next benefit' : 'Próximo beneficio'}</p>
            <h3 className="mt-1 text-[1.45rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
              {isEnglish ? 'Private winter tasting' : 'Cata privada de invierno'}
            </h3>
          </div>
        </div>
        <p className="mt-4 text-[12px] leading-5 text-[var(--color-muted)]">
          {isEnglish
            ? 'Early access for two people and a special selection of seasonal labels.'
            : 'Acceso anticipado para dos personas y selección especial de etiquetas de temporada.'}
        </p>
        <Link to="/control/app/eventos" className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--color-burgundy)]">
          {isEnglish ? 'View invitation' : 'Ver invitación'}
          <Sparkles size={14} />
        </Link>
      </section>

      <PrimaryButton>{isEnglish ? 'View benefits and renew' : 'Ver beneficios y renovar'}</PrimaryButton>
    </div>
  )
}
