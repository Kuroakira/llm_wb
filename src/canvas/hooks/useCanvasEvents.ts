import { useRef, useState, useEffect, useCallback } from 'react'
import { useBoardStore } from '@/store/boardStore'
import { screenToCanvas } from '@/lib/coordinates'
import { setCursor, resetCursor, getPanCursor, getPanDraggingCursor, getConnectionCursor, getConnectionActiveCursor, getConnectionTargetCursor, getConnectionCancelCursor } from '@/lib/cursor-utils'
import { shouldAllowNativeKeyboard } from '@/lib/keyboard-utils'
import type { AnchorPosition, Tool } from '@/types'

export function useCanvasEvents() {
  const {
    elements,
    connectors,
    selectedTool,
    viewport,
    connectorDrag,
    endConnectorDrag,
    addFreeConnectorAt,
    connectionMode,
    addSticky,
    addRect,
    addText,
    addImage,
    updateElement,
    deleteElement,
    deleteConnector,
    startConnection,
    completeConnection,
    cancelConnection,
    undo,
    redo,
    copySelected,
    cutSelected,
    paste,
    setPan,
    bringToFront,
    sendToBack,
    clearSelection,
    setCursorPosition,
    autoResizeElementHeight
  } = useBoardStore()

  // ダブルクリック後の短時間はクリックを無視するフラグ
  const lastDoubleClickTime = useRef<number>(0)

  // エディター状態管理
  const [editorState, setEditorState] = useState<{
    isVisible: boolean
    elementId: string | null
    position: { x: number; y: number }
    text: string
    element: any
    originalElement: any
    elementType?: 'sticky' | 'text' | 'rect'
  }>({
    isVisible: false,
    elementId: null,
    position: { x: 0, y: 0 },
    text: '',
    element: null,
    originalElement: null,
    elementType: undefined
  })

  // カラーピッカー状態管理
  const [colorPickerState, setColorPickerState] = useState<{
    isVisible: boolean
    elementId: string | null
    position: { x: number; y: number }
    currentColor: string
  }>({
    isVisible: false,
    elementId: null,
    position: { x: 0, y: 0 },
    currentColor: ''
  })

  // パンニング状態管理（Toolbarのpan toolと統合）
  const [panState, setPanState] = useState<{
    isActive: boolean
    startPosition: { x: number; y: number } | null
    startViewport: { panX: number; panY: number } | null
  }>({
    isActive: false,
    startPosition: null,
    startViewport: null
  })

  // コンテキストメニュー状態管理
  const [contextMenuState, setContextMenuState] = useState<{
    isVisible: boolean
    elementId: string | null
    elementType: 'rect' | 'sticky' | 'text' | null
    position: { x: number; y: number }
  }>({
    isVisible: false,
    elementId: null,
    elementType: null,
    position: { x: 0, y: 0 }
  })

  // 画面座標からキャンバス座標への変換（統一化）
  const transformScreenToCanvas = useCallback((screenX: number, screenY: number) => {
    return screenToCanvas(screenX, screenY, viewport)
  }, [viewport])

  // 点がいずれかの要素と重なるかをチェック（統一化）
  const isPointOverElement = useCallback((canvasX: number, canvasY: number): boolean => {
    return elements.some(element => 
      canvasX >= element.x && 
      canvasX <= element.x + element.width &&
      canvasY >= element.y && 
      canvasY <= element.y + element.height
    )
  }, [elements])

  // マーキー選択（背景ドラッグで矩形選択）
  const [selectionRect, setSelectionRect] = useState<{
    isActive: boolean
    x: number
    y: number
    width: number
    height: number
  }>({ isActive: false, x: 0, y: 0, width: 0, height: 0 })
  // 選択ドラッグ開始位置（常に固定のアンカーとして使用）
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null)

  const normalizeRect = (x1: number, y1: number, x2: number, y2: number) => {
    const x = Math.min(x1, x2)
    const y = Math.min(y1, y2)
    const width = Math.abs(x2 - x1)
    const height = Math.abs(y2 - y1)
    return { x, y, width, height }
  }

  // 近接アンカー探索（ライン開始前でも使用）
  const getElementAnchors = (el: any) => [
    { anchor: 'top' as const, x: el.x + el.width / 2, y: el.y },
    { anchor: 'right' as const, x: el.x + el.width, y: el.y + el.height / 2 },
    { anchor: 'bottom' as const, x: el.x + el.width / 2, y: el.y + el.height },
    { anchor: 'left' as const, x: el.x, y: el.y + el.height / 2 }
  ]

  // Enhanced findSnapTarget with extended hover areas
  const findSnapTarget = (px: number, py: number) => {
    const scale = viewport?.zoom || 1
    
    // Only use extended hover areas in connector/line mode
    if (selectedTool === 'line' || selectedTool === 'connector') {
      // Import extended hover detection
      const { getPriorityHoverElement, DEFAULT_HOVER_CONFIG } = require('@/lib/geometry')
      
      // Find elements within extended hover area
      const cursorPos = { x: px, y: py }
      const elementsWithZIndex = elements.map(el => ({
        ...el,
        zIndex: el.zIndex || 0
      }))
      
      const priorityElement = getPriorityHoverElement(
        cursorPos,
        elementsWithZIndex,
        DEFAULT_HOVER_CONFIG,
        scale
      )
      
      if (priorityElement) {
        // Find closest anchor on the priority element
        const anchors = getElementAnchors(priorityElement)
        let bestAnchor: any = null
        let bestDist = Infinity
        
        for (const a of anchors) {
          const d = Math.hypot(px - a.x, py - a.y)
          if (d < bestDist) {
            bestDist = d
            bestAnchor = { elementId: priorityElement.id, anchor: a.anchor }
          }
        }
        
        return bestAnchor
      }
    }
    
    // Fallback to original anchor-based detection for non-connector modes
    const threshold = 40 / scale
    let best: any = null
    let bestDist = Infinity
    for (const el of elements) {
      const anchors = getElementAnchors(el)
      for (const a of anchors) {
        const d = Math.hypot(px - a.x, py - a.y)
        if (d < bestDist) {
          bestDist = d
          best = { elementId: el.id, anchor: a.anchor }
        }
      }
    }
    if (best && bestDist <= threshold) return best
    return null
  }

  // 交差判定（少しでも重なれば選択）
  const isElementIntersectRect = (
    el: { x: number; y: number; width: number; height: number },
    rect: { x: number; y: number; width: number; height: number }
  ) => {
    const elRight = el.x + el.width
    const elBottom = el.y + el.height
    const rectRight = rect.x + rect.width
    const rectBottom = rect.y + rect.height
    // 四辺が全て離れていない => 交差
    const noOverlap = elRight < rect.x || rectRight < el.x || elBottom < rect.y || rectBottom < el.y
    return !noOverlap
  }

  // コネクタの交差判定（線分が矩形と交差、もしくは端点が矩形内）
  const isConnectorIntersectRect = (
    c: { points: number[] },
    rect: { x: number; y: number; width: number; height: number }
  ) => {
    const [x1, y1, x2, y2] = c.points
    const rectRight = rect.x + rect.width
    const rectBottom = rect.y + rect.height
    // 端点が矩形内
    const pointInRect = (x: number, y: number) => x >= rect.x && x <= rectRight && y >= rect.y && y <= rectBottom
    if (pointInRect(x1, y1) || pointInRect(x2, y2)) return true

    // 線分と矩形各辺の交差
    const segments = [
      [rect.x, rect.y, rectRight, rect.y], // 上辺
      [rectRight, rect.y, rectRight, rectBottom], // 右辺
      [rectRight, rectBottom, rect.x, rectBottom], // 下辺
      [rect.x, rectBottom, rect.x, rect.y] // 左辺
    ] as const

    const ccw = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
      return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax)
    }
    const intersect = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) => {
      return ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy) && ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy)
    }

    for (const [rx1, ry1, rx2, ry2] of segments) {
      if (intersect(x1, y1, x2, y2, rx1, ry1, rx2, ry2)) return true
    }
    return false
  }

  // Centralized pan handler for pan tool
  const handlePanStart = useCallback((pos: { x: number; y: number }, evt: any) => {
    if (evt?.button !== 0) return false // Only left mouse button
    
    setPanState({
      isActive: true,
      startPosition: { x: pos.x, y: pos.y },
      startViewport: { panX: viewport.panX, panY: viewport.panY }
    })
    
    // Set grabbing cursor immediately
    setCursor(getPanDraggingCursor())
    return true
  }, [viewport.panX, viewport.panY])

  const handleSelectionMouseDown = (e: any) => {
    // Pan tool: Always pan on any click
    if (selectedTool === 'pan') {
      const pos = e.target.getStage().getPointerPosition?.()
      if (!pos) return
      
      if (handlePanStart(pos, e.evt)) {
        return
      }
    }

    // Select tool: Original behavior for background selection
    if (selectedTool !== 'select') return
    const targetClassName = e.target?.getClassName?.() || e.target?.constructor?.name || ''
    const isBackgroundClick = targetClassName === 'Stage' || (e.target === e.target?.getStage?.())
    if (!isBackgroundClick) return
    if (e?.evt && e.evt.button !== 0) return
    const pos = e.target.getStage().getPointerPosition?.()
    if (!pos) return
    const canvasPos = transformScreenToCanvas(pos.x, pos.y)

    // Check if cursor is over an element
    const isOverElement = isPointOverElement(canvasPos.x, canvasPos.y)

    if (isOverElement) {
      // Skip selection if over element
      return
    }

    // Background click: Start selection rectangle
    selectionStartRef.current = { x: canvasPos.x, y: canvasPos.y }
    
    // Initialize selection rectangle (not active yet)
    setSelectionRect({ isActive: false, x: canvasPos.x, y: canvasPos.y, width: 0, height: 0 })
    
    // Reset pan state for select tool
    setPanState({
      isActive: false,
      startPosition: null,
      startViewport: null
    })
  }

  // Centralized pan move handler
  const handlePanMove = useCallback((pos: { x: number; y: number }) => {
    if (!panState.isActive || !panState.startPosition || !panState.startViewport) {
      return false
    }
    
    const deltaX = pos.x - panState.startPosition.x
    const deltaY = pos.y - panState.startPosition.y
    
    setPan(
      panState.startViewport.panX + deltaX,
      panState.startViewport.panY + deltaY
    )
    return true // Indicate that panning was handled
  }, [panState, setPan])

  const handleSelectionMouseMove = (e: any) => {
    const pos = e.target.getStage().getPointerPosition?.()
    
    // Pan tool: Handle panning if active
    if (selectedTool === 'pan' && pos) {
      if (handlePanMove(pos)) {
        return // Skip other processing when panning
      }
    }
    
    // Update cursor position globally for cut/paste and proximity-based anchor visibility
    if (pos) {
      const canvasPos = transformScreenToCanvas(pos.x, pos.y)
      // Always track cursor position for features like cut/paste and connector proximity
      setCursorPosition(canvasPos)
    }

    // Enhanced line mode cursor management with connection state awareness
    if (selectedTool === 'line') {
      if (pos) {
        const canvasPos = transformScreenToCanvas(pos.x, pos.y)
        const target = findSnapTarget(canvasPos.x, canvasPos.y)
        const setHover = useBoardStore.getState().setConnectorHoverTarget
        
        // Update hover target for visual feedback
        if (target) { try { setHover(target) } catch {} } else { try { setHover(null) } catch {} }
        
        // 2クリック方式：カーソル管理（統一化）
        const targetClassName = e.target?.getClassName?.() || e.target?.constructor?.name || ''
        const isBackgroundArea = targetClassName === 'Stage' || (e.target === e.target?.getStage?.())
        
        if (connectionMode.isActive) {
          // 2クリック方式：第1クリック完了済み、第2クリック待機中
          if (target && target.elementId !== connectionMode.fromElementId) {
            setCursor(getConnectionTargetCursor())
          } else if (isBackgroundArea) {
            setCursor(getConnectionCancelCursor())
          } else {
            setCursor(getConnectionActiveCursor())
          }
        } else {
          // 2クリック方式：第1クリック待機状態
          setCursor(getConnectionCursor())
        }
      }
    }

    // Select tool: Handle selection rectangle
    if (selectedTool === 'select' && selectionStartRef.current && !selectionRect.isActive && pos) {
      const canvasPos = transformScreenToCanvas(pos.x, pos.y)
      const deltaX = Math.abs(canvasPos.x - selectionStartRef.current.x)
      const deltaY = Math.abs(canvasPos.y - selectionStartRef.current.y)
      
      // 5px以上移動したら選択矩形モードに移行
      if (deltaX > 5 || deltaY > 5) {
        setSelectionRect({ isActive: true, x: selectionStartRef.current.x, y: selectionStartRef.current.y, width: 0, height: 0 })
      }
    }

    if (selectionRect.isActive && pos) {
      const canvasPos = transformScreenToCanvas(pos.x, pos.y)
      const start = selectionStartRef.current || { x: selectionRect.x, y: selectionRect.y }
      const rect = normalizeRect(start.x, start.y, canvasPos.x, canvasPos.y)
      setSelectionRect({ isActive: true, ...rect })
    }
  }

  // Centralized pan end handler
  const handlePanEnd = useCallback(() => {
    if (!panState.isActive) return false
    
    setPanState({
      isActive: false,
      startPosition: null,
      startViewport: null
    })
    
    // Reset cursor to grab (not default) for pan tool
    if (selectedTool === 'pan') {
      setCursor(getPanCursor())
    } else {
      resetCursor()
    }
    return true
  }, [panState.isActive, selectedTool])

  const handleSelectionMouseUp = (e: any) => {
    // Pan tool: End panning
    if (selectedTool === 'pan') {
      if (handlePanEnd()) {
        return
      }
    }

    // Select tool: Handle selection rectangle completion
    if (selectedTool === 'select') {
      // Selection rectangle processing
      if (selectionRect.isActive) {
        const rect = selectionRect
        const pickedShapeIds = elements.filter((el) => isElementIntersectRect(el, rect)).map((el) => el.id)
        const pickedConnectorIds = connectors.filter((c) => isConnectorIntersectRect(c, rect)).map((c: any) => c.id)
        const store: any = useBoardStore.getState()

        // Shift key for additive selection
        const isAdd = !!(e?.evt && e.evt.shiftKey)
        if (isAdd) {
          const prevShapeIds: string[] = store.selectedIds || []
          const prevConnectorIds: string[] = store.selectedConnectorIds || []
          const unionShapes = Array.from(new Set([...(prevShapeIds || []), ...pickedShapeIds]))
          const unionConnectors = Array.from(new Set([...(prevConnectorIds || []), ...pickedConnectorIds]))
          if (unionShapes.length > 0) store.selectShapes(unionShapes)
          if (unionConnectors.length > 0) store.selectConnectors(unionConnectors)
        } else {
          store.selectShapesAndConnectors(pickedShapeIds, pickedConnectorIds)
        }

        setSelectionRect({ isActive: false, x: 0, y: 0, width: 0, height: 0 })
      }
      
      // Clean up selection state
      selectionStartRef.current = null
    }

    // Ensure pan state is clean (already handled by handlePanEnd if needed)
    if (selectedTool !== 'pan') {
      handlePanEnd()
    }
  }

  // Track previous tool for spacebar temporary pan mode
  const [previousTool, setPreviousToolState] = useState<Tool>('select')
  const [isSpacebarPanning, setSpacebarPanning] = useState(false)

  // CRITICAL: Only handle canvas-specific shortcuts, NEVER interfere with text input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Use centralized keyboard utility for consistent behavior
      if (shouldAllowNativeKeyboard(e)) {
        return
      }

      // エディターが開いている場合もスキップ
      if (editorState.isVisible) {
        return
      }

      // Spacebar: Temporary pan mode (hold to pan, release to return to previous tool)
      if (e.code === 'Space' && !e.repeat && !isSpacebarPanning) {
        e.preventDefault()
        const { selectedTool, selectTool } = useBoardStore.getState()
        if (selectedTool !== 'pan') {
          setPreviousToolState(selectedTool)
          setSpacebarPanning(true)
          selectTool('pan')
        }
        return
      }

      // H key: Toggle pan tool permanently
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault()
        const { selectedTool, selectTool } = useBoardStore.getState()
        if (selectedTool === 'pan') {
          selectTool('select') // Return to select tool
        } else {
          selectTool('pan') // Switch to pan tool
        }
        return
      }

      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()

        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }

      // Copy: Ctrl/Cmd + C
      if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        console.log('[Clipboard] Copy triggered, selectedIds:', useBoardStore.getState().selectedIds)
        copySelected()
        console.log('[Clipboard] Clipboard after copy:', useBoardStore.getState().clipboard)
        return
      }

      // Cut: Ctrl/Cmd + X
      if (e.key === 'x' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        console.log('[Clipboard] Cut triggered, selectedIds:', useBoardStore.getState().selectedIds)
        cutSelected()
        return
      }

      // Paste: Ctrl/Cmd + V
      if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        console.log('[Clipboard] Paste triggered, clipboard:', useBoardStore.getState().clipboard)
        paste()
        console.log('[Clipboard] Elements after paste:', useBoardStore.getState().elements.length)
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        const { selectedIds, selectedConnectorIds, deleteElements, deleteConnector, clearSelection } = useBoardStore.getState()
        if (selectedIds && selectedIds.length > 0) {
          deleteElements(selectedIds)
          clearSelection()
          return
        }
        if (selectedConnectorIds && selectedConnectorIds.length > 0) {
          for (const cid of selectedConnectorIds) {
            deleteConnector(cid)
          }
          clearSelection()
        }
        return
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Use centralized keyboard utility for consistent behavior
      if (shouldAllowNativeKeyboard(e)) {
        return
      }

      // Spacebar release: Return to previous tool
      if (e.code === 'Space' && isSpacebarPanning) {
        e.preventDefault()
        const { selectTool } = useBoardStore.getState()
        selectTool(previousTool)
        setSpacebarPanning(false)
        return
      }
    }

    // イベントリスナーを追加
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    // クリーンアップ
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [connectors, editorState.isVisible, elements, deleteElement, deleteConnector, updateElement, undo, redo, copySelected, cutSelected, paste, bringToFront, sendToBack, isSpacebarPanning, previousTool])

  const handleStageClick = (e: any) => {
    // ダブルクリック後200ms以内のクリックは無視
    const now = Date.now()
    if (now - lastDoubleClickTime.current < 200) {
      return
    }

    // 編集モード中は背景クリックでの付箋作成を無効化
    if (document.querySelector('[data-testid="sticky-editor"]')) {
      return
    }

    // Pan tool: Do nothing on click (panning is handled in mouse down/move/up)
    if (selectedTool === 'pan') {
      return
    }

    // 背景をクリックした場合の処理（付箋などの要素以外）
    const targetClassName = e.target?.getClassName?.() || e.target?.constructor?.name || ''
    const isBackgroundClick = targetClassName === 'Stage' ||
                             (e.target === e.target?.getStage?.())

    // StickyNoteのGroupやRectをクリックした場合は処理しない
    const isElementClick = targetClassName === 'Group' ||
                          targetClassName === 'Rect' ||
                          targetClassName === 'Text'

    if (isBackgroundClick && !isElementClick) {
      // 選択ツールの場合は選択を解除
      if (selectedTool === 'select') {
        clearSelection()
      } else if (selectedTool === 'sticky') {
        // 付箋ツールが選択されている場合は付箋を作成
        const pos = e.target.getStage().getPointerPosition()
        const canvasPos = transformScreenToCanvas(pos.x, pos.y)
        addSticky({ x: canvasPos.x, y: canvasPos.y })

        // 付箋作成後は自動で選択ツールに戻る（Figmaライク）
        const { selectTool } = useBoardStore.getState()
        selectTool('select')
      } else if (selectedTool === 'rect') {
        // 矩形ツールが選択されている場合は矩形を作成
        const pos = e.target.getStage().getPointerPosition()
        const canvasPos = transformScreenToCanvas(pos.x, pos.y)
        addRect({ x: canvasPos.x, y: canvasPos.y })

        // 矩形作成後は自動で選択ツールに戻る（Figmaライク）
        const { selectTool } = useBoardStore.getState()
        selectTool('select')
      } else if (selectedTool === 'text') {
        // テキストツールが選択されている場合はテキストを作成
        const pos = e.target.getStage().getPointerPosition()
        const canvasPos = transformScreenToCanvas(pos.x, pos.y)
        addText({ x: canvasPos.x, y: canvasPos.y })

        // テキスト作成後は自動で選択ツールに戻る（Figmaライク）
        const { selectTool } = useBoardStore.getState()
        selectTool('select')
      } else if (selectedTool === 'line') {
        // 真の2クリック方式：クリック状態を維持せずマウスを自由に動かす
        // 第1クリック → 即座に完了（ドラッグ不要）→ マウス自由移動 → 第2クリック
        const pos = e.target.getStage().getPointerPosition()
        const canvasPos = transformScreenToCanvas(pos.x, pos.y)
        const target = findSnapTarget(canvasPos.x, canvasPos.y)
        
        if (connectionMode.isActive) {
          // 第2クリック：接続完了またはキャンセル（クリック状態は既に解放済み）
          if (target && target.elementId !== connectionMode.fromElementId) {
            // 異なる要素への接続 → 完了
            completeConnection(target.elementId, target.anchor as AnchorPosition)
            try { useBoardStore.getState().setConnectorHoverTarget(null) } catch {}
          } else {
            // 同じ要素または背景 → 部分接続を作成
            const { createPartialConnection } = useBoardStore.getState()
            createPartialConnection(canvasPos)
            try { useBoardStore.getState().setConnectorHoverTarget(null) } catch {}
          }
        } else {
          // 第1クリック：接続開始（このクリックは即座に完了、ドラッグ状態なし）
          if (target) {
            // アンカーポイントから接続開始
            try { useBoardStore.getState().setConnectorHoverTarget(target) } catch {}
            startConnection(target.elementId, target.anchor as AnchorPosition)
          } else {
            // 近くにアンカーなし → 自由線を作成
            const id = addFreeConnectorAt({ x: canvasPos.x, y: canvasPos.y, length: 80 })
            const { selectConnector, selectTool } = useBoardStore.getState()
            selectConnector(id)
            selectTool('select')
          }
        }
      } else {
        // 何もしない（選択状態なし）
      }
    }
  }

  const handleStageDoubleClick = (e: any) => {
    // ダブルクリック時刻を記録
    lastDoubleClickTime.current = Date.now()

    // 編集モード中は完全に無視
    if (document.querySelector('[data-testid="sticky-editor"]')) {
      return
    }

    // 付箋のTextやGroupをダブルクリックした場合は何もしない
    const targetClassName = e.target?.getClassName?.() || ''
    const isElementDoubleClick = targetClassName === 'Group' ||
                                targetClassName === 'Rect' ||
                                targetClassName === 'Text'

    if (isElementDoubleClick) {
      return // 何もしない
    }

    // ダブルクリックでは付箋を作成しない（編集モードとの干渉を防ぐ）
    if (e && e.evt) {
      e.evt.stopPropagation()
      e.evt.preventDefault()
    }
    if (e && e.cancelBubble !== undefined) {
      e.cancelBubble = true
    }
  }

  // 選択機能は削除（シンプルなUX）

  const handleElementUpdate = (id: string, updates: any) => {
    updateElement(id, updates)
  }

  // 移動・リサイズは新しい実装ではKonvaで直接処理

  const handleElementDoubleClick = (elementId: string, element: any, stageRefOrPosition: any) => {
    // 矩形は右クリックでコンテキストメニューを使用するため、ダブルクリックは無効
    if (element.type === 'rect') {
      return
    }

    // 現在のビューポート状態を取得
    const { viewport } = useBoardStore.getState()

    // For HTML fallback, we don't have a stage
    if (!stageRefOrPosition || !stageRefOrPosition.getStage) {
      // HTML版：ズーム・パン・スクロール位置を考慮した座標計算
      const canvasContainer = document.querySelector('.canvas-scroll') as HTMLElement
      const canvasRect = canvasContainer?.getBoundingClientRect()

      if (canvasRect) {
        // 要素の画面上での実際の位置を計算
        const screenX = canvasRect.left + (element.x * viewport.zoom) + viewport.panX
        const screenY = canvasRect.top + (element.y * viewport.zoom) + viewport.panY

        setEditorState({
          isVisible: true,
          elementId,
          position: {
            x: screenX,
            y: screenY
          },
          text: element.text || '',
          element: {
            ...element,
            // ズームに合わせてサイズを調整
            width: element.width * viewport.zoom,
            height: element.height * viewport.zoom
          },
          originalElement: element, // Keep original element for auto-sizing calculations
          elementType: element.type || undefined
        })
      }
      return
    }

    // For Konva version
    const stage = stageRefOrPosition.getStage()
    if (stage) {
      const stageBox = stage.container().getBoundingClientRect()
      // ステージ座標をスクリーン座標に変換（ズーム・パン・スクロールを考慮）
      const screenX = stageBox.left + (element.x * viewport.zoom) + viewport.panX
      const screenY = stageBox.top + (element.y * viewport.zoom) + viewport.panY

      setEditorState({
        isVisible: true,
        elementId,
        position: {
          x: screenX,
          y: screenY
        },
        text: element.text || '',
        element: {
          ...element,
          // ズームに合わせてサイズを調整
          width: element.width * viewport.zoom,
          height: element.height * viewport.zoom
        },
        originalElement: element, // Keep original element for auto-sizing calculations
        elementType: element.type || undefined
      })
    }
  }

  const handleEditorFinish = () => {
    const elementId = editorState.elementId
    if (elementId && editorState.text !== editorState.element?.text) {
      updateElement(elementId, { text: editorState.text })
      
      // Trigger auto-resize after text is updated with longer delay for large text
      setTimeout(() => {
        autoResizeElementHeight(elementId)
      }, 100) // Increased delay to ensure text measurement works for large content
      
      // Additional retry for very large text content
      setTimeout(() => {
        autoResizeElementHeight(elementId)
      }, 300) // Second attempt with longer delay
    }
    setEditorState({
      isVisible: false,
      elementId: null,
      position: { x: 0, y: 0 },
      text: '',
      element: null,
      originalElement: null
    })
  }

  const handleEditorTextChange = (text: string) => {
    setEditorState(prev => ({ ...prev, text }))
  }

  // カラーピッカーのハンドラー
  const handleColorChange = (color: string) => {
    if (colorPickerState.elementId) {
      updateElement(colorPickerState.elementId, { fill: color })
      setColorPickerState(prev => ({ ...prev, currentColor: color }))
    }
  }

  const handleColorPickerClose = () => {
    setColorPickerState({
      isVisible: false,
      elementId: null,
      position: { x: 0, y: 0 },
      currentColor: ''
    })
  }

  // コンテキストメニューのハンドラー
  const handleContextMenu = (elementId: string, element: any, position: { x: number; y: number }) => {
    // カラーピッカーが開いている場合は閉じる
    if (colorPickerState.isVisible) {
      handleColorPickerClose()
    }

    setContextMenuState({
      isVisible: true,
      elementId,
      elementType: element.type || null,
      position
    })
  }

  const handleContextMenuClose = () => {
    setContextMenuState({
      isVisible: false,
      elementId: null,
      elementType: null,
      position: { x: 0, y: 0 }
    })
  }

  const handleContextMenuColorChange = () => {
    if (contextMenuState.elementId && contextMenuState.elementType === 'rect') {
      const element = elements.find(el => el.id === contextMenuState.elementId)
      if (element && element.type === 'rect') {
        setColorPickerState({
          isVisible: true,
          elementId: contextMenuState.elementId,
          position: contextMenuState.position,
          currentColor: element.fill || '#E3F2FD'
        })
      }
    }
  }

  const handleContextMenuBringToFront = () => {
    if (contextMenuState.elementId) {
      bringToFront(contextMenuState.elementId)
      handleContextMenuClose()
    }
  }

  const handleContextMenuSendToBack = () => {
    if (contextMenuState.elementId) {
      sendToBack(contextMenuState.elementId)
      handleContextMenuClose()
    }
  }

  // ドラッグオーバー処理（ドロップを許可）
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    
    // 画像ファイルまたは付箋データの場合にドロップを許可
    const hasImageFiles = Array.from(e.dataTransfer.items).some(item => item.type.startsWith('image/'))
    const hasStickyData = e.dataTransfer.types.includes('application/sticky-note')
    
    if (hasImageFiles || hasStickyData) {
      e.dataTransfer.dropEffect = 'copy'
    } else {
      e.dataTransfer.dropEffect = 'none'
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()

    try {
      // ドロップ位置をキャンバス座標に変換（共通処理）
      const rect = (e.currentTarget as Element).getBoundingClientRect()
      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top
      const canvasPos = transformScreenToCanvas(screenX, screenY)

      // 1. 画像ファイルのドロップを処理
      const files = Array.from(e.dataTransfer.files)
      const imageFiles = files.filter(file => file.type.startsWith('image/'))
      
      if (imageFiles.length > 0) {
        // 最初の画像ファイルのみ処理
        const imageFile = imageFiles[0]
        
        const reader = new FileReader()
        reader.onload = (event) => {
          if (!event.target?.result) return
          
          const src = event.target.result as string
          
          // 画像のサイズを取得してキャンバスに追加
          const img = new Image()
          img.onload = () => {
            addImage({
              x: canvasPos.x,
              y: canvasPos.y,
              src,
              originalWidth: img.naturalWidth,
              originalHeight: img.naturalHeight
            })
          }
          img.src = src
        }
        reader.readAsDataURL(imageFile)
        return
      }

      const stickyData = e.dataTransfer.getData('application/sticky-note')

      if (!stickyData) {
        return
      }

      const data = JSON.parse(stickyData)

      if (!['left-chat-panel', 'chat-history', 'chat-panel'].includes(data.source)) {
        return
      }

      addSticky({
        x: canvasPos.x,
        y: canvasPos.y,
        text: data.text,
        isFromLLM: true
      })

    } catch (error) {
      // Handle error silently
    }
  }

  // 真の2クリック方式：接続ポイント直接クリック処理
  // 重要：マウスボタンを押し続ける必要なし、純粋なクリック→リリース→移動→クリック
  const handleConnectionPointClick = (elementId: string, anchor: AnchorPosition) => {
    if (selectedTool !== 'line') {
      // Auto-switch to line tool when user clicks anchor points
      // This provides intuitive UX: hover shows anchors, click starts connection
      const { selectTool } = useBoardStore.getState()
      selectTool('line')
      // Continue with connection logic after tool switch
    }

    if (!connectionMode.isActive) {
      // 第1クリック：接続開始（このクリックは即座に完了、ドラッグ開始ではない）
      // ユーザーはマウスボタンを離し、自由にカーソルを動かせる
      try { useBoardStore.getState().setConnectorHoverTarget({ elementId, anchor }) } catch {}
      startConnection(elementId, anchor)
      // ここでクリックは完全に終了、ドラッグモードには入らない
    } else {
      // 第2クリック：接続完了または取り消し（独立したクリック操作）
      if (connectionMode.fromElementId !== elementId) {
        // 異なる要素への接続 → 完了
        completeConnection(elementId, anchor)
      } else {
        // 同じ要素への再クリック → キャンセル
        cancelConnection()
      }
      // 第2クリック完了後、ホバー状態をクリア
      try { useBoardStore.getState().setConnectorHoverTarget(null) } catch {}
    }
  }

  // ESC key handling: cancel operations and return to select mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const { selectTool, editingTextId } = useBoardStore.getState()

        // Don't interrupt text editing
        if (editingTextId) {
          return
        }

        // Cancel line mode connection if active
        if (selectedTool === 'line' && connectionMode.isActive) {
          cancelConnection()
          try {
            useBoardStore.getState().setConnectorHoverTarget(null)
            setCursorPosition(null)
          } catch {}
        }

        // Cancel connector drag if active
        if (connectorDrag.isActive) {
          endConnectorDrag()
          try {
            useBoardStore.getState().setConnectorHoverTarget(null)
            setCursorPosition(null)
          } catch {}
        }

        // Always return to select mode after canceling operations
        if (selectedTool !== 'select') {
          selectTool('select')
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedTool, connectionMode.isActive, cancelConnection, connectorDrag.isActive, endConnectorDrag, setCursorPosition])
  
  // Clear cursor position when tool changes away from connector tools
  useEffect(() => {
    if (selectedTool !== 'line' && !connectorDrag.isActive) {
      setCursorPosition(null)
    }
  }, [selectedTool, connectorDrag.isActive, setCursorPosition])

  return {
    editorState,
    colorPickerState,
    contextMenuState,
    screenToCanvas: transformScreenToCanvas,
    handleStageClick,
    handleStageDoubleClick,
    handleSelectionMouseDown,
    handleSelectionMouseMove,
    handleSelectionMouseUp,
    handleElementUpdate,
    handleElementDoubleClick,
    handleContextMenu,
    handleEditorFinish,
    handleEditorTextChange,
    handleColorChange,
    handleColorPickerClose,
    handleContextMenuClose,
    handleContextMenuColorChange,
    handleContextMenuBringToFront,
    handleContextMenuSendToBack,
    handleDragOver,
    handleDrop,
    handleConnectionPointClick,
    // 線モード関連の状態
    isLineMode: selectedTool === 'line',
    connectionMode,
    selectionRect,
    // パンニング状態
    panState,
    isPointOverElement
  }
}
