import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { useFloatingControlMenu } from './useFloatingControlMenu'

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
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const listboxId = useId()
  const floatingMenu = useFloatingControlMenu(triggerRef, open, 190, 156, menuRef)

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
    if (!open) return undefined

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
    setActiveIndex(selectedIndex)
    requestAnimationFrame(() => optionRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' }))
  }, [open, options, value])

  function selectOption(index: number) {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    setOpen(false)
    triggerRef.current?.focus({ preventScroll: true })
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (open) {
        selectOption(activeIndex)
        return
      }
      setOpen(true)
      return
    }
    if (event.key === 'Escape') setOpen(false)
  }

  function handleTriggerPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (disabled) return
    event.preventDefault()
    triggerRef.current?.focus({ preventScroll: true })
    setOpen((current) => !current)
  }

  function handleTriggerClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault()
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
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onPointerDown={handleTriggerPointerDown}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel ?? 'Seleccionar opción'}
          className={joinClasses(
          'control-select flex min-h-9 w-full items-center justify-between gap-2 rounded-lg border border-[rgba(220,202,181,0.9)] bg-[#F7F2EA] px-3 text-left text-[10px] text-[var(--color-muted-strong)] shadow-[0_8px_18px_rgba(90,49,28,0.06)] transition hover:border-[rgba(180,138,85,0.55)] hover:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-55',
          open &&
            'border-[rgba(91,11,31,0.36)] bg-white shadow-[0_12px_24px_rgba(91,11,31,0.1)]',
          buttonClassName,
        )}
      >
        <span className="min-w-0 flex-1 break-words leading-[1.05]">{selected?.label ?? value}</span>

        <ChevronDown
          size={16}
          className={joinClasses(
            'shrink-0 text-[var(--color-burgundy)] transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? createPortal(
        <div
          ref={menuRef}
          data-control-floating-menu
          data-placement={floatingMenu.placement}
          style={floatingMenu.style}
          onMouseDown={(event) => event.preventDefault()}
          className={joinClasses(
            'overflow-hidden rounded-lg border border-[rgba(220,202,181,0.9)] bg-[#F7F2EA] p-1 shadow-[0_16px_28px_rgba(58,23,18,0.14)]',
            menuClassName,
          )}
        >
          <div
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel ?? selected?.label ?? 'Opciones'}
            className="overflow-y-auto overscroll-contain pr-1"
            style={{ maxHeight: floatingMenu.contentMaxHeight }}
          >
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
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(index)}
                  className={joinClasses(
                    'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-[9px] transition focus:outline-none',
                    active
                      ? 'bg-[#681126] text-[#F7F2EA] shadow-none'
                      : 'text-[var(--color-muted-strong)] hover:bg-[rgba(91,11,31,0.08)] hover:text-[var(--color-burgundy)]',
                  )}
                >
                  <span className="min-w-0 flex-1 break-words leading-[1.05]">{option.label}</span>

                  <Check
                    size={13}
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
      , document.body) : null}
    </div>
  )
}
