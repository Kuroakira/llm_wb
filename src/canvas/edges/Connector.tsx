'use client'

import React, { useRef, useState } from 'react'
import { useBoardStore } from '@/store/boardStore'
import { Z_INDEX } from '@/lib/z-index-constants'

// Konvaコンポーネントの動的インポート
let Line: any, Arrow: any, Circle: any

if (typeof window !== 'undefined') {
  try {
    const konva = require('react-konva')
    Line = konva.Line
    Arrow = konva.Arrow
    Circle = konva.Circle
  } catch (e) {
  }
}

type ConnectorProps = {
  id: string
  fromId: string
  toId: string
  points: number[] // [x1, y1, x2, y2]
  onDelete?: (id: string) => void
}

export function Connector({
  id,
  fromId,
  toId,
  points,
  onDelete: _onDelete
}: ConnectorProps) {
  // 線の色とスタイル（選択状態なし）
  const strokeColor = '#666'
  const strokeWidth = 2

  const { updateConnectorPoints, attachConnectorEnd, detachConnectorEnd, elements, selectConnector, selectedConnectorIds, viewport, setConnectorHoverTarget } = useBoardStore()
  const isSelected = selectedConnectorIds.includes(id)
  const [isDraggingEnd, setIsDraggingEnd] = useState<null | 'start' | 'end'>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const dragStartPointsRef = useRef<number[] | null>(null)
  const isDraggingWholeRef = useRef(false)
  const snapTargetRef = useRef<null | { elementId: string; anchor: 'top'|'right'|'bottom'|'left'; x: number; y: number }>(null)

  // HTMLフォールバック用のアンカー描画
  const renderHTML = () => {
    const [x1, y1, x2, y2] = points
    const left = Math.min(x1, x2)
    const top = Math.min(y1, y2)
    const w = Math.abs(x2 - x1)
    const h = Math.abs(y2 - y1)

    const handleDown = (which: 'start' | 'end') => (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      setIsDraggingEnd(which)
      startPosRef.current = { x: e.clientX, y: e.clientY }
      const handleMove = (ev: MouseEvent) => {
        ev.preventDefault()
        const dx = ev.clientX - (startPosRef.current?.x || 0)
        const dy = ev.clientY - (startPosRef.current?.y || 0)
        if (which === 'start') {
          updateConnectorPoints(id, [x1 + dx, y1 + dy, x2, y2])
        } else {
          updateConnectorPoints(id, [x1, y1, x2 + dx, y2 + dy])
        }
      }
      const handleUp = () => {
        document.removeEventListener('mousemove', handleMove)
        document.removeEventListener('mouseup', handleUp)
        setIsDraggingEnd(null)
      }
      document.addEventListener('mousemove', handleMove)
      document.addEventListener('mouseup', handleUp)
    }

    const handleWholeDown = (e: React.MouseEvent) => {
      e.stopPropagation()
      selectConnector(id)
      if (fromId || toId) return
      isDraggingWholeRef.current = true
      dragStartPointsRef.current = points
      const start = { x: e.clientX, y: e.clientY }
      const handleMove = (ev: MouseEvent) => {
        if (!isDraggingWholeRef.current) return
        const scale = viewport?.zoom || 1
        const dx = (ev.clientX - start.x) / scale
        const dy = (ev.clientY - start.y) / scale
        const base = dragStartPointsRef.current || points
        const [sx1, sy1, sx2, sy2] = base
        updateConnectorPoints(id, [sx1 + dx, sy1 + dy, sx2 + dx, sy2 + dy])
      }
      const handleUp = () => {
        document.removeEventListener('mousemove', handleMove)
        document.removeEventListener('mouseup', handleUp)
        isDraggingWholeRef.current = false
      }
      document.addEventListener('mousemove', handleMove)
      document.addEventListener('mouseup', handleUp)
    }

    return (
      <div
        data-testid="connector"
        style={{ position: 'absolute', left, top, width: w + 4, height: h + 4, pointerEvents: 'none', zIndex: 0 }}
      >
        <svg width="100%" height="100%" style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
          <line
            x1={x1 - left + 2}
            y1={y1 - top + 2}
            x2={x2 - left + 2}
            y2={y2 - top + 2}
            stroke={isSelected ? '#0D99FF' : strokeColor}
            strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
          />
        </svg>
        {/* クリックで選択 */}
        <div
          style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', background: 'transparent' }}
          onMouseDown={handleWholeDown}
        />
        {/* アンカー */}
        <div
          style={{ position: 'absolute', left: x1 - left - 12, top: y1 - top - 12, width: 24, height: 24, borderRadius: '50%', background: '#FFFFFF', border: `2px solid ${isSelected ? '#0D99FF' : '#666'}`, cursor: 'pointer', pointerEvents: 'auto', boxSizing: 'border-box' }}
          onMouseDown={handleDown('start')}
        />
        <div
          style={{ position: 'absolute', left: x2 - left - 12, top: y2 - top - 12, width: 24, height: 24, borderRadius: '50%', background: '#FFFFFF', border: `2px solid ${isSelected ? '#0D99FF' : '#666'}`, cursor: 'pointer', pointerEvents: 'auto', boxSizing: 'border-box' }}
          onMouseDown={handleDown('end')}
        />
      </div>
    )
  }

  // テスト環境用のフォールバック
  if (!Line) return renderHTML()

  const [x1, y1, x2, y2] = points

  const getElementAnchors = (el: any) => {
    return [
      { anchor: 'top' as const, x: el.x + el.width / 2, y: el.y },
      { anchor: 'right' as const, x: el.x + el.width, y: el.y + el.height / 2 },
      { anchor: 'bottom' as const, x: el.x + el.width / 2, y: el.y + el.height },
      { anchor: 'left' as const, x: el.x, y: el.y + el.height / 2 }
    ]
  }

  const findSnapTarget = (px: number, py: number) => {
    const scale = viewport?.zoom || 1
    const threshold = 24 / scale
    let best: any = null
    let bestDist = Infinity
    for (const el of elements) {
      const anchors = getElementAnchors(el)
      for (const a of anchors) {
        const d = Math.hypot(px - a.x, py - a.y)
        if (d < bestDist) {
          bestDist = d
          best = { elementId: el.id, anchor: a.anchor, x: a.x, y: a.y }
        }
      }
    }
    if (best && bestDist <= threshold) return best
    return null
  }
  const handleAnchorMouseDown = (which: 'start' | 'end') => (e: any) => {
    e.evt?.stopPropagation?.()
    e.cancelBubble = true
    const start = { x: e.evt.clientX, y: e.evt.clientY }
    const handleMove = (ev: MouseEvent) => {
      const scale = viewport?.zoom || 1
      const dx = (ev.clientX - start.x) / scale
      const dy = (ev.clientY - start.y) / scale
      let nx1 = x1, ny1 = y1, nx2 = x2, ny2 = y2
      if (which === 'start') { nx1 = x1 + dx; ny1 = y1 + dy } else { nx2 = x2 + dx; ny2 = y2 + dy }
      // スナップ判定（ドラッグ中）
      const target = findSnapTarget(which === 'start' ? nx1 : nx2, which === 'start' ? ny1 : ny2)
      if (target) {
        snapTargetRef.current = target
        setConnectorHoverTarget({ elementId: target.elementId, anchor: target.anchor })
        if (which === 'start') { nx1 = target.x; ny1 = target.y } else { nx2 = target.x; ny2 = target.y }
      } else {
        snapTargetRef.current = null
        setConnectorHoverTarget(null)
      }
      updateConnectorPoints(id, [nx1, ny1, nx2, ny2])
    }
    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      // スナップが確定していれば接続、そうでなければ未接続にする
      const snap = snapTargetRef.current
      if (snap) {
        attachConnectorEnd(id, which === 'start' ? 'from' : 'to', snap.elementId, snap.anchor as any)
      } else {
        // 離れた場合は端点の接続を解除
        if ((which === 'start' && fromId) || (which === 'end' && toId)) {
          detachConnectorEnd(id, which === 'start' ? 'from' : 'to')
        }
      }
      snapTargetRef.current = null
      setConnectorHoverTarget(null)
      useBoardStore.getState().endConnectorDrag()
    }
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }

  // 線全体ドラッグ（両端未接続時のみ）
  const handleWholeMouseDownKonva = (e: any) => {
    e.evt?.stopPropagation?.()
    // アンカー近傍は全体ドラッグを無効化（端の優先判定）
    const pointer = e.target?.getStage?.().getPointerPosition?.()
    const scale = viewport?.zoom || 1
    const stage = e.target?.getStage?.()
    let localX = pointer?.x ?? 0
    let localY = pointer?.y ?? 0
    if (stage) {
      const transform = stage.getAbsoluteTransform().copy()
      transform.invert()
      const p = transform.point(pointer)
      localX = p.x
      localY = p.y
    }
    const thresholdCanvas = 24 / scale
    const isNearStart = Math.hypot(localX - x1, localY - y1) <= thresholdCanvas
    const isNearEnd = Math.hypot(localX - x2, localY - y2) <= thresholdCanvas
    if (isNearStart || isNearEnd) {
      return // 端点ドラッグが優先
    }
    selectConnector(id)
    if (fromId || toId) return
    const start = { x: e.evt.clientX, y: e.evt.clientY }
    const base = points
    const handleMove = (ev: MouseEvent) => {
      const scale = viewport?.zoom || 1
      const dx = (ev.clientX - start.x) / scale
      const dy = (ev.clientY - start.y) / scale
      const [sx1, sy1, sx2, sy2] = base
      updateConnectorPoints(id, [sx1 + dx, sy1 + dy, sx2 + dx, sy2 + dy])
    }
    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      if (e.target?.getStage) {
        e.target.getStage().container().style.cursor = 'default'
      }
    }
    if (e.target?.getStage) {
      e.target.getStage().container().style.cursor = 'move'
    }
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }

  return (
    <>
      <Arrow
        id={id}
        points={points}
        stroke={isSelected ? '#0D99FF' : strokeColor}
        strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
        fill={isSelected ? '#0D99FF' : strokeColor}
        // 矢印先端を小さくしてリサイズハンドルとの被りを最小化
        pointerLength={6}
        pointerWidth={4}
        shadowEnabled={false}
        shadowOpacity={0.3}
        listening={true}
        // 矢印の選択判定を大きくして選択しやすくする（アンカーポイントより優先度は低く保持）
        hitStrokeWidth={12}
        // 矢印のz-indexを最低値に設定してアンカーポイントが確実に優先されるように
        zIndex={Z_INDEX.ARROW_BASE}
        // Enhanced event handling to prevent interference with anchor clicks
        onMouseDown={(e: any) => {
          // Check if event was already handled by anchor point
          if (e.evt && e.evt._konva_anchor_handled) {
            return
          }
          handleWholeMouseDownKonva(e)
        }}
        onMouseEnter={(e: any) => {
          if (isSelected && !fromId && !toId) e.target.getStage().container().style.cursor = 'move'
        }}
        onMouseLeave={(e: any) => { e.target.getStage().container().style.cursor = 'default' }}
      />
      {/* ドラッグ可能な端点アンカー（Circle自体がイベントを受ける） */}
      {isSelected && Circle && (
        <Circle
          x={x1}
          y={y1}
          radius={12}
          fill={'rgba(255,255,255,0.01)'}
          stroke="#0D99FF"
          strokeWidth={2}
          listening={true}
          // コネクタ端点のz-indexを接続ポイントより低く設定
          zIndex={Z_INDEX.CONNECTOR_ANCHORS}
          // Enhanced event handling to prevent interference with connection points
          onMouseDown={(e: any) => {
            // Check if event was already handled by anchor point
            if (e.evt && e.evt._konva_anchor_handled) {
              return
            }
            // リサイズハンドルが既にイベントを処理している場合はスキップ
            if (e.evt && e.evt._konva_prevent_click) {
              return
            }
            useBoardStore.getState().startConnectorDrag(id, 'from')
            handleAnchorMouseDown('start')(e)
          }}
        />
      )}
      {isSelected && Circle && (
        <Circle
          x={x2}
          y={y2}
          radius={12}
          fill={'rgba(255,255,255,0.01)'}
          stroke="#0D99FF"
          strokeWidth={2}
          listening={true}
          // コネクタ端点のz-indexを接続ポイントより低く設定
          zIndex={Z_INDEX.CONNECTOR_ANCHORS}
          // Enhanced event handling to prevent interference with connection points
          onMouseDown={(e: any) => {
            // Check if event was already handled by anchor point
            if (e.evt && e.evt._konva_anchor_handled) {
              return
            }
            // リサイズハンドルが既にイベントを処理している場合はスキップ
            if (e.evt && e.evt._konva_prevent_click) {
              return
            }
            useBoardStore.getState().startConnectorDrag(id, 'to')
            handleAnchorMouseDown('end')(e)
          }}
        />
      )}
    </>
  )
}
