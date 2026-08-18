import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react'

type FloatingMenuPosition = {
  style: CSSProperties
  contentMaxHeight: number
  placement: 'top' | 'bottom'
}

const VIEWPORT_MARGIN = 12
const MENU_GAP = 8
const DEFAULT_MAX_HEIGHT = 304

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
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      const availableBelow = viewportHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN
      const availableAbove = rect.top - MENU_GAP - VIEWPORT_MARGIN
      const measuredHeight = floatingRef?.current?.scrollHeight ?? preferredMaxHeight
      const desiredHeight = Math.min(preferredMaxHeight, measuredHeight)
      const placement = availableBelow >= desiredHeight
        ? 'bottom'
        : availableAbove >= desiredHeight
          ? 'top'
          : availableBelow >= availableAbove
            ? 'bottom'
            : 'top'
      const availableHeight = placement === 'bottom' ? availableBelow : availableAbove
      const maxHeight = Math.max(0, Math.min(desiredHeight, availableHeight))
      const width = Math.min(
        Math.max(rect.width, preferredMinWidth),
        window.innerWidth - (VIEWPORT_MARGIN * 2),
      )
      const left = Math.min(
        Math.max(rect.left, VIEWPORT_MARGIN),
        window.innerWidth - VIEWPORT_MARGIN - width,
      )

      setPosition({
        placement,
        contentMaxHeight: Math.max(0, maxHeight - 16),
        style: {
          position: 'fixed',
          zIndex: 500,
          left,
          width,
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
