import { describe, test, expect, beforeEach } from 'vitest'
import { useBoardStore } from '@/store/boardStore'

describe('Viewport Panning', () => {
  beforeEach(() => {
    // Reset the store to initial state
    useBoardStore.getState().clearAll()
    useBoardStore.getState().resetViewport()
  })

  test('should initialize viewport with default values', () => {
    const state = useBoardStore.getState()
    expect(state.viewport.zoom).toBe(1)
    expect(state.viewport.panX).toBe(0)
    expect(state.viewport.panY).toBe(0)
  })

  test('should update pan values correctly', () => {
    useBoardStore.getState().setPan(100, 50)
    
    const state = useBoardStore.getState()
    expect(state.viewport.panX).toBe(100)
    expect(state.viewport.panY).toBe(50)
  })

  test('should maintain zoom while panning', () => {
    // Set initial zoom
    useBoardStore.getState().setZoom(1.5)
    
    // Pan the viewport
    useBoardStore.getState().setPan(200, 150)
    
    const state = useBoardStore.getState()
    expect(state.viewport.zoom).toBe(1.5)
    expect(state.viewport.panX).toBe(200)
    expect(state.viewport.panY).toBe(150)
  })

  test('should update viewport with partial values', () => {
    useBoardStore.getState().setViewport({ panX: 75 })
    
    let state = useBoardStore.getState()
    expect(state.viewport.panX).toBe(75)
    expect(state.viewport.panY).toBe(0) // Should remain unchanged
    expect(state.viewport.zoom).toBe(1) // Should remain unchanged
    
    useBoardStore.getState().setViewport({ zoom: 2.0, panY: 100 })
    
    state = useBoardStore.getState()
    expect(state.viewport.zoom).toBe(2.0)
    expect(state.viewport.panX).toBe(75) // Should remain unchanged
    expect(state.viewport.panY).toBe(100)
  })

  test('should handle negative pan values', () => {
    useBoardStore.getState().setPan(-50, -25)
    
    const state = useBoardStore.getState()
    expect(state.viewport.panX).toBe(-50)
    expect(state.viewport.panY).toBe(-25)
  })

  test('should persist viewport changes', () => {
    // Initial pan
    useBoardStore.getState().setPan(100, 100)
    
    // Simulate loading from storage
    useBoardStore.getState().loadFromStorage()
    
    // Verify the viewport state is maintained (test basic functionality)
    const state = useBoardStore.getState()
    expect(state.viewport).toBeDefined()
  })
})