/**
 * Tests for Konva-based text measurement system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  getStickyNoteKonvaConfig, 
  getTextBoxKonvaConfig, 
  measureTextWithKonva, 
  calculateKonvaOptimalHeight,
  cleanupMeasurementStage
} from '@/lib/konvaTextMeasurement'
import type { StickyElement, TextElement } from '@/types'

// Mock DOM for Konva
Object.defineProperty(window, 'document', {
  value: {
    createElement: vi.fn(() => ({
      style: {},
      appendChild: vi.fn(),
      removeChild: vi.fn()
    }))
  }
})

describe('Konva Text Measurement', () => {
  afterEach(() => {
    cleanupMeasurementStage()
  })

  describe('getStickyNoteKonvaConfig', () => {
    it('should return correct config for sticky note', () => {
      const element: StickyElement = {
        id: 'test-1',
        type: 'sticky',
        x: 0,
        y: 0,
        width: 200,
        height: 150,
        text: 'Test',
        color: '#FFF2B2',
        textAlign: 'left',
        verticalAlign: 'middle',
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const config = getStickyNoteKonvaConfig(element, 1)
      
      expect(config.fontSize).toBe(16) // getResponsiveFontSize returns 16 for base font
      expect(config.fontFamily).toContain('system-ui') // Font family includes system-ui
      expect(config.lineHeight).toBe(1.5)
      expect(config.padding).toBe(12)
      expect(config.wrapWidth).toBe(176) // 200 - 24
      expect(config.wrap).toBe('word')
      expect(config.textAlign).toBe('left')
      expect(config.verticalAlign).toBe('middle')
    })

    it('should scale with zoom level', () => {
      const element: StickyElement = {
        id: 'test-2',
        type: 'sticky',
        x: 0,
        y: 0,
        width: 200,
        height: 150,
        text: 'Test',
        color: '#FFF2B2',
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const config = getStickyNoteKonvaConfig(element, 2) // 2x zoom
      
      expect(config.fontSize).toBe(32) // 16 * zoom(2)
    })
  })

  describe('getTextBoxKonvaConfig', () => {
    it('should return correct config for text box', () => {
      const element: TextElement = {
        id: 'test-3',
        type: 'text',
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        text: 'Test text',
        fontSize: 16,
        fontFamily: 'Arial',
        textAlign: 'center',
        verticalAlign: 'middle',
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const config = getTextBoxKonvaConfig(element, 1)
      
      expect(config.fontSize).toBe(16)
      expect(config.fontFamily).toBe('Arial')
      expect(config.lineHeight).toBe(1) // TextBox default
      expect(config.padding).toBe(4) // TextBox padding
      expect(config.wrapWidth).toBe(192) // 200 - 8
      expect(config.wrap).toBe('none') // TextBox default
    })
  })

  describe('measureTextWithKonva', () => {
    it('should handle empty text', () => {
      const config = {
        fontSize: 14,
        fontFamily: 'Arial',
        lineHeight: 1.5,
        padding: 12,
        wrapWidth: 176,
        wrap: 'word'
      }

      const result = measureTextWithKonva('', config)
      
      expect(result.width).toBe(24) // padding * 2
      expect(result.height).toBe(45) // (fontSize * lineHeight) + (padding * 2)
      expect(result.lineCount).toBe(1)
    })

    it('should measure single line text', () => {
      const config = {
        fontSize: 14,
        fontFamily: 'Arial',
        lineHeight: 1.5,
        padding: 12,
        wrapWidth: 176,
        wrap: 'word'
      }

      const result = measureTextWithKonva('Hello World', config)
      
      expect(result.width).toBeGreaterThan(24) // Greater than padding
      expect(result.height).toBeGreaterThan(24) // Greater than padding
      expect(result.lineCount).toBeGreaterThan(0)
    })

    it('should measure multi-line text', () => {
      const config = {
        fontSize: 14,
        fontFamily: 'Arial',
        lineHeight: 1.5,
        padding: 12,
        wrapWidth: 176,
        wrap: 'word'
      }

      const multiLineText = 'Line 1\nLine 2\nLine 3'
      const result = measureTextWithKonva(multiLineText, config)
      
      expect(result.lineCount).toBeGreaterThanOrEqual(3)
      expect(result.height).toBeGreaterThan(50) // Should be taller for multiple lines
    })
  })

  describe('calculateKonvaOptimalHeight', () => {
    it('should calculate optimal height for sticky note', () => {
      const element: StickyElement = {
        id: 'test-4',
        type: 'sticky',
        x: 0,
        y: 0,
        width: 200,
        height: 20, // Very small height that definitely needs expansion
        text: 'This is a longer text that should require more height to display properly and needs multiple lines',
        color: '#FFF2B2',
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const result = calculateKonvaOptimalHeight(element, element.text, 1, 2000)
      
      expect(result.shouldResize).toBe(true)
      expect(result.newHeight).toBeGreaterThan(20)
      expect(result.currentHeight).toBe(20)
      expect(result.lineCount).toBeGreaterThan(1)
    })

    it('should not resize when height is appropriate', () => {
      const element: StickyElement = {
        id: 'test-5',
        type: 'sticky',
        x: 0,
        y: 0,
        width: 200,
        height: 50, // Height close to calculated height for short text
        text: 'Hi',
        color: '#FFF2B2',
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const result = calculateKonvaOptimalHeight(element, element.text, 1, 2000)
      
      // Should not resize for short text with adequate height (within 5px threshold)
      expect(result.shouldResize).toBe(false)
    })

    it('should respect max height constraint', () => {
      const element: StickyElement = {
        id: 'test-6',
        type: 'sticky',
        x: 0,
        y: 0,
        width: 200,
        height: 50,
        text: 'Very long text that would normally require much more height than the maximum allowed. '.repeat(20),
        color: '#FFF2B2',
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const maxHeight = 300
      const result = calculateKonvaOptimalHeight(element, element.text, 1, maxHeight)
      
      expect(result.newHeight).toBeLessThanOrEqual(maxHeight)
    })

    it('should handle non-text elements gracefully', () => {
      const element = {
        id: 'test-7',
        type: 'rect', // Not a text element
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      } as any

      const result = calculateKonvaOptimalHeight(element, '', 1, 2000)
      
      expect(result.shouldResize).toBe(false)
      expect(result.newHeight).toBe(100)
    })
  })
})