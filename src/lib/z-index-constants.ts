/**
 * Z-Index constants for maintaining proper layering hierarchy in the whiteboard application
 * 
 * Layer hierarchy (lowest to highest priority):
 * 1. Base canvas elements (0-100)
 * 2. Connectors and arrows (1-50) 
 * 3. Connection points and anchors (3000-4000)
 * 4. UI overlays and panels (1000+)
 */

export const Z_INDEX = {
  // Base canvas elements (lowest layer)
  CANVAS_ELEMENT_BASE: 0,
  CANVAS_ELEMENT_SELECTED: 1,
  
  // Connectors and arrows (low priority)
  ARROW_BASE: 1,                    // Base arrow/connector lines
  CONNECTOR_ANCHORS: 10,            // Connector end anchor circles (when selected)
  
  // Connection points (high priority for interaction)
  CONNECTION_POINTS_BASE: 3000,     // Normal connection anchor points
  CONNECTION_BADGES: 3001,          // Connection count badges
  CONNECTION_BADGE_TEXT: 3002,      // Badge text
  CONNECTION_POINTS_HOVERED: 3500,  // Hovered connection anchor points
  CONNECTION_INTERACTION: 4000,     // Invisible interaction overlay (highest priority)
  
  // Resize handles and transformation controls
  RESIZE_HANDLES: 9999,             // Resize handles (very high priority)
  TRANSFORM_CONTROLS: 10000,        // Transformation controls
  
  // UI overlays and panels (DOM z-index values)
  UI_PANEL_BASE: 1000,             // Base UI panels
  UI_DROPDOWN: 1001,               // Dropdowns and menus
  UI_MODAL: 1002,                  // Modal dialogs and overlays
} as const

// Type for z-index values
export type ZIndexValue = typeof Z_INDEX[keyof typeof Z_INDEX]

/**
 * Get z-index for canvas elements based on their state
 */
export function getCanvasElementZIndex(isSelected: boolean = false, isHovered: boolean = false): number {
  if (isSelected) return Z_INDEX.CANVAS_ELEMENT_SELECTED
  return Z_INDEX.CANVAS_ELEMENT_BASE
}

/**
 * Get z-index for connection points based on their state
 */
export function getConnectionPointZIndex(isHovered: boolean = false, isHidden: boolean | null = false): number {
  if (isHidden) return -100 // Hide completely
  if (isHovered) return Z_INDEX.CONNECTION_POINTS_HOVERED
  return Z_INDEX.CONNECTION_POINTS_BASE
}

/**
 * Validate that interaction elements have higher z-index than visual elements
 */
export function validateZIndexHierarchy(): boolean {
  const validations = [
    Z_INDEX.CONNECTION_INTERACTION > Z_INDEX.CONNECTION_POINTS_HOVERED,
    Z_INDEX.CONNECTION_POINTS_HOVERED > Z_INDEX.CONNECTION_POINTS_BASE,
    Z_INDEX.CONNECTION_POINTS_BASE > Z_INDEX.CONNECTOR_ANCHORS,
    Z_INDEX.CONNECTOR_ANCHORS > Z_INDEX.ARROW_BASE,
    Z_INDEX.RESIZE_HANDLES > Z_INDEX.CONNECTION_INTERACTION,
  ]
  
  return validations.every(validation => validation)
}