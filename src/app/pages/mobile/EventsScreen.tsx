import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  PartyPopper,
  Sparkles,
  Ticket,
} from 'lucide-react'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicContent } from '../../hooks/usePublicContent'
import {
  contentRouteId,
  formatCurrency,
  formatPublicDate,
  imageField,
  numberField,
  textField,
} from '../../utils/publicContent'

type EventCategory =
  | 'Todos'
  | 'Festivales'
  | 'Vendimias'
  | 'Gastronomía'
  | 'Privados'

type EventVisual =
  | {
      type: 'photo'
      asset: string
    }
  | {
      type: 'logo'
      asset: string
      background: string
    }

const categories: EventCategory[] = [
  'Todos',
  'Festivales',
  'Vendimias',
  'Gastronomía',
  'Privados',
]

const categoryLabels: Record<EventCategory, { es: string; en: string }> = {
  'Todos': { es: 'Todos', en: 'All' },
  'Festivales': { es: 'Festivales', en: 'Festivals' },
  'Vendimias': { es: 'Vendimias', en: 'Harvests' },
  'Gastronomía': { es: 'Gastronomía', en: 'Gastronomy' },
  'Privados': { es: 'Privados', en: 'Private' },
}

function getFestivalIdentities(isEnglish: boolean) {
  return [
    {
      name: 'Vendimia',
      subtitle: isEnglish ? 'Wine tradition' : 'Tradición vinícola',
      logo: '/Logo-vendimia.svg',
      background: 'linear-gradient(145deg, #efe4d2 0%, #c5a36c 48%, #5b1a29 100%)',
    },
    {
      name: 'Espuma y Vino',
      subtitle: isEnglish ? 'Festival' : 'Festival',
      logo: '/festival%20espuma.svg',
      background: 'linear-gradient(145deg, #edf2f6 0%, #6086a5 48%, #142c47 100%)',
    },
    {
      name: 'Vino en Colores',
      subtitle: isEnglish ? 'Art and wine' : 'Arte y vino',
      logo: '/Logo-Vino-en-Colores%20fesitval.webp',
      background: 'linear-gradient(145deg, #fff7e8 0%, #efb580 48%, #862943 100%)',
    },
    {
      name: '1000 Copas',
      subtitle: isEnglish ? 'Celebration' : 'Celebración',
      logo: '/festival%201000%20copas.svg',
      background: 'linear-gradient(145deg, #f4eadb 0%, #b89162 48%, #4f0f1f 100%)',
    },
  ]
}

function getSeasonalEvents(isEnglish: boolean) {
  return [
    {
      id: 'san-valentin',
      title: isEnglish ? "Valentine's Day" : 'San Valentín',
      description: isEnglish ? 'Wine, dinners and experiences to share.' : 'Vino, cenas y experiencias para compartir.',
      image: '/san%20valentin%20evento.webp',
      month: isEnglish ? 'February' : 'Febrero',
    },
    {
      id: 'independencia',
      title: isEnglish ? 'Independence Fiesta' : 'Fiesta de Independencia',
      description: isEnglish ? 'Music, gastronomy and Mexican wine.' : 'Música, gastronomía y vino mexicano.',
      image: '/independencia%20evento.webp',
      month: isEnglish ? 'September' : 'Septiembre',
    },
    {
      id: 'halloween',
      title: 'Halloween',
      description: isEnglish ? 'A different celebration inside the hacienda.' : 'Una celebración diferente dentro de la hacienda.',
      image: '/1-Halloween%20evento.webp',
      month: isEnglish ? 'October' : 'Octubre',
    },
    {
      id: 'leyendas',
      title: isEnglish ? 'Legends Evening' : 'Tarde de Leyendas',
      description: isEnglish ? 'Tales, ambiance and a night among history.' : 'Relatos, ambientación y una noche entre historia.',
      image: '/Tarde-Leyendas%20evento.webp',
      month: isEnglish ? 'Special season' : 'Temporada especial',
    },
  ]
}

function normalizeText(value: string) {
  return value.toLocaleLowerCase('es-MX')
}

function getEventCategory(title: string): EventCategory {
  const normalizedTitle = normalizeText(title)

  if (normalizedTitle.includes('vendimia')) {
    return 'Vendimias'
  }

  if (
    normalizedTitle.includes('cena') ||
    normalizedTitle.includes('maridaje') ||
    normalizedTitle.includes('gastronom')
  ) {
    return 'Gastronomía'
  }

  if (
    normalizedTitle.includes('corporativo') ||
    normalizedTitle.includes('privado') ||
    normalizedTitle.includes('boda')
  ) {
    return 'Privados'
  }

  return 'Festivales'
}

function getEventVisual(title: string, index: number): EventVisual {
  const normalizedTitle = normalizeText(title)

  if (
    normalizedTitle.includes('1000') ||
    normalizedTitle.includes('copas')
  ) {
    return {
      type: 'logo',
      asset: '/festival%201000%20copas.svg',
      background:
        'linear-gradient(145deg, #e9dcc8 0%, #a67b55 47%, #4f0f1f 100%)',
    }
  }

  if (normalizedTitle.includes('vendimia')) {
    return {
      type: 'logo',
      asset: '/Logo-vendimia.svg',
      background:
        'linear-gradient(145deg, #e8ddc8 0%, #a88a59 47%, #532035 100%)',
    }
  }

  if (normalizedTitle.includes('espuma')) {
    return {
      type: 'logo',
      asset: '/festival%20espuma.svg',
      background:
        'linear-gradient(145deg, #dfeaf0 0%, #5681a0 48%, #172f48 100%)',
    }
  }

  if (
    normalizedTitle.includes('vino en colores') ||
    normalizedTitle.includes('colores')
  ) {
    return {
      type: 'logo',
      asset: '/Logo-Vino-en-Colores%20fesitval.webp',
      background:
        'linear-gradient(145deg, #fff2dc 0%, #dc9d78 48%, #772039 100%)',
    }
  }

  if (
    normalizedTitle.includes('cena') ||
    normalizedTitle.includes('maridaje') ||
    normalizedTitle.includes('romant')
  ) {
    return {
      type: 'photo',
      asset: '/romantic%20dinners%20evento.webp',
    }
  }

  if (
    normalizedTitle.includes('corporativo') ||
    normalizedTitle.includes('privado')
  ) {
    return {
      type: 'photo',
      asset: '/Picnic%20evento.webp',
    }
  }

  const fallbackPhotos = [
    '/independencia%20evento.webp',
    '/san%20valentin%20evento.webp',
    '/Tarde-Leyendas%20evento.webp',
    '/1-Halloween%20evento.webp',
  ]

  return {
    type: 'photo',
    asset: fallbackPhotos[index % fallbackPhotos.length],
  }
}

function getEventBadge(title: string, index: number, isEnglish: boolean) {
  const normalizedTitle = normalizeText(title)

  if (index === 0) {
    return isEnglish ? 'Featured event' : 'Evento destacado'
  }

  if (normalizedTitle.includes('vendimia')) {
    return isEnglish ? 'Tradition' : 'Tradición'
  }

  if (
    normalizedTitle.includes('cena') ||
    normalizedTitle.includes('maridaje')
  ) {
    return isEnglish ? 'Gastronomy' : 'Gastronomía'
  }

  if (
    normalizedTitle.includes('corporativo') ||
    normalizedTitle.includes('privado')
  ) {
    return isEnglish ? 'Private event' : 'Evento privado'
  }

  return 'Festival'
}

function getAvailability(title: string, index: number, isEnglish: boolean) {
  const normalizedTitle = normalizeText(title)

  if (
    normalizedTitle.includes('corporativo') ||
    normalizedTitle.includes('privado')
  ) {
    return isEnglish ? 'Custom quote' : 'Cotización personalizada'
  }

  if (
    normalizedTitle.includes('cena') ||
    normalizedTitle.includes('maridaje')
  ) {
    return isEnglish ? 'Limited capacity' : 'Cupo limitado'
  }

  if (index === 1) {
    return isEnglish ? 'High demand' : 'Alta demanda'
  }

  if (index === 2) {
    return isEnglish ? 'Last spots' : 'Últimos lugares'
  }

  return isEnglish ? 'Open sale' : 'Venta abierta'
}

function getDuration(title: string, isEnglish: boolean) {
  const normalizedTitle = normalizeText(title)

  if (
    normalizedTitle.includes('cena') ||
    normalizedTitle.includes('maridaje')
  ) {
    return isEnglish ? '3 hours' : '3 horas'
  }

  if (
    normalizedTitle.includes('corporativo') ||
    normalizedTitle.includes('privado')
  ) {
    return isEnglish ? 'Custom schedule' : 'Horario personalizado'
  }

  return isEnglish ? 'Full-day event' : 'Evento de día completo'
}

function EventArtwork({
  visual,
  title,
}: {
  visual: EventVisual
  title: string
}) {
  if (visual.type === 'logo') {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center p-8"
        style={{
          background: visual.background,
        }}
      >
        <div className="flex h-[142px] w-[142px] items-center justify-center rounded-[1.7rem] bg-white/95 p-5 shadow-[0_22px_50px_rgba(35,5,13,0.24)]">
          <img
            src={visual.asset}
            alt={title}
            draggable={false}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      </div>
    )
  }

  return (
    <img
      src={visual.asset}
      alt={title}
      draggable={false}
      className="absolute inset-0 h-full w-full object-cover"
      onError={(imageEvent) => {
        imageEvent.currentTarget.src =
          '/romantic%20dinners%20evento.webp'
      }}
    />
  )
}

export function EventsScreen() {
  const { isEnglish } = useAppPreferences()
  const { records: events, loading, error } = usePublicContent('events')
  const [activeCategory, setActiveCategory] =
    useState<EventCategory>('Todos')

  const festivalIdentities = useMemo(() => getFestivalIdentities(isEnglish), [isEnglish])
  const seasonalEvents = useMemo(() => getSeasonalEvents(isEnglish), [isEnglish])

  const filteredEvents = useMemo(() => {
    if (activeCategory === 'Todos') {
      return events
    }

    return events.filter(
      (event) =>
        getEventCategory(textField(event, 'title')) === activeCategory,
    )
  }, [activeCategory, events])

  const [featuredEvent, ...remainingEvents] = filteredEvents
  const featuredTitle = featuredEvent ? textField(featuredEvent, 'title', isEnglish ? 'Event' : 'Evento') : ''
  const featuredVenue = featuredEvent ? textField(featuredEvent, 'venue', 'Hacienda de Letras') : ''
  const featuredDate = featuredEvent ? formatPublicDate(featuredEvent.start_at) : ''
  const featuredPriceAmount = featuredEvent ? numberField(featuredEvent, 'price') : 0
  const featuredPrice = featuredPriceAmount > 0
    ? formatCurrency(featuredPriceAmount)
    : (isEnglish ? 'Access to be confirmed' : 'Acceso por confirmar')
  const featuredVisual = featuredEvent
    ? {
        type: 'photo' as const,
        asset: imageField(featuredEvent, getEventVisual(featuredTitle, 0).type === 'photo' ? getEventVisual(featuredTitle, 0).asset : '/romantic%20dinners%20evento.webp'),
      }
    : null

  return (
    <div className="min-w-0 overflow-x-hidden pb-9">
      <section className="relative h-[285px] overflow-hidden rounded-[1.8rem]">
        <img
          src="/romantic%20dinners%20evento.webp"
          alt="Eventos de Hacienda de Letras"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,5,13,0.08)_0%,rgba(35,5,13,0.24)_43%,rgba(35,5,13,0.96)_100%)]" />

        <span className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-[#2f0913]/55 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.17em] text-[#f1d29c] backdrop-blur-md">
          <PartyPopper size={12} />
          {isEnglish ? 'Hacienda de Letras Events' : 'Agenda Hacienda de Letras'}
        </span>

        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#e5c58f]">
            {isEnglish ? 'Wine · Music · Gastronomy' : 'Vino · Música · Gastronomía'}
          </p>

          <h1
            className="mt-2 max-w-[315px] text-[35px] font-normal leading-[0.98] text-white"
            style={{
              fontFamily: 'var(--font-display)',
            }}
          >
            {isEnglish ? 'Celebrations with their own history.' : 'Celebraciones con historia propia.'}
          </h1>

          <p className="mt-3 max-w-[315px] text-[12px] leading-5 text-white/78">
            {isEnglish
              ? 'Festivals, seasons and gatherings that transform the hacienda.'
              : 'Festivales, temporadas y encuentros que transforman la hacienda.'}
          </p>
        </div>
      </section>

      <section className="mt-7">
        <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#a77b45]">
          <span className="h-px w-7 bg-[#b48a55]" />
          {isEnglish ? 'Iconic festivals' : 'Festivales emblemáticos'}
        </p>

        <h2
          className="mt-2 text-[29px] font-normal leading-none text-[#4f0f1f]"
          style={{
            fontFamily: 'var(--font-display)',
          }}
        >
          {isEnglish ? 'An agenda with identity' : 'Una agenda con identidad'}
        </h2>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {festivalIdentities.map((festival) => (
            <article
              key={festival.name}
              className="min-w-0 overflow-hidden rounded-[1.35rem] border border-[#dfcdb8] bg-[#fffaf3] p-3 shadow-[0_14px_30px_rgba(64,28,19,0.08)]"
            >
              <div
                className="flex h-[125px] items-center justify-center rounded-[1rem] p-4"
                style={{
                  background: festival.background,
                }}
              >
                <div className="flex h-[92px] w-[92px] items-center justify-center rounded-[1rem] bg-white/95 p-3 shadow-md">
                  <img
                    src={festival.logo}
                    alt={festival.name}
                    draggable={false}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>

              <h3 className="mt-3 line-clamp-2 text-[13px] font-bold leading-4 text-[#4f0f1f]">
                {festival.name}
              </h3>

              <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.11em] text-[#a77b45]">
                {festival.subtitle}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const isActive = category === activeCategory

            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className="rounded-full border px-4 py-2.5 text-[11px] font-semibold"
                style={{
                  borderColor: isActive
                    ? '#681126'
                    : 'rgba(205,181,153,0.72)',
                  backgroundColor: isActive
                    ? '#681126'
                    : '#fffaf3',
                  color: isActive ? '#ffffff' : '#715c50',
                  outline: 'none',
                  boxShadow: isActive
                    ? '0 8px 18px rgba(104,17,38,0.15)'
                    : 'none',
                }}
              >
                {isEnglish ? categoryLabels[category].en : categoryLabels[category].es}
              </button>
            )
          })}
        </div>
      </section>

      {loading ? (
        <section className="mt-6 rounded-[1.5rem] border border-[#dfcdb8] bg-[#fffaf3] p-7 text-center text-[12px] text-[#7f6a59]">
          {isEnglish ? 'Loading published events...' : 'Cargando eventos publicados...'}
        </section>
      ) : error ? (
        <section className="mt-6 rounded-[1.5rem] border border-[rgba(157,71,63,0.28)] bg-[rgba(157,71,63,0.08)] p-7 text-center text-[12px] text-[var(--color-alert)]">
          {error}
        </section>
      ) : featuredEvent && featuredVisual ? (
        <section className="mt-6">
          <Link
            to={`/app/eventos/${contentRouteId(featuredEvent)}`}
            className="block overflow-hidden rounded-[1.75rem] border border-[#dfcdb8] bg-[#fffaf3] shadow-[0_24px_54px_rgba(64,28,19,0.14)]"
          >
            <div className="relative h-[330px] overflow-hidden bg-[#d8c6b3]">
              <EventArtwork
                visual={featuredVisual}
                title={featuredTitle}
              />

              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,5,13,0.02)_0%,rgba(35,5,13,0.08)_40%,rgba(35,5,13,0.95)_100%)]" />

              <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.14em] text-[#681126] shadow-sm">
                {getEventBadge(featuredTitle, 0, isEnglish)}
              </span>

              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#e8c78e]">
                  <CalendarDays size={12} />
                  {featuredDate}
                </p>

                <h3
                  className="mt-2 max-w-[310px] text-[34px] font-normal leading-[0.98] text-white"
                  style={{
                    fontFamily:
                      'var(--font-display)',
                  }}
                >
                  {featuredTitle}
                </h3>

                <p className="mt-3 flex items-center gap-2 text-[10px] text-white/75">
                  <MapPin size={12} />
                  {featuredVenue}
                </p>

                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/55">
                      {isEnglish ? 'Access' : 'Acceso'} · {' '}
                      {featuredPrice}
                    </p>
                  </div>

                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#94163a] text-white shadow-lg">
                    <ArrowRight size={19} />
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4">
              <div className="rounded-[1rem] bg-[#f4eadf] p-3">
                <div className="flex items-center gap-2 text-[#681126]">
                  <Ticket size={13} />
                  <span className="text-[8px] font-bold uppercase tracking-[0.1em]">
                    {isEnglish ? 'Availability' : 'Disponibilidad'}
                  </span>
                </div>

                <p className="mt-2 text-[10px] font-semibold leading-4 text-[#4e3930]">
                  {getAvailability(featuredTitle, 0, isEnglish)}
                </p>
              </div>

              <div className="rounded-[1rem] bg-[#f4eadf] p-3">
                <div className="flex items-center gap-2 text-[#681126]">
                  <Clock3 size={13} />
                  <span className="text-[8px] font-bold uppercase tracking-[0.1em]">
                    {isEnglish ? 'Duration' : 'Duración'}
                  </span>
                </div>

                <p className="mt-2 text-[10px] font-semibold leading-4 text-[#4e3930]">
                  {getDuration(featuredTitle, isEnglish)}
                </p>
              </div>
            </div>
          </Link>
        </section>
      ) : null}

      <section className="mt-6 space-y-5">
        {remainingEvents.map((event, index) => {
          const actualIndex = index + 1
          const eventTitle = textField(event, 'title', isEnglish ? 'Event' : 'Evento')
          const fallbackVisual = getEventVisual(eventTitle, actualIndex)
          const eventVisual = {
            type: 'photo' as const,
            asset: imageField(
              event,
              fallbackVisual.type === 'photo' ? fallbackVisual.asset : '/romantic%20dinners%20evento.webp',
            ),
          }
          const eventVenue = textField(event, 'venue', 'Hacienda de Letras')
          const eventDate = formatPublicDate(event.start_at)
          const eventPriceAmount = numberField(event, 'price')
          const eventPrice = eventPriceAmount > 0
            ? formatCurrency(eventPriceAmount)
            : (isEnglish ? 'Access to be confirmed' : 'Acceso por confirmar')

          return (
            <Link
              key={event.id}
              to={`/app/eventos/${contentRouteId(event)}`}
              className="block overflow-hidden rounded-[1.6rem] border border-[#dfcdb8] bg-[#fffaf3] shadow-[0_18px_40px_rgba(64,28,19,0.1)]"
            >
              <div className="relative h-[245px] overflow-hidden bg-[#d8c6b3]">
                <EventArtwork visual={eventVisual} title={eventTitle} />

                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,5,13,0.02)_0%,rgba(35,5,13,0.08)_38%,rgba(35,5,13,0.94)_100%)]" />

                <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.14em] text-[#681126] shadow-sm">
                    {getEventBadge(eventTitle, actualIndex, isEnglish)}
                </span>

                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#e8c78e]">
                    <CalendarDays size={12} />
                    {eventDate}
                  </p>

                  <h3
                    className="mt-2 max-w-[300px] text-[29px] font-normal leading-[0.98] text-white"
                    style={{
                      fontFamily:
                        'var(--font-display)',
                    }}
                  >
                    {eventTitle}
                  </h3>

                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-[10px] text-white/72">
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">
                          {eventVenue}
                        </span>
                      </p>

                      <p className="mt-2 flex items-center gap-2 text-[14px] font-bold text-white">
                        <Ticket size={13} />
                        {eventPrice}
                      </p>
                    </div>

                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/12 text-white">
                      <ArrowRight size={17} />
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <span className="text-[10px] font-semibold text-[#7f6a59]">
                  {getAvailability(eventTitle, actualIndex, isEnglish)}
                </span>

                <span className="text-[11px] font-bold text-[#681126]">
                  {isEnglish ? 'View details' : 'Ver información'}
                </span>
              </div>
            </Link>
          )
        })}
      </section>

      <section className="mt-8">
        <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#a77b45]">
          <span className="h-px w-7 bg-[#b48a55]" />
          {isEnglish ? 'Throughout the year' : 'Durante todo el año'}
        </p>

        <h2
          className="mt-2 text-[29px] font-normal leading-none text-[#4f0f1f]"
          style={{
            fontFamily: 'var(--font-display)',
          }}
        >
          {isEnglish ? 'Special seasons' : 'Temporadas especiales'}
        </h2>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {seasonalEvents.map((seasonalEvent) => (
            <Link
              key={seasonalEvent.id}
              to="/app/reservacion"
              state={{
                eventTitle: seasonalEvent.title,
                eventType: 'Evento de temporada',
              }}
              className="min-w-0 overflow-hidden rounded-[1.3rem] border border-[#dfcdb8] bg-[#fffaf3] shadow-[0_14px_30px_rgba(64,28,19,0.08)]"
            >
              <div className="relative h-[160px] overflow-hidden bg-[#d8c6b3]">
                <img
                  src={seasonalEvent.image}
                  alt={seasonalEvent.title}
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,5,13,0.02),rgba(35,5,13,0.82))]" />

                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[7px] font-bold uppercase tracking-[0.11em] text-[#681126]">
                  {seasonalEvent.month}
                </span>

                <h3
                  className="absolute inset-x-0 bottom-0 p-3 text-[21px] font-normal leading-[0.96] text-white"
                  style={{
                    fontFamily:
                      'var(--font-display)',
                  }}
                >
                  {seasonalEvent.title}
                </h3>
              </div>

              <div className="p-3">
                <p className="line-clamp-2 min-h-[32px] text-[10px] leading-4 text-[#725f54]">
                  {seasonalEvent.description}
                </p>

                <span className="mt-3 inline-flex items-center gap-1.5 text-[9px] font-bold text-[#681126]">
                  {isEnglish ? 'Learn more' : 'Conocer más'}
                  <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="relative mt-8 overflow-hidden rounded-[1.75rem] bg-[#2f0913] p-6 text-white shadow-[0_22px_50px_rgba(47,9,19,0.22)]">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full border border-[#dbc59d]/20" />
        <div className="absolute -right-5 -top-5 h-28 w-28 rounded-full border border-[#dbc59d]/20" />

        <div className="relative">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#dbc59d]/35 text-[#dbc59d]">
            <Sparkles size={19} />
          </span>

          <p className="mt-5 text-[9px] font-bold uppercase tracking-[0.19em] text-[#dbc59d]">
            {isEnglish ? 'Private celebrations' : 'Celebraciones privadas'}
          </p>

          <h3
            className="mt-2 max-w-[285px] text-[28px] font-normal leading-[1.02] text-white"
            style={{
              fontFamily: 'var(--font-display)',
            }}
          >
            {isEnglish
              ? 'Create an event with the character of the hacienda.'
              : 'Crea un evento con el carácter de la hacienda.'}
          </h3>

          <p className="mt-3 max-w-[290px] text-[12px] leading-5 text-white/68">
            {isEnglish
              ? 'Weddings, corporate meetings and celebrations designed around each occasion.'
              : 'Bodas, encuentros empresariales y celebraciones diseñadas alrededor de cada ocasión.'}
          </p>

          <Link
            to="/app/reservacion"
            state={{
              eventType: 'Evento privado',
              eventTitle: 'Solicitud de evento privado',
            }}
            className="mt-5 inline-flex items-center gap-2 text-[12px] font-bold"
            style={{
              color: '#e5c58f',
              textDecoration: 'none',
            }}
          >
            {isEnglish ? 'Request information' : 'Solicitar información'}
            <ArrowRight size={15} color="#e5c58f" />
          </Link>
        </div>
      </section>

      {!loading && !error && filteredEvents.length === 0 ? (
        <section className="mt-6 rounded-[1.5rem] border border-[#dfcdb8] bg-[#fffaf3] p-7 text-center">
          <CalendarDays
            size={23}
            className="mx-auto text-[#681126]"
          />

          <h3
            className="mt-4 text-[25px] text-[#4f0f1f]"
            style={{
              fontFamily: 'var(--font-display)',
            }}
          >
            {isEnglish ? 'Coming soon' : 'Próximamente'}
          </h3>

          <p className="mt-2 text-[12px] leading-5 text-[#7f6a59]">
            {isEnglish
              ? 'We are preparing new events for this category.'
              : 'Estamos preparando nuevos eventos para esta categoría.'}
          </p>
        </section>
      ) : null}
    </div>
  )
}
