import { Link } from 'react-router-dom'
import { CalendarDays, Grape, MapPin, Sparkles, Ticket, Wine } from 'lucide-react'
import { SectionHeading, WineCard } from '../../components/mobile/PremiumMobileUi'
import { wines } from '../../data/wines'
import { useAppPreferences } from '../../context/AppPreferencesContext'

export function HomeScreen() {
  const { isEnglish } = useAppPreferences()

  const actions = [
    {
      label: isEnglish ? 'Buy wine' : 'Comprar vino',
      detail: isEnglish ? 'Explore the cellar' : 'Explora la cava',
      to: '/control/app/tienda',
      icon: Wine,
    },
    {
      label: isEnglish ? 'Book' : 'Reservar',
      detail: isEnglish ? 'Tastings & tours' : 'Catas y recorridos',
      to: '/control/app/reservacion',
      icon: CalendarDays,
    },
    {
      label: isEnglish ? 'Events' : 'Eventos',
      detail: isEnglish ? 'Tickets & agenda' : 'Boletos y agenda',
      to: '/control/app/eventos',
      icon: Ticket,
    },
    {
      label: 'Wine Club',
      detail: isEnglish ? 'Exclusive benefits' : 'Beneficios exclusivos',
      to: '/control/app/club',
      icon: Grape,
    },
  ]
  return (
    <div className="space-y-6 pb-3">
      <section className="relative min-h-[275px] overflow-hidden rounded-[1.55rem] shadow-[0_24px_50px_rgba(53,23,20,0.18)]">
        <img src="/Slide-1.webp" alt="Viñedos de Hacienda de Letras" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(38,13,14,0.76),rgba(52,18,20,0.24),rgba(38,13,14,0.08))]" />
        <div className="relative flex min-h-[275px] max-w-[82%] flex-col justify-end p-6 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#efd8b3]">Hacienda de Letras</p>
          <h1 className="mt-2 text-[2.35rem] leading-[0.9]" style={{ fontFamily: 'var(--font-display)' }}>
            {isEnglish ? 'The wine of Aguascalientes' : 'El vino de Aguascalientes'}
          </h1>
          <p className="mt-3 max-w-[260px] text-[13px] leading-5 text-white/[0.88]">
            {isEnglish ? 'Tradition, landscape and experiences made to be enjoyed at your own pace.' : 'Tradición, paisaje y experiencias creadas para disfrutarse sin prisa.'}
          </p>
          <Link
            to="/control/app/experiencias"
            className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-burgundy)] px-4 py-2.5 text-[12px] font-semibold text-white shadow-lg"
          >
            {isEnglish ? 'Discover the experience' : 'Descubre la experiencia'}
            <Sparkles size={14} />
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.label}
              to={action.to}
              className="group min-w-0 rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f7ece2] text-[var(--color-burgundy)]">
                <Icon size={19} strokeWidth={1.8} />
              </span>
              <p className="mt-3 text-[15px] font-semibold leading-tight text-[var(--color-ink)]">{action.label}</p>
              <p className="mt-1 text-[11px] leading-4 text-[var(--color-muted)]">{action.detail}</p>
            </Link>
          )
        })}
      </section>

      <section className="space-y-4">
        <SectionHeading
          eyebrow={isEnglish ? 'The cellar' : 'La cava'}
          title={isEnglish ? 'Featured wines' : 'Vinos destacados'}
          action={
            <Link to="/control/app/tienda" className="text-[12px] font-semibold text-[var(--color-gold)]">
              {isEnglish ? 'View all' : 'Ver todos'}
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-3">
          {wines.slice(0, 4).map((wine, index) => (
            <WineCard key={wine.id} wine={wine} badge={index === 0 ? (isEnglish ? 'Best seller' : 'Más vendido') : (isEnglish ? 'Selection' : 'Selección')} />
          ))}
        </div>
      </section>

      <Link
        to="/control/app/sommelier"
        className="relative block overflow-hidden rounded-[1.4rem] bg-[linear-gradient(135deg,#5c0f23,#8e1f37)] p-5 text-white shadow-[0_18px_40px_rgba(93,15,35,0.22)]"
      >
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border border-white/10" />
        <div className="absolute -bottom-12 right-10 h-32 w-32 rounded-full border border-white/10" />
        <div className="relative flex items-center gap-4">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#d4aa63] bg-[#76162d] text-[#f1d39a]">
            <Sparkles size={23} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#edc98c]">ALQIA Sommelier</p>
            <h2
              className="mt-1 text-[1.6rem] leading-none text-[#f3dfb4]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {isEnglish ? 'Your ideal wine, better chosen' : 'Tu vino ideal, mejor elegido'}
            </h2>
            <p className="mt-2 text-[12px] leading-5 text-[#f6ead3]">
              {isEnglish ? 'Pairings, gifts and recommendations for your occasion.' : 'Maridajes, regalos y recomendaciones según tu ocasión.'}
            </p>
          </div>
        </div>
      </Link>

      <Link
        to="/control/app/mapa"
        className="grid min-h-[150px] grid-cols-[0.9fr_1.1fr] overflow-hidden rounded-[1.35rem] border border-[rgba(220,202,181,0.78)] bg-white shadow-[0_16px_34px_rgba(74,32,28,0.07)]"
      >
        <div className="relative overflow-hidden bg-[#efe3d2]">
          <img src="/Slide-1.webp" alt="Ruta a Hacienda de Letras" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[rgba(86,19,33,0.22)]" />
          <span className="absolute left-1/2 top-1/2 inline-flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white shadow-xl">
            <MapPin size={21} />
          </span>
        </div>
        <div className="flex flex-col justify-center p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">{isEnglish ? 'Visit us' : 'Visítanos'}</p>
          <h3 className="mt-1 text-[1.45rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
            {isEnglish ? 'How to get here?' : '¿Cómo llegar?'}
          </h3>
          <p className="mt-2 text-[12px] leading-5 text-[var(--color-muted)]">{isEnglish ? 'Check the route and explore the main points of the hacienda.' : 'Consulta la ruta y explora los puntos principales de la hacienda.'}</p>
        </div>
      </Link>
    </div>
  )
}
