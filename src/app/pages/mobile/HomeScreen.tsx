import { Link } from 'react-router-dom'
import { CalendarDays, Grape, MapPin, Sparkles, Ticket, Wine } from 'lucide-react'
import { SectionHeading, WineCard } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicContent } from '../../hooks/usePublicContent'
import { contentRouteId, formatCurrency, imageField, numberField, textField } from '../../utils/publicContent'

export function HomeScreen() {
  const { isEnglish, locale } = useAppPreferences()
  const { records: wines, loading: loadingWines, error: winesError, retry: retryWines } = usePublicContent('wines')
  const { records: experiences, loading: loadingExperiences, error: experiencesError, retry: retryExperiences } = usePublicContent('experiences')
  const { records: events, loading: loadingEvents, error: eventsError, retry: retryEvents } = usePublicContent('events')
  const { records: promotions } = usePublicContent('promotions')
  const { records: plans } = usePublicContent('membership-plans')

  const actions = [
    {
      label: isEnglish ? 'Buy wine' : 'Comprar vino',
      detail: isEnglish ? 'Explore the cellar' : 'Explora la cava',
      to: '/app/tienda',
      icon: Wine,
    },
    {
      label: isEnglish ? 'Book' : 'Reservar',
      detail: isEnglish ? 'Tastings & tours' : 'Catas y recorridos',
      to: '/app/reservacion',
      icon: CalendarDays,
    },
    {
      label: isEnglish ? 'Events' : 'Eventos',
      detail: isEnglish ? 'Published agenda' : 'Agenda publicada',
      to: '/app/eventos',
      icon: Ticket,
    },
    {
      label: 'Wine Club',
      detail: isEnglish ? 'Published plans' : 'Planes publicados',
      to: '/app/club',
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
            to="/app/experiencias"
            className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-burgundy)] px-4 py-2.5 text-[12px] font-semibold text-white shadow-lg"
          >
            {isEnglish ? 'See published experiences' : 'Ver experiencias publicadas'}
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
            <Link to="/app/tienda" className="text-[12px] font-semibold text-[var(--color-gold)]">
              {isEnglish ? 'View all' : 'Ver todos'}
            </Link>
          }
        />
        {loadingWines ? (
          <div className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">
            {isEnglish ? 'Loading published wines...' : 'Cargando vinos publicados...'}
          </div>
        ) : winesError ? (
          <div className="rounded-[1.2rem] border border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] p-5 text-[12px] text-[var(--color-alert)]">
            <p>{winesError}</p>
            <button type="button" onClick={retryWines} className="mt-3 text-[12px] font-semibold text-[var(--color-burgundy)]">
              {isEnglish ? 'Retry' : 'Reintentar'}
            </button>
          </div>
        ) : wines.length === 0 ? (
          <div className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">
            {isEnglish ? 'No featured wines available.' : 'No hay vinos destacados disponibles.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {wines.slice(0, 4).map((wine, index) => (
              <WineCard
                key={wine.id}
                wine={{
                  id: contentRouteId(wine),
                  name: textField(wine, 'name', isEnglish ? 'Wine' : 'Vino'),
                  kind: textField(wine, 'subtitle') || textField(wine, 'origin') || textField(wine, 'status'),
                  price: formatCurrency(numberField(wine, 'price'), locale),
                  image: imageField(wine, '/Logo-HDL-2.svg'),
                  varietal: textField(wine, 'grape_variety'),
                  harvest: textField(wine, 'vintage'),
                }}
                badge={index === 0 ? (isEnglish ? 'Featured' : 'Destacado') : (isEnglish ? 'Selection' : 'Selección')}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeading
          eyebrow={isEnglish ? 'Experiences' : 'Experiencias'}
          title={isEnglish ? 'Available to book' : 'Disponibles para reservar'}
          action={<Link to="/app/experiencias" className="text-[12px] font-semibold text-[var(--color-gold)]">{isEnglish ? 'View all' : 'Ver todas'}</Link>}
        />
        {loadingExperiences ? (
          <div className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">
            {isEnglish ? 'Loading published experiences...' : 'Cargando experiencias publicadas...'}
          </div>
        ) : experiencesError ? (
          <div className="rounded-[1.2rem] border border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] p-5 text-[12px] text-[var(--color-alert)]">
            <p>{experiencesError}</p>
            <button type="button" onClick={retryExperiences} className="mt-3 text-[12px] font-semibold text-[var(--color-burgundy)]">
              {isEnglish ? 'Retry' : 'Reintentar'}
            </button>
          </div>
        ) : experiences.length === 0 ? (
          <div className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">
            {isEnglish ? 'No experiences are published yet.' : 'Aún no hay experiencias publicadas.'}
          </div>
        ) : (
          <div className="grid gap-3">
            {experiences.slice(0, 2).map((experience) => (
              <Link key={experience.id} to="/app/reservacion" state={{ experienceId: contentRouteId(experience) }} className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-3 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
                <img src={imageField(experience, '/turismo.jpeg')} alt={textField(experience, 'title', 'Experiencia')} className="h-24 w-full rounded-[0.9rem] object-cover" />
                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-[16px] font-semibold leading-tight text-[var(--color-ink)]">{textField(experience, 'title', 'Experiencia')}</h3>
                  <p className="mt-1 line-clamp-2 text-[11px] text-[var(--color-muted)]">{textField(experience, 'short_description') || textField(experience, 'description')}</p>
                  <p className="mt-2 text-[12px] font-semibold text-[var(--color-burgundy)]">{formatCurrency(numberField(experience, 'base_price'), locale)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeading
          eyebrow={isEnglish ? 'Agenda' : 'Agenda'}
          title={isEnglish ? 'Published events' : 'Eventos publicados'}
          action={<Link to="/app/eventos" className="text-[12px] font-semibold text-[var(--color-gold)]">{isEnglish ? 'Open' : 'Abrir'}</Link>}
        />
        {loadingEvents ? (
          <div className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">
            {isEnglish ? 'Loading published events...' : 'Cargando eventos publicados...'}
          </div>
        ) : eventsError ? (
          <div className="rounded-[1.2rem] border border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] p-5 text-[12px] text-[var(--color-alert)]">
            <p>{eventsError}</p>
            <button type="button" onClick={retryEvents} className="mt-3 text-[12px] font-semibold text-[var(--color-burgundy)]">
              {isEnglish ? 'Retry' : 'Reintentar'}
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-5 text-[12px] text-[var(--color-muted)]">
            {isEnglish ? 'No events are published yet.' : 'Aún no hay eventos publicados.'}
          </div>
        ) : (
          <div className="grid gap-3">
            {events.slice(0, 2).map((event) => (
              <Link key={event.id} to={`/app/eventos/${contentRouteId(event)}`} className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">{textField(event, 'venue') || (isEnglish ? 'Published event' : 'Evento publicado')}</p>
                <h3 className="mt-1 text-[1.45rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{textField(event, 'title', 'Evento')}</h3>
                <p className="mt-2 text-[11px] text-[var(--color-muted)]">{textField(event, 'short_description') || textField(event, 'description')}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {promotions.length || plans.length ? (
        <section className="grid gap-3">
          {promotions[0] ? (
            <Link to="/app/tienda" className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">{isEnglish ? 'Published promotion' : 'Promoción publicada'}</p>
              <h3 className="mt-1 text-[1.35rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{textField(promotions[0], 'title') || textField(promotions[0], 'name', 'Promoción')}</h3>
            </Link>
          ) : null}
          {plans[0] ? (
            <Link to="/app/club" className="rounded-[1.2rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">Wine Club</p>
              <h3 className="mt-1 text-[1.35rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{textField(plans[0], 'name', isEnglish ? 'Membership plan' : 'Plan de membresía')}</h3>
            </Link>
          ) : null}
        </section>
      ) : null}

      <Link
        to="/app/sommelier"
        className="relative block overflow-hidden rounded-[1.4rem] bg-[linear-gradient(135deg,#5c0f23,#8e1f37)] p-5 text-white shadow-[0_18px_40px_rgba(93,15,35,0.22)]"
      >
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border border-white/10" />
        <div className="absolute -bottom-12 right-10 h-32 w-32 rounded-full border border-white/10" />
        <div className="relative flex items-center gap-4">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#d4aa63] bg-[#76162d] text-[#f1d39a]">
            <Sparkles size={23} />
          </span>
          <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#edc98c]">Sommelier</p>
            <h2
              className="mt-1 text-[1.6rem] leading-none text-[#f3dfb4]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {isEnglish ? 'Coming soon' : 'Disponible próximamente'}
            </h2>
            <p className="mt-2 text-[12px] leading-5 text-[#f6ead3]">
              {isEnglish ? 'Wine guidance will be connected in a later phase.' : 'La guía de vinos se conectará en una fase posterior.'}
            </p>
          </div>
        </div>
      </Link>

      <Link
        to="/app/mapa"
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
          <p className="mt-2 text-[12px] leading-5 text-[var(--color-muted)]">{isEnglish ? 'Open the configurable map of the hacienda.' : 'Abre el mapa configurable de la hacienda.'}</p>
        </div>
      </Link>
    </div>
  )
}
