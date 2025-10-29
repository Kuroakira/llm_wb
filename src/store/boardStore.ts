import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { debouncedSaveBoardData, loadBoardData, debouncedSaveViewport, loadViewport } from '@/lib/persistence'
import { calculateStickySize, estimateStickySize } from '@/lib/textMeasurement'
// Removed old autoResizeElement - now using Konva-based measurement
import { debugLog } from '@/lib/logger'
import type { CanvasElement, ElementID, Tool, StickyElement, RectElement, TextElement, Connector, AnchorPosition, Viewport, Mode, TextAlignment, VerticalAlignment, ChatMessage, MainTheme } from '@/types'

// New simple state management (stability-focused)
type BoardStore = {
  // Basic state only
  elements: CanvasElement[]
  connectors: Connector[]
  selectedTool: Tool
  history: {
    past: { elements: CanvasElement[]; connectors: Connector[] }[]
    future: { elements: CanvasElement[]; connectors: Connector[] }[]
  }
  selectedConnectorIds: ElementID[]
  isDraggingConnector: boolean
  connectorDrag: { isActive: boolean; connectorId: ElementID | null; end: 'from' | 'to' | null }
  // Snap target during drag (for visual emphasis)
  connectorHoverTarget: { elementId: ElementID; anchor: AnchorPosition } | null
  // Hovered element (for anchor display control in line mode)
  hoveredElementId: ElementID | null
  // Current mouse cursor position (canvas coordinate system, for proximity anchor display)
  cursorPosition: { x: number; y: number } | null

  // Figma/Google Slides-style mode management
  mode: Mode
  selectedIds: ElementID[]
  editingTextId?: ElementID

  // Viewport (zoom/pan)
  viewport: Viewport

  // Connection mode (simplified)
  connectionMode: {
    isActive: boolean
    fromElementId: string | null
    fromAnchor: AnchorPosition | null
  }

  // Chat history
  chatHistory: ChatMessage[]

  // Main theme
  mainTheme: MainTheme | null

  // Clipboard
  clipboard: {
    elements: CanvasElement[]
    connectors: Connector[]
  }

  // Basic actions
  addElement: (element: Omit<CanvasElement, 'id' | 'createdAt' | 'updatedAt' | 'zIndex'>) => string
  updateElement: (id: ElementID, updates: Partial<CanvasElement>, skipConnectorUpdate?: boolean, skipHistory?: boolean) => void
  deleteElement: (id: ElementID) => void
  deleteElements: (ids: ElementID[]) => void


  // ツール
  selectTool: (tool: Tool) => void

  // Figma/Google Slides風のモード管理
  setMode: (mode: Mode) => void
  selectShape: (id: ElementID) => void
  selectShapes: (ids: ElementID[]) => void
  clearSelection: () => void
  selectConnector: (id: ElementID) => void
  selectConnectors: (ids: ElementID[]) => void
  selectShapesAndConnectors: (shapeIds: ElementID[], connectorIds: ElementID[]) => void
  startEditingText: (id: ElementID) => void
  stopEditingText: () => void

  // Convenience actions (for compatibility)
  addSticky: (params: { x: number; y: number; text?: string; isFromLLM?: boolean }) => string
  addRect: (params: { x: number; y: number }) => string
  addText: (params: { x: number; y: number; text?: string }) => string
  addImage: (params: { x: number; y: number; src: string; originalWidth: number; originalHeight: number; maxWidth?: number; maxHeight?: number }) => string
  moveElement: (id: ElementID, position: { x: number; y: number }) => void
  bringToFront: (id: ElementID) => void
  sendToBack: (id: ElementID) => void

  // Text alignment related
  updateTextAlignment: (ids: ElementID[], align: TextAlignment) => void
  updateVerticalAlignment: (ids: ElementID[], align: VerticalAlignment) => void
  updateElementColor: (ids: ElementID[], color: string) => void
  updateFontSize: (ids: ElementID[], fontSize: number) => void

  // Connectors
  addConnector: (from: { id: ElementID; anchor: AnchorPosition }, to: { id: ElementID; anchor: AnchorPosition }) => void
  deleteConnector: (id: ElementID) => void
  addFreeConnectorAt: (params: { x: number; y: number; length?: number }) => string
  updateConnectorPoints: (id: ElementID, points: number[]) => void
  attachConnectorEnd: (id: ElementID, end: 'from' | 'to', elementId: ElementID, anchor: AnchorPosition) => void
  detachConnectorEnd: (id: ElementID, end: 'from' | 'to') => void
  updateConnectors: () => void
  startConnection: (fromElementId: ElementID, fromAnchor: AnchorPosition) => void
  completeConnection: (toElementId: ElementID, toAnchor: AnchorPosition) => void
  createPartialConnection: (toPoint: { x: number; y: number }) => void
  cancelConnection: () => void

  // Viewport
  setViewport: (viewport: Partial<Viewport>) => void
  setZoom: (zoom: number) => void
  setPan: (panX: number, panY: number) => void
  setIsDraggingConnector: (isDragging: boolean) => void
  startConnectorDrag: (connectorId: ElementID, end: 'from' | 'to') => void
  endConnectorDrag: () => void
  setConnectorHoverTarget: (target: { elementId: ElementID; anchor: AnchorPosition } | null) => void
  setHoveredElementId: (elementId: ElementID | null) => void
  setCursorPosition: (position: { x: number; y: number } | null) => void

  // History (simplified)
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // Clear all
  clearAll: () => void

  // For drag operations (save history snapshot only once)
  beginElementDrag: () => void

  // Persistence
  loadFromStorage: () => void
  _triggerAutoSave: () => void

  // Helpers
  getElementById: (id: ElementID) => CanvasElement | undefined
  getNextZIndex: () => number

  // Auto-sizing
  autoResizeElementHeight: (id: ElementID) => boolean

  // Export/Import
  exportAsJSON: () => string
  importFromJSON: (json: string) => void
  resetViewport: () => void

  // Chat related
  addChatMessage: (message: Omit<ChatMessage, 'id'>) => void
  getChatContext: () => string
  clearChatHistory: () => void

  // Main theme related
  setMainTheme: (content: string) => void
  updateMainTheme: (content: string) => void
  removeMainTheme: () => void
  getMainTheme: () => MainTheme | null

  // Clipboard operations
  copySelected: () => void
  cutSelected: () => void
  paste: () => void
}

// Performance optimization: Create store with devtools and subscribeWithSelector middleware
export const useBoardStore = create<BoardStore>()(
  immer((set, get) => ({
    // Initial state
    elements: [],
    connectors: [],
    selectedTool: 'select',
    history: { past: [], future: [] },
    selectedConnectorIds: [],
    isDraggingConnector: false,
    connectorDrag: { isActive: false, connectorId: null, end: null },
    connectorHoverTarget: null,
    hoveredElementId: null,
    cursorPosition: null,

    // Figma/Google Slides-style Mode management
    mode: 'idle',
    selectedIds: [],
    editingTextId: undefined,

    viewport: { zoom: 1, panX: 0, panY: 0 },
    connectionMode: { isActive: false, fromElementId: null, fromAnchor: null },
    chatHistory: [],
    mainTheme: null,
    clipboard: { elements: [], connectors: [] },

    // Add element
    addElement: (elementData) => {
      // Save current snapshot to history
      pushHistorySnapshot(get, set)
      const id = nanoid()
      const now = Date.now()
      const zIndex = get().getNextZIndex()

      const element: CanvasElement = {
        ...elementData,
        id,
        zIndex,
        createdAt: now,
        updatedAt: now
      } as CanvasElement

      set((state) => {
        state.elements.push(element)
      })

      get()._triggerAutoSave()
      return id
    },

    // Update element
    updateElement: (id, updates, skipConnectorUpdate = false, skipHistory = false) => {
      // History snapshot (only when needed)
      if (!skipHistory) {
        pushHistorySnapshot(get, set)
      }
      set((state) => {
        const element = state.elements.find(e => e.id === id)
        if (element) {
          Object.assign(element, updates)
          element.updatedAt = Date.now()
        }
      })

      // Skip connector update when called frequently (e.g. during drag)
      if (!skipConnectorUpdate) {
        get().updateConnectors()
      }
      get()._triggerAutoSave()
    },

    // Delete element
    deleteElement: (id) => {
      get().deleteElements([id])
    },

    deleteElements: (ids) => {
      // Save current snapshot to history
      pushHistorySnapshot(get, set)
      set((state) => {
        // Delete elements
        state.elements = state.elements.filter(e => !ids.includes(e.id))

        // Delete related connectors
        state.connectors = state.connectors.filter(c =>
          !ids.includes(c.fromId) && !ids.includes(c.toId)
        )
      })

      get()._triggerAutoSave()
    },


    // Tools
    selectTool: (tool) => {
      const { cancelConnection, endConnectorDrag, connectorDrag, setConnectorHoverTarget } = get()
      set((state) => {
        state.selectedTool = tool
      })
      // Reset guide lines and drag state when tool changes
      if (tool !== 'line') {
        try {
          cancelConnection()
          setConnectorHoverTarget(null) // Clear hover target when leaving line mode
        } catch {}
      }
      if (connectorDrag?.isActive) {
        try { endConnectorDrag() } catch {}
      }

      // Set appropriate cursor for the new tool
      if (typeof window !== 'undefined') {
        import('@/lib/cursor-utils').then(({ getPanCursor, resetCursor, setCursor }) => {
          if (tool === 'pan') {
            setCursor(getPanCursor())
          } else {
            resetCursor()
          }
        })
      }
    },

    // Figma/Google Slides-style Mode management actions
    setMode: (mode) => {
      set((state) => {
        state.mode = mode
      })
    },

    selectShape: (id) => {
      set((state) => {
        state.mode = 'select'
        state.selectedIds = [id]
        state.editingTextId = undefined
        state.selectedConnectorIds = []
      })
    },

    selectShapes: (ids) => {
      set((state) => {
        state.mode = 'select'
        state.selectedIds = ids
        state.editingTextId = undefined
        state.selectedConnectorIds = []
      })
    },

    clearSelection: () => {
      set((state) => {
        state.mode = 'idle'
        state.selectedIds = []
        state.editingTextId = undefined
        state.selectedConnectorIds = []
      })
    },

    selectConnector: (id) => {
      set((state) => {
        state.selectedConnectorIds = [id]
        state.selectedIds = []
        state.mode = 'select'
      })
    },

    selectConnectors: (ids) => {
      set((state) => {
        state.selectedConnectorIds = ids
        state.selectedIds = []
        state.mode = 'select'
      })
    },

    selectShapesAndConnectors: (shapeIds, connectorIds) => {
      set((state) => {
        state.selectedIds = shapeIds
        state.selectedConnectorIds = connectorIds
        state.mode = (shapeIds.length > 0 || connectorIds.length > 0) ? 'select' : 'idle'
      })
    },

    startEditingText: (id) => {
      set((state) => {
        state.mode = 'editingText'
        state.selectedIds = [id]
        state.editingTextId = id
      })
    },

    stopEditingText: () => {
      set((state) => {
        const wasEditingId = state.editingTextId
        state.mode = wasEditingId ? 'select' : 'idle'
        state.editingTextId = undefined
        // Return edited element to selected state
        if (wasEditingId) {
          state.selectedIds = [wasEditingId]
        }
      })
    },

    // Convenience actions (for compatibility)
    addSticky: (params) => {
      const text = params.text || (params.isFromLLM ? 'AI response' : 'New Note')

      // Dynamic size calculation for LLM sticky notes
      let width = 200
      let height = 150

      if (params.isFromLLM && params.text) {
        try {
          // Attempt accurate measurement in browser environment
          if (typeof window !== 'undefined') {
            const size = calculateStickySize(params.text)
            width = size.width
            height = size.height
          } else {
            // Estimate on server-side
            const size = estimateStickySize(params.text)
            width = size.width
            height = size.height
          }
        } catch (error) {
          // Fallback: character count-based estimation
          console.warn('Failed to calculate sticky size, using fallback:', error)
          const size = estimateStickySize(params.text)
          width = size.width
          height = size.height
        }
      }

      const elementId = get().addElement({
        type: 'sticky',
        x: params.x,
        y: params.y,
        width,
        height,
        text,
        color: params.isFromLLM ? '#E3F2FD' : '#FFF2B2',
        textAlign: 'left',
        verticalAlign: 'middle'
      } as any)

      // For new sticky notes with text, apply auto-resize to ensure proper height
      if (text && text.trim()) {
        setTimeout(() => {
          get().autoResizeElementHeight(elementId)
        }, 10) // Small delay to ensure element is fully created
      }

      return elementId
    },

    addRect: (params) => {
      return get().addElement({
        type: 'rect',
        x: params.x,
        y: params.y,
        width: 200,
        height: 150,
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 2,
        radius: 0
      } as any)
    },

    addText: (params) => {
      const text = params.text || 'New Text'
      const elementId = get().addElement({
        type: 'text',
        x: params.x,
        y: params.y,
        width: 200,
        height: 100,
        text,
        fontSize: 16,
        fontFamily: 'Arial',
        textAlign: 'left',
        verticalAlign: 'middle'
      } as any)

      // Apply auto-resize for text elements with content
      if (text && text.trim()) {
        setTimeout(() => {
          get().autoResizeElementHeight(elementId)
        }, 10) // Small delay to ensure element is fully created
      }

      return elementId
    },

    addImage: (params) => {
      // Calculate maximum size as 1/8 of screen size
      const maxScreenWidth = params.maxWidth || (typeof window !== 'undefined' ? window.innerWidth / 8 : 300)
      const maxScreenHeight = params.maxHeight || (typeof window !== 'undefined' ? window.innerHeight / 8 : 200)

      // Adjust size while maintaining aspect ratio
      const aspectRatio = params.originalWidth / params.originalHeight
      let width = params.originalWidth
      let height = params.originalHeight

      // Adjust if width exceeds maximum
      if (width > maxScreenWidth) {
        width = maxScreenWidth
        height = width / aspectRatio
      }

      // Adjust if height exceeds maximum
      if (height > maxScreenHeight) {
        height = maxScreenHeight
        width = height * aspectRatio
      }

      // Ensure minimum size
      width = Math.max(20, width)
      height = Math.max(10, height)

      return get().addElement({
        type: 'image',
        x: params.x,
        y: params.y,
        width,
        height,
        src: params.src,
        originalWidth: params.originalWidth,
        originalHeight: params.originalHeight
      } as any)
    },

    moveElement: (id, position) => {
      get().updateElement(id, position)
    },


    bringToFront: (id) => {
      pushHistorySnapshot(get, set)
      const maxZ = get().getNextZIndex()
      get().updateElement(id, { zIndex: maxZ })
    },

    sendToBack: (id) => {
      pushHistorySnapshot(get, set)
      get().updateElement(id, { zIndex: 1 })
    },

    // Text alignment implementation
    updateTextAlignment: (ids, align) => {
      pushHistorySnapshot(get, set)
      set((state) => {
        ids.forEach(id => {
          const element = state.elements.find(e => e.id === id)
          if (element && (element.type === 'sticky' || element.type === 'text')) {
            ;(element as StickyElement | TextElement).textAlign = align
            element.updatedAt = Date.now()
          }
        })
      })
      get()._triggerAutoSave()
    },

    updateVerticalAlignment: (ids, align) => {
      pushHistorySnapshot(get, set)
      set((state) => {
        ids.forEach(id => {
          const element = state.elements.find(e => e.id === id)
          if (element && (element.type === 'sticky' || element.type === 'text')) {
            ;(element as StickyElement | TextElement).verticalAlign = align
            element.updatedAt = Date.now()
          }
        })
      })
      get()._triggerAutoSave()
    },

    updateElementColor: (ids, color) => {
      pushHistorySnapshot(get, set)
      set((state) => {
        ids.forEach(id => {
          const element = state.elements.find(e => e.id === id)
          if (element) {
            if (element.type === 'sticky') {
              ;(element as StickyElement).color = color
            } else if (element.type === 'rect') {
              ;(element as RectElement).fill = color
            }
            element.updatedAt = Date.now()
          }
        })
      })
      get()._triggerAutoSave()
    },

    updateFontSize: (ids, fontSize) => {
      pushHistorySnapshot(get, set)
      set((state) => {
        ids.forEach(id => {
          const element = state.elements.find(e => e.id === id)
          if (element && element.type === 'text') {
            ;(element as TextElement).fontSize = fontSize
            element.updatedAt = Date.now()
          }
        })
      })
      get()._triggerAutoSave()
    },

    // Connectors
    addConnector: (from, to) => {
      // Save current snapshot to history
      pushHistorySnapshot(get, set)
      const id = nanoid()
      const now = Date.now()

      // Calculate anchor point coordinates
      const fromElement = get().getElementById(from.id)
      const toElement = get().getElementById(to.id)

      if (!fromElement || !toElement) return

      const fromPoint = getAnchorPoint(fromElement, from.anchor)
      const toPoint = getAnchorPoint(toElement, to.anchor)

      const connector: Connector = {
        id,
        fromId: from.id,
        toId: to.id,
        fromAnchor: from.anchor,
        toAnchor: to.anchor,
        points: [fromPoint.x, fromPoint.y, toPoint.x, toPoint.y],
        zIndex: get().getNextZIndex(),
        createdAt: now,
        updatedAt: now
      }

      set((state) => {
        state.connectors.push(connector)
      })

      get()._triggerAutoSave()
    },

    deleteConnector: (id) => {
      // Save current snapshot to history
      pushHistorySnapshot(get, set)
      set((state) => {
        state.connectors = state.connectors.filter(c => c.id !== id)
      })

      get()._triggerAutoSave()
    },

    // Add free connector (both ends unconnected)
    addFreeConnectorAt: ({ x, y, length = 80 }) => {
      const id = nanoid()
      const now = Date.now()
      const points = [x, y, x + length, y + length]
      const connector: Connector = {
        id,
        fromId: '',
        toId: '',
        points,
        zIndex: get().getNextZIndex(),
        createdAt: now,
        updatedAt: now
      }
      set((state) => {
        state.connectors.push(connector)
      })
      get()._triggerAutoSave()
      return id
    },

    updateConnectorPoints: (id, points) => {
      set((state) => {
        const c = state.connectors.find(c => c.id === id)
        if (c) {
          c.points = points
          c.updatedAt = Date.now()
        }
      })
      // No need to recalculate connectors when directly updating points
      get()._triggerAutoSave()
    },

    attachConnectorEnd: (id, end, elementId, anchor) => {
      set((state) => {
        const connector = state.connectors.find(c => c.id === id)
        const element = state.elements.find(e => e.id === elementId)
        if (!connector || !element) return
        const setPointToAnchor = (el: any, which: 'start' | 'end') => {
          const ax = anchor === 'left' ? el.x : anchor === 'right' ? el.x + el.width : el.x + el.width / 2
          const ay = anchor === 'top' ? el.y : anchor === 'bottom' ? el.y + el.height : el.y + el.height / 2
          if (which === 'start') {
            connector.points[0] = ax
            connector.points[1] = ay
          } else {
            connector.points[2] = ax
            connector.points[3] = ay
          }
        }
        if (end === 'from') {
          connector.fromId = elementId
          connector.fromAnchor = anchor
          setPointToAnchor(element, 'start')
        } else {
          connector.toId = elementId
          connector.toAnchor = anchor
          setPointToAnchor(element, 'end')
        }
        connector.updatedAt = Date.now()
      })
      // If both ends are connected to elements, updateConnectors will follow from now on
      get().updateConnectors()
      get()._triggerAutoSave()
    },

    detachConnectorEnd: (id, end) => {
      set((state) => {
        const connector = state.connectors.find(c => c.id === id)
        if (!connector) return
        if (end === 'from') {
          connector.fromId = ''
          connector.fromAnchor = undefined
        } else {
          connector.toId = ''
          connector.toAnchor = undefined
        }
        connector.updatedAt = Date.now()
      })
      get()._triggerAutoSave()
    },

    updateConnectors: () => {
      set((state) => {
        state.connectors.forEach(connector => {
          const fromElement = state.elements.find(e => e.id === connector.fromId)
          const toElement = state.elements.find(e => e.id === connector.toId)

          if (fromElement && toElement && connector.fromAnchor && connector.toAnchor) {
            const fromPoint = getAnchorPoint(fromElement, connector.fromAnchor)
            const toPoint = getAnchorPoint(toElement, connector.toAnchor)
            connector.points = [fromPoint.x, fromPoint.y, toPoint.x, toPoint.y]
            connector.updatedAt = Date.now()
          }
        })
      })
    },

    // Connection related (2-click method)
    startConnection: (fromElementId, fromAnchor) => {
      set((state) => {
        state.connectionMode = {
          isActive: true,
          fromElementId,
          fromAnchor
        }
      })
      // Cursor setting for 2-click method: First click complete, waiting for second click
      if (typeof window !== 'undefined') {
        import('@/lib/cursor-utils').then(({ getConnectionActiveCursor, setCursor }) => {
          setCursor(getConnectionActiveCursor())
        })
      }
    },

    completeConnection: (toElementId, toAnchor) => {
      const { connectionMode } = get()
      if (connectionMode.isActive && connectionMode.fromElementId && connectionMode.fromAnchor) {
        // 2-click method: Complete connection on second click
        get().addConnector(
          { id: connectionMode.fromElementId, anchor: connectionMode.fromAnchor },
          { id: toElementId, anchor: toAnchor }
        )
      }
      get().cancelConnection()
      // 2-click method: Automatically return to select tool after creating one line
      try { get().selectTool('select') } catch {}
    },

    createPartialConnection: (toPoint) => {
      const { connectionMode } = get()
      if (connectionMode.isActive && connectionMode.fromElementId && connectionMode.fromAnchor) {
        // Save current snapshot to history
        pushHistorySnapshot(get, set)

        const id = nanoid()
        const now = Date.now()

        // Calculate anchor point of starting element
        const fromElement = get().getElementById(connectionMode.fromElementId)
        if (!fromElement) return

        const fromPoint = getAnchorPoint(fromElement, connectionMode.fromAnchor)

        const connector: Connector = {
          id,
          fromId: connectionMode.fromElementId,
          toId: '', // End point not connected to element
          fromAnchor: connectionMode.fromAnchor,
          toAnchor: undefined, // No anchor at end point
          points: [fromPoint.x, fromPoint.y, toPoint.x, toPoint.y],
          zIndex: get().getNextZIndex(),
          createdAt: now,
          updatedAt: now
        }

        set((state) => {
          state.connectors.push(connector)
        })

        get()._triggerAutoSave()
      }

      get().cancelConnection()
      // Automatically return to select tool after creating partial connection
      try { get().selectTool('select') } catch {}
    },

    cancelConnection: () => {
      set((state) => {
        state.connectionMode = { isActive: false, fromElementId: null, fromAnchor: null }
      })
      // 2-click method: Reset cursor when canceling connection
      if (typeof window !== 'undefined') {
        import('@/lib/cursor-utils').then(({ resetCursor }) => {
          resetCursor()
        })
      }
    },

    // Viewport
    setViewport: (viewport) => {
      set((state) => {
        Object.assign(state.viewport, viewport)
      })

      // Auto-save viewport changes
      const { viewport: newViewport } = get()
      debouncedSaveViewport({
        zoom: newViewport.zoom,
        panX: newViewport.panX,
        panY: newViewport.panY,
        savedAt: Date.now()
      })
    },

    setZoom: (zoom) => {
      set((state) => {
        state.viewport.zoom = zoom
      })

      // Auto-save viewport changes
      const { viewport } = get()
      debouncedSaveViewport({
        zoom: viewport.zoom,
        panX: viewport.panX,
        panY: viewport.panY,
        savedAt: Date.now()
      })
    },

    setPan: (panX, panY) => {
      set((state) => {
        state.viewport.panX = panX
        state.viewport.panY = panY
      })

      // Auto-save viewport changes
      const { viewport } = get()
      debouncedSaveViewport({
        zoom: viewport.zoom,
        panX: viewport.panX,
        panY: viewport.panY,
        savedAt: Date.now()
      })
    },

    // Flag: Dragging connector endpoint
    setIsDraggingConnector: (isDragging: boolean) => {
      set((state) => {
        state.isDraggingConnector = isDragging
      })
    },
    startConnectorDrag: (connectorId, end) => {
      set((state) => {
        state.connectorDrag = { isActive: true, connectorId, end }
      })
    },
    endConnectorDrag: () => {
      set((state) => {
        state.connectorDrag = { isActive: false, connectorId: null, end: null }
        state.connectorHoverTarget = null
      })
    },
    setConnectorHoverTarget: (target) => {
      set((state) => {
        state.connectorHoverTarget = target
      })
    },
    setHoveredElementId: (elementId) => {
      set((state) => {
        state.hoveredElementId = elementId
      })
    },
    setCursorPosition: (position) => {
      set((state) => {
        state.cursorPosition = position
      })
    },

    // 履歴（簡略版 - 実装は後で）
    undo: () => {
      const { history } = get()
      if (history.past.length === 0) return
      set((state) => {
        const current = {
          elements: deepClone(state.elements),
          connectors: deepClone(state.connectors)
        }
        const previous = state.history.past.pop()!
        state.history.future.push(current)
        state.elements = deepClone(previous.elements)
        state.connectors = deepClone(previous.connectors)
        state.selectedIds = []
        state.editingTextId = undefined
      })
      get()._triggerAutoSave()
    },

    redo: () => {
      const { history } = get()
      if (history.future.length === 0) return
      set((state) => {
        const current = {
          elements: deepClone(state.elements),
          connectors: deepClone(state.connectors)
        }
        const next = state.history.future.pop()!
        state.history.past.push(current)
        state.elements = deepClone(next.elements)
        state.connectors = deepClone(next.connectors)
        state.selectedIds = []
        state.editingTextId = undefined
      })
      get()._triggerAutoSave()
    },

    canUndo: () => {
      return get().history.past.length > 0
    },

    canRedo: () => {
      return get().history.future.length > 0
    },

    clearAll: () => {
      set((state) => {
        state.elements = []
        state.connectors = []
        state.selectedIds = []
        state.editingTextId = undefined
        state.history.past = []
        state.history.future = []
        state.mode = 'select'
        state.selectedTool = 'select'
      })
      get()._triggerAutoSave()
    },

    // ドラッグ開始時に一度だけ履歴を積む
    beginElementDrag: () => {
      pushHistorySnapshot(get, set)
    },

    // Persistence
    loadFromStorage: () => {
      try {
        // Restore board data
        const data = loadBoardData()
        if (data && data.elements) {
          set((state) => {
            state.elements = data.elements || []
            state.connectors = data.connectors || []
          })
        }

        // Restore viewport
        const viewport = loadViewport()
        if (viewport) {
          debugLog('🔄 Restoring viewport from localStorage', viewport)
          set((state) => {
            state.viewport.zoom = viewport.zoom
            state.viewport.panX = viewport.panX
            state.viewport.panY = viewport.panY
          })
        }
      } catch (error) {
        console.warn('Failed to load from storage:', error)
      }
    },

    _triggerAutoSave: () => {
      const { elements, connectors } = get()
      debouncedSaveBoardData(elements, connectors)
    },

    // ヘルパー
    getElementById: (id) => {
      return get().elements.find(e => e.id === id)
    },

    getNextZIndex: () => {
      const elements = get().elements
      const connectors = get().connectors
      const maxElementZ = elements.length > 0 ? Math.max(...elements.map(e => e.zIndex)) : 0
      const maxConnectorZ = connectors.length > 0 ? Math.max(...connectors.map(c => c.zIndex)) : 0
      return Math.max(maxElementZ, maxConnectorZ) + 1
    },

    exportAsJSON: () => {
      const { elements, connectors, viewport } = get()
      return JSON.stringify({
        elements,
        connectors,
        viewport
      })
    },

    importFromJSON: (json: string) => {
      try {
        const data = JSON.parse(json)
        set((state) => {
          state.elements = data.elements || []
          state.connectors = data.connectors || []
          state.viewport = data.viewport || { zoom: 1, panX: 0, panY: 0 }
          state.selectedIds = []
          state.editingTextId = undefined
          state.history.past = []
          state.history.future = []
        })
        get()._triggerAutoSave()
      } catch (error) {
        console.error('Failed to import JSON:', error)
      }
    },

    resetViewport: () => {
      set((state) => {
        state.viewport = { zoom: 1, panX: 0, panY: 0 }
      })
    },

    // Auto-resize element height based on text content
    autoResizeElementHeight: (id) => {
      const element = get().getElementById(id)
      if (!element || (element.type !== 'sticky' && element.type !== 'text')) {
        return false
      }

      const text = element.type === 'sticky' ? element.text : (element as TextElement).text
      const { viewport, updateElement } = get()

      // Use Konva-based measurement for accurate sizing
      const { calculateKonvaOptimalHeight } = require('@/lib/konvaTextMeasurement')
      const result = calculateKonvaOptimalHeight(element, text, viewport.zoom, 2000)

      if (result.shouldResize) {
        updateElement(id, { height: result.newHeight })
        return true
      }

      return false
    },

    // チャット関連アクション
    addChatMessage: (message) => {
      set((state) => {
        const newMessage: ChatMessage = {
          id: nanoid(),
          ...message,
        }
        state.chatHistory.push(newMessage)
      })
    },

    getChatContext: () => {
      const { chatHistory } = get()

      // Build context using only summaries of last 5 assistant messages
      const recentAssistantMessages = chatHistory
        .filter(msg => msg.role === 'assistant' && msg.summary)
        .slice(-5)

      if (recentAssistantMessages.length === 0) {
        return ''
      }

      const contextLines = recentAssistantMessages.map(msg =>
        `Past conversation: ${msg.summary}`
      )

      return `Summary of past conversations:\n${contextLines.join('\n')}\n\n`
    },

    clearChatHistory: () => {
      set((state) => {
        state.chatHistory = []
      })
    },

    // メインテーマ関連
    setMainTheme: (content) => {
      set((state) => {
        const now = Date.now()
        state.mainTheme = {
          id: nanoid(),
          content,
          createdAt: now,
          updatedAt: now
        }
      })
    },

    updateMainTheme: (content) => {
      set((state) => {
        if (state.mainTheme) {
          state.mainTheme.content = content
          state.mainTheme.updatedAt = Date.now()
        }
      })
    },

    removeMainTheme: () => {
      set((state) => {
        state.mainTheme = null
      })
    },

    getMainTheme: () => {
      return get().mainTheme
    },

    // Clipboard operations
    copySelected: () => {
      const { selectedIds, elements, connectors } = get()

      if (selectedIds.length === 0) return

      // Copy selected elements
      const selectedElements = elements.filter(el => selectedIds.includes(el.id))

      // Copy connectors that connect selected elements
      const selectedConnectors = connectors.filter(conn =>
        selectedIds.includes(conn.fromId) && selectedIds.includes(conn.toId)
      )

      set((state) => {
        state.clipboard = {
          elements: deepClone(selectedElements),
          connectors: deepClone(selectedConnectors)
        }
      })
    },

    cutSelected: () => {
      const { selectedIds, copySelected, deleteElements } = get()

      if (selectedIds.length === 0) return

      // Copy first
      copySelected()

      // Then delete
      deleteElements(selectedIds)
    },

    paste: () => {
      const { clipboard } = get()

      if (clipboard.elements.length === 0) return

      // Save history before paste
      pushHistorySnapshot(get, set)

      // Create ID mapping for new elements
      const idMap = new Map<ElementID, ElementID>()
      const newElements: CanvasElement[] = []

      // Create new elements with offset (10px right, 10px down)
      clipboard.elements.forEach(el => {
        const newId = nanoid()
        idMap.set(el.id, newId)

        const now = Date.now()
        const newElement: CanvasElement = {
          ...deepClone(el),
          id: newId,
          x: el.x + 10,
          y: el.y + 10,
          zIndex: get().getNextZIndex(),
          createdAt: now,
          updatedAt: now
        }
        newElements.push(newElement)
      })

      // Create new connectors with updated IDs
      const newConnectors: Connector[] = []
      clipboard.connectors.forEach(conn => {
        const newFromId = idMap.get(conn.fromId)
        const newToId = idMap.get(conn.toId)

        if (newFromId && newToId) {
          const now = Date.now()
          const newConnector: Connector = {
            ...deepClone(conn),
            id: nanoid(),
            fromId: newFromId,
            toId: newToId,
            zIndex: get().getNextZIndex(),
            createdAt: now,
            updatedAt: now
          }

          // Recalculate connector points based on new element positions
          const fromElement = newElements.find(e => e.id === newFromId)
          const toElement = newElements.find(e => e.id === newToId)

          if (fromElement && toElement && newConnector.fromAnchor && newConnector.toAnchor) {
            const fromPoint = getAnchorPoint(fromElement, newConnector.fromAnchor)
            const toPoint = getAnchorPoint(toElement, newConnector.toAnchor)
            newConnector.points = [fromPoint.x, fromPoint.y, toPoint.x, toPoint.y]
          }

          newConnectors.push(newConnector)
        }
      })

      // Add new elements and connectors to state
      set((state) => {
        state.elements.push(...newElements)
        state.connectors.push(...newConnectors)

        // Select newly pasted elements
        state.selectedIds = newElements.map(e => e.id)
      })

      get()._triggerAutoSave()
    }
  }))
)

// Optimized history management with max history limit
const MAX_HISTORY_SIZE = 20

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

function pushHistorySnapshot(get: any, set: any) {
  const state = get()
  const snapshot = {
    elements: deepClone(state.elements),
    connectors: deepClone(state.connectors)
  }
  set((s: any) => {
    // Limit history size to prevent memory bloat
    if (s.history.past.length >= MAX_HISTORY_SIZE) {
      // Remove oldest history items, keeping most recent
      s.history.past = s.history.past.slice(-(MAX_HISTORY_SIZE - 1))
    }
    s.history.past.push(snapshot)
    // Clear future history on new action
    s.history.future = []
  })
}

// Calculate anchor point coordinates
function getAnchorPoint(element: { x: number; y: number; width: number; height: number }, anchor: AnchorPosition) {
  const { x, y, width, height } = element

  switch (anchor) {
    case 'top':
      return { x: x + width / 2, y }
    case 'right':
      return { x: x + width, y: y + height / 2 }
    case 'bottom':
      return { x: x + width / 2, y: y + height }
    case 'left':
      return { x, y: y + height / 2 }
  }
}
