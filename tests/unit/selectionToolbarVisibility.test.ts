import { describe, it, expect } from 'vitest'
import type { CanvasElement } from '@/types'

/**
 * Test the visibility logic for SelectionToolbar in CanvasStage
 * This mirrors the logic from CanvasStage.tsx line 394-398
 */
describe('SelectionToolbar Visibility Logic', () => {
  
  // Helper function that mirrors the logic in CanvasStage
  const shouldShowToolbar = (selectedElements: CanvasElement[], selectedTool: string) => {
    return selectedElements.length > 0 && 
           selectedTool === 'select' &&
           selectedElements.some(el => el.type !== 'image')
  }

  const createMockElement = (type: CanvasElement['type'], id = 'test-id'): CanvasElement => {
    const base = {
      id,
      x: 0, y: 0, width: 200, height: 100,
      zIndex: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    switch (type) {
      case 'sticky':
        return { ...base, type, text: 'Test', color: '#FFF2B2' }
      case 'text':
        return { ...base, type, text: 'Test', fontSize: 16, fontFamily: 'Arial' }
      case 'rect':
        return { ...base, type, fill: '#FFFFFF', stroke: '#000000', strokeWidth: 2 }
      case 'image':
        return { ...base, type, src: 'test.png', originalWidth: 200, originalHeight: 100 }
    }
  }

  describe('when no elements are selected', () => {
    it('should hide toolbar', () => {
      expect(shouldShowToolbar([], 'select')).toBe(false)
    })
  })

  describe('when wrong tool is selected', () => {
    it('should hide toolbar even with selected elements', () => {
      const elements = [createMockElement('sticky')]
      expect(shouldShowToolbar(elements, 'line')).toBe(false)
      expect(shouldShowToolbar(elements, 'rect')).toBe(false)
    })
  })

  describe('when only image elements are selected', () => {
    it('should hide toolbar for single image', () => {
      const elements = [createMockElement('image')]
      expect(shouldShowToolbar(elements, 'select')).toBe(false)
    })

    it('should hide toolbar for multiple images', () => {
      const elements = [
        createMockElement('image', 'img1'),
        createMockElement('image', 'img2'),
        createMockElement('image', 'img3')
      ]
      expect(shouldShowToolbar(elements, 'select')).toBe(false)
    })
  })

  describe('when non-image elements are selected', () => {
    it('should show toolbar for sticky note', () => {
      const elements = [createMockElement('sticky')]
      expect(shouldShowToolbar(elements, 'select')).toBe(true)
    })

    it('should show toolbar for text element', () => {
      const elements = [createMockElement('text')]
      expect(shouldShowToolbar(elements, 'select')).toBe(true)
    })

    it('should show toolbar for rectangle', () => {
      const elements = [createMockElement('rect')]
      expect(shouldShowToolbar(elements, 'select')).toBe(true)
    })

    it('should show toolbar for multiple non-image elements', () => {
      const elements = [
        createMockElement('sticky', 'sticky1'),
        createMockElement('text', 'text1'),
        createMockElement('rect', 'rect1')
      ]
      expect(shouldShowToolbar(elements, 'select')).toBe(true)
    })
  })

  describe('when mixed elements are selected', () => {
    it('should show toolbar when image + sticky are selected', () => {
      const elements = [
        createMockElement('image', 'img1'),
        createMockElement('sticky', 'sticky1')
      ]
      expect(shouldShowToolbar(elements, 'select')).toBe(true)
    })

    it('should show toolbar when image + text are selected', () => {
      const elements = [
        createMockElement('image', 'img1'),
        createMockElement('text', 'text1')
      ]
      expect(shouldShowToolbar(elements, 'select')).toBe(true)
    })

    it('should show toolbar when image + rectangle are selected', () => {
      const elements = [
        createMockElement('image', 'img1'),
        createMockElement('rect', 'rect1')
      ]
      expect(shouldShowToolbar(elements, 'select')).toBe(true)
    })

    it('should show toolbar when multiple images + one non-image are selected', () => {
      const elements = [
        createMockElement('image', 'img1'),
        createMockElement('image', 'img2'),
        createMockElement('image', 'img3'),
        createMockElement('sticky', 'sticky1')
      ]
      expect(shouldShowToolbar(elements, 'select')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle empty selection with wrong tool', () => {
      expect(shouldShowToolbar([], 'line')).toBe(false)
    })
  })
})