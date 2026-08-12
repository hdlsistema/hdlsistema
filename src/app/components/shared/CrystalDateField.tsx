import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { CrystalSelect } from './CrystalSelect'

type CrystalDateFieldProps = {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  className?: string
  buttonClassName?: string
  disabled?: boolean
}

type CrystalDateTimeFieldProps = Omit<CrystalDateFieldProps, 'onChange'> & {
  value: string
  onChange: (value: string) => void
}

const monthFormatter = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' })
const dateFormatter = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function toDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function toDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function displayDate(value: string, placeholder: string) {
  const date = toDate(value)
  return date ? dateFormatter.format(date) : placeholder
}

function monthDays(base: Date) {
  const year = base.getFullYear()
  const month = base.getMonth()
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const days: Array<{ value: string; label: string; inMonth: boolean }> = []

  for (let index = 0; index < 42; index += 1) {
    const next = new Date(year, month, index - offset + 1)
    days.push({
      value: toDateValue(next),
      label: String(next.getDate()),
      inMonth: next.getMonth() === month,
    })
  }

  return days
}

function timeOptions(currentValue: string) {
  const options: Array<{ value: string; label: string }> = []
  for (let hour = 7; hour <= 23; hour += 1) {
    for (const minute of [0, 30]) {
      const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      options.push({ value, label: value })
    }
  }
  if (currentValue && !options.some((option) => option.value === currentValue)) {
    options.unshift({ value: currentValue, label: currentValue })
  }
  return options
}

export function CrystalDateField({
  value,
  onChange,
  label,
  placeholder = 'Seleccionar fecha',
  className,
  buttonClassName,
  disabled,
}: CrystalDateFieldProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [visibleMonth, setVisibleMonth] = useState(() => toDate(value) ?? new Date())

  useEffect(() => {
    const nextDate = toDate(value)
    if (nextDate) setVisibleMonth(nextDate)
  }, [value])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const days = useMemo(() => monthDays(visibleMonth), [visibleMonth])

  function moveMonth(delta: number) {
    setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta, 1))
  }

  function selectDate(nextValue: string) {
    onChange(nextValue)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={joinClasses('relative min-w-0', className)}>
      {label ? <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{label}</span> : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={joinClasses(
          'control-date-trigger flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-[rgba(220,202,181,0.9)] bg-[rgba(255,252,247,0.74)] px-4 text-left text-sm text-[var(--color-ink)] shadow-[0_12px_28px_rgba(90,49,28,0.08)] backdrop-blur-xl transition hover:border-[rgba(180,138,85,0.55)] hover:bg-[rgba(255,252,247,0.86)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-55',
          open && 'border-[rgba(104,17,38,0.36)] bg-[rgba(255,250,244,0.92)] shadow-[0_16px_30px_rgba(104,17,38,0.12)]',
          buttonClassName,
        )}
      >
        <span className={value ? '' : 'text-[var(--color-muted)]'}>{displayDate(value, placeholder)}</span>
        <CalendarDays size={17} className="shrink-0 text-[var(--color-burgundy)]" />
      </button>

      {open ? (
        <div className="crystal-date-popover absolute left-0 right-0 top-[calc(100%+0.45rem)] z-[180] overflow-hidden rounded-[1.15rem] border border-[rgba(220,202,181,0.9)] bg-[linear-gradient(180deg,rgba(255,251,246,0.98),rgba(247,239,229,0.98))] p-3 shadow-[0_24px_48px_rgba(58,23,18,0.18)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => moveMonth(-1)} className="crystal-date-popover__nav rounded-full p-2 text-[var(--color-burgundy)] hover:bg-[rgba(104,17,38,0.08)]" aria-label="Mes anterior">
              <ChevronLeft size={18} />
            </button>
            <p className="crystal-date-popover__month text-center text-sm font-semibold capitalize text-[var(--color-ink)]">{monthFormatter.format(visibleMonth)}</p>
            <button type="button" onClick={() => moveMonth(1)} className="crystal-date-popover__nav rounded-full p-2 text-[var(--color-burgundy)] hover:bg-[rgba(104,17,38,0.08)]" aria-label="Mes siguiente">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="crystal-date-popover__weekdays mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[var(--color-gold)]">
            {weekdays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
          </div>
          <div className="crystal-date-popover__grid mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const selected = day.value === value
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => selectDate(day.value)}
                  className={joinClasses(
                    'crystal-date-popover__day aspect-square rounded-full text-xs transition focus:outline-none',
                    selected
                      ? 'bg-[var(--color-burgundy)] font-semibold text-white shadow-[0_8px_18px_rgba(104,17,38,0.24)]'
                      : day.inMonth
                        ? 'text-[var(--color-ink)] hover:bg-[rgba(104,17,38,0.08)]'
                        : 'text-[rgba(122,99,82,0.42)] hover:bg-[rgba(104,17,38,0.05)]',
                  )}
                >
                  {day.label}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function CrystalDateTimeField({ value, onChange, label, placeholder, className, buttonClassName, disabled }: CrystalDateTimeFieldProps) {
  const [date = '', rawTime = ''] = value ? value.split('T') : ['', '']
  const time = rawTime.slice(0, 5)

  function updateDate(nextDate: string) {
    onChange(nextDate ? `${nextDate}T${time || '09:00'}` : '')
  }

  function updateTime(nextTime: string) {
    onChange(date ? `${date}T${nextTime}` : '')
  }

  return (
    <div className={joinClasses('grid gap-2 sm:grid-cols-[1fr_9rem]', className)}>
      <CrystalDateField value={date} onChange={updateDate} label={label} placeholder={placeholder ?? 'Seleccionar fecha'} buttonClassName={buttonClassName} disabled={disabled} />
      <CrystalSelect value={time || '09:00'} onChange={updateTime} disabled={disabled} options={timeOptions(time)} buttonClassName={joinClasses('min-h-11', buttonClassName)} />
    </div>
  )
}
