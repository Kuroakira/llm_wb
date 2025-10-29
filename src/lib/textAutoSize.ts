/**
 * Text-based auto-sizing utilities for TextBox and StickyNote components
 * Calculates optimal height based on text content and existing element dimensions
 */

import type { CanvasElement } from '@/types'

export interface TextSizeConfig {
  fontSize: number
  fontFamily: string
  lineHeight: number
  padding: number
  minHeight: number
  maxHeight: number
  wrapWidth: number
}

export interface AutoSizeResult {
  shouldResize: boolean
  newHeight: number
  currentHeight: number
  textHeight: number
  lineCount: number
}

/**
 * Calculate text height using Canvas API for accurate measurement
 */
export function calculateTextHeight(
  text: string, 
  config: TextSizeConfig
): { height: number; lineCount: number } {
  if (!text || !text.trim()) {
    const emptyHeight = config.fontSize * config.lineHeight + config.padding * 2
    return { 
      height: Math.max(config.minHeight, emptyHeight),
      lineCount: 1 
    }
  }

  // Use Canvas for accurate text measurement
  let canvas: HTMLCanvasElement | null = null
  let context: CanvasRenderingContext2D | null = null
  
  // Check if we're in a browser environment
  if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas')
    context = canvas.getContext('2d')
  }
  
  if (!context) {
    // Fallback to character-based estimation
    const lines = text.split('\n')
    const estimatedLineCount = Math.max(1, lines.length)
    const height = (estimatedLineCount * config.fontSize * config.lineHeight) + (config.padding * 2)
    const finalHeight = Math.min(config.maxHeight, Math.max(config.minHeight, height))
    return { 
      height: finalHeight,
      lineCount: estimatedLineCount 
    }
  }

  context.font = `${config.fontSize}px ${config.fontFamily}`
  
  const lines = text.split('\n')
  let totalLineCount = 0
  const availableWidth = config.wrapWidth - (config.padding * 2)

  for (const line of lines) {
    if (line.trim() === '') {
      totalLineCount += 1
      continue
    }

    // Check if line needs wrapping
    const lineWidth = context.measureText(line).width
    if (lineWidth <= availableWidth) {
      totalLineCount += 1
    } else {
      // Calculate word wrapping with improved logic for large text
      const words = line.split(' ')
      let currentLineWidth = 0
      let wrappedLines = 1

      for (const word of words) {
        const wordWidth = context.measureText(word).width
        const spaceWidth = context.measureText(' ').width
        
        // Check if adding this word would exceed the available width
        if (currentLineWidth > 0 && currentLineWidth + spaceWidth + wordWidth > availableWidth) {
          wrappedLines += 1
          currentLineWidth = wordWidth
        } else {
          currentLineWidth += (currentLineWidth > 0 ? spaceWidth : 0) + wordWidth
        }
      }
      totalLineCount += wrappedLines
    }
  }

  const textHeight = totalLineCount * config.fontSize * config.lineHeight
  const totalHeight = textHeight + (config.padding * 2)
  const finalHeight = Math.min(config.maxHeight, Math.max(config.minHeight, totalHeight))
  
  return {
    height: finalHeight,
    lineCount: totalLineCount
  }
}

/**
 * Determine if element should be auto-resized and calculate new height
 */
export function calculateAutoResize(
  element: CanvasElement,
  text: string,
  config: TextSizeConfig
): AutoSizeResult {
  const { height: optimalHeight, lineCount } = calculateTextHeight(text, config)
  const currentHeight = element.height
  
  // Determine if resize is needed - use smaller threshold for better accuracy with large text
  const heightDifference = Math.abs(optimalHeight - currentHeight)
  const shouldResize = heightDifference > 5 // Reduced from 10px to 5px for better accuracy
  
  return {
    shouldResize,
    newHeight: optimalHeight,
    currentHeight,
    textHeight: optimalHeight - (config.padding * 2),
    lineCount
  }
}

/**
 * Get text size configuration for StickyNote elements
 */
export function getStickyNoteConfig(element: CanvasElement, zoom: number = 1): TextSizeConfig {
  return {
    fontSize: 14 * zoom,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: 1.5,
    padding: 12 * zoom,
    minHeight: 50 * zoom,
    maxHeight: 2000 * zoom, // Increased from 600 to 2000 to accommodate large text content
    wrapWidth: element.width
  }
}

/**
 * Get text size configuration for TextBox elements
 */
export function getTextBoxConfig(element: CanvasElement, zoom: number = 1): TextSizeConfig {
  const fontSize = element.type === 'text' ? (element as any).fontSize || 16 : 16
  
  return {
    fontSize: fontSize * zoom,
    fontFamily: element.type === 'text' ? (element as any).fontFamily || 'Arial' : 'Arial',
    lineHeight: 1.4,
    padding: 4 * zoom,
    minHeight: 30 * zoom,
    maxHeight: 1800 * zoom, // Increased from 500 to 1800 to accommodate large text content
    wrapWidth: element.width
  }
}

/**
 * Debounced auto-resize function for text editing
 */
export function createDebouncedAutoResize(
  updateElement: (id: string, updates: Partial<CanvasElement>) => void,
  delay: number = 300
) {
  const timeouts = new Map<string, NodeJS.Timeout>()

  return function autoResizeElement(
    elementId: string,
    element: CanvasElement,
    text: string,
    zoom: number = 1
  ) {
    // Clear existing timeout for this element
    const existingTimeout = timeouts.get(elementId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      let config: TextSizeConfig

      // Get appropriate config based on element type
      if (element.type === 'sticky') {
        config = getStickyNoteConfig(element, zoom)
      } else if (element.type === 'text') {
        config = getTextBoxConfig(element, zoom)
      } else {
        return // Not a text-based element
      }

      const autoSizeResult = calculateAutoResize(element, text, config)
      
      if (autoSizeResult.shouldResize) {
        updateElement(elementId, {
          height: autoSizeResult.newHeight
        })
      }

      // Clean up timeout reference
      timeouts.delete(elementId)
    }, delay)

    timeouts.set(elementId, timeout)
  }
}

/**
 * Immediate auto-resize for scenarios where debouncing is not needed
 */
export function autoResizeElement(
  elementId: string,
  element: CanvasElement,
  text: string,
  updateElement: (id: string, updates: Partial<CanvasElement>) => void,
  zoom: number = 1
): boolean {
  let config: TextSizeConfig

  // Get appropriate config based on element type
  if (element.type === 'sticky') {
    config = getStickyNoteConfig(element, zoom)
  } else if (element.type === 'text') {
    config = getTextBoxConfig(element, zoom)
  } else {
    return false // Not a text-based element
  }

  const autoSizeResult = calculateAutoResize(element, text, config)
  
  if (autoSizeResult.shouldResize) {
    updateElement(elementId, {
      height: autoSizeResult.newHeight
    })
    return true
  }

  return false
}