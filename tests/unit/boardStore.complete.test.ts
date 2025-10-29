import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useBoardStore } from '../../src/store/boardStore'
import type { CanvasElement, StickyElement, TextElement, RectElement, Connector } from '../../src/types'

// 依存関数をモック
vi.mock('nanoid', () => ({
  nanoid: () => 'test-id-' + Math.random()
}))

// snapUtilsをモック
vi.mock('../../src/lib/snapUtils', () => ({
  calculateStickySize: (text: string) => ({ width: 200, height: 100 }),
  estimateStickySize: (text: string) => ({ width: 200, height: 100 })
}))

describe('boardStore - 完全なfunctionalitytest', () => {
  beforeEach(() => {
    // ストアをリセット
    useBoardStore.setState({
      elements: [],
      connectors: [],
      selectedIds: [],
      editingTextId: undefined,
      history: { past: [], future: [] },
      mode: 'select',
      selectedTool: 'select',
      viewport: { zoom: 1, panX: 0, panY: 0 },
      isDraggingConnector: false,
      connectorDrag: { isActive: false },
      connectorHoverTarget: null,
      pendingConnection: null
    })
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  describe('要素のcreate', () => {
    it('addSticky - sticky noteをcreateする', () => {
      const id = useBoardStore.getState().addSticky({ x: 100, y: 100, text: 'teststicky note' })

      expect(id).toBeTruthy()
      
      // 状態を再取得
      const { elements } = useBoardStore.getState()
      expect(elements).toHaveLength(1)
      
      const sticky = elements[0] as StickyElement
      expect(sticky.type).toBe('sticky')
      expect(sticky.x).toBe(100)
      expect(sticky.y).toBe(100)
      expect(sticky.text).toBe('teststicky note')
      expect(sticky.width).toBe(200)
      expect(sticky.height).toBe(150)
      expect(sticky.color).toBe('#FFF2B2')
    })

    it('addText - textをcreateする', () => {
      const id = useBoardStore.getState().addText({ x: 150, y: 150, text: 'text要素' })

      const { elements } = useBoardStore.getState()
      expect(elements).toHaveLength(1)
      
      const text = elements[0] as TextElement
      expect(text.type).toBe('text')
      expect(text.x).toBe(150)
      expect(text.y).toBe(150)
      expect(text.text).toBe('text要素')
      expect(text.fontSize).toBe(16)
      expect(text.fontFamily).toBe('Arial')
    })

    it('addRect - rectangleをcreateする', () => {
      const id = useBoardStore.getState().addRect({ x: 200, y: 200 })

      const { elements } = useBoardStore.getState()
      expect(elements).toHaveLength(1)
      
      const rect = elements[0] as RectElement
      expect(rect.type).toBe('rect')
      expect(rect.x).toBe(200)
      expect(rect.y).toBe(200)
      expect(rect.width).toBe(200)
      expect(rect.height).toBe(150)
      expect(rect.fill).toBe('transparent')
      expect(rect.stroke).toBe('#000000')
      expect(rect.strokeWidth).toBe(2)
    })

    it('getNextZIndex - 次のzIndexを正しく計算する', () => {
      // 要素がない場合は1を返す
      expect(useBoardStore.getState().getNextZIndex()).toBe(1)
      
      // 要素を追加
      useBoardStore.getState().addSticky({ x: 0, y: 0 })
      useBoardStore.getState().addText({ x: 50, y: 50 })
      
      // 最大値 + 1 を返す
      const { elements } = useBoardStore.getState()
      const maxZ = Math.max(...elements.map(e => e.zIndex || 0))
      expect(useBoardStore.getState().getNextZIndex()).toBe(maxZ + 1)
    })
  })

  describe('要素の更新', () => {
    it('updateElement - 要素のプロパティを更新する', () => {
      const store = useBoardStore.getState()
      const id = store.addSticky({ x: 100, y: 100 })
      
      store.updateElement(id, { 
        x: 200, 
        y: 300, 
        text: '更新されたtext' 
      })
      
      const element = store.elements.find(e => e.id === id)
      expect(element?.x).toBe(200)
      expect(element?.y).toBe(300)
      expect((element as StickyElement).text).toBe('更新されたtext')
    })

    it('updateElement - 履歴にスナップショットをsaveする', () => {
      const store = useBoardStore.getState()
      const id = store.addSticky({ x: 100, y: 100 })
      
      const initialHistoryLength = store.history.past.length
      
      store.updateElement(id, { x: 200 })
      
      expect(store.history.past.length).toBe(initialHistoryLength + 1)
    })

    it('moveElement - 要素をmoveする', () => {
      const store = useBoardStore.getState()
      const id = store.addRect({ x: 50, y: 50 })
      
      store.moveElement(id, { x: 100, y: 150 })
      
      const element = store.elements.find(e => e.id === id)
      expect(element?.x).toBe(100)
      expect(element?.y).toBe(150)
    })

    it('bringToFront - 要素を最前面にmoveする', () => {
      const store = useBoardStore.getState()
      const id1 = store.addSticky({ x: 0, y: 0 })
      const id2 = store.addSticky({ x: 50, y: 50 })
      const id3 = store.addSticky({ x: 100, y: 100 })
      
      store.bringToFront(id1)
      
      const element = store.elements.find(e => e.id === id1)
      const otherElements = store.elements.filter(e => e.id !== id1)
      
      expect(element!.zIndex).toBeGreaterThan(Math.max(...otherElements.map(e => e.zIndex || 0)))
    })

    it('sendToBack - 要素を最背面にmoveする', () => {
      const store = useBoardStore.getState()
      const id1 = store.addSticky({ x: 0, y: 0 })
      const id2 = store.addSticky({ x: 50, y: 50 })
      const id3 = store.addSticky({ x: 100, y: 100 })
      
      store.sendToBack(id3)
      
      const element = store.elements.find(e => e.id === id3)
      const otherElements = store.elements.filter(e => e.id !== id3)
      
      expect(element!.zIndex).toBeLessThan(Math.min(...otherElements.map(e => e.zIndex || 1)))
    })
  })

  describe('要素のdelete', () => {
    it('deleteElement - 要素をdeleteする', () => {
      const store = useBoardStore.getState()
      const id = store.addSticky({ x: 100, y: 100 })
      
      expect(store.elements).toHaveLength(1)
      
      store.deleteElement(id)
      
      expect(store.elements).toHaveLength(0)
      expect(store.elements.find(e => e.id === id)).toBeUndefined()
    })

    it('deleteElement - 関連するconnectorもdeleteする', () => {
      const store = useBoardStore.getState()
      const id1 = store.addSticky({ x: 0, y: 0 })
      const id2 = store.addSticky({ x: 100, y: 100 })
      
      store.addConnector(
        { id: id1, anchor: 'right' }, 
        { id: id2, anchor: 'left' }
      )
      
      expect(store.connectors).toHaveLength(1)
      
      store.deleteElement(id1)
      
      // id1に関連するconnectorがdeleteされる
      expect(store.connectors).toHaveLength(0)
    })

    it('deleteElements - 複数要素をdeleteする', () => {
      const store = useBoardStore.getState()
      const id1 = store.addSticky({ x: 0, y: 0 })
      const id2 = store.addText({ x: 50, y: 50 })
      const id3 = store.addRect({ x: 100, y: 100 })
      
      store.deleteElements([id1, id3])
      
      expect(store.elements).toHaveLength(1)
      expect(store.elements[0].id).toBe(id2)
    })

    it('clearAll - すべてをClearする', () => {
      const store = useBoardStore.getState()
      store.addSticky({ x: 0, y: 0 })
      store.addText({ x: 50, y: 50 })
      store.addConnector({
        fromId: 'dummy1',
        toId: 'dummy2',
        points: [0, 0, 100, 100]
      })
      
      store.selectShape(store.elements[0].id)
      
      expect(store.elements.length).toBeGreaterThan(0)
      expect(store.connectors.length).toBeGreaterThan(0)
      expect(store.selectedIds.length).toBeGreaterThan(0)
      
      store.clearAll()
      
      expect(store.elements).toHaveLength(0)
      expect(store.connectors).toHaveLength(0)
      expect(store.selectedIds).toHaveLength(0)
      expect(store.history.past).toHaveLength(0)
      expect(store.history.future).toHaveLength(0)
    })
  })

  describe('selection管理', () => {
    it('selectShape - 単一要素をselectionする', () => {
      const store = useBoardStore.getState()
      const id = store.addSticky({ x: 0, y: 0 })
      
      store.selectShape(id)
      
      expect(store.selectedIds).toEqual([id])
    })

    it('selectShapes - 複数要素をselectionする', () => {
      const store = useBoardStore.getState()
      const id1 = store.addSticky({ x: 0, y: 0 })
      const id2 = store.addText({ x: 50, y: 50 })
      
      store.selectShapes([id1, id2])
      
      expect(store.selectedIds).toHaveLength(2)
      expect(store.selectedIds).toContain(id1)
      expect(store.selectedIds).toContain(id2)
    })

    it('toggleSelection - selection状態をトグルする', () => {
      const store = useBoardStore.getState()
      const id = store.addSticky({ x: 0, y: 0 })
      
      // 最初はselectionされていない
      expect(store.selectedIds).not.toContain(id)
      
      // トグルでselection
      store.toggleSelection(id)
      expect(store.selectedIds).toContain(id)
      
      // 再度トグルでselection解除
      store.toggleSelection(id)
      expect(store.selectedIds).not.toContain(id)
    })

    it('clearSelection - selectionをClearする', () => {
      const store = useBoardStore.getState()
      const id1 = store.addSticky({ x: 0, y: 0 })
      const id2 = store.addText({ x: 50, y: 50 })
      
      store.selectShapes([id1, id2])
      expect(store.selectedIds).toHaveLength(2)
      
      store.clearSelection()
      expect(store.selectedIds).toHaveLength(0)
    })

    it('deleteSelected - selection中の要素をdeleteする', () => {
      const store = useBoardStore.getState()
      const id1 = store.addSticky({ x: 0, y: 0 })
      const id2 = store.addText({ x: 50, y: 50 })
      const id3 = store.addRect({ x: 100, y: 100 })
      
      store.selectShapes([id1, id3])
      store.deleteSelected()
      
      expect(store.elements).toHaveLength(1)
      expect(store.elements[0].id).toBe(id2)
      expect(store.selectedIds).toHaveLength(0)
    })
  })

  describe('connector管理', () => {
    it('addConnector - connectorを追加する', () => {
      const store = useBoardStore.getState()
      const id1 = store.addSticky({ x: 0, y: 0 })
      const id2 = store.addSticky({ x: 100, y: 100 })
      
      const connectorId = store.addConnector({
        fromId: id1,
        toId: id2,
        points: [50, 50, 150, 150]
      })
      
      expect(connectorId).toBeTruthy()
      expect(store.connectors).toHaveLength(1)
      
      const connector = store.connectors[0]
      expect(connector.fromId).toBe(id1)
      expect(connector.toId).toBe(id2)
      expect(connector.points).toEqual([50, 50, 150, 150])
    })

    it('updateConnector - connectorを更新する', () => {
      const store = useBoardStore.getState()
      const connectorId = store.addConnector({
        fromId: 'id1',
        toId: 'id2',
        points: [0, 0, 100, 100]
      })
      
      store.updateConnector(connectorId, {
        points: [50, 50, 150, 150],
        fromAnchor: 'top',
        toAnchor: 'bottom'
      })
      
      const connector = store.connectors.find(c => c.id === connectorId)
      expect(connector?.points).toEqual([50, 50, 150, 150])
      expect(connector?.fromAnchor).toBe('top')
      expect(connector?.toAnchor).toBe('bottom')
    })

    it('deleteConnector - connectorをdeleteする', () => {
      const store = useBoardStore.getState()
      const connectorId = store.addConnector({
        fromId: 'id1',
        toId: 'id2',
        points: [0, 0, 100, 100]
      })
      
      expect(store.connectors).toHaveLength(1)
      
      store.deleteConnector(connectorId)
      
      expect(store.connectors).toHaveLength(0)
    })

    it('updateConnectors - すべてのconnectorの位置を再計算する', () => {
      const store = useBoardStore.getState()
      const id1 = store.addSticky({ x: 0, y: 0 })
      const id2 = store.addSticky({ x: 200, y: 200 })
      
      store.addConnector({
        fromId: id1,
        toId: id2,
        points: [0, 0, 0, 0] // 仮の値
      })
      
      store.updateConnectors()
      
      // 実際の要素位置に基づいてpointsが更新される
      const connector = store.connectors[0]
      expect(connector.points).not.toEqual([0, 0, 0, 0])
      // 正確な値は geometry 関数に依存
    })
  })

  describe('履歴管理（Undo/Redo）', () => {
    it('undo - 直前の操作を取り消す', () => {
      const store = useBoardStore.getState()
      const id = store.addSticky({ x: 100, y: 100, text: '初期' })
      
      store.updateElement(id, { text: '変更後' })
      
      const element = store.elements.find(e => e.id === id)
      expect((element as StickyElement).text).toBe('変更後')
      
      store.undo()
      
      const revertedElement = store.elements.find(e => e.id === id)
      expect((revertedElement as StickyElement).text).toBe('初期')
    })

    it('redo - 取り消した操作をやり直す', () => {
      const store = useBoardStore.getState()
      const id = store.addSticky({ x: 100, y: 100, text: '初期' })
      
      store.updateElement(id, { text: '変更後' })
      store.undo()
      
      const element = store.elements.find(e => e.id === id)
      expect((element as StickyElement).text).toBe('初期')
      
      store.redo()
      
      const redoneElement = store.elements.find(e => e.id === id)
      expect((redoneElement as StickyElement).text).toBe('変更後')
    })

    it('canUndo/canRedo - Undo/Redo可能状態を返す', () => {
      const store = useBoardStore.getState()
      
      expect(store.canUndo()).toBe(false)
      expect(store.canRedo()).toBe(false)
      
      store.addSticky({ x: 0, y: 0 })
      
      expect(store.canUndo()).toBe(true)
      expect(store.canRedo()).toBe(false)
      
      store.undo()
      
      expect(store.canUndo()).toBe(false)
      expect(store.canRedo()).toBe(true)
    })

    it('履歴が20件を超えたら古いものからdeleteされる', () => {
      const store = useBoardStore.getState()
      
      // 25件の操作を行う
      for (let i = 0; i < 25; i++) {
        store.addSticky({ x: i * 10, y: i * 10 })
      }
      
      // 履歴は20件まで
      expect(store.history.past.length).toBeLessThanOrEqual(20)
    })
  })

  describe('モード管理', () => {
    it('setMode - モードを切り替える', () => {
      const store = useBoardStore.getState()
      
      expect(store.mode).toBe('select')
      
      store.setMode('editingText')
      expect(store.mode).toBe('editingText')
      
      store.setMode('idle')
      expect(store.mode).toBe('idle')
    })

    it('startEditingText - textedit modeを開始する', () => {
      const store = useBoardStore.getState()
      const id = store.addSticky({ x: 0, y: 0 })
      
      store.startEditingText(id)
      
      expect(store.mode).toBe('editingText')
      expect(store.editingTextId).toBe(id)
    })

    it('finishEditingText - textedit modeを終了する', () => {
      const store = useBoardStore.getState()
      const id = store.addSticky({ x: 0, y: 0 })
      
      store.startEditingText(id)
      store.finishEditingText()
      
      expect(store.mode).toBe('select')
      expect(store.editingTextId).toBeNull()
    })

    it('setTool - ツールを切り替える', () => {
      const store = useBoardStore.getState()
      
      expect(store.tool).toBe('select')
      
      store.setTool('sticky')
      expect(store.tool).toBe('sticky')
      
      store.setTool('connector')
      expect(store.tool).toBe('connector')
    })
  })

  describe('ビューポート管理', () => {
    it('setViewport - ビューポートを設定する', () => {
      const store = useBoardStore.getState()
      
      store.setViewport({ zoom: 1.5, panX: 100, panY: 50 })
      
      expect(store.viewport.zoom).toBe(1.5)
      expect(store.viewport.panX).toBe(100)
      expect(store.viewport.panY).toBe(50)
    })

    it('resetViewport - ビューポートをリセットする', () => {
      const store = useBoardStore.getState()
      
      store.setViewport({ zoom: 2, panX: 200, panY: 100 })
      store.resetViewport()
      
      expect(store.viewport.zoom).toBe(1)
      expect(store.viewport.panX).toBe(0)
      expect(store.viewport.panY).toBe(0)
    })
  })


  describe('エクスポートfunctionality', () => {
    it('exportAsJSON - 現在の状態をJSONとして出力する', () => {
      const store = useBoardStore.getState()
      const id1 = store.addSticky({ x: 0, y: 0, text: 'test' })
      const id2 = store.addText({ x: 100, y: 100 })
      store.addConnector({
        fromId: id1,
        toId: id2,
        points: [50, 50, 150, 150]
      })
      
      const exported = store.exportAsJSON()
      const parsed = JSON.parse(exported)
      
      expect(parsed.elements).toHaveLength(2)
      expect(parsed.connectors).toHaveLength(1)
      expect(parsed.viewport).toBeDefined()
    })

    it('importFromJSON - JSONから状態をrestoreする', () => {
      const store = useBoardStore.getState()
      
      const testData = {
        elements: [
          {
            id: 'test-1',
            type: 'sticky',
            x: 100,
            y: 100,
            width: 200,
            height: 100,
            text: 'インポートされたsticky note',
            color: '#FFE5B4',
            zIndex: 1,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        ],
        connectors: [],
        viewport: { zoom: 1.2, panX: 50, panY: 30 }
      }
      
      store.importFromJSON(JSON.stringify(testData))
      
      expect(store.elements).toHaveLength(1)
      expect(store.elements[0].id).toBe('test-1')
      expect((store.elements[0] as StickyElement).text).toBe('インポートされたsticky note')
      expect(store.viewport.zoom).toBe(1.2)
    })
  })
})