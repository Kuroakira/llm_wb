import { useState, useRef, useCallback } from 'react'
import { useBoardStore } from '@/store/boardStore'
import { screenToCanvas } from '@/lib/coordinates'

interface SelectionRect {
  isActive: boolean
  x: number
  y: number
  width: number
  height: number
}

/**
 * Hook for managing selection mode and marquee selection
 * Extracted from useCanvasEvents for better separation of concerns
 */
export function useSelectionMode() {
  const { selectedTool, elements, connectors, selectShapesAndConnectors } = useBoardStore()
  
  const [selectionRect, setSelectionRect] = useState<SelectionRect>({
    isActive: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0
  })
  
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null)
  
  const normalizeRect = useCallback((
    x1: number, 
    y1: number, 
    x2: number, 
    y2: number
  ) => {
    const x = Math.min(x1, x2)
    const y = Math.min(x1, y2)
    const width = Math.abs(x2 - x1)
    const height = Math.abs(y2 - y1)
    return { x, y, width, height }
  }, [])
  
  // Check if element intersects with selection rectangle
  const isElementIntersectRect = useCallback((
    el: { x: number; y: number; width: number; height: number },
    rect: { x: number; y: number; width: number; height: number }
  ) => {
    const elRight = el.x + el.width
    const elBottom = el.y + el.height
    const rectRight = rect.x + rect.width
    const rectBottom = rect.y + rect.height
    
    // Check if rectangles don't overlap (then invert result)
    const noOverlap = elRight < rect.x || 
                     rectRight < el.x || 
                     elBottom < rect.y || 
                     rectBottom < el.y
    
    return !noOverlap
  }, [])
  
  // Check if connector intersects with selection rectangle
  const isConnectorIntersectRect = useCallback((
    c: { points: number[] },
    rect: { x: number; y: number; width: number; height: number }
  ) => {
    const [x1, y1, x2, y2] = c.points
    const rectRight = rect.x + rect.width
    const rectBottom = rect.y + rect.height
    
    // Check if endpoints are inside rectangle
    const pointInRect = (x: number, y: number) => 
      x >= rect.x && x <= rectRight && y >= rect.y && y <= rectBottom
    
    if (pointInRect(x1, y1) || pointInRect(x2, y2)) return true
    
    // Check line-rectangle intersection
    const segments = [
      [rect.x, rect.y, rectRight, rect.y], // top edge
      [rectRight, rect.y, rectRight, rectBottom], // right edge
      [rectRight, rectBottom, rect.x, rectBottom], // bottom edge
      [rect.x, rectBottom, rect.x, rect.y] // left edge
    ] as const
    
    const ccw = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
      return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax)
    }
    
    const intersect = (
      ax: number, ay: number, bx: number, by: number,
      cx: number, cy: number, dx: number, dy: number
    ) => {
      return ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy) &&
             ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy)
    }
    
    for (const [rx1, ry1, rx2, ry2] of segments) {
      if (intersect(x1, y1, x2, y2, rx1, ry1, rx2, ry2)) return true
    }
    
    return false
  }, [])
  
  // Handle selection mouse down
  const handleSelectionMouseDown = useCallback((
    e: any,
    viewport: any
  ) => {
    if (selectedTool !== 'select') return false
    
    const targetClassName = e.target?.getClassName?.() || e.target?.constructor?.name || ''
    const isBackgroundClick = targetClassName === 'Stage' || (e.target === e.target?.getStage?.())
    
    if (!isBackgroundClick) return false
    if (e?.evt && e.evt.button !== 0) return false // Only left mouse button
    
    const pos = e.target.getStage().getPointerPosition?.()
    if (!pos) return false
    
    const canvasPos = screenToCanvas(pos.x, pos.y, viewport)
    selectionStartRef.current = { x: canvasPos.x, y: canvasPos.y }
    
    setSelectionRect({ 
      isActive: true, 
      x: canvasPos.x, 
      y: canvasPos.y, 
      width: 0, 
      height: 0 
    })
    
    return true
  }, [selectedTool])
  
  // Handle selection mouse move
  const handleSelectionMouseMove = useCallback((
    e: any,
    viewport: any
  ) => {
    if (!selectionRect.isActive) return false
    
    const pos = e.target.getStage().getPointerPosition?.()
    if (!pos) return false
    
    const canvasPos = screenToCanvas(pos.x, pos.y, viewport)
    const start = selectionStartRef.current || { x: selectionRect.x, y: selectionRect.y }
    const rect = normalizeRect(start.x, start.y, canvasPos.x, canvasPos.y)
    
    setSelectionRect({ isActive: true, ...rect })
    return true
  }, [selectionRect.isActive, normalizeRect])
  
  // Handle selection mouse up
  const handleSelectionMouseUp = useCallback((e: any) => {
    if (!selectionRect.isActive) return false
    
    const rect = selectionRect
    const pickedShapeIds = elements
      .filter((el) => isElementIntersectRect(el, rect))
      .map((el) => el.id)
    
    const pickedConnectorIds = connectors
      .filter((c) => isConnectorIntersectRect(c, rect))
      .map((c) => c.id)
    
    // Handle Shift key for additive selection
    const isAdd = !!(e?.evt && e.evt.shiftKey)
    
    if (isAdd) {
      // Add to existing selection
      const store = useBoardStore.getState()
      const prevShapeIds: string[] = store.selectedIds || []
      const prevConnectorIds: string[] = store.selectedConnectorIds || []
      
      const unionShapes = Array.from(new Set([
        ...(prevShapeIds || []), 
        ...pickedShapeIds
      ]))
      const unionConnectors = Array.from(new Set([
        ...(prevConnectorIds || []), 
        ...pickedConnectorIds
      ]))
      
      selectShapesAndConnectors(unionShapes, unionConnectors)
    } else {
      // Replace selection
      selectShapesAndConnectors(pickedShapeIds, pickedConnectorIds)
    }
    
    // Clean up selection state
    setSelectionRect({ isActive: false, x: 0, y: 0, width: 0, height: 0 })
    selectionStartRef.current = null
    
    return true
  }, [
    selectionRect, 
    elements, 
    connectors, 
    isElementIntersectRect, 
    isConnectorIntersectRect,
    selectShapesAndConnectors
  ])
  
  return {
    selectionRect,
    handleSelectionMouseDown,
    handleSelectionMouseMove,
    handleSelectionMouseUp
  }
}