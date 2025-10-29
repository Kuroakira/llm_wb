/**
 * Measure text size and calculate responsive sticky note dimensions
 */

export interface StickySize {
  width: number
  height: number
}

export function calculateStickySize(text: string): StickySize {
  // Min/Max size definitions - Updated for large text content
  const MIN_WIDTH = 200
  const MIN_HEIGHT = 150
  const MAX_WIDTH = 500
  const MAX_HEIGHT = 2000 // Increased from 600 to 2000 to match auto-sizing system
  const PADDING = 24 // Sticky note inner padding

  // Font settings (match actual sticky note settings)
  const FONT_SIZE = 14
  const LINE_HEIGHT = 1.5
  const FONT_FAMILY = 'system-ui, -apple-system, sans-serif'

  // Measure text size using Canvas
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    // Fallback: character count-based estimation
    const charCount = text.length
    const estimatedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, charCount * 8 + PADDING * 2))
    const estimatedHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.ceil(charCount / 30) * 20 + PADDING * 2))
    return { width: estimatedWidth, height: estimatedHeight }
  }

  context.font = `${FONT_SIZE}px ${FONT_FAMILY}`

  // Split text by newlines
  const lines = text.split('\n')
  let maxLineWidth = 0
  let totalHeight = 0

  // Process each line
  for (const line of lines) {
    if (line.trim() === '') {
      // Empty line
      totalHeight += FONT_SIZE * LINE_HEIGHT
      continue
    }

    // Measure line width
    const lineMetrics = context.measureText(line)
    const lineWidth = lineMetrics.width

    // Consider wrapping at maximum width
    const maxLineWidthWithoutPadding = MAX_WIDTH - PADDING * 2
    if (lineWidth > maxLineWidthWithoutPadding) {
      // Wrap long lines
      const words = line.split(' ')
      let currentLineWidth = 0
      let lineCount = 1

      for (const word of words) {
        const wordWidth = context.measureText(word + ' ').width
        if (currentLineWidth + wordWidth > maxLineWidthWithoutPadding) {
          lineCount++
          currentLineWidth = wordWidth
        } else {
          currentLineWidth += wordWidth
        }
      }

      maxLineWidth = Math.max(maxLineWidth, Math.min(lineWidth, maxLineWidthWithoutPadding))
      totalHeight += FONT_SIZE * LINE_HEIGHT * lineCount
    } else {
      maxLineWidth = Math.max(maxLineWidth, lineWidth)
      totalHeight += FONT_SIZE * LINE_HEIGHT
    }
  }

  // Add padding
  const finalWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, maxLineWidth + PADDING * 2))
  const finalHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, totalHeight + PADDING * 2))

  return {
    width: Math.round(finalWidth),
    height: Math.round(finalHeight)
  }
}

/**
 * Character count-based estimation for server-side or environments without Canvas
 */
export function estimateStickySize(text: string): StickySize {
  const MIN_WIDTH = 200
  const MIN_HEIGHT = 150
  const MAX_WIDTH = 500
  const MAX_HEIGHT = 2000 // Increased from 600 to 2000 to match auto-sizing system

  const charCount = text.length
  const lineCount = text.split('\n').length

  // Width calculation based on character count (approx 8px per character + margins)
  const estimatedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.min(charCount * 8, MAX_WIDTH - 48) + 48))

  // Height calculation based on line count and character count
  const charsPerLine = Math.floor((estimatedWidth - 48) / 8)
  const estimatedLines = Math.max(lineCount, Math.ceil(charCount / charsPerLine))
  const estimatedHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, estimatedLines * 22 + 48))

  return {
    width: Math.round(estimatedWidth),
    height: Math.round(estimatedHeight)
  }
}