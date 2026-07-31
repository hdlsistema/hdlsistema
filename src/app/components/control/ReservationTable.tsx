import { ChevronRight, MapPin, Users } from 'lucide-react'
import { reservations } from '../../data/reservations'
import { StatusBadge } from '../shared/StatusBadge'
import { useAppPreferences } from '../../context/AppPreferencesContext'

export type ReservationItem = (typeof reservations)[number]

type ReservationTableProps = {
  items?: ReservationItem[]
  selectedReservationId?: string | null
  onSelect?: (reservationId: string) => void
}

export function ReservationTable({
  items = reservations,
  selectedReservationId = null,
  onSelect,
}: ReservationTableProps) {
  const { isEnglish } = useAppPreferences()

  if (items.length === 0) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] p-8 text-center shadow-[var(--shadow-card)]">
        <div>
          <p
            className="text-[1.7rem] text-[var(--color-burgundy)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {isEnglish ? 'No reservations found' : 'No encontramos reservaciones'}
          </p>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-muted)]">
            {isEnglish
              ? 'Adjust the filters or add a new reservation to get started.'
              : 'Ajusta los filtros o registra una nueva reservación para comenzar.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3 border-b border-[var(--color-line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3
            className="text-[1.45rem] leading-none text-[var(--color-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {isEnglish ? 'Recent reservations' : 'Reservaciones recientes'}
          </h3>

          <p className="mt-2 text-xs text-[var(--color-muted)]">
            {isEnglish
              ? 'Select a reservation to view its full operational detail.'
              : 'Selecciona una reservación para consultar su operación completa.'}
          </p>
        </div>

        <span className="w-fit rounded-full bg-[var(--color-soft)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-strong)]">
          {items.length} {isEnglish ? 'records' : 'registros'}
        </span>
      </div>

      <div className="hidden grid-cols-[minmax(0,1.35fr)_minmax(130px,0.8fr)_minmax(150px,0.9fr)_auto] gap-4 border-b border-[var(--color-line)] bg-[var(--color-soft)] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--color-muted)] lg:grid">
        <span>{isEnglish ? 'Guest & experience' : 'Cliente y experiencia'}</span>
        <span>{isEnglish ? 'Visit' : 'Visita'}</span>
        <span>{isEnglish ? 'Payment' : 'Pago'}</span>
        <span>{isEnglish ? 'Status' : 'Estado'}</span>
      </div>

      <div className="divide-y divide-[var(--color-line)]">
        {items.map((reservation) => {
          const isSelected =
            selectedReservationId === reservation.id

          return (
            <button
              key={reservation.id}
              type="button"
              onClick={() => onSelect?.(reservation.id)}
              className="group grid w-full min-w-0 gap-4 px-5 py-4 text-left transition lg:grid-cols-[minmax(0,1.35fr)_minmax(130px,0.8fr)_minmax(150px,0.9fr)_auto] lg:items-center"
              style={{
                backgroundColor: isSelected
                  ? 'rgba(180, 138, 85, 0.12)'
                  : 'transparent',
                border: 'none',
                outline: 'none',
                boxShadow: isSelected
                  ? 'inset 3px 0 0 var(--color-burgundy)'
                  : 'none',
              }}
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{
                      background:
                        'linear-gradient(145deg, var(--color-burgundy-soft), var(--color-burgundy-deep))',
                    }}
                  >
                    {reservation.guest
                      .split(' ')
                      .slice(0, 2)
                      .map((name) => name.charAt(0))
                      .join('')
                      .toUpperCase()}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                      {reservation.guest}
                    </p>

                    <p className="mt-1 line-clamp-1 text-xs text-[var(--color-muted)]">
                      {reservation.plan}
                    </p>

                    <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">
                      {reservation.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:block">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)] lg:hidden">
                    Visita
                  </p>

                  <p className="mt-1 text-xs font-semibold text-[var(--color-ink)] lg:mt-0">
                    {reservation.date}
                  </p>

                  <p className="mt-1 flex items-center gap-1.5 text-[10px] text-[var(--color-muted)]">
                    <Users size={12} />
                    {reservation.people} {isEnglish ? 'guests' : 'personas'}
                  </p>
                </div>

                <div className="lg:mt-2">
                  <p className="flex items-center gap-1.5 text-[10px] text-[var(--color-muted)]">
                    <MapPin size={12} />
                    {reservation.travelOrigin}
                  </p>
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)] lg:hidden">
                  Pago
                </p>

                <p className="mt-1 truncate text-xs font-semibold text-[var(--color-ink)] lg:mt-0">
                  {reservation.amount}
                </p>

                <p className="mt-1 line-clamp-1 text-[10px] text-[var(--color-muted)]">
                  {reservation.paymentMethod}
                </p>

                <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">
                  Ref. {reservation.paymentReference}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 lg:justify-end">
                <StatusBadge label={reservation.status} />

                <ChevronRight
                  size={17}
                  className="shrink-0 text-[var(--color-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-burgundy)]"
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}