import * as React from "react"

interface UseDraggableOptions {
  onDragStart?: (event: PointerEvent) => void
  onDrag?: (event: PointerEvent, delta: { x: number; y: number }) => void
  onDragEnd?: (event: PointerEvent, velocity: { x: number; y: number }) => void
  // Boundary options
  boundary?: {
    left?: number
    right?: number
    top?: number
    bottom?: number
  }
  // Rubberband resistance: higher means more resistance
  rubberbandResistance?: number
}

interface UseDraggableReturn {
  ref: React.RefObject<HTMLElement>
  style: React.CSSProperties
}

export function useDraggable(
  options: UseDraggableOptions = {}
): [React.RefObject<HTMLElement>, React.CSSProperties, React.Dispatch<React.SetStateAction<React.CSSProperties>>] {
  const {
    onDragStart,
    onDrag,
    onDragEnd,
    boundary = {},
    rubberbandResistance = 0.5,
  } = options

  const ref = React.useRef<HTMLElement>(null)
  const [style, setStyle] = React.useState<React.CSSProperties>({
    transform: "translate(0, 0)",
    transition: "transform 0.0s", // We'll set to 0s during drag, then set to a spring-like transition on release
  })

  // State for dragging
  const startPos = React.useRef({ x: 0, y: 0 })
  const currentPos = React.useRef({ x: 0, y: 0 })
  const isDragging = React.useRef(false)
  const lastMoveTime = React.useRef(0)
  const lastMovePos = React.useRef({ x: 0, y: 0 })
  const velocity = React.useRef({ x: 0, y: 0 })

  // Calculate velocity based on time and position delta
  const calculateVelocity = (currentPos: { x: number; y: number }, time: number) => {
    const deltaTime = time - lastMoveTime.current
    if (deltaTime === 0) return { x: 0, y: 0 }
    const deltaX = currentPos.x - lastMovePos.current.x
    const deltaY = currentPos.y - lastMovePos.current.y
    return {
      x: (deltaX / deltaTime) * 1000, // pixels per second
      y: (deltaY / deltaTime) * 1000,
    }
  }

  // Apply rubberband effect: progressive resistance
  const applyRubberband = (
    pos: { x: number; y: number },
    boundary: { left?: number; right?: number; top?: number; bottom?: number }
  ): { x: number; y: number } => {
    const result = { ...pos }

    // Left boundary
    if (boundary.left !== undefined && pos.x < boundary.left) {
      const overshoot = boundary.left - pos.x
      result.x = boundary.left - overshoot * rubberbandResistance
    }
    // Right boundary
    if (boundary.right !== undefined && pos.x > boundary.right) {
      const overshoot = pos.x - boundary.right
      result.x = boundary.right + overshoot * rubberbandResistance
    }
    // Top boundary
    if (boundary.top !== undefined && pos.y < boundary.top) {
      const overshoot = boundary.top - pos.y
      result.y = boundary.top - overshoot * rubberbandResistance
    }
    // Bottom boundary
    if (boundary.bottom !== undefined && pos.y > boundary.bottom) {
      const overshoot = pos.y - boundary.bottom
      result.y = boundary.bottom + overshoot * rubberbandResistance
    }

    return result
  }

  const handlePointerDown = React.useCallback((event: PointerEvent) => {
    // Only respond to left click or touch
    if (event.button !== 0 && event.pointerType !== "touch") return

    const element = ref.current
    if (!element) return

    // Set pointer capture to receive all pointermove/up events
    element.setPointerCapture(event.pointerId)

    // Initialize dragging state
    isDragging.current = true
    startPos.current = { x: event.clientX, y: event.clientY }
    currentPos.current = { x: 0, y: 0 } // Initial offset
    lastMoveTime.current = performance.now()
    lastMovePos.current = { x: event.clientX, y: event.clientY }

    // Set transition to none for immediate response
    setStyle({ transform: `translate(${currentPos.current.x}px, ${currentPos.current.y}px)`, transition: "transform 0.0s" })

    onDragStart?.(event)
  }, [onDragStart, rubberbandResistance])

  const handlePointerMove = React.useCallback((event: PointerEvent) => {
    if (!isDragging.current || !ref.current) return

    // Calculate delta from start
    const deltaX = event.clientX - startPos.current.x
    const deltaY = event.clientY - startPos.current.y

    // Apply boundary with rubberband effect
    const boundedDelta = applyRubberband({ x: deltaX, y: deltaY }, boundary)
    currentPos.current = boundedDelta

    // Update style
    setStyle({
      transform: `translate(${currentPos.current.x}px, ${currentPos.current.y}px)`,
      transition: "transform 0.0s",
    })

    // Calculate velocity
    const now = performance.now()
    velocity.current = calculateVelocity(
      { x: event.clientX, y: event.clientY },
      now
    )
    lastMoveTime.current = now
    lastMovePos.current = { x: event.clientX, y: event.clientY }

    onDrag?.(event, currentPos.current)
  }, [boundary, onDrag, rubberbandResistance])

  const handlePointerUp = React.useCallback((event: PointerEvent) => {
    if (!isDragging.current || !ref.current) return

    // Release pointer capture
    ref.current.releasePointerCapture(event.pointerId)
    isDragging.current = false

    // Set a transition for the release (spring-like)
    // We'll use a short transition that feels snappy
    setStyle({
      transform: `translate(${currentPos.current.x}px, ${currentPos.current.y}px)`,
      transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    })

    // Call onDragEnd with velocity
    onDragEnd?.(event, {
      x: velocity.current.x,
      y: velocity.current.y,
    })

    // Reset velocity
    velocity.current = { x: 0, y: 0 }
  }, [onDragEnd])

  // Attach event listeners
  React.useEffect(() => {
    const element = ref.current
    if (!element) return

    element.addEventListener("pointerdown", handlePointerDown)
    element.addEventListener("pointermove", handlePointerMove)
    element.addEventListener("pointerup", handlePointerUp)
    element.addEventListener("pointercancel", handlePointerUp)

    return () => {
      element.removeEventListener("pointerdown", handlePointerDown)
      element.removeEventListener("pointermove", handlePointerMove)
      element.removeEventListener("pointerup", handlePointerUp)
      element.removeEventListener("pointercancel", handlePointerUp)
    }
  }, [handlePointerDown, handlePointerMove, handlePointerUp])

  return [ref, style, setStyle]
}