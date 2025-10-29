/**
 * Konva-based text measurement for accurate auto-sizing
 * Uses the same measurement system as actual Konva Text rendering
 */

import Konva from 'konva'
import type { CanvasElement, TextElement, StickyElement } from '@/types'
import { TYPOGRAPHY_TOKENS, TEXT_SPACING, getResponsiveFontSize } from '@/design-system/typography'

let measurementStage: any = null
let measurementLayer: any = null

/**
 * Initialize or get the measurement stage for Konva text measurement
 */
function getMeasurementStage() {
  if (!measurementStage) {
    // Create an offscreen stage for measurement
    measurementStage = new Konva.Stage({
      container: document.createElement('div'),
      width: 2000,
      height: 2000,
      visible: false
    })
    measurementLayer = new Konva.Layer()
    measurementStage.add(measurementLayer)
  }
  return { stage: measurementStage, layer: measurementLayer }
}

/**
 * Configuration for Konva text measurement matching actual rendering
 */
export interface KonvaTextConfig {
  fontSize: number
  fontFamily: string
  lineHeight: number
  padding: number
  wrapWidth: number
  wrap: string
  textAlign?: string
  verticalAlign?: string
}

/**
 * Get Konva text configuration for StickyNote elements
 */
export function getStickyNoteKonvaConfig(element: CanvasElement, zoom: number = 1): KonvaTextConfig {
  return {
    fontSize: parseInt(getResponsiveFontSize(TYPOGRAPHY_TOKENS.fontSize.base, zoom)), // 14 * zoom
    fontFamily: TYPOGRAPHY_TOKENS.fontFamily.primary, // system-ui, -apple-system, sans-serif
    lineHeight: parseFloat(TYPOGRAPHY_TOKENS.lineHeight.normal.toString()), // 1.5
    padding: parseInt(TEXT_SPACING.padding.md), // 12px
    wrapWidth: element.width - (parseInt(TEXT_SPACING.padding.md) * 2), // width - 24px
    wrap: 'word',
    textAlign: (element as StickyElement).textAlign || 'left',
    verticalAlign: (element as StickyElement).verticalAlign || 'top'
  }
}

/**
 * Get Konva text configuration for TextBox elements
 */
export function getTextBoxKonvaConfig(element: CanvasElement, zoom: number = 1): KonvaTextConfig {
  const textElement = element as TextElement
  return {
    fontSize: textElement.fontSize || 16,
    fontFamily: textElement.fontFamily || 'Arial',
    lineHeight: 1, // TextBox doesn't specify lineHeight, defaults to 1
    padding: 4, // TextBox uses 4px padding
    wrapWidth: element.width - 8, // width - padding * 2
    wrap: 'none', // TextBox doesn't wrap by default
    textAlign: textElement.textAlign || 'left',
    verticalAlign: textElement.verticalAlign || 'top'
  }
}

/**
 * Measure text using Konva's actual text measurement system
 */
export function measureTextWithKonva(text: string, config: KonvaTextConfig): { width: number; height: number; lineCount: number } {
  if (!text || !text.trim()) {
    const emptyHeight = config.fontSize * config.lineHeight + config.padding * 2
    return {
      width: config.padding * 2,
      height: emptyHeight,
      lineCount: 1
    }
  }

  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    // Fallback for non-browser environments - estimate line wrapping
    const lines = text.split('\n')
    let totalLineCount = 0
    
    // Estimate line wrapping for each line
    for (const line of lines) {
      if (line.trim() === '') {
        totalLineCount += 1
      } else {
        // Estimate character width based on font size
        const avgCharWidth = config.fontSize * 0.6
        const charactersPerLine = Math.floor(config.wrapWidth / avgCharWidth)
        const wrappedLines = Math.ceil(line.length / charactersPerLine)
        totalLineCount += Math.max(1, wrappedLines)
      }
    }
    
    const lineCount = Math.max(1, totalLineCount)
    const estimatedHeight = (lineCount * config.fontSize * config.lineHeight) + (config.padding * 2)
    const estimatedWidth = Math.min(config.wrapWidth, Math.max(200, text.length * config.fontSize * 0.6)) + (config.padding * 2)
    
    return {
      width: estimatedWidth,
      height: estimatedHeight,
      lineCount
    }
  }

  try {
    const { stage, layer } = getMeasurementStage()

    // Create a Konva Text object with the same configuration as the actual rendered text
    const konvaText = new Konva.Text({
      text,
      fontSize: config.fontSize,
      fontFamily: config.fontFamily,
      lineHeight: config.lineHeight,
      width: config.wrapWidth,
      wrap: config.wrap as any,
      align: config.textAlign as any,
      verticalAlign: config.verticalAlign as any,
      padding: 0 // We'll add padding separately
    })

    // Add to layer for measurement (required for accurate measurement)
    layer.add(konvaText)

    // Get the measured dimensions
    const textWidth = konvaText.width()
    const textHeight = konvaText.height()
    
    // Calculate line count based on text height and line spacing
    const singleLineHeight = config.fontSize * config.lineHeight
    const lineCount = Math.max(1, Math.round(textHeight / singleLineHeight))

    // Clean up
    konvaText.destroy()

    return {
      width: textWidth + (config.padding * 2),
      height: textHeight + (config.padding * 2),
      lineCount
    }
  } catch (error) {
    console.warn('Konva text measurement failed, using fallback:', error)
    
    // Fallback to line wrapping estimation
    const lines = text.split('\n')
    let totalLineCount = 0
    
    // Estimate line wrapping for each line
    for (const line of lines) {
      if (line.trim() === '') {
        totalLineCount += 1
      } else {
        // Estimate character width based on font size
        const avgCharWidth = config.fontSize * 0.6
        const charactersPerLine = Math.floor(config.wrapWidth / avgCharWidth)
        const wrappedLines = Math.ceil(line.length / charactersPerLine)
        totalLineCount += Math.max(1, wrappedLines)
      }
    }
    
    const lineCount = Math.max(1, totalLineCount)
    const estimatedHeight = (lineCount * config.fontSize * config.lineHeight) + (config.padding * 2)
    const estimatedWidth = Math.min(config.wrapWidth, Math.max(200, text.length * config.fontSize * 0.6)) + (config.padding * 2)
    
    return {
      width: estimatedWidth,
      height: estimatedHeight,
      lineCount
    }
  }
}

/**
 * Calculate optimal height for an element using Konva measurement
 */
export function calculateKonvaOptimalHeight(
  element: CanvasElement, 
  text: string, 
  zoom: number = 1,
  maxHeight: number = 2000
): { shouldResize: boolean; newHeight: number; currentHeight: number; lineCount: number } {
  let config: KonvaTextConfig

  // Get appropriate config based on element type
  if (element.type === 'sticky') {
    config = getStickyNoteKonvaConfig(element, zoom)
  } else if (element.type === 'text') {
    config = getTextBoxKonvaConfig(element, zoom)
  } else {
    return {
      shouldResize: false,
      newHeight: element.height,
      currentHeight: element.height,
      lineCount: 1
    }
  }

  // Measure using Konva
  const measurement = measureTextWithKonva(text, config)
  
  // Apply max height constraint
  const optimalHeight = Math.min(maxHeight * zoom, measurement.height)
  const heightDifference = Math.abs(optimalHeight - element.height)
  
  return {
    shouldResize: heightDifference > 5, // 5px threshold
    newHeight: optimalHeight,
    currentHeight: element.height,
    lineCount: measurement.lineCount
  }
}

/**
 * Cleanup function for measurement resources
 */
export function cleanupMeasurementStage() {
  if (measurementStage) {
    measurementStage.destroy()
    measurementStage = null
    measurementLayer = null
  }
}