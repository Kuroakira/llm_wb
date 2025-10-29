import type { AnchorPosition } from '@/types'

export type ProximityThresholds = {
  /** Primary anchors distance (px) - always visible within this range */
  primary: number
  /** Secondary anchors distance (px) - visible with reduced opacity */
  secondary: number
  /** Maximum distance (px) - hidden beyond this */
  maximum: number
}

export const DEFAULT_PROXIMITY_THRESHOLDS: ProximityThresholds = {
  primary: 30,
  secondary: 60,
  maximum: 80
}

export type ProximityLevel = 'hidden' | 'secondary' | 'primary'

export type ElementBounds = {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export type AnchorPoint = {
  elementId: string
  anchor: AnchorPosition
  x: number
  y: number
  distance: number
  proximityLevel: ProximityLevel
}

/**
 * Calculate anchor point coordinates for an element
 */
export function getAnchorCoordinates(
  element: ElementBounds,
  anchor: AnchorPosition
): { x: number; y: number } {
  const { x, y, width, height } = element
  
  switch (anchor) {
    case 'top':
      return { x: x + width / 2, y }
    case 'right':
      return { x: x + width, y: y + height / 2 }
    case 'bottom':
      return { x: x + width / 2, y: y + height }
    case 'left':
      return { x, y: y + height / 2 }
    default:
      return { x: x + width / 2, y: y + height / 2 }
  }
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(
  point1: { x: number; y: number },
  point2: { x: number; y: number }
): number {
  return Math.hypot(point2.x - point1.x, point2.y - point1.y)
}

/**
 * Determine proximity level based on distance and thresholds
 */
export function getProximityLevel(
  distance: number,
  thresholds: ProximityThresholds = DEFAULT_PROXIMITY_THRESHOLDS
): ProximityLevel {
  if (distance <= thresholds.primary) {
    return 'primary'
  } else if (distance <= thresholds.secondary) {
    return 'secondary'
  } else if (distance <= thresholds.maximum) {
    return 'hidden' // Still tracked but not visible
  } else {
    return 'hidden'
  }
}

/**
 * Calculate proximity for all anchor points of an element relative to cursor position
 */
export function calculateElementAnchorProximities(
  element: ElementBounds,
  cursorPosition: { x: number; y: number },
  thresholds: ProximityThresholds = DEFAULT_PROXIMITY_THRESHOLDS
): AnchorPoint[] {
  const anchors: AnchorPosition[] = ['top', 'right', 'bottom', 'left']
  
  return anchors.map(anchor => {
    const anchorCoords = getAnchorCoordinates(element, anchor)
    const distance = calculateDistance(cursorPosition, anchorCoords)
    const proximityLevel = getProximityLevel(distance, thresholds)
    
    return {
      elementId: element.id,
      anchor,
      x: anchorCoords.x,
      y: anchorCoords.y,
      distance,
      proximityLevel
    }
  })
}

/**
 * Calculate proximity for all elements and their anchors
 */
export function calculateAllAnchorProximities(
  elements: ElementBounds[],
  cursorPosition: { x: number; y: number },
  thresholds: ProximityThresholds = DEFAULT_PROXIMITY_THRESHOLDS
): AnchorPoint[] {
  return elements.flatMap(element =>
    calculateElementAnchorProximities(element, cursorPosition, thresholds)
  )
}

/**
 * Filter anchor points by proximity level
 */
export function filterAnchorsByProximity(
  anchorPoints: AnchorPoint[],
  minLevel: ProximityLevel = 'secondary'
): AnchorPoint[] {
  const levelPriority = { hidden: 0, secondary: 1, primary: 2 }
  const minPriority = levelPriority[minLevel]
  
  return anchorPoints.filter(anchor => 
    levelPriority[anchor.proximityLevel] >= minPriority
  )
}

/**
 * Get visible anchor points sorted by distance (closest first)
 */
export function getVisibleAnchorPoints(
  elements: ElementBounds[],
  cursorPosition: { x: number; y: number },
  thresholds: ProximityThresholds = DEFAULT_PROXIMITY_THRESHOLDS
): AnchorPoint[] {
  const allAnchors = calculateAllAnchorProximities(elements, cursorPosition, thresholds)
  const visibleAnchors = filterAnchorsByProximity(allAnchors, 'secondary')
  
  // Sort by distance (closest first)
  return visibleAnchors.sort((a, b) => a.distance - b.distance)
}

/**
 * Check if element should show connection points based on proximity
 */
export function shouldShowConnectionPoints(
  elementId: string,
  elements: ElementBounds[],
  cursorPosition: { x: number; y: number } | null,
  thresholds: ProximityThresholds = DEFAULT_PROXIMITY_THRESHOLDS
): boolean {
  // Always show if cursor position is not available (fallback to hover-based)
  if (!cursorPosition) return false
  
  const element = elements.find(el => el.id === elementId)
  if (!element) return false
  
  const anchorProximities = calculateElementAnchorProximities(
    element, 
    cursorPosition, 
    thresholds
  )
  
  // Show if any anchor is within secondary proximity
  return anchorProximities.some(anchor => 
    anchor.proximityLevel === 'secondary' || anchor.proximityLevel === 'primary'
  )
}

/**
 * Apply zoom-aware proximity thresholds
 */
export function getZoomAwareThresholds(
  baseThresholds: ProximityThresholds,
  zoomLevel: number,
  minZoom: number = 0.5,
  maxZoom: number = 3.0
): ProximityThresholds {
  // Clamp zoom level to prevent extreme threshold values
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoomLevel))
  
  // Scale thresholds inversely with zoom (higher zoom = smaller thresholds in canvas space)
  const scale = 1 / clampedZoom
  
  return {
    primary: baseThresholds.primary * scale,
    secondary: baseThresholds.secondary * scale,
    maximum: baseThresholds.maximum * scale
  }
}

/**
 * Convert screen coordinates to canvas coordinates for proximity calculations
 */
export function screenToCanvasForProximity(
  screenX: number,
  screenY: number,
  viewport: { zoom: number; panX: number; panY: number }
): { x: number; y: number } {
  return {
    x: (screenX - viewport.panX) / viewport.zoom,
    y: (screenY - viewport.panY) / viewport.zoom
  }
}