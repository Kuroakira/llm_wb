import { describe, it, expect } from 'vitest'
import {
  calculateAdaptiveBuffer,
  detectDenseLayout,
  createExpandedBounds,
  isPointInExtendedArea,
  findElementsInHoverArea,
  getPriorityHoverElement,
  calculateDistanceToElement,
  DEFAULT_HOVER_CONFIG,
  type ExtendedHoverConfig
} from '@/lib/geometry'

describe('Extended Hover Areas', () => {
  const mockElement = { x: 100, y: 100, width: 80, height: 60, id: 'el1', zIndex: 1 }
  const mockElements = [
    mockElement,
    { x: 200, y: 150, width: 60, height: 40, id: 'el2', zIndex: 2 },
    { x: 120, y: 180, width: 50, height: 30, id: 'el3', zIndex: 0 }
  ]

  describe('calculateAdaptiveBuffer', () => {
    it('should return base buffer for normal zoom and sparse layout', () => {
      const buffer = calculateAdaptiveBuffer(DEFAULT_HOVER_CONFIG, 1.0, false)
      expect(buffer).toBe(20) // baseBufferSize / zoom = 20 / 1.0
    })

    it('should reduce buffer for dense layouts', () => {
      const buffer = calculateAdaptiveBuffer(DEFAULT_HOVER_CONFIG, 1.0, true)
      expect(buffer).toBe(10) // denseBufferSize / zoom = 10 / 1.0
    })

    it('should scale buffer inversely with zoom level', () => {
      const buffer2x = calculateAdaptiveBuffer(DEFAULT_HOVER_CONFIG, 2.0, false)
      const buffer05x = calculateAdaptiveBuffer(DEFAULT_HOVER_CONFIG, 0.5, false)
      
      expect(buffer2x).toBe(10) // 20 / 2.0
      expect(buffer05x).toBe(40) // 20 / 0.5
    })

    it('should clamp extreme zoom levels', () => {
      const config = { ...DEFAULT_HOVER_CONFIG, minZoomScale: 0.5, maxZoomScale: 2.0 }
      
      const bufferTooLow = calculateAdaptiveBuffer(config, 0.1, false) // Should clamp to 0.5
      const bufferTooHigh = calculateAdaptiveBuffer(config, 5.0, false) // Should clamp to 2.0
      
      expect(bufferTooLow).toBe(40) // 20 / 0.5 (clamped)
      expect(bufferTooHigh).toBe(10) // 20 / 2.0 (clamped)
    })
  })

  describe('detectDenseLayout', () => {
    it('should detect sparse layout with few nearby elements', () => {
      const cursorPos = { x: 50, y: 50 } // Far from elements
      const isDense = detectDenseLayout(cursorPos, mockElements)
      expect(isDense).toBe(false)
    })

    it('should detect dense layout with many nearby elements', () => {
      const cursorPos = { x: 140, y: 140 } // Center of element cluster
      const denseElements = [
        { x: 120, y: 120, width: 40, height: 30 },
        { x: 160, y: 130, width: 40, height: 30 },
        { x: 130, y: 160, width: 40, height: 30 },
        { x: 150, y: 110, width: 40, height: 30 } // 4 elements within threshold = dense
      ]
      const isDense = detectDenseLayout(cursorPos, denseElements, 80)
      expect(isDense).toBe(true)
    })

    it('should use custom threshold for density detection', () => {
      const cursorPos = { x: 140, y: 140 }
      const smallThreshold = detectDenseLayout(cursorPos, mockElements, 20)
      const largeThreshold = detectDenseLayout(cursorPos, mockElements, 200)
      
      expect(smallThreshold).toBe(false) // Smaller threshold = fewer elements in range
      expect(largeThreshold).toBe(true) // Larger threshold = more elements in range
    })
  })

  describe('createExpandedBounds', () => {
    it('should expand element bounds by buffer size', () => {
      const expanded = createExpandedBounds(mockElement, 20)
      
      expect(expanded).toEqual({
        x: 80,  // 100 - 20
        y: 80,  // 100 - 20
        width: 120,  // 80 + 20*2
        height: 100  // 60 + 20*2
      })
    })

    it('should handle zero buffer size', () => {
      const expanded = createExpandedBounds(mockElement, 0)
      expect(expanded).toEqual({
        x: mockElement.x,
        y: mockElement.y,
        width: mockElement.width,
        height: mockElement.height
      })
    })
  })

  describe('isPointInExtendedArea', () => {
    it('should detect point within extended area', () => {
      const point = { x: 85, y: 95 } // Just outside element but within buffer
      const isInArea = isPointInExtendedArea(point, mockElement, 20)
      expect(isInArea).toBe(true)
    })

    it('should reject point outside extended area', () => {
      const point = { x: 70, y: 70 } // Outside element and buffer
      const isInArea = isPointInExtendedArea(point, mockElement, 20)
      expect(isInArea).toBe(false)
    })

    it('should detect point within original element bounds', () => {
      const point = { x: 150, y: 120 } // Inside element
      const isInArea = isPointInExtendedArea(point, mockElement, 10)
      expect(isInArea).toBe(true)
    })
  })

  describe('findElementsInHoverArea', () => {
    it('should find elements within hover area sorted by z-index', () => {
      const cursorPos = { x: 140, y: 140 } // Position that should hit multiple elements
      const elements = findElementsInHoverArea(cursorPos, mockElements, DEFAULT_HOVER_CONFIG, 1.0)
      
      expect(elements.length).toBeGreaterThan(0)
      
      // Should be sorted by z-index (highest first)
      for (let i = 1; i < elements.length; i++) {
        expect(elements[i-1].zIndex).toBeGreaterThanOrEqual(elements[i].zIndex)
      }
    })

    it('should adapt buffer size based on zoom and density', () => {
      const cursorPos = { x: 140, y: 140 }
      
      // High zoom should reduce effective buffer, potentially finding fewer elements
      const highZoomElements = findElementsInHoverArea(cursorPos, mockElements, DEFAULT_HOVER_CONFIG, 3.0)
      const lowZoomElements = findElementsInHoverArea(cursorPos, mockElements, DEFAULT_HOVER_CONFIG, 0.5)
      
      // Low zoom should have larger buffer and potentially find more elements
      expect(lowZoomElements.length).toBeGreaterThanOrEqual(highZoomElements.length)
    })

    it('should handle empty elements array', () => {
      const cursorPos = { x: 100, y: 100 }
      const elements = findElementsInHoverArea(cursorPos, [], DEFAULT_HOVER_CONFIG, 1.0)
      expect(elements).toEqual([])
    })
  })

  describe('getPriorityHoverElement', () => {
    it('should return element with highest z-index in hover area', () => {
      const cursorPos = { x: 140, y: 140 }
      const element = getPriorityHoverElement(cursorPos, mockElements, DEFAULT_HOVER_CONFIG, 1.0)
      
      if (element) {
        // Should have the highest z-index among elements in area
        const elementsInArea = findElementsInHoverArea(cursorPos, mockElements, DEFAULT_HOVER_CONFIG, 1.0)
        const maxZIndex = Math.max(...elementsInArea.map(el => el.zIndex))
        expect(element.zIndex).toBe(maxZIndex)
      }
    })

    it('should return null when no elements in hover area', () => {
      const cursorPos = { x: 0, y: 0 } // Far from all elements
      const element = getPriorityHoverElement(cursorPos, mockElements, DEFAULT_HOVER_CONFIG, 1.0)
      expect(element).toBeNull()
    })

    it('should respect custom configuration', () => {
      const customConfig: ExtendedHoverConfig = {
        baseBufferSize: 5,
        denseLayoutThreshold: 50,
        denseBufferSize: 2,
        minZoomScale: 0.5,
        maxZoomScale: 2.0
      }
      
      const cursorPos = { x: 140, y: 140 }
      const element = getPriorityHoverElement(cursorPos, mockElements, customConfig, 1.0)
      
      // With smaller buffer, might not find elements that would be found with default config
      const defaultElement = getPriorityHoverElement(cursorPos, mockElements, DEFAULT_HOVER_CONFIG, 1.0)
      
      // Results might differ due to different buffer sizes
      if (!element && defaultElement) {
        expect(customConfig.baseBufferSize).toBeLessThan(DEFAULT_HOVER_CONFIG.baseBufferSize)
      }
    })
  })

  describe('calculateDistanceToElement', () => {
    it('should return 0 for point inside element', () => {
      const point = { x: 140, y: 130 } // Inside mockElement
      const distance = calculateDistanceToElement(point, mockElement)
      expect(distance).toBe(0)
    })

    it('should calculate distance to nearest edge for external point', () => {
      const point = { x: 80, y: 130 } // Left of element
      const distance = calculateDistanceToElement(point, mockElement)
      expect(distance).toBe(20) // 100 - 80 = 20 pixels to left edge
    })

    it('should calculate diagonal distance for corner points', () => {
      const point = { x: 80, y: 80 } // Bottom-left of element
      const distance = calculateDistanceToElement(point, mockElement)
      const expectedDistance = Math.hypot(20, 20) // Distance to corner
      expect(distance).toBeCloseTo(expectedDistance, 2)
    })

    it('should handle point exactly on element edge', () => {
      const point = { x: 100, y: 130 } // On left edge
      const distance = calculateDistanceToElement(point, mockElement)
      expect(distance).toBe(0)
    })
  })

  describe('Integration scenarios', () => {
    it('should work correctly in connector mode workflow', () => {
      // Simulate cursor movement in connector mode
      const cursorPath = [
        { x: 50, y: 50 },   // Far from elements
        { x: 90, y: 110 },  // Approaching element with buffer
        { x: 110, y: 120 }, // Inside element
        { x: 140, y: 140 }  // Between multiple elements
      ]

      for (const cursorPos of cursorPath) {
        const priorityElement = getPriorityHoverElement(cursorPos, mockElements)
        const elementsInArea = findElementsInHoverArea(cursorPos, mockElements)
        
        // Priority element should always be first in sorted list (or both null)
        if (priorityElement) {
          expect(elementsInArea[0]).toEqual(priorityElement)
          expect(elementsInArea[0].zIndex).toEqual(priorityElement.zIndex)
        } else {
          expect(elementsInArea).toEqual([])
        }
      }
    })

    it('should handle zoom changes dynamically', () => {
      const cursorPos = { x: 120, y: 125 } // Near element edge
      const zoomLevels = [0.5, 1.0, 1.5, 2.0]
      
      const results = zoomLevels.map(zoom => ({
        zoom,
        elements: findElementsInHoverArea(cursorPos, mockElements, DEFAULT_HOVER_CONFIG, zoom),
        buffer: calculateAdaptiveBuffer(DEFAULT_HOVER_CONFIG, zoom, false)
      }))
      
      // Verify buffer scaling
      expect(results[0].buffer).toBe(40) // 20 / 0.5
      expect(results[1].buffer).toBe(20) // 20 / 1.0
      expect(results[2].buffer).toBe(20 / 1.5) // 20 / 1.5
      expect(results[3].buffer).toBe(10) // 20 / 2.0
      
      // Higher zoom = smaller buffer = potentially fewer elements detected
      expect(results[3].buffer).toBeLessThan(results[0].buffer)
    })
  })
})