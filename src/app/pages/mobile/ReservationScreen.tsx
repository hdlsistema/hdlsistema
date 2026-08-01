import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Minus, Plus, Users } from 'lucide-react'
import { PrimaryButton, SectionHeading } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicContent } from '../../hooks/usePublicContent'
import { contentRouteId, formatCurrency, imageField, numberField, textField } from '../../utils/publicContent'

const days = Array.from({ length: 31 }, (_, index) => index + 1)
const times = ['11:00 AM', '1:00 PM', '3:00 PM', '5:00 PM']

export function ReservationScreen() {
  const { isEnglish } = useAppPreferences()
  const location = useLocation()
  const experienceId = (location.state as { experienceId?: string } | null)?.experienceId
  const { records: experiences, loading, error } = usePublicContent('experiences')
  const featuredExperience =
    experiences.find((experience) => contentRouteId(experience) === experienceId) ?? experiences[0]
  const [selectedDay, setSelectedDay] = useState(18)
  const [selectedTime, setSelectedTime] = useState('1:00 PM')
  const [people, setPeople] = useState(2)

  return (
    <div className="space-y-6 pb-3">
      <section className="space-y-3">
        <SectionHeading eyebrow={isEnglish ? 'Online booking' : 'Reserva en línea'} title={isEnglish ? 'Plan your experience' : 'Planea tu experiencia'} />
        <p className="text-[13px] leading-5 text-[var(--color-muted)]">
          {isEnglish
            ? 'Choose a date, time and number of guests. We will confirm your spot at checkout.'
            : 'Elige fecha, horario y número de personas. Confirmaremos tu lugar al finalizar.'}
        </p>
      </section>

      <section className="overflow-hidden rounded-[1.35rem] border border-[rgba(220,202,181,0.78)] bg-white shadow-[0_18px_38px_rgba(74,32,28,0.08)]">
        {loading ? (
          <div className="p-5 text-[12px] text-[var(--color-muted)]">
            {isEnglish ? 'Loading published experiences...' : 'Cargando experiencias publicadas...'}
          </div>
        ) : error ? (
          <div className="p-5 text-[12px] text-[var(--color-alert)]">{error}</div>
        ) : featuredExperience ? (
          <>
            <div className="relative h-[175px] overflow-hidden">
              <img
                src={imageField(featuredExperience, '/turismo.jpeg')}
                alt={textField(featuredExperience, 'title', isEnglish ? 'Experience' : 'Experiencia')}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(40,14,17,0.78))]" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#f0cf92]">{isEnglish ? 'Selected experience' : 'Experiencia seleccionada'}</p>
                <h2 className="mt-1 text-[1.9rem] leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                  {textField(featuredExperience, 'title', isEnglish ? 'Experience' : 'Experiencia')}
                </h2>
              </div>
            </div>
            <div className="p-4">
              <p className="text-[12px] leading-5 text-[var(--color-muted)]">
                {textField(featuredExperience, 'short_description') || textField(featuredExperience, 'description')}
              </p>
              <p className="mt-3 text-[14px] font-semibold text-[var(--color-burgundy)]">
                {formatCurrency(numberField(featuredExperience, 'base_price'))} {isEnglish ? 'per person' : 'por persona'}
              </p>
            </div>
          </>
        ) : (
          <div className="p-5 text-[12px] text-[var(--color-muted)]">
            {isEnglish ? 'No published experiences available.' : 'No hay experiencias publicadas disponibles.'}
          </div>
        )}
      </section>

      <section className="grid grid-cols-4 gap-2">
        {(isEnglish
          ? [['1', 'Experience'], ['2', 'Date'], ['3', 'Guests'], ['4', 'Confirm']]
          : [['1', 'Experiencia'], ['2', 'Fecha'], ['3', 'Personas'], ['4', 'Confirmar']]
        ).map(([number, label], index) => (
          <div key={label} className="min-w-0 text-center">
            <span className={`mx-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold ${index <= 1 ? 'bg-[var(--color-burgundy)] text-white' : 'border border-[rgba(104,13,36,0.18)] bg-white text-[var(--color-muted)]'}`}>
              {index === 0 ? <Check size={13} /> : number}
            </span>
            <p className="mt-2 truncate text-[9px] text-[var(--color-muted)]">{label}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <SectionHeading title={isEnglish ? 'Select a date' : 'Selecciona la fecha'} />
        <article className="rounded-[1.3rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <button type="button"
              aria-label={isEnglish ? 'Previous month' : 'Mes anterior'}  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f8eee5] text-[var(--color-burgundy)]">
              <ChevronLeft size={17} />
            </button>
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">{isEnglish ? 'Availability' : 'Disponibilidad'}</p>
              <h3 className="mt-1 text-[1.35rem] leading-none text-[var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>{isEnglish ? 'July 2026' : 'Julio 2026'}</h3>
            </div>
            <button type="button" aria-label={isEnglish ? 'Next month' : 'Mes siguiente'} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f8eee5] text-[var(--color-burgundy)]">
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1 text-center">
            {(isEnglish ? ['M','T','W','T','F','S','S'] : ['L','M','M','J','V','S','D']).map((day, index) => (
              <div key={`${day}-${index}`} className="pb-2 text-[9px] font-semibold text-[var(--color-muted)]">{day}</div>
            ))}
            {days.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[11px] transition ${selectedDay === day ? 'bg-[var(--color-burgundy)] font-semibold text-white shadow-[0_8px_18px_rgba(104,13,36,0.18)]' : 'text-[var(--color-ink)] hover:bg-[#f8eee5]'}`}
              >
                {day}
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="space-y-3">
        <SectionHeading title={isEnglish ? 'Choose a time' : 'Elige un horario'} />
        <div className="grid grid-cols-2 gap-3">
          {times.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => setSelectedTime(time)}
              className={`flex items-center justify-center gap-2 rounded-[1rem] border px-4 py-3 text-[12px] font-semibold transition ${selectedTime === time ? 'border-[var(--color-burgundy)] bg-[var(--color-burgundy)] text-white' : 'border-[rgba(220,202,181,0.78)] bg-white text-[var(--color-ink)]'}`}
            >
              <Clock3 size={14} />
              {time}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[1.25rem] border border-[rgba(220,202,181,0.78)] bg-white p-4 shadow-[0_14px_30px_rgba(74,32,28,0.06)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f8eee5] text-[var(--color-burgundy)]">
              <Users size={18} />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-[var(--color-ink)]">{isEnglish ? 'Number of guests' : 'Número de personas'}</p>
              <p className="mt-1 text-[10px] text-[var(--color-muted)]">{isEnglish ? 'Spots subject to availability' : 'Cupo sujeto a disponibilidad'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-[rgba(104,13,36,0.13)] bg-[#fffaf5] p-1">
            <button type="button"
            aria-label={isEnglish ? 'Decrease guests' : 'Disminuir personas'} onClick={() => setPeople((current) => Math.max(1, current - 1))} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-burgundy)]">
              <Minus size={14} />
            </button>
            <span className="w-6 text-center text-[12px] font-semibold text-[var(--color-ink)]">{people}</span>
            <button type="button" aria-label={isEnglish ? 'Increase guests' : 'Aumentar personas'} onClick={() => setPeople((current) => current + 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-burgundy)] text-white">
              <Plus size={14} />
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[1.3rem] bg-[linear-gradient(145deg,#fffaf5,#f2dfca)] p-5 shadow-[0_16px_34px_rgba(74,32,28,0.07)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-gold)]">{isEnglish ? 'Summary' : 'Resumen'}</p>
        <div className="mt-4 space-y-2 text-[12px]">
          <div className="flex items-center justify-between gap-4"><span className="text-[var(--color-muted)]">{isEnglish ? 'Date' : 'Fecha'}</span><span className="font-semibold text-[var(--color-ink)]">{isEnglish ? `July ${selectedDay}` : `${selectedDay} de julio`}</span></div>
          <div className="flex items-center justify-between gap-4"><span className="text-[var(--color-muted)]">{isEnglish ? 'Time' : 'Horario'}</span><span className="font-semibold text-[var(--color-ink)]">{selectedTime}</span></div>
          <div className="flex items-center justify-between gap-4"><span className="text-[var(--color-muted)]">{isEnglish ? 'Guests' : 'Personas'}</span><span className="font-semibold text-[var(--color-ink)]">{people}</span></div>
        </div>
      </section>

      <PrimaryButton to="/app/carrito">
        <CalendarDays size={16} />
        {isEnglish ? 'Continue with booking' : 'Continuar con la reserva'}
      </PrimaryButton>
    </div>
  )
}
