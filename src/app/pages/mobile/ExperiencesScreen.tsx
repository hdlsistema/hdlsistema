import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Sparkles,
  Users,
  Wine,
} from 'lucide-react'
import { experiences } from '../../data/experiences'
import { useAppPreferences } from '../../context/AppPreferencesContext'

type Category =
  | 'Todas'
  | 'Catas'
  | 'Recorridos'
  | 'Gastronomía'
  | 'Especiales'
  | 'All'
  | 'Tastings'
  | 'Tours'
  | 'Gastronomy'
  | 'Special'

const categoriesES: Category[] = [
  'Todas',
  'Catas',
  'Recorridos',
  'Gastronomía',
  'Especiales',
]

const categoriesEN: Category[] = [
  'All',
  'Tastings',
  'Tours',
  'Gastronomy',
  'Special',
]

function normalizeText(value: string) {
  return value.toLocaleLowerCase('es-MX')
}

function getCategory(title: string): Category {
  const normalizedTitle = normalizeText(title)

  if (normalizedTitle.includes('cata')) {
    return 'Catas'
  }

  if (
    normalizedTitle.includes('recorrido') ||
    normalizedTitle.includes('viñedo')
  ) {
    return 'Recorridos'
  }

  if (
    normalizedTitle.includes('cena') ||
    normalizedTitle.includes('restaurante') ||
    normalizedTitle.includes('picnic')
  ) {
    return 'Gastronomía'
  }

  return 'Especiales'
}

function getDuration(title: string, isEnglish: boolean) {
  const normalizedTitle = normalizeText(title)

  if (normalizedTitle.includes('cata')) {
    return isEnglish ? '75 minutes' : '75 minutos'
  }

  if (
    normalizedTitle.includes('recorrido') ||
    normalizedTitle.includes('viñedo')
  ) {
    return isEnglish ? '90 minutes' : '90 minutos'
  }

  if (normalizedTitle.includes('cena')) {
    return '2 h 30 min'
  }

  if (normalizedTitle.includes('picnic')) {
    return isEnglish ? '2 hours' : '2 horas'
  }

  if (normalizedTitle.includes('restaurante')) {
    return isEnglish ? 'Open hours' : 'Horario abierto'
  }

  return isEnglish ? 'Private experience' : 'Experiencia privada'
}

function getCapacity(title: string, isEnglish: boolean) {
  const normalizedTitle = normalizeText(title)

  if (normalizedTitle.includes('cena')) {
    return isEnglish ? 'Experience for two' : 'Experiencia para dos'
  }

  if (normalizedTitle.includes('picnic')) {
    return isEnglish ? 'Couples & groups' : 'Parejas y grupos'
  }

  if (normalizedTitle.includes('restaurante')) {
    return isEnglish ? 'Subject to availability' : 'Sujeto a disponibilidad'
  }

  return isEnglish ? 'Limited spots' : 'Cupo limitado'
}

function getBadge(title: string, index: number, isEnglish: boolean) {
  const normalizedTitle = normalizeText(title)

  if (index === 0) {
    return isEnglish ? 'Most booked' : 'Más reservada'
  }

  if (
    normalizedTitle.includes('recorrido') ||
    normalizedTitle.includes('viñedo')
  ) {
    return isEnglish ? 'Tradition' : 'Tradición'
  }

  if (normalizedTitle.includes('cena')) {
    return isEnglish ? 'Special moment' : 'Momento especial'
  }

  if (normalizedTitle.includes('picnic')) {
    return isEnglish ? 'Among vineyards' : 'Entre viñedos'
  }

  if (normalizedTitle.includes('restaurante')) {
    return isEnglish ? 'Gastronomy' : 'Gastronomía'
  }

  return isEnglish ? 'Experience' : 'Experiencia'
}

export function ExperiencesScreen() {
  const { isEnglish } = useAppPreferences()
  const [activeCategory, setActiveCategory] =
    useState<Category>(isEnglish ? 'All' : 'Todas')

  const categories = isEnglish ? categoriesEN : categoriesES

  const filteredExperiences = useMemo(() => {
    if (activeCategory === 'Todas' || activeCategory === 'All') {
      return experiences
    }

    return experiences.filter(
      (experience) =>
        getCategory(experience.title) === activeCategory ||
        (isEnglish && (() => {
          const esCategory = getCategory(experience.title)
          const enMap: Record<Category, Category> = {
            'Catas': 'Tastings',
            'Recorridos': 'Tours',
            'Gastronomía': 'Gastronomy',
            'Especiales': 'Special',
            'Todas': 'All',
            'All': 'All',
            'Tastings': 'Tastings',
            'Tours': 'Tours',
            'Gastronomy': 'Gastronomy',
            'Special': 'Special',
          }
          return enMap[esCategory] === activeCategory
        })()),
    )
  }, [activeCategory, isEnglish])

  return (
    <div className="pb-8">
      <section className="relative h-[270px] overflow-hidden rounded-[1.75rem]">
        <img
          src="/turismo.jpeg"
          alt="Experiencias en Hacienda de Letras"
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,5,13,0.06)_0%,rgba(35,5,13,0.24)_42%,rgba(35,5,13,0.94)_100%)]" />

        <div className="absolute left-5 top-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-[#2f0913]/50 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.17em] text-[#f1d29c] backdrop-blur-md">
            <Sparkles size={12} />
            {isEnglish ? 'Experience the estate' : 'Vive la hacienda'}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="text-[10px] font-bold uppercase tracking-[0.21em] text-[#e5c58f]">
            {isEnglish ? 'Wine · History · Scenery' : 'Vino · Historia · Paisaje'}
          </p>

          <h1
            className="mt-2 max-w-[310px] text-[35px] font-normal leading-[0.98] text-white"
            style={{
              fontFamily: 'var(--font-display)',
            }}
          >
            {isEnglish ? 'Experiences to savor, without rushing.' : 'Experiencias que se viven sin prisa.'}
          </h1>

          <p className="mt-3 max-w-[315px] text-[12px] leading-5 text-white/78">
            {isEnglish
              ? 'Discover tastings, tours, gastronomy and special moments among vineyards.'
              : 'Descubre catas, recorridos, gastronomía y momentos especiales entre viñedos.'}
          </p>
        </div>
      </section>

      <section className="mt-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#a77b45]">
              <span className="h-px w-7 bg-[#b48a55]" />
              {isEnglish ? 'Choose your moment' : 'Elige tu momento'}
            </p>

            <h2
              className="mt-2 text-[29px] font-normal leading-none text-[#4f0f1f]"
              style={{
                fontFamily: 'var(--font-display)',
              }}
            >
              {isEnglish ? 'Explore the estate' : 'Explora la hacienda'}
            </h2>
          </div>

          <span className="text-[10px] font-semibold text-[#8b7668]">
            {filteredExperiences.length}{' '}
            {filteredExperiences.length === 1
              ? (isEnglish ? 'experience' : 'experiencia')
              : (isEnglish ? 'experiences' : 'experiencias')}
          </span>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((category) => {
            const isActive = category === activeCategory

            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className="shrink-0 rounded-full border px-4 py-2.5 text-[11px] font-semibold transition"
                style={{
                  borderColor: isActive
                    ? '#681126'
                    : 'rgba(205, 181, 153, 0.72)',
                  backgroundColor: isActive
                    ? '#681126'
                    : '#fffaf3',
                  color: isActive ? '#ffffff' : '#715c50',
                  outline: 'none',
                  boxShadow: isActive
                    ? '0 9px 20px rgba(104, 17, 38, 0.17)'
                    : 'none',
                }}
              >
                {category}
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-5 space-y-6">
        {filteredExperiences.map((experience, index) => {
          const image = experience.image

          return (
            <article
              key={experience.id}
              className="overflow-hidden rounded-[1.65rem] border border-[#dfcdb8] bg-[#fffaf3] shadow-[0_20px_44px_rgba(64,28,19,0.1)]"
            >
              <div className="relative h-[255px] overflow-hidden bg-[#eadfce]">
                <img
                  src={image}
                  alt={experience.title}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = '/turismo.jpeg'
                  }}
                />

                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,5,13,0.04)_0%,rgba(35,5,13,0.16)_42%,rgba(35,5,13,0.95)_100%)]" />

                <span className="absolute left-4 top-4 rounded-full border border-white/35 bg-white/95 px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.15em] text-[#681126] shadow-sm">
                  {getBadge(experience.title, index, isEnglish)}
                </span>

                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.17em] text-[#e8c78e]">
                    <MapPin size={12} />
                    Hacienda de Letras
                  </p>

                  <h3
                    className="mt-2 max-w-[310px] text-[31px] font-normal leading-[0.98] text-white"
                    style={{
                      fontFamily:
                        'var(--font-display)',
                    }}
                  >
                    {experience.title}
                  </h3>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <span className="text-[18px] font-bold text-white">
                      {experience.price}
                    </span>

                    <span className="max-w-[130px] text-right text-[9px] font-semibold leading-4 text-white/68">
                      {isEnglish ? 'Subject to availability' : 'Sujeto a disponibilidad'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <p
                  className="text-[13px] leading-6 text-[#725f54]"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {experience.summary}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-[1rem] bg-[#f4eadf] px-3 py-3">
                    <div className="flex items-center gap-2 text-[#681126]">
                      <Clock3 size={14} />

                      <span className="text-[9px] font-bold uppercase tracking-[0.12em]">
                        {isEnglish ? 'Duration' : 'Duración'}
                      </span>
                    </div>

                    <p className="mt-2 text-[11px] font-semibold text-[#4e3930]">
                      {getDuration(experience.title, isEnglish)}
                    </p>
                  </div>

                  <div className="rounded-[1rem] bg-[#f4eadf] px-3 py-3">
                    <div className="flex items-center gap-2 text-[#681126]">
                      <Users size={14} />

                      <span className="text-[9px] font-bold uppercase tracking-[0.12em]">
                        {isEnglish ? 'Modality' : 'Modalidad'}
                      </span>
                    </div>

                    <p className="mt-2 text-[11px] font-semibold text-[#4e3930]">
                      {getCapacity(experience.title, isEnglish)}
                    </p>
                  </div>
                </div>

                <Link
                  to="/control/app/reservacion"
                  state={{
                    experienceId: experience.id,
                    experienceTitle: experience.title,
                  }}
                  className="mt-5 flex min-h-[52px] w-full items-center justify-between rounded-full bg-[#681126] px-5 shadow-[0_13px_26px_rgba(104,17,38,0.2)] transition hover:-translate-y-0.5"
                  style={{
                    color: '#ffffff',
                    textDecoration: 'none',
                  }}
                >
                  <span
                    className="inline-flex min-w-0 items-center gap-2 text-[13px] font-bold"
                    style={{
                      color: '#ffffff',
                    }}
                  >
                    <CalendarDays
                      size={16}
                      color="#ffffff"
                      className="shrink-0"
                    />

                    <span
                      className="truncate"
                      style={{
                        color: '#ffffff',
                      }}
                    >
                      Consultar disponibilidad
                    </span>
                  </span>

                  <ArrowRight
                    size={17}
                    color="#ffffff"
                    className="shrink-0"
                  />
                </Link>
              </div>
            </article>
          )
        })}
      </section>

      {filteredExperiences.length === 0 ? (
        <section className="mt-6 rounded-[1.5rem] border border-[#dfcdb8] bg-[#fffaf3] p-7 text-center">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#681126] text-[#e5c58f]">
            <Wine size={20} />
          </span>

          <h3
            className="mt-4 text-[25px] text-[#4f0f1f]"
            style={{
              fontFamily: 'var(--font-display)',
            }}
          >
            {isEnglish ? 'Coming soon' : 'Muy pronto'}
          </h3>

          <p className="mt-2 text-[12px] leading-5 text-[#7f6a59]">
            {isEnglish
              ? 'We are preparing new experiences for this category.'
              : 'Estamos preparando nuevas experiencias para esta categoría.'}
          </p>
        </section>
      ) : null}

      <section className="relative mt-7 overflow-hidden rounded-[1.7rem] bg-[#2f0913] p-6 text-white shadow-[0_20px_46px_rgba(47,9,19,0.2)]">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full border border-[#dbc59d]/20" />
        <div className="absolute -right-5 -top-5 h-28 w-28 rounded-full border border-[#dbc59d]/20" />

        <div className="relative">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#dbc59d]/35 text-[#dbc59d]">
            <Sparkles size={19} />
          </span>

          <p className="mt-5 text-[9px] font-bold uppercase tracking-[0.19em] text-[#dbc59d]">
            ALQIA Sommelier
          </p>

          <h3
            className="mt-2 max-w-[280px] text-[28px] font-normal leading-[1.02] text-white"
            style={{
              fontFamily: 'var(--font-display)',
            }}
          >
            {isEnglish
              ? 'Find the ideal experience for your occasion.'
              : 'Encuentra la experiencia ideal para tu ocasión.'}
          </h3>

          <p className="mt-3 max-w-[290px] text-[12px] leading-5 text-white/68">
            {isEnglish
              ? 'Tell us what you want to celebrate and we will help you choose the perfect moment.'
              : 'Cuéntanos qué deseas celebrar y te ayudaremos a elegir el mejor momento.'}
          </p>

          <Link
            to="/control/app/sommelier"
            className="mt-5 inline-flex items-center gap-2 text-[12px] font-bold"
            style={{
              color: '#e5c58f',
              textDecoration: 'none',
            }}
          >
            {isEnglish ? 'Ask the Sommelier' : 'Consultar al Sommelier'}
            <ArrowRight size={15} color="#e5c58f" />
          </Link>
        </div>
      </section>
    </div>
  )
}