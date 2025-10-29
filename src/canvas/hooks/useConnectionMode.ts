import { useEffect, useCallback } from 'react'
import { useBoardStore } from '@/store/boardStore'
import type { AnchorPosition } from '@/types'

/**
 * Hook for managing connection mode and line tool interactions
 * Extracted from useCanvasEvents for better separation of concerns
 */
export function useConnectionMode() {
  const {
    selectedTool,
    connectionMode,
    startConnection,
    completeConnection,
    cancelConnection,
    createPartialConnection,
    addFreeConnectorAt,
    selectConnector,
    selectTool,
    setConnectorHoverTarget,
    connectorDrag,
    endConnectorDrag
  } = useBoardStore()
  
  const isLineMode = selectedTool === 'line'
  
  // Find snap target for connection points
  const findSnapTarget = useCallback((
    px: number, 
    py: number, 
    elements: any[], 
    viewport: any
  ): { elementId: string; anchor: AnchorPosition } | null => {
    const scale = viewport?.zoom || 1
    const threshold = 40 / scale // Enhanced threshold for better UX
    let best: any = null
    let bestDist = Infinity
    
    const getElementAnchors = (el: any) => [
      { anchor: 'top' as const, x: el.x + el.width / 2, y: el.y },
      { anchor: 'right' as const, x: el.x + el.width, y: el.y + el.height / 2 },
      { anchor: 'bottom' as const, x: el.x + el.width / 2, y: el.y + el.height },
      { anchor: 'left' as const, x: el.x, y: el.y + el.height / 2 }
    ]
    
    for (const el of elements) {
      const anchors = getElementAnchors(el)
      for (const a of anchors) {
        const d = Math.hypot(px - a.x, py - a.y)
        if (d < bestDist) {
          bestDist = d
          best = { elementId: el.id, anchor: a.anchor }
        }
      }
    }
    
    if (best && bestDist <= threshold) return best
    return null
  }, [])
  
  // Handle connection point click (2-click mode)
  const handleConnectionPointClick = useCallback((
    elementId: string, 
    anchor: AnchorPosition
  ) => {
    if (!isLineMode) return
    
    if (!connectionMode.isActive) {
      // First click: start connection
      setConnectorHoverTarget({ elementId, anchor })
      startConnection(elementId, anchor)
    } else {
      // Second click: complete or cancel
      if (connectionMode.fromElementId !== elementId) {
        completeConnection(elementId, anchor)
      } else {
        cancelConnection()
      }
      setConnectorHoverTarget(null)
    }
  }, [
    isLineMode,
    connectionMode,
    setConnectorHoverTarget,
    startConnection,
    completeConnection,
    cancelConnection
  ])
  
  // Handle line tool clicks on canvas
  const handleLineToolClick = useCallback((
    canvasPos: { x: number; y: number },
    elements: any[],
    viewport: any
  ) => {
    const target = findSnapTarget(canvasPos.x, canvasPos.y, elements, viewport)
    
    if (connectionMode.isActive) {
      // Second click
      if (target && target.elementId !== connectionMode.fromElementId) {
        // Complete connection to another element
        completeConnection(target.elementId, target.anchor as AnchorPosition)
        setConnectorHoverTarget(null)
      } else if (!target) {
        // Create partial connection to background
        createPartialConnection(canvasPos)
        setConnectorHoverTarget(null)
      } else {
        // Cancel if clicking same element
        cancelConnection()
        setConnectorHoverTarget(null)
      }
    } else {
      // First click
      if (target) {
        // Start connection from anchor
        setConnectorHoverTarget(target as any)
        startConnection(target.elementId, target.anchor as AnchorPosition)
      } else {
        // Create free connector
        const id = addFreeConnectorAt({ 
          x: canvasPos.x, 
          y: canvasPos.y, 
          length: 80 
        })
        selectConnector(id)
        selectTool('select')
      }
    }
  }, [
    connectionMode,
    findSnapTarget,
    completeConnection,
    createPartialConnection,
    cancelConnection,
    setConnectorHoverTarget,
    startConnection,
    addFreeConnectorAt,
    selectConnector,
    selectTool
  ])
  
  // Update cursor for line mode
  const updateLineModeCursor = useCallback((
    canvasPos: { x: number; y: number },
    elements: any[],
    viewport: any,
    isBackgroundArea: boolean
  ) => {
    if (!isLineMode) return
    
    const target = findSnapTarget(canvasPos.x, canvasPos.y, elements, viewport)
    
    // Update hover target
    if (target) {
      setConnectorHoverTarget(target as any)
    } else {
      setConnectorHoverTarget(null)
    }
    
    // Update cursor based on state
    if (typeof window !== 'undefined') {
      import('@/lib/cursor-utils').then(({ 
        getConnectionCursor, 
        getConnectionActiveCursor, 
        getConnectionTargetCursor, 
        getConnectionCancelCursor,
        setCursor 
      }) => {
        if (connectionMode.isActive) {
          if (target && target.elementId !== connectionMode.fromElementId) {
            setCursor(getConnectionTargetCursor())
          } else if (isBackgroundArea) {
            setCursor(getConnectionCancelCursor())
          } else {
            setCursor(getConnectionActiveCursor())
          }
        } else {
          setCursor(getConnectionCursor())
        }
      })
    }
  }, [
    isLineMode,
    connectionMode,
    findSnapTarget,
    setConnectorHoverTarget
  ])
  
  // Cancel connection on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLineMode && connectionMode.isActive) {
          cancelConnection()
          setConnectorHoverTarget(null)
        }
        if (connectorDrag.isActive) {
          endConnectorDrag()
          setConnectorHoverTarget(null)
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    isLineMode,
    connectionMode.isActive,
    connectorDrag.isActive,
    cancelConnection,
    endConnectorDrag,
    setConnectorHoverTarget
  ])
  
  return {
    isLineMode,
    connectionMode,
    findSnapTarget,
    handleConnectionPointClick,
    handleLineToolClick,
    updateLineModeCursor
  }
}