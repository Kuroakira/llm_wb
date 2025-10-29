import { describe, it, expect, beforeEach } from 'vitest'
import { useBoardStore } from '@/store/boardStore'

describe('2クリックconnectionシステム', () => {
  let store: any

  beforeEach(() => {
    // 新しいストアインスタンスをcreate
    store = useBoardStore.getState()
    // 状態をClear
    store.clearAll?.() || (() => {
      store.elements = []
      store.connectors = []
      store.connectionMode = { isActive: false, fromElementId: null, fromAnchor: null }
      store.selectedTool = 'select'
    })()
  })

  it('第1クリック: connectionモードが開始される（クリック状態維持なし）', () => {
    // sticky noteを2つcreate
    const stickyId1 = store.addSticky({ x: 100, y: 100 })
    const stickyId2 = store.addSticky({ x: 300, y: 100 })
    
    // line toolをselection
    store.selectTool('line')
    // Re-get state after mutation
    const currentState = useBoardStore.getState()
    expect(currentState.selectedTool).toBe('line')
    
    // 第1クリック: connection開始
    store.startConnection(stickyId1, 'right')
    
    // connectionモードがアクティブになる（クリック状態は維持されない）
    expect(store.connectionMode.isActive).toBe(true)
    expect(store.connectionMode.fromElementId).toBe(stickyId1)
    expect(store.connectionMode.fromAnchor).toBe('right')
    
    // まだconnectorはcreateされていない
    expect(store.connectors).toHaveLength(0)
  })

  it('第2クリック: connectionがcompleteし、selectionツールに自動復帰', () => {
    // sticky noteを2つcreate
    const stickyId1 = store.addSticky({ x: 100, y: 100 })
    const stickyId2 = store.addSticky({ x: 300, y: 100 })
    
    // line toolをselectionして第1クリック
    store.selectTool('line')
    store.startConnection(stickyId1, 'right')
    
    expect(store.connectionMode.isActive).toBe(true)
    
    // 第2クリック: connectioncomplete
    store.completeConnection(stickyId2, 'left')
    
    // connectionモードが終了
    expect(store.connectionMode.isActive).toBe(false)
    expect(store.connectionMode.fromElementId).toBe(null)
    expect(store.connectionMode.fromAnchor).toBe(null)
    
    // connectorがcreateされる
    expect(store.connectors).toHaveLength(1)
    const connector = store.connectors[0]
    expect(connector.fromId).toBe(stickyId1)
    expect(connector.toId).toBe(stickyId2)
    expect(connector.fromAnchor).toBe('right')
    expect(connector.toAnchor).toBe('left')
    
    // 自動的にselectionツールに戻る
    expect(store.selectedTool).toBe('select')
  })

  it('背景クリック: connectionがキャンセルされる', () => {
    // sticky noteをcreate
    const stickyId1 = store.addSticky({ x: 100, y: 100 })
    
    // line toolをselectionして第1クリック
    store.selectTool('line')
    store.startConnection(stickyId1, 'right')
    
    expect(store.connectionMode.isActive).toBe(true)
    
    // connectionをキャンセル（背景クリック相当）
    store.cancelConnection()
    
    // connectionモードが終了
    expect(store.connectionMode.isActive).toBe(false)
    expect(store.connectionMode.fromElementId).toBe(null)
    expect(store.connectionMode.fromAnchor).toBe(null)
    
    // connectorはcreateされない
    expect(store.connectors).toHaveLength(0)
  })

  it('同じ要素への第2クリック: connectionがキャンセルされる', () => {
    // sticky noteをcreate
    const stickyId1 = store.addSticky({ x: 100, y: 100 })
    
    // line toolをselectionして第1クリック
    store.selectTool('line')
    store.startConnection(stickyId1, 'right')
    
    expect(store.connectionMode.isActive).toBe(true)
    
    // 同じ要素に第2クリック → キャンセル
    store.completeConnection(stickyId1, 'left')
    
    // connectionモードが終了
    expect(store.connectionMode.isActive).toBe(false)
    
    // connectorはcreateされない
    expect(store.connectors).toHaveLength(0)
  })

  it('Escapeキー: connectionがキャンセルされる', () => {
    // sticky noteをcreate
    const stickyId1 = store.addSticky({ x: 100, y: 100 })
    
    // line toolをselectionして第1クリック
    store.selectTool('line')
    store.startConnection(stickyId1, 'right')
    
    expect(store.connectionMode.isActive).toBe(true)
    
    // Escapeキーでキャンセル
    store.cancelConnection()
    
    // connectionモードが終了
    expect(store.connectionMode.isActive).toBe(false)
    
    // connectorはcreateされない
    expect(store.connectors).toHaveLength(0)
  })
})

describe('2クリックconnectionシステム - ユーザーエクスペリエンス', () => {
  let store: any

  beforeEach(() => {
    store = useBoardStore.getState()
    store.elements = []
    store.connectors = []
    store.connectionMode = { isActive: false, fromElementId: null, fromAnchor: null }
    store.selectedTool = 'select'
  })

  it('真の2クリック方式: クリック状態を維持しない', () => {
    // この設計により以bottomが実現される：
    // 1. 第1クリック → 即座にcomplete（mousedownとmouseupが正常complete）
    // 2. マウスmove → ドラッグ状態ではなく、純粋なmousemove
    // 3. プレビューライン → マウス座標follow、ドラッグとは無関係
    // 4. 第2クリック → 独立したクリックイベント

    const stickyId1 = store.addSticky({ x: 100, y: 100 })
    const stickyId2 = store.addSticky({ x: 300, y: 100 })
    
    store.selectTool('line')
    
    // 第1クリック: 完全なクリック操作（押bottom→離top）
    store.startConnection(stickyId1, 'right')
    // この時点でクリック操作はcomplete、ドラッグ状態ではない
    
    expect(store.connectionMode.isActive).toBe(true)
    
    // ユーザーはマウスを自由に動かせる（ボタンを押し続ける必要なし）
    // プレビューラインはmousemoveイベントで更新される
    
    // 第2クリック: 完全に独立したクリック操作
    store.completeConnection(stickyId2, 'left')
    
    // connectioncomplete
    expect(store.connectors).toHaveLength(1)
    expect(store.connectionMode.isActive).toBe(false)
  })
})