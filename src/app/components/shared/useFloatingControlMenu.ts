import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react'

type FloatingMenuPosition = {
  style: CSSProperties
  contentMaxHeight: number
  placement: 'top' | 'bottom'
}

const VIEWPORT_MARGIN = 12
const MENU_GAP = 8
const DEFAULT_MAX_HEIGHT = 304
const MIN_USABLE_HEIGHT = 96

export function useFloatingControlMenu(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  preferredMaxHeight = DEFAULT_MAX_HEIGHT,
  preferredMinWidth = 220,
  floatingRef?: RefObject<HTMLElement | null>,
) {
  const [position, setPosition] = useState<FloatingMenuPosition>({
    style: { visibility: 'hidden' },
    contentMaxHeight: preferredMaxHeight,
    placement: 'bottom',
  })

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return

    const updatePosition = () => {
      const anchor = anchorRef.current
      if (!anchor) return

      const rect = anchor.getBoundingClientRect()
      const viewportHeight = Math.max(
        window.innerHeight || 0,
        document.documentElement.clientHeight || 0,
        MIN_USABLE_HEIGHT + (VIEWPORT_MARGIN * 2),
      )
      const viewportWidth = Math.max(
        window.innerWidth || 0,
        document.documentElement.clientWidth || 0,
        preferredMinWidth + (VIEWPORT_MARGIN * 2),
      )
      const availableBelow = Math.max(0, viewportHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN)
      const availableAbove = Math.max(0, rect.top - MENU_GAP - VIEWPORT_MARGIN)
      const rawMeasuredHeight = Math.max(floatingRef?.current?.scrollHeight ?? 0, preferredMaxHeight)
      const measuredHeight = rawMeasuredHeight > 24 ? rawMeasuredHeight : preferredMaxHeight
      const desiredHeight = Math.min(preferredMaxHeight, measuredHeight)
      const placement = availableBelow >= desiredHeight
        ? 'bottom'
        : availableAbove >= desiredHeight
          ? 'top'
          : availableBelow >= availableAbove
            ? 'bottom'
            : 'top'
      const availableHeight = placement === 'bottom' ? availableBelow : availableAbove
      const viewportMaxHeight = Math.max(MIN_USABLE_HEIGHT, viewportHeight - (VIEWPORT_MARGIN * 2))
      const minimumHeight = Math.min(Math.max(48, Math.min(MIN_USABLE_HEIGHT, desiredHeight)), viewportMaxHeight)
      const maxHeight = Math.min(
        viewportMaxHeight,
        Math.max(minimumHeight, Math.min(desiredHeight, availableHeight || desiredHeight)),
      )
      const width = Math.min(
        Math.max(rect.width, preferredMinWidth),
        viewportWidth - (VIEWPORT_MARGIN * 2),
      )
      const left = Math.min(
        Math.max(rect.left, VIEWPORT_MARGIN),
        viewportWidth - VIEWPORT_MARGIN - width,
      )

      setPosition({
        placement,
        contentMaxHeight: Math.max(32, maxHeight - 12),
        style: {
          position: 'fixed',
          zIndex: 500,
          left,
          width,
          minHeight: minimumHeight,
          maxHeight,
          boxSizing: 'border-box',
          ...(placement === 'bottom'
            ? { top: rect.bottom + MENU_GAP }
            : { bottom: viewportHeight - rect.top + MENU_GAP }),
        },
      })
    }

    updatePosition()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePosition)
    observer?.observe(anchorRef.current)
    if (floatingRef?.current) observer?.observe(floatingRef.current)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [anchorRef, floatingRef, open, preferredMaxHeight, preferredMinWidth])

  return position
}
