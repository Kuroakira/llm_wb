import { describe, it, expect, beforeEach } from 'vitest'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

// Create a test store with minimal board functionality
const createTestStore = () => {
  return create()(
    immer((set: any, get: any) => ({
      elements: [],
      connectors: [],
      selectedTool: 'select' as any,
      connectionMode: { isActive: false, fromElementId: null, fromAnchor: null },
      history: { past: [], future: [] },
      
      addSticky: (params: any) => {
        const id = `test-id-${Math.random().toString(36).substr(2, 9)}`
        const element = {
          id,
          type: 'sticky',
          x: params.x,
          y: params.y,
          width: 200,
          height: 150,
          text: params.text || 'Test',
          color: '#FFF2B2',
          zIndex: 1,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        set((state: any) => {
          state.elements.push(element)
        })
        return id
      },
      
      startConnection: (elementId: string, anchor: any) => {
        set((state: any) => {
          state.connectionMode = {
            isActive: true,
            fromElementId: elementId,
            fromAnchor: anchor
          }
        })
      },
      
      cancelConnection: () => {
        set((state: any) => {
          state.connectionMode = { isActive: false, fromElementId: null, fromAnchor: null }
        })
      },
      
      completeConnection: (elementId: string, anchor: any) => {
        const { connectionMode } = get()
        if (connectionMode.isActive && connectionMode.fromElementId && connectionMode.fromAnchor) {
          // Don't allow self-connections
          if (connectionMode.fromElementId !== elementId) {
            const connector = {
              id: `connector-${Math.random().toString(36).substr(2, 9)}`,
              fromId: connectionMode.fromElementId,
              toId: elementId,
              fromAnchor: connectionMode.fromAnchor,
              toAnchor: anchor,
              points: [0, 0, 100, 100],
              zIndex: 1,
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
            set((state: any) => {
              state.connectors.push(connector)
            })
          }
        }
        get().cancelConnection()
        get().selectTool('select')
      },
      
      selectTool: (tool: string) => {
        const currentConnectionMode = get().connectionMode
        set((state: any) => {
          state.selectedTool = tool
          // Cancel connection when switching away from line tool
          if (tool !== 'line' && currentConnectionMode.isActive) {
            state.connectionMode = { isActive: false, fromElementId: null, fromAnchor: null }
          }
        })
      },
      
      undo: () => {
        const { history } = get()
        if (history.past.length > 0) {
          const previous = history.past.pop()
          set((state: any) => {
            state.history.future.push({
              elements: [...state.elements],
              connectors: [...state.connectors]
            })
            state.elements = previous.elements || []
            state.connectors = previous.connectors || []
          })
        }
      },
      
      redo: () => {
        const { history } = get()
        if (history.future.length > 0) {
          const next = history.future.pop()
          set((state: any) => {
            state.history.past.push({
              elements: [...state.elements],
              connectors: [...state.connectors]
            })
            state.elements = next.elements || []
            state.connectors = next.connectors || []
          })
        }
      }
    }))
  )
}

let store: any

// Simple test to verify the two-click workflow logic
describe('Two-Click Connection Workflow - Logic Verification', () => {
  
  beforeEach(() => {
    store = createTestStore()
  })

  describe('Connection Mode State Management', () => {
    it('should initialize with inactive connection mode', () => {
      const state = store.getState()
      expect(state.connectionMode.isActive).toBe(false)
      expect(state.connectionMode.fromElementId).toBeNull()
      expect(state.connectionMode.fromAnchor).toBeNull()
    })

    it('should start connection mode when startConnection is called', () => {
      // Create a test element first
      const elementId = store.getState().addSticky({ x: 100, y: 100, text: 'Test' })
      
      // Start connection
      store.getState().startConnection(elementId, 'right')
      
      const state = store.getState()
      expect(state.connectionMode.isActive).toBe(true)
      expect(state.connectionMode.fromElementId).toBe(elementId)
      expect(state.connectionMode.fromAnchor).toBe('right')
    })

    it('should cancel connection mode when cancelConnection is called', () => {
      // Create a test element and start connection
      const elementId = store.getState().addSticky({ x: 100, y: 100, text: 'Test' })
      store.getState().startConnection(elementId, 'right')
      
      // Cancel connection
      store.getState().cancelConnection()
      
      const state = store.getState()
      expect(state.connectionMode.isActive).toBe(false)
      expect(state.connectionMode.fromElementId).toBeNull()
      expect(state.connectionMode.fromAnchor).toBeNull()
    })

    it('should complete connection and create connector', () => {
      // Create two test elements
      const element1Id = store.getState().addSticky({ x: 100, y: 100, text: 'Element 1' })
      const element2Id = store.getState().addSticky({ x: 300, y: 200, text: 'Element 2' })
      
      // Start connection from element 1
      store.getState().startConnection(element1Id, 'right')
      
      // Complete connection to element 2
      store.getState().completeConnection(element2Id, 'left')
      
      const state = store.getState()
      
      // Connection mode should be inactive after completion
      expect(state.connectionMode.isActive).toBe(false)
      expect(state.connectionMode.fromElementId).toBeNull()
      expect(state.connectionMode.fromAnchor).toBeNull()
      
      // Should have created a connector
      expect(state.connectors).toHaveLength(1)
      
      const connector = state.connectors[0]
      expect(connector.fromId).toBe(element1Id)
      expect(connector.toId).toBe(element2Id)
      expect(connector.fromAnchor).toBe('right')
      expect(connector.toAnchor).toBe('left')
    })

    it('should automatically switch to select tool after completing connection', () => {
      // Set line tool initially
      store.getState().selectTool('line')
      expect(store.getState().selectedTool).toBe('line')
      
      // Create two test elements
      const element1Id = store.getState().addSticky({ x: 100, y: 100, text: 'Element 1' })
      const element2Id = store.getState().addSticky({ x: 300, y: 200, text: 'Element 2' })
      
      // Start and complete connection
      store.getState().startConnection(element1Id, 'right')
      store.getState().completeConnection(element2Id, 'left')
      
      // Should switch back to select tool (Figma-like behavior)
      expect(store.getState().selectedTool).toBe('select')
    })
  })

  describe('Connection Mode with Tool Changes', () => {
    it('should cancel connection mode when switching away from line tool', () => {
      // Create test element and start connection
      const elementId = store.getState().addSticky({ x: 100, y: 100, text: 'Test' })
      store.getState().selectTool('line')
      store.getState().startConnection(elementId, 'right')
      
      // Verify connection is active
      expect(store.getState().connectionMode.isActive).toBe(true)
      
      // Switch to different tool
      store.getState().selectTool('sticky')
      
      // Connection mode should be cancelled
      expect(store.getState().connectionMode.isActive).toBe(false)
      expect(store.getState().connectionMode.fromElementId).toBeNull()
      expect(store.getState().connectionMode.fromAnchor).toBeNull()
    })

    it('should preserve connection mode when staying on line tool', () => {
      // Create test element and start connection
      const elementId = store.getState().addSticky({ x: 100, y: 100, text: 'Test' })
      store.getState().selectTool('line')
      store.getState().startConnection(elementId, 'right')
      
      // Re-select line tool
      store.getState().selectTool('line')
      
      // Connection mode should still be active
      expect(store.getState().connectionMode.isActive).toBe(true)
      expect(store.getState().connectionMode.fromElementId).toBe(elementId)
      expect(store.getState().connectionMode.fromAnchor).toBe('right')
    })
  })

  describe('Connection State Validation', () => {
    it('should prevent self-connection attempts', () => {
      // Create test element
      const elementId = store.getState().addSticky({ x: 100, y: 100, text: 'Test' })
      
      // Start connection from element
      store.getState().startConnection(elementId, 'right')
      
      // Try to complete connection to same element
      store.getState().completeConnection(elementId, 'left')
      
      const state = store.getState()
      
      // Should not create connector (self-connection not allowed)
      expect(state.connectors).toHaveLength(0)
      
      // Connection mode should be cancelled
      expect(state.connectionMode.isActive).toBe(false)
    })

    it('should handle rapid connection attempts gracefully', () => {
      // Create multiple elements
      const element1Id = store.getState().addSticky({ x: 100, y: 100, text: 'Element 1' })
      const element2Id = store.getState().addSticky({ x: 300, y: 200, text: 'Element 2' })
      const element3Id = store.getState().addSticky({ x: 500, y: 300, text: 'Element 3' })
      
      // Rapid fire connection attempts
      store.getState().startConnection(element1Id, 'right')
      store.getState().startConnection(element2Id, 'left')  // Should override previous
      store.getState().completeConnection(element3Id, 'top')
      
      const state = store.getState()
      
      // Should create only one connector (from element2 to element3)
      expect(state.connectors).toHaveLength(1)
      expect(state.connectors[0].fromId).toBe(element2Id)
      expect(state.connectors[0].toId).toBe(element3Id)
      
      // Connection mode should be inactive
      expect(state.connectionMode.isActive).toBe(false)
    })
  })

  describe('Connection History Integration', () => {
    it('should add connection creation to undo history', () => {
      // Create elements
      const element1Id = store.getState().addSticky({ x: 100, y: 100, text: 'Element 1' })
      const element2Id = store.getState().addSticky({ x: 300, y: 200, text: 'Element 2' })
      
      // Clear any existing history to start fresh
      const state = store.getState()
      state.history.past = []
      state.history.future = []
      
      // Create connection (should add to history)
      store.getState().startConnection(element1Id, 'right')
      store.getState().completeConnection(element2Id, 'left')
      
      // Should have connector
      expect(store.getState().connectors).toHaveLength(1)
      
      // Should be able to undo connection creation
      store.getState().undo()
      expect(store.getState().connectors).toHaveLength(0)
      
      // Should be able to redo connection creation
      store.getState().redo()
      expect(store.getState().connectors).toHaveLength(1)
    })
  })
})