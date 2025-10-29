// Performance-optimized Zustand selectors for React optimization
import { useMemo } from 'react'
import { useBoardStore } from './boardStore'
import type { CanvasElement, Connector, ElementID } from '@/types'

// Memoized selectors to prevent unnecessary re-renders
export const useElements = () => useBoardStore(state => state.elements)
export const useConnectors = () => useBoardStore(state => state.connectors)
export const useSelectedTool = () => useBoardStore(state => state.selectedTool)
export const useSelectedIds = () => useBoardStore(state => state.selectedIds)
export const useViewport = () => useBoardStore(state => state.viewport)
export const useMode = () => useBoardStore(state => state.mode)
export const useEditingTextId = () => useBoardStore(state => state.editingTextId)
export const useConnectionMode = () => useBoardStore(state => state.connectionMode)
export const useConnectorDrag = () => useBoardStore(state => state.connectorDrag)
export const useHoveredElementId = () => useBoardStore(state => state.hoveredElementId)
export const useCursorPosition = () => useBoardStore(state => state.cursorPosition)

// Optimized derived state selectors with memoization
export const useSelectedElements = () => {
  const elements = useElements()
  const selectedIds = useSelectedIds()
  
  return useMemo(() => {
    if (selectedIds.length === 0) return []
    const selectedIdsSet = new Set(selectedIds)
    return elements.filter(el => selectedIdsSet.has(el.id))
  }, [elements, selectedIds])
}

export const useElementsInViewport = () => {
  const elements = useElements()
  const viewport = useViewport()
  
  return useMemo(() => {
    // Basic viewport culling - only include elements that might be visible
    const viewportMargin = 100 // Extra margin for smooth scrolling
    const viewportWidth = (typeof window !== 'undefined' ? window.innerWidth : 1920) / viewport.zoom
    const viewportHeight = (typeof window !== 'undefined' ? window.innerHeight : 1080) / viewport.zoom
    const viewportLeft = -viewport.panX / viewport.zoom - viewportMargin
    const viewportTop = -viewport.panY / viewport.zoom - viewportMargin
    const viewportRight = viewportLeft + viewportWidth + viewportMargin * 2
    const viewportBottom = viewportTop + viewportHeight + viewportMargin * 2
    
    return elements.filter(element => {
      return !(
        element.x + element.width < viewportLeft ||
        element.x > viewportRight ||
        element.y + element.height < viewportTop ||
        element.y > viewportBottom
      )
    })
  }, [elements, viewport])
}

export const useSortedElements = () => {
  const elements = useElementsInViewport()
  
  return useMemo(() => {
    return elements.slice().sort((a, b) => a.zIndex - b.zIndex)
  }, [elements])
}

export const useElementById = (id: ElementID) => {
  const elements = useElements()
  
  return useMemo(() => {
    return elements.find(el => el.id === id)
  }, [elements, id])
}

export const useIsElementSelected = (id: ElementID) => {
  const selectedIds = useSelectedIds()
  
  return useMemo(() => {
    return selectedIds.includes(id)
  }, [selectedIds, id])
}

export const useCanUndo = () => useBoardStore(state => state.canUndo())
export const useCanRedo = () => useBoardStore(state => state.canRedo())

// Actions selectors (stable references)
export const useStoreActions = () => useBoardStore(state => ({
  // Element actions
  addSticky: state.addSticky,
  addRect: state.addRect,
  addText: state.addText,
  addImage: state.addImage,
  updateElement: state.updateElement,
  deleteElement: state.deleteElement,
  deleteElements: state.deleteElements,
  moveElement: state.moveElement,
  
  // Selection actions
  selectShape: state.selectShape,
  selectShapes: state.selectShapes,
  clearSelection: state.clearSelection,
  startEditingText: state.startEditingText,
  stopEditingText: state.stopEditingText,
  
  // Tool actions
  selectTool: state.selectTool,
  
  // Viewport actions
  setViewport: state.setViewport,
  setZoom: state.setZoom,
  setPan: state.setPan,
  
  // Connector actions
  addConnector: state.addConnector,
  deleteConnector: state.deleteConnector,
  updateConnectors: state.updateConnectors,
  startConnection: state.startConnection,
  completeConnection: state.completeConnection,
  cancelConnection: state.cancelConnection,
  
  // History actions
  undo: state.undo,
  redo: state.redo,
  
  // Text formatting actions
  updateTextAlignment: state.updateTextAlignment,
  updateVerticalAlignment: state.updateVerticalAlignment,
  updateElementColor: state.updateElementColor,
  updateFontSize: state.updateFontSize,

  // Utility actions
  bringToFront: state.bringToFront,
  sendToBack: state.sendToBack,
  beginElementDrag: state.beginElementDrag,
  _triggerAutoSave: state._triggerAutoSave,
  setHoveredElementId: state.setHoveredElementId,
  setCursorPosition: state.setCursorPosition
}))