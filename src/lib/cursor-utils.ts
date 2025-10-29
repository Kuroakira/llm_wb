import type { ResizeDirection } from '@/canvas/shapes/ResizeHandle'

/**
 * Get CSS cursor corresponding to resize direction (for corner handles)
 */
export const getCursorForDirection = (direction: ResizeDirection): string => {
  // Only corner handles are supported
  const cornerCursorMap: Record<string, string> = {
    'nw': 'nw-resize',
    'ne': 'ne-resize',
    'sw': 'sw-resize',
    'se': 'se-resize'
  }
  return cornerCursorMap[direction] || 'default'
}

/**
 * Set document cursor
 */
export const setCursor = (cursor: string) => {
  if (typeof document !== 'undefined') {
    document.body.style.cursor = cursor
  }
}

/**
 * 2-click method: Cursor for connection points (ready for first click)
 */
export const getConnectionCursor = (): string => {
  return 'crosshair' // Browser standard crosshair cursor: indicates "connection can start"
}

/**
 * 2-click method: Cursor after first click (waiting for second click)
 * Preview line is displayed, mouse can move freely
 */
export const getConnectionActiveCursor = (): string => {
  return 'copy' // Copy cursor: clearly indicates "connection in progress, waiting for second click"
}

/**
 * 2-click method: Cursor over valid connection target (second click possible)
 */
export const getConnectionTargetCursor = (): string => {
  return 'alias' // Alias cursor: indicates "click here to complete connection"
}

/**
 * 2-click method: Cursor for canceling connection on background click
 */
export const getConnectionCancelCursor = (): string => {
  return 'not-allowed' // Not-allowed cursor: indicates "background click cancels connection"
}

/**
 * Cursor for panning (grab cursor)
 */
export const getPanCursor = (): string => {
  return 'grab' // Grab cursor: indicates "drag to move"
}

/**
 * Cursor while dragging for pan (grabbing cursor)
 */
export const getPanDraggingCursor = (): string => {
  return 'grabbing' // Grabbing cursor: indicates "currently dragging"
}

/**
 * Reset document cursor to default
 */
export const resetCursor = () => setCursor('default')