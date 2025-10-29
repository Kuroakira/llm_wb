/**
 * Interaction utilities for canvas elements - centralized interaction logic
 * 
 * This module provides standardized calculations for:
 * - Hover detection zones
 * - Click interaction areas  
 * - Zoom-compensated interaction radiuses
 * - Buffer zone calculations
 */

import type { Viewport } from '@/types'

/**
 * Configuration constants for interaction areas
 */
export const INTERACTION_CONFIG = {
  // Buffer zones
  HOVER_BUFFER: 20,           // Buffer around elements for hover detection
  ANCHOR_VISUAL_RADIUS: 6,    // Visual radius of anchor points
  
  // Interaction multipliers
  MIN_INTERACTION_RADIUS: 10, // Minimum clickable area
  MAX_INTERACTION_RADIUS: 40, // Maximum clickable area  
  INTERACTION_MULTIPLIER: 2,  // Base interaction area = visual size × this
  
  // Zoom thresholds
  ZOOM_SCALE_THRESHOLD: 1,    // Below this, increase interaction area
  ZOOM_SCALE_FACTOR: 0.5,     // Scaling factor for zoomed-in interactions
  EXTENDED_HOVER_REDUCTION: 0.9, // Reduction factor in extended hover mode
} as const

/**
 * Calculate interaction radius for anchor points with zoom compensation
 */
export function calculateInteractionRadius(
  viewport: Viewport | undefined,
  options: {
    visualRadius?: number
    isExtendedHover?: boolean
  } = {}
): number {
  const scale = viewport?.zoom || 1
  const { 
    visualRadius = INTERACTION_CONFIG.ANCHOR_VISUAL_RADIUS,
    isExtendedHover = false 
  } = options
  
  // Base interaction radius - 2x visual size minimum
  const baseRadius = Math.max(
    visualRadius * INTERACTION_CONFIG.INTERACTION_MULTIPLIER, 
    INTERACTION_CONFIG.MIN_INTERACTION_RADIUS
  )
  
  // Zoom-compensated radius for consistent clickability
  let zoomCompensatedRadius: number
  if (scale < INTERACTION_CONFIG.ZOOM_SCALE_THRESHOLD) {
    // Zoomed out: increase hit area
    zoomCompensatedRadius = baseRadius / scale
  } else {
    // Zoomed in: moderate scaling
    zoomCompensatedRadius = baseRadius / Math.max(scale * INTERACTION_CONFIG.ZOOM_SCALE_FACTOR, 0.8)
  }
  
  // Reduce radius in extended hover mode to avoid overlap
  if (isExtendedHover) {
    zoomCompensatedRadius *= INTERACTION_CONFIG.EXTENDED_HOVER_REDUCTION
  }
  
  // Clamp to reasonable bounds
  return Math.max(
    Math.min(zoomCompensatedRadius, INTERACTION_CONFIG.MAX_INTERACTION_RADIUS),
    INTERACTION_CONFIG.MIN_INTERACTION_RADIUS
  )
}

/**
 * Check if a point is within an element's hover buffer zone
 */
export function isWithinHoverBuffer(
  point: { x: number; y: number },
  element: { x: number; y: number; width: number; height: number },
  bufferSize: number = INTERACTION_CONFIG.HOVER_BUFFER
): boolean {
  const expandedBounds = {
    left: element.x - bufferSize,
    right: element.x + element.width + bufferSize,
    top: element.y - bufferSize,
    bottom: element.y + element.height + bufferSize
  }
  
  return (
    point.x >= expandedBounds.left && 
    point.x <= expandedBounds.right &&
    point.y >= expandedBounds.top &&
    point.y <= expandedBounds.bottom
  )
}

/**
 * Standardized event stopping for interaction isolation
 */
export function stopEventPropagation(event: any): void {
  if (event.evt) {
    event.evt.stopPropagation()
    event.evt.stopImmediatePropagation() 
    event.evt.preventDefault()
    
    // Mark as handled to prevent further processing
    event.evt._konva_anchor_handled = true
  }
  event.cancelBubble = true
}

/**
 * Common interaction event properties for Konva elements
 */
export function getInteractionProps(interactionRadius: number) {
  return {
    radius: interactionRadius,
    fill: 'transparent',
    perfectDrawEnabled: false,
    hitStrokeWidth: 0,
    strokeEnabled: false,
    shadowEnabled: false,
    globalCompositeOperation: 'source-over' as const
  }
}