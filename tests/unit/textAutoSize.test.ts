import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  calculateTextHeight, 
  calculateAutoResize, 
  getStickyNoteConfig, 
  getTextBoxConfig, 
  autoResizeElement 
} from '@/lib/textAutoSize'
import type { StickyElement, TextElement } from '@/types'

// Mock Canvas API
beforeEach(() => {
  global.document = {
    createElement: vi.fn(() => ({
      getContext: vi.fn(() => ({
        font: '',
        measureText: vi.fn((text: string) => ({
          width: text.length * 8 // Mock 8px per character
        }))
      }))
    }))
  } as any
})

describe('textAutoSize utilities', () => {
  describe('calculateTextHeight', () => {
    it('should calculate height for single line text', () => {
      const config = {
        fontSize: 14,
        fontFamily: 'Arial',
        lineHeight: 1.5,
        padding: 12,
        minHeight: 50,
        maxHeight: 600,
        wrapWidth: 200
      }

      const result = calculateTextHeight('Hello World', config)
      
      expect(result.lineCount).toBe(1)
      expect(result.height).toBeGreaterThanOrEqual(config.minHeight)
      expect(result.height).toBeLessThanOrEqual(config.maxHeight)
    })

    it('should calculate height for multi-line text', () => {
      const config = {
        fontSize: 14,
        fontFamily: 'Arial',
        lineHeight: 1.5,
        padding: 12,
        minHeight: 50,
        maxHeight: 600,
        wrapWidth: 200
      }

      const multiLineText = 'Line 1\nLine 2\nLine 3'
      const result = calculateTextHeight(multiLineText, config)
      
      expect(result.lineCount).toBe(3)
      expect(result.height).toBeGreaterThan(config.minHeight)
    })

    it('should handle empty text', () => {
      const config = {
        fontSize: 14,
        fontFamily: 'Arial',
        lineHeight: 1.5,
        padding: 12,
        minHeight: 50,
        maxHeight: 600,
        wrapWidth: 200
      }

      const result = calculateTextHeight('', config)
      
      expect(result.lineCount).toBe(1)
      expect(result.height).toBeGreaterThanOrEqual(config.minHeight)
    })
  })

  describe('calculateAutoResize', () => {
    it('should suggest resize when text height differs significantly', () => {
      const element: StickyElement = {
        id: 'test-1',
        type: 'sticky',
        x: 0,
        y: 0,
        width: 200,
        height: 50, // Too small for the text
        text: 'This is a very long text that should require more height than 50 pixels',
        color: '#FFF2B2',
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const config = getStickyNoteConfig(element)
      const result = calculateAutoResize(element, element.text, config)

      expect(result.shouldResize).toBe(true)
      expect(result.newHeight).toBeGreaterThan(element.height)
    })

    it('should not suggest resize when height is appropriate', () => {
      const element: StickyElement = {
        id: 'test-2',
        type: 'sticky',
        x: 0,
        y: 0,
        width: 200,
        height: 50, // Very close to optimal for short text with 5px threshold
        text: 'Hi',
        color: '#FFF2B2',
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const config = getStickyNoteConfig(element)
      const result = calculateAutoResize(element, element.text, config)

      // With the 5px threshold, small differences shouldn't trigger resize
      expect(result.shouldResize).toBe(false)
    })
  })

  describe('autoResizeElement', () => {
    it('should update element height when resize is needed', () => {
      const element: StickyElement = {
        id: 'test-3',
        type: 'sticky',
        x: 0,
        y: 0,
        width: 200,
        height: 50,
        text: 'Very long text that needs multiple lines and should trigger a height adjustment for proper display',
        color: '#FFF2B2',
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const mockUpdateElement = vi.fn()
      const result = autoResizeElement('test-3', element, element.text, mockUpdateElement, 1)

      expect(result).toBe(true)
      expect(mockUpdateElement).toHaveBeenCalledWith('test-3', {
        height: expect.any(Number)
      })
    })

    it('should not update element height when resize is not needed', () => {
      const element: TextElement = {
        id: 'test-4',
        type: 'text',
        x: 0,
        y: 0,
        width: 200,
        height: 35, // Very close to optimal for short text
        text: 'Hi',
        fontSize: 16,
        fontFamily: 'Arial',
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const mockUpdateElement = vi.fn()
      const result = autoResizeElement('test-4', element, element.text, mockUpdateElement, 1)

      expect(result).toBe(false)
      expect(mockUpdateElement).not.toHaveBeenCalled()
    })

    it('should return false for non-text elements', () => {
      const element = {
        id: 'test-5',
        type: 'rect',
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 1,
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      } as any

      const mockUpdateElement = vi.fn()
      const result = autoResizeElement('test-5', element, 'some text', mockUpdateElement, 1)

      expect(result).toBe(false)
      expect(mockUpdateElement).not.toHaveBeenCalled()
    })
  })

  describe('configuration functions', () => {
    it('should return correct config for sticky notes', () => {
      const element: StickyElement = {
        id: 'test-sticky',
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

      const config = getStickyNoteConfig(element, 1.5)

      expect(config.fontSize).toBe(14 * 1.5)
      expect(config.padding).toBe(12 * 1.5)
      expect(config.wrapWidth).toBe(element.width)
      expect(config.lineHeight).toBe(1.5)
    })

    it('should return correct config for text elements', () => {
      const element: TextElement = {
        id: 'test-text',
        type: 'text',
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        text: 'Test',
        fontSize: 20,
        fontFamily: 'Helvetica',
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const config = getTextBoxConfig(element, 2.0)

      expect(config.fontSize).toBe(20 * 2.0)
      expect(config.fontFamily).toBe('Helvetica')
      expect(config.padding).toBe(4 * 2.0)
      expect(config.wrapWidth).toBe(element.width)
      expect(config.lineHeight).toBe(1.4)
    })
  })
})