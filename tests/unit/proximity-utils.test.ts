import { describe, it, expect, beforeEach } from 'vitest'
import {
  getAnchorCoordinates,
  calculateDistance,
  getProximityLevel,
  calculateElementAnchorProximities,
  shouldShowConnectionPoints,
  getZoomAwareThresholds,
  DEFAULT_PROXIMITY_THRESHOLDS,
  type ElementBounds,
  type ProximityThresholds
} from '@/lib/proximity-utils'

describe('proximity-utils', () => {
  let testElement: ElementBounds
  let testElements: ElementBounds[]
  
  beforeEach(() => {
    testElement = {
      id: 'test-1',
      x: 100,
      y: 100,
      width: 200,
      height: 150
    }
    
    testElements = [
      testElement,
      {
        id: 'test-2',
        x: 400,
        y: 100,
        width: 200,
        height: 150
      }
    ]
  })

  describe('getAnchorCoordinates', () => {
    it('should calculate correct anchor coordinates', () => {
      const coords = {
        top: getAnchorCoordinates(testElement, 'top'),
        right: getAnchorCoordinates(testElement, 'right'),
        bottom: getAnchorCoordinates(testElement, 'bottom'),
        left: getAnchorCoordinates(testElement, 'left')
      }

      expect(coords.top).toEqual({ x: 200, y: 100 }) // center-top
      expect(coords.right).toEqual({ x: 300, y: 175 }) // right-center
      expect(coords.bottom).toEqual({ x: 200, y: 250 }) // center-bottom
      expect(coords.left).toEqual({ x: 100, y: 175 }) // left-center
    })
  })

  describe('calculateDistance', () => {
    it('should calculate correct distance between two points', () => {
      const point1 = { x: 0, y: 0 }
      const point2 = { x: 3, y: 4 }
      
      expect(calculateDistance(point1, point2)).toBe(5) // 3-4-5 triangle
    })

    it('should handle identical points', () => {
      const point = { x: 100, y: 200 }
      expect(calculateDistance(point, point)).toBe(0)
    })
  })

  describe('getProximityLevel', () => {
    const thresholds: ProximityThresholds = {
      primary: 30,
      secondary: 60,
      maximum: 100
    }

    it('should return primary for close distances', () => {
      expect(getProximityLevel(25, thresholds)).toBe('primary')
      expect(getProximityLevel(30, thresholds)).toBe('primary')
    })

    it('should return secondary for medium distances', () => {
      expect(getProximityLevel(35, thresholds)).toBe('secondary')
      expect(getProximityLevel(60, thresholds)).toBe('secondary')
    })

    it('should return hidden for far distances', () => {
      expect(getProximityLevel(80, thresholds)).toBe('hidden')
      expect(getProximityLevel(150, thresholds)).toBe('hidden')
    })
  })

  describe('calculateElementAnchorProximities', () => {
    it('should calculate proximities for all anchor points', () => {
      const cursorPos = { x: 190, y: 90 } // Close to top anchor
      const proximities = calculateElementAnchorProximities(
        testElement, 
        cursorPos, 
        DEFAULT_PROXIMITY_THRESHOLDS
      )

      expect(proximities).toHaveLength(4) // top, right, bottom, left
      
      // Top anchor should be closest (distance ~14.14)
      const topProximity = proximities.find(p => p.anchor === 'top')
      expect(topProximity?.proximityLevel).toBe('primary')
      expect(topProximity?.distance).toBeLessThan(20)
      
      // Other anchors should be farther
      const bottomProximity = proximities.find(p => p.anchor === 'bottom')
      expect(bottomProximity?.distance).toBeGreaterThan(topProximity?.distance!)
    })

    it('should apply custom thresholds correctly', () => {
      const strictThresholds: ProximityThresholds = {
        primary: 10,
        secondary: 20,
        maximum: 30
      }
      
      const cursorPos = { x: 190, y: 90 } // ~14px from top anchor
      const proximities = calculateElementAnchorProximities(
        testElement,
        cursorPos,
        strictThresholds
      )
      
      const topProximity = proximities.find(p => p.anchor === 'top')
      expect(topProximity?.proximityLevel).toBe('secondary') // Too far for primary with strict thresholds
    })
  })

  describe('shouldShowConnectionPoints', () => {
    it('should show connection points when cursor is near element', () => {
      const nearCursor = { x: 180, y: 90 } // Close to top anchor
      
      expect(shouldShowConnectionPoints(
        'test-1', 
        testElements, 
        nearCursor, 
        DEFAULT_PROXIMITY_THRESHOLDS
      )).toBe(true)
    })

    it('should not show connection points when cursor is far from element', () => {
      const farCursor = { x: 500, y: 500 } // Far from both elements
      
      expect(shouldShowConnectionPoints(
        'test-1', 
        testElements, 
        farCursor, 
        DEFAULT_PROXIMITY_THRESHOLDS
      )).toBe(false)
    })

    it('should return false for non-existent element', () => {
      const cursor = { x: 200, y: 100 }
      
      expect(shouldShowConnectionPoints(
        'non-existent', 
        testElements, 
        cursor, 
        DEFAULT_PROXIMITY_THRESHOLDS
      )).toBe(false)
    })
  })

  describe('getZoomAwareThresholds', () => {
    it('should scale thresholds inversely with zoom', () => {
      const baseThresholds = DEFAULT_PROXIMITY_THRESHOLDS
      
      // Higher zoom = smaller thresholds (more precise)
      const zoomedIn = getZoomAwareThresholds(baseThresholds, 2.0)
      expect(zoomedIn.primary).toBe(baseThresholds.primary / 2)
      expect(zoomedIn.secondary).toBe(baseThresholds.secondary / 2)
      
      // Lower zoom = larger thresholds (more forgiving)
      const zoomedOut = getZoomAwareThresholds(baseThresholds, 0.5)
      expect(zoomedOut.primary).toBe(baseThresholds.primary / 0.5)
      expect(zoomedOut.secondary).toBe(baseThresholds.secondary / 0.5)
    })

    it('should clamp extreme zoom values', () => {
      const baseThresholds = DEFAULT_PROXIMITY_THRESHOLDS
      
      // Very high zoom should be clamped
      const extremeZoomIn = getZoomAwareThresholds(baseThresholds, 10.0, 0.5, 3.0)
      expect(extremeZoomIn.primary).toBe(baseThresholds.primary / 3.0) // Clamped to maxZoom
      
      // Very low zoom should be clamped  
      const extremeZoomOut = getZoomAwareThresholds(baseThresholds, 0.1, 0.5, 3.0)
      expect(extremeZoomOut.primary).toBe(baseThresholds.primary / 0.5) // Clamped to minZoom
    })
  })

  describe('integration tests', () => {
    it('should handle typical connector drag scenario', () => {
      // Simulate dragging from element 1 towards element 2
      const dragPath = [
        { x: 320, y: 175 }, // Near element 1 right anchor
        { x: 350, y: 175 }, // Moving towards element 2
        { x: 380, y: 175 }, // Getting closer to element 2
        { x: 390, y: 175 }  // Very close to element 2 left anchor
      ]
      
      dragPath.forEach((cursorPos, index) => {
        const element1Visible = shouldShowConnectionPoints(
          'test-1', 
          testElements, 
          cursorPos, 
          DEFAULT_PROXIMITY_THRESHOLDS
        )
        
        const element2Visible = shouldShowConnectionPoints(
          'test-2', 
          testElements, 
          cursorPos, 
          DEFAULT_PROXIMITY_THRESHOLDS
        )
        
        if (index === 0) {
          // Start: element 1 should be visible, element 2 might not be
          expect(element1Visible).toBe(true)
        } else if (index === dragPath.length - 1) {
          // End: element 2 should be visible, element 1 might not be
          expect(element2Visible).toBe(true)
        }
      })
    })

    it('should work correctly with different zoom levels', () => {
      const cursorPos = { x: 220, y: 120 } // Near element 1
      
      // At normal zoom
      const normalZoomThresholds = getZoomAwareThresholds(DEFAULT_PROXIMITY_THRESHOLDS, 1.0)
      const normalVisible = shouldShowConnectionPoints('test-1', testElements, cursorPos, normalZoomThresholds)
      
      // At high zoom (stricter thresholds)
      const highZoomThresholds = getZoomAwareThresholds(DEFAULT_PROXIMITY_THRESHOLDS, 2.0)
      const highZoomVisible = shouldShowConnectionPoints('test-1', testElements, cursorPos, highZoomThresholds)
      
      // At low zoom (more lenient thresholds)
      const lowZoomThresholds = getZoomAwareThresholds(DEFAULT_PROXIMITY_THRESHOLDS, 0.5)
      const lowZoomVisible = shouldShowConnectionPoints('test-1', testElements, cursorPos, lowZoomThresholds)
      
      // Low zoom should be most likely to show, high zoom least likely
      if (!normalVisible) {
        expect(highZoomVisible).toBe(false)
        expect(lowZoomVisible).toBe(true)
      }
    })
  })
})