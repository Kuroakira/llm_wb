import { describe, it, expect, beforeEach } from 'vitest'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { CanvasElement, Connector } from '@/types'

// Simplified test store that mimics the clipboard functionality
type TestStore = {
  elements: CanvasElement[]
  selectedIds: string[]
  clipboard: {
    elements: CanvasElement[]
    connectors: Connector[]
  }
  copySelected: () => void
  paste: () => void
}

describe('Clipboard Functionality', () => {
  let store: any

  beforeEach(() => {
    store = create<TestStore>()(
      immer((set, get) => ({
        elements: [],
        selectedIds: [],
        clipboard: { elements: [], connectors: [] },

        copySelected: () => {
          const { selectedIds, elements } = get()
          if (selectedIds.length === 0) return

          const selectedElements = elements.filter(el => selectedIds.includes(el.id))

          set((state) => {
            state.clipboard = {
              elements: JSON.parse(JSON.stringify(selectedElements)),
              connectors: []
            }
          })
        },

        paste: () => {
          const { clipboard } = get()
          if (clipboard.elements.length === 0) return

          const newElements: CanvasElement[] = []

          clipboard.elements.forEach(el => {
            const newElement: CanvasElement = {
              ...JSON.parse(JSON.stringify(el)),
              id: `new-${el.id}`,
              x: el.x + 10,
              y: el.y + 10,
              zIndex: 1,
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
            newElements.push(newElement)
          })

          set((state) => {
            state.elements.push(...newElements)
            state.selectedIds = newElements.map(e => e.id)
          })
        }
      }))
    )
  })

  it('should copy selected elements to clipboard', () => {
    const { getState, setState } = store

    // Add an element and select it
    setState({
      elements: [
        {
          id: 'elem1',
          type: 'sticky',
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          text: 'Test',
          color: '#FFF2B2',
          zIndex: 1,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ],
      selectedIds: ['elem1']
    })

    // Copy
    getState().copySelected()

    // Check clipboard has the element
    expect(getState().clipboard.elements).toHaveLength(1)
    expect(getState().clipboard.elements[0].id).toBe('elem1')
  })

  it('should paste elements with 10px offset', () => {
    const { getState, setState } = store

    // Add and select an element
    setState({
      elements: [
        {
          id: 'elem1',
          type: 'text',
          x: 50,
          y: 50,
          width: 100,
          height: 50,
          text: 'Original',
          fontSize: 16,
          fontFamily: 'Arial',
          zIndex: 1,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ],
      selectedIds: ['elem1']
    })

    // Copy
    getState().copySelected()

    // Paste
    getState().paste()

    // Should have 2 elements now
    const state = getState()
    expect(state.elements).toHaveLength(2)

    // Check the pasted element has offset
    const pastedElement = state.elements.find(e => e.id !== 'elem1')
    expect(pastedElement).toBeDefined()
    expect(pastedElement!.x).toBe(60) // 50 + 10
    expect(pastedElement!.y).toBe(60) // 50 + 10
  })

  it('should allow pasting multiple times', () => {
    const { getState, setState } = store

    // Add and select an element
    setState({
      elements: [
        {
          id: 'elem1',
          type: 'rect',
          x: 200,
          y: 200,
          width: 100,
          height: 100,
          fill: '#ff0000',
          stroke: '#000000',
          strokeWidth: 2,
          zIndex: 1,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ],
      selectedIds: ['elem1']
    })

    // Copy once
    getState().copySelected()

    // Paste 3 times
    getState().paste()
    getState().paste()
    getState().paste()

    // Should have 4 elements total (1 original + 3 pastes)
    expect(getState().elements).toHaveLength(4)
  })

  it('should not paste when clipboard is empty', () => {
    const { getState, setState } = store

    setState({
      elements: [
        {
          id: 'elem1',
          type: 'sticky',
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          text: 'Test',
          color: '#FFF2B2',
          zIndex: 1,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ],
      selectedIds: [],
      clipboard: { elements: [], connectors: [] }
    })

    // Try to paste with empty clipboard
    getState().paste()

    // Should still have only 1 element
    expect(getState().elements).toHaveLength(1)
  })
})
