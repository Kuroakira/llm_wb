type Rectangle = {
  x: number
  y: number
  width: number
  height: number
}

type Point = {
  x: number
  y: number
}

function getCenter(rect: Rectangle): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2
  }
}

export function anchorForConnection(from: Rectangle, to: Rectangle) {
  const fromCenter = getCenter(from)
  const toCenter = getCenter(to)

  const dx = toCenter.x - fromCenter.x
  const dy = toCenter.y - fromCenter.y

  const isHorizontal = Math.abs(dx) > Math.abs(dy)

  // Add margin to prevent arrow from overlapping element boundaries (countermeasure for resize handles)
  const margin = 12 // Larger than arrow tip's pointerLength to prevent handle overlap
  
  let fromPoint: Point
  let toPoint: Point
  
  if (isHorizontal) {
    if (dx > 0) {
      fromPoint = { x: from.x + from.width, y: fromCenter.y }
      toPoint = { x: to.x + margin, y: toCenter.y } // Slightly inside from left edge
    } else {
      fromPoint = { x: from.x, y: fromCenter.y }
      toPoint = { x: to.x + to.width - margin, y: toCenter.y } // Slightly inside from right edge
    }
  } else {
    if (dy > 0) {
      fromPoint = { x: fromCenter.x, y: from.y + from.height }
      toPoint = { x: toCenter.x, y: to.y + margin } // Slightly inside from top edge
    } else {
      fromPoint = { x: fromCenter.x, y: from.y }
      toPoint = { x: toCenter.x, y: to.y + to.height - margin } // Slightly inside from bottom edge
    }
  }
  
  return { fromPoint, toPoint }
}

export function recalcConnectorPoints(
  connector: { fromId: string; toId: string },
  elements: Array<{ id: string; x: number; y: number; width: number; height: number }>
): number[] {
  const fromElement = elements.find(el => el.id === connector.fromId)
  const toElement = elements.find(el => el.id === connector.toId)
  
  if (!fromElement || !toElement) {
    return [0, 0, 0, 0]
  }
  
  const { fromPoint, toPoint } = anchorForConnection(fromElement, toElement)
  return [fromPoint.x, fromPoint.y, toPoint.x, toPoint.y]
}

export function isPointInRect(point: Point, rect: Rectangle): boolean {
  return point.x >= rect.x && 
         point.x <= rect.x + rect.width &&
         point.y >= rect.y && 
         point.y <= rect.y + rect.height
}

/**
 * Calculate text dimensions
 * @param text Text content
 * @param fontSize Font size (default: 14)
 * @param fontFamily Font family
 * @param padding Padding (default: 20)
 * @returns Recommended width and height
 */
export function calculateTextDimensions(text: string, fontSize: number = 14, fontFamily?: string, padding: number = 20): { width: number; height: number } {
  // Calculate actual text size using Canvas API
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (context) {
      context.font = `${fontSize}px ${fontFamily || 'system-ui, -apple-system, "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif'}`

      // Calculate width of each line
      const lines = text.split('\n')
      let maxWidth = 0

      for (const line of lines) {
        const metrics = context.measureText(line)
        maxWidth = Math.max(maxWidth, metrics.width)
      }

      // Calculate line height (use 1.5 times fontSize as line spacing)
      const lineHeight = fontSize * 1.5
      const totalHeight = lines.length * lineHeight

      // Add padding and calculate final size
      // Set minimum and maximum sizes
      const width = Math.min(Math.max(maxWidth + padding * 2, 150), 400)
      const height = Math.min(Math.max(totalHeight + padding * 2, 80), 300)

      return { width, height }
    }
  }

  // Fallback: estimation based on character count
  const lines = text.split('\n')
  const maxLineLength = Math.max(...lines.map(line => line.length))
  const estimatedWidth = Math.min(Math.max(maxLineLength * fontSize * 0.6 + padding * 2, 150), 400)
  const estimatedHeight = Math.min(Math.max(lines.length * fontSize * 1.5 + padding * 2, 80), 300)

  return { width: estimatedWidth, height: estimatedHeight }
}

// Extended hover areas for connector mode
export type ExtendedHoverConfig = {
  baseBufferSize: number // Base buffer in pixels (20px)
  denseLayoutThreshold: number // Distance threshold for dense layout detection (80px)
  denseBufferSize: number // Reduced buffer for dense layouts (10px)
  minZoomScale: number // Minimum zoom scale factor (0.5)
  maxZoomScale: number // Maximum zoom scale factor (2.0)
}

export const DEFAULT_HOVER_CONFIG: ExtendedHoverConfig = {
  baseBufferSize: 20,
  denseLayoutThreshold: 80,
  denseBufferSize: 10,
  minZoomScale: 0.5,
  maxZoomScale: 2.0
}

/**
 * Calculate adaptive buffer size based on zoom level and element density
 */
export function calculateAdaptiveBuffer(
  config: ExtendedHoverConfig,
  zoomLevel: number,
  isDenseLayout: boolean
): number {
  // Clamp zoom level to prevent extreme buffer sizes
  const clampedZoom = Math.max(config.minZoomScale, Math.min(config.maxZoomScale, zoomLevel))
  
  // Use smaller buffer in dense layouts
  const baseBuffer = isDenseLayout ? config.denseBufferSize : config.baseBufferSize
  
  // Scale buffer by zoom level (inverse relationship)
  // Higher zoom = smaller buffer in screen pixels
  return baseBuffer / clampedZoom
}

/**
 * Detect if the cursor area has dense element layout
 */
export function detectDenseLayout(
  cursorPos: Point,
  elements: Rectangle[],
  threshold: number = DEFAULT_HOVER_CONFIG.denseLayoutThreshold
): boolean {
  const nearbyElements = elements.filter(el => {
    const distance = Math.hypot(
      cursorPos.x - (el.x + el.width / 2),
      cursorPos.y - (el.y + el.height / 2)
    )
    return distance <= threshold
  })
  
  return nearbyElements.length >= 3 // 3 or more elements within threshold = dense
}

/**
 * Create expanded bounding rectangle with buffer zone
 */
export function createExpandedBounds(
  element: Rectangle,
  bufferSize: number
): Rectangle {
  return {
    x: element.x - bufferSize,
    y: element.y - bufferSize,
    width: element.width + bufferSize * 2,
    height: element.height + bufferSize * 2
  }
}

/**
 * Check if point is within element's extended hover area
 */
export function isPointInExtendedArea(
  point: Point,
  element: Rectangle,
  bufferSize: number
): boolean {
  const expandedBounds = createExpandedBounds(element, bufferSize)
  return isPointInRect(point, expandedBounds)
}

/**
 * Find elements within extended hover area, sorted by z-index priority
 */
export function findElementsInHoverArea(
  cursorPos: Point,
  elements: Array<Rectangle & { id: string; zIndex: number }>,
  config: ExtendedHoverConfig = DEFAULT_HOVER_CONFIG,
  zoomLevel: number = 1.0
): Array<Rectangle & { id: string; zIndex: number }> {
  // Detect layout density
  const isDenseLayout = detectDenseLayout(cursorPos, elements, config.denseLayoutThreshold)
  
  // Calculate adaptive buffer
  const bufferSize = calculateAdaptiveBuffer(config, zoomLevel, isDenseLayout)
  
  // Find elements within extended area
  const elementsInArea = elements.filter(element =>
    isPointInExtendedArea(cursorPos, element, bufferSize)
  )
  
  // Sort by z-index (higher z-index = higher priority)
  return elementsInArea.sort((a, b) => b.zIndex - a.zIndex)
}

/**
 * Get priority element for hover (highest z-index within extended area)
 */
export function getPriorityHoverElement(
  cursorPos: Point,
  elements: Array<Rectangle & { id: string; zIndex: number }>,
  config: ExtendedHoverConfig = DEFAULT_HOVER_CONFIG,
  zoomLevel: number = 1.0
): (Rectangle & { id: string; zIndex: number }) | null {
  const elementsInArea = findElementsInHoverArea(cursorPos, elements, config, zoomLevel)
  return elementsInArea[0] || null // First element has highest z-index
}

/**
 * Calculate distance from point to element edge (for proximity-based selection)
 */
export function calculateDistanceToElement(point: Point, element: Rectangle): number {
  // Distance to closest edge
  const dx = Math.max(element.x - point.x, 0, point.x - (element.x + element.width))
  const dy = Math.max(element.y - point.y, 0, point.y - (element.y + element.height))
  return Math.hypot(dx, dy)
}