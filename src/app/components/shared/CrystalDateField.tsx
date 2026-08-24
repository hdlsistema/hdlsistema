import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { CrystalSelect } from './CrystalSelect'
import { useFloatingControlMenu } from './useFloatingControlMenu'
import { useAppPreferences } from '../../context/AppPreferencesContext'

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

function displayDate(value: string, placeholder: string, formatter: Intl.DateTimeFormat) {
  const date = toDate(value)
  return date ? formatter.format(date) : placeholder
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
  const { locale, isEnglish } = useAppPreferences()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [visibleMonth, setVisibleMonth] = useState(() => toDate(value) ?? new Date())
  const floatingMenu = useFloatingControlMenu(triggerRef, open, 360, 296, popoverRef)

  useEffect(() => {
    const nextDate = toDate(value)
    if (nextDate) setVisibleMonth(nextDate)
  }, [value])

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !popoverRef.current?.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const days = useMemo(() => monthDays(visibleMonth), [visibleMonth])
  const monthFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }), [locale])
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }), [locale])
  const weekdays = isEnglish ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['L', 'M', 'M', 'J', 'V', 'S', 'D']

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
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={joinClasses(
          'control-date-trigger flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-[rgba(220,202,181,0.9)] bg-[#F7F2EA] px-3 text-left text-[10px] text-[var(--color-ink)] shadow-[0_8px_18px_rgba(90,49,28,0.06)] transition hover:border-[rgba(180,138,85,0.55)] hover:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-55',
          open && 'border-[rgba(91,11,31,0.36)] bg-white shadow-[0_12px_24px_rgba(91,11,31,0.1)]',
          buttonClassName,
        )}
      >
        <span className={value ? '' : 'text-[var(--color-muted)]'}>{displayDate(value, placeholder, dateFormatter)}</span>
        <CalendarDays size={17} className="shrink-0 text-[var(--color-burgundy)]" />
      </button>

      {open ? createPortal(
        <div
          ref={popoverRef}
          data-control-floating-menu
          data-placement={floatingMenu.placement}
          style={floatingMenu.style}
          className="crystal-date-popover overflow-x-hidden overflow-y-auto overscroll-contain rounded-lg border border-[rgba(220,202,181,0.9)] bg-[#F7F2EA] p-2 shadow-[0_16px_28px_rgba(58,23,18,0.14)]"
        >
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => moveMonth(-1)} className="crystal-date-popover__nav rounded-full p-2 text-[var(--color-burgundy)] hover:bg-[rgba(91,11,31,0.08)]" aria-label={isEnglish ? 'Previous month' : 'Mes anterior'}>
              <ChevronLeft size={18} />
            </button>
            <p className="crystal-date-popover__month text-center text-[11px] font-semibold capitalize text-[var(--color-ink)]">{monthFormatter.format(visibleMonth)}</p>
            <button type="button" onClick={() => moveMonth(1)} className="crystal-date-popover__nav rounded-full p-2 text-[var(--color-burgundy)] hover:bg-[rgba(91,11,31,0.08)]" aria-label={isEnglish ? 'Next month' : 'Mes siguiente'}>
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="crystal-date-popover__weekdays mt-2 grid grid-cols-7 gap-1 text-center text-[9px] font-semibold text-[var(--color-gold)]">
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
                    'crystal-date-popover__day aspect-square rounded-full text-[10px] transition focus:outline-none',
                    selected
                      ? 'bg-[var(--color-burgundy)] font-semibold text-white shadow-[0_8px_18px_rgba(91,11,31,0.24)]'
                      : day.inMonth
                        ? 'text-[var(--color-ink)] hover:bg-[rgba(91,11,31,0.08)]'
                        : 'text-[rgba(122,99,82,0.42)] hover:bg-[rgba(91,11,31,0.05)]',
                  )}
                >
                  {day.label}
                </button>
              )
            })}
          </div>
        </div>,
        document.body,
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
    <div className={joinClasses('control-date-time-field grid min-w-0 gap-2', className)}>
      <CrystalDateField value={date} onChange={updateDate} label={label} placeholder={placeholder ?? 'Seleccionar fecha'} className="min-w-0" buttonClassName={buttonClassName} disabled={disabled} />
      <CrystalSelect value={time || '09:00'} onChange={updateTime} disabled={disabled} options={timeOptions(time)} className="min-w-0" buttonClassName={joinClasses('min-h-11', buttonClassName)} />
    </div>
  )
}
