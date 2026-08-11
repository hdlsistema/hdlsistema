import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { Check, ChevronDown } from 'lucide-react'

type CrystalSelectOption = {
  value: string
  label: string
}

type CrystalSelectProps = {
  value: string
  onChange: (value: string) => void
  options?: CrystalSelectOption[]
  children?: ReactNode
  disabled?: boolean
  ariaLabel?: string
  className?: string
  buttonClassName?: string
  menuClassName?: string
}

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function CrystalSelect({
  value,
  onChange,
  options: explicitOptions,
  children,
  disabled,
  ariaLabel,
  className,
  buttonClassName,
  menuClassName,
}: CrystalSelectProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const listboxId = useId()

  const childOptions = useMemo(() => {
    return Children.toArray(children).flatMap((child) => {
      if (!isValidElement<{ value?: unknown; children?: ReactNode }>(child)) return []
      const childValue = child.props.value == null ? '' : String(child.props.value)
      const childLabel = Children.toArray(child.props.children).join('').trim() || childValue
      return [{ value: childValue, label: childLabel }]
    })
  }, [children])

  const options = explicitOptions ?? childOptions

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  )

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
    setActiveIndex(selectedIndex)
    requestAnimationFrame(() => optionRefs.current[selectedIndex]?.focus())
  }, [open, options, value])

  function selectOption(index: number) {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    setOpen(false)
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      return
    }
    if (event.key === 'Escape') setOpen(false)
  }

  function handleOptionKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const nextIndex = event.key === 'ArrowDown'
        ? (index + 1) % options.length
        : (index - 1 + options.length) % options.length
      setActiveIndex(nextIndex)
      optionRefs.current[nextIndex]?.focus()
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const nextIndex = event.key === 'Home' ? 0 : options.length - 1
      setActiveIndex(nextIndex)
      optionRefs.current[nextIndex]?.focus()
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectOption(index)
      return
    }
    if (event.key === 'Escape') setOpen(false)
  }

  return (
    <div
      ref={containerRef}
      className={joinClasses('relative min-w-0', className)}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        className={joinClasses(
          'flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-[rgba(220,202,181,0.9)] bg-[rgba(255,252,247,0.74)] px-4 text-left text-sm text-[var(--color-muted-strong)] shadow-[0_12px_28px_rgba(90,49,28,0.08)] backdrop-blur-xl transition hover:border-[rgba(180,138,85,0.55)] hover:bg-[rgba(255,252,247,0.86)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-55',
          open &&
            'border-[rgba(104,17,38,0.36)] bg-[rgba(255,250,244,0.92)] shadow-[0_16px_30px_rgba(104,17,38,0.12)]',
          buttonClassName,
        )}
      >
        <span className="truncate">{selected?.label ?? value}</span>

        <ChevronDown
          size={16}
          className={joinClasses(
            'shrink-0 text-[var(--color-burgundy)] transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div
          className={joinClasses(
            'absolute left-0 right-0 top-[calc(100%+0.45rem)] z-50 overflow-hidden rounded-[1rem] border border-[rgba(220,202,181,0.9)] bg-[linear-gradient(180deg,rgba(255,251,246,0.96),rgba(247,239,229,0.96))] p-2 shadow-[0_24px_48px_rgba(58,23,18,0.16)] backdrop-blur-2xl',
            menuClassName,
          )}
        >
          <div id={listboxId} role="listbox" aria-label={selected?.label ?? 'Opciones'} className="max-h-72 overflow-y-auto pr-1">
            {options.map((option, index) => {
              const active = option.value === value

              return (
                <button
                  key={option.value}
                  type="button"
                  ref={(element) => { optionRefs.current[index] = element }}
                  role="option"
                  aria-selected={active}
                  tabIndex={activeIndex === index ? 0 : -1}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                  onClick={() => selectOption(index)}
                  className={joinClasses(
                    'flex w-full items-center justify-between gap-3 rounded-[0.85rem] px-3 py-2.5 text-left text-sm transition focus:outline-none',
                    active
                      ? 'bg-[linear-gradient(135deg,rgba(104,17,38,0.96),rgba(79,15,31,0.88))] text-white shadow-[0_10px_22px_rgba(79,15,31,0.22)]'
                      : 'text-[var(--color-muted-strong)] hover:bg-[rgba(104,17,38,0.08)] hover:text-[var(--color-burgundy)]',
                  )}
                >
                  <span className="truncate">{option.label}</span>

                  <Check
                    size={15}
                    className={joinClasses(
                      'shrink-0',
                      active ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
