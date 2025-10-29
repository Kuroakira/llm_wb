import { useState } from 'react'
import { useBoardStore } from '@/store/boardStore'

export function useViewport() {
  const { viewport, setZoom, setPan } = useBoardStore()

  // パン操作の状態管理
  const [isPanning, setIsPanning] = useState(false)
  const [lastPointerPosition, setLastPointerPosition] = useState<{x: number, y: number} | null>(null)
  

  // マウスホイールでのズーム（キーボード + マウスホイール用）
  const handleWheel = (e: React.WheelEvent) => {
    // キーボードショートカット（Ctrl/Cmd + wheel）のみ処理
    // ピンチジェスチャーはPAGEレベルで処理されるため、ここでは処理しない
    if ((e.ctrlKey || e.metaKey) && Math.abs(e.deltaY) > 0) {
      e.preventDefault()
      e.stopPropagation()
      
      // Konvaステージからマウス位置を取得
      const stage = (e.target as any)?.getStage?.()
      if (!stage) return
      
      const pointerPos = stage.getPointerPosition()
      if (!pointerPos) return
      
      const zoomSpeed = 0.002
      const zoomDelta = -e.deltaY * zoomSpeed
      let newZoom = viewport.zoom * (1 + zoomDelta)
      newZoom = Math.max(0.05, Math.min(5.0, newZoom))
      
      // カーソル位置を中心にズームするためのパン調整
      const zoomRatio = newZoom / viewport.zoom
      
      // ステージ上でのマウス位置（ビューポート座標系）
      const stageX = pointerPos.x
      const stageY = pointerPos.y
      
      // ワールド座標系でのマウス位置
      const worldX = (stageX - viewport.panX) / viewport.zoom
      const worldY = (stageY - viewport.panY) / viewport.zoom
      
      // 新しいズーム後でもマウス位置が同じスクリーン位置になるようにパンを調整
      const newPanX = stageX - worldX * newZoom
      const newPanY = stageY - worldY * newZoom
      
      // ズームとパンを同時に設定
      const { setViewport } = useBoardStore.getState()
      setViewport({
        zoom: newZoom,
        panX: newPanX,
        panY: newPanY
      })
    }
  }

  // マウスダウンでパン開始
  const handleMouseDown = (e: any) => {
    // スペースキーが押されている、または中クリックの場合はパンモード
    if (e.evt.button === 1 || e.evt.shiftKey) { // 中クリックまたはShift+クリック
      e.evt.preventDefault()
      setIsPanning(true)
      setLastPointerPosition({
        x: e.evt.clientX,
        y: e.evt.clientY
      })
    }
  }

  // マウス移動でパン
  const handleMouseMove = (e: any) => {
    // ドラッグ中の要素がある場合は処理しない
    if (e.target?.isDragging?.()) {
      return
    }
    
    if (!isPanning || !lastPointerPosition) return
    
    e.evt.preventDefault()
    
    const deltaX = e.evt.clientX - lastPointerPosition.x
    const deltaY = e.evt.clientY - lastPointerPosition.y
    
    setPan(viewport.panX + deltaX, viewport.panY + deltaY)
    
    setLastPointerPosition({
      x: e.evt.clientX,
      y: e.evt.clientY
    })
  }

  // マウスアップでパン終了
  const handleMouseUp = () => {
    setIsPanning(false)
    setLastPointerPosition(null)
  }

  // タッチイベント（PAGEレベルで処理されるため、ここでは空の実装）
  const handleTouchStart = (e: React.TouchEvent) => {
    // ピンチジェスチャーはPAGEレベルで処理されるため、ここでは何もしない
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    // ピンチジェスチャーはPAGEレベルで処理されるため、ここでは何もしない
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    // ピンチジェスチャーはPAGEレベルで処理されるため、ここでは何もしない
  }

  return {
    viewport,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  }
}