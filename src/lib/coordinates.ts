/**
 * Utility functions for coordinate transformation
 */

import type { Viewport, Position } from '@/types'

/**
 * Convert screen coordinates to canvas coordinates
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewport: Viewport
): Position {
  return {
    x: (screenX - viewport.panX) / viewport.zoom,
    y: (screenY - viewport.panY) / viewport.zoom
  }
}

/**
 * Convert canvas coordinates to screen coordinates
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  viewport: Viewport
): Position {
  return {
    x: canvasX * viewport.zoom + viewport.panX,
    y: canvasY * viewport.zoom + viewport.panY
  }
}

/**
 * Get click position from HTML element and convert to canvas coordinates
 */
export function getCanvasPositionFromEvent(
  e: React.MouseEvent,
  viewport: Viewport
): Position {
  const rect = e.currentTarget.getBoundingClientRect()
  const screenX = e.clientX - rect.left
  const screenY = e.clientY - rect.top
  return screenToCanvas(screenX, screenY, viewport)
}

/**
 * Get pointer position from Konva Stage and convert to canvas coordinates
 */
export function getCanvasPositionFromKonvaEvent(
  e: any,
  viewport: Viewport
): Position {
  const pos = e.target.getStage().getPointerPosition()
  return screenToCanvas(pos.x, pos.y, viewport)
}

/**
 * Limit zoom range
 */
export function clampZoom(zoom: number, minZoom = 0.1, maxZoom = 5): number {
  return Math.max(minZoom, Math.min(maxZoom, zoom))
}