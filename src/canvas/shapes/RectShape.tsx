'use client'

import React, { useRef, useState, useEffect, memo } from 'react'
import { KonvaResizeHandle, getKonvaResizeHandlePositions } from './ResizeHandle'
import { ConnectionPoints } from './ConnectionPoints'
import { useBoardStore } from '@/store/boardStore'
import { handleSnapDragMove, handleSnapDragEnd } from '@/lib/snapUtils'

import { Rect, Group } from 'react-konva'

type RectShapeProps = {
  id: string
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  radius?: number
  onUpdate: (id: string, updates: any) => void
  onDoubleClick?: (elementId: string, element: any, position: { x: number; y: number }) => void
  onContextMenu?: (elementId: string, element: any, position: { x: number; y: number }) => void
  // 線モード関連
  showConnectionPoints?: boolean
  onConnectionPointClick?: (elementId: string, anchor: any) => void
  isLineMode?: boolean
  // ビューポート関連
  zoom?: number
  zIndex?: number
}

// メモ化の比較関数
function arePropsEqual(prevProps: RectShapeProps, nextProps: RectShapeProps) {
  // 基本的なプロパティの比較
  if (
    prevProps.id !== nextProps.id ||
    prevProps.x !== nextProps.x ||
    prevProps.y !== nextProps.y ||
    prevProps.width !== nextProps.width ||
    prevProps.height !== nextProps.height ||
    prevProps.fill !== nextProps.fill ||
    prevProps.stroke !== nextProps.stroke ||
    prevProps.strokeWidth !== nextProps.strokeWidth ||
    prevProps.radius !== nextProps.radius ||
    prevProps.showConnectionPoints !== nextProps.showConnectionPoints ||
    prevProps.isLineMode !== nextProps.isLineMode ||
    prevProps.zoom !== nextProps.zoom
  ) {
    return false
  }
  
  // 関数の参照が変わっても、実際の動作は同じなので再レンダリングを防ぐ
  return true
}

export const RectShape = memo(function RectShape({
  id,
  x,
  y,
  width,
  height,
  fill,
  stroke,
  strokeWidth,
  radius,
  onUpdate,
  onDoubleClick,
  onContextMenu,
  showConnectionPoints = false,
  onConnectionPointClick,
  isLineMode = false,
  zoom = 1
}: RectShapeProps) {
  // 状態アクセスを1か所に集約（モック互換）
  const store: any = useBoardStore()
  const mode = store.mode
  const selectedIds: string[] = store.selectedIds ?? store.selection ?? []
  const editingTextId = store.editingTextId
  const isSelected = selectedIds.includes(id)
  const isEditing = mode === 'editingText' && editingTextId === id

  const selectShapeSafe = (elementId: string) => {
    if (typeof store.selectShape === 'function') return store.selectShape(elementId)
    if (typeof store.setSelection === 'function') return store.setSelection([elementId])
  }
  const updateConnectorsSafe = () => {
    if (typeof store.updateConnectors === 'function') return store.updateConnectors()
  }

  const groupRef = useRef<any>()
  const isPointerDownRef = useRef(false)
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null)
  // 複数選択ドラッグ用の参照
  const dragSelectionIdsRef = useRef<string[] | null>(null)
  const dragInitialPositionsRef = useRef<Record<string, { x: number; y: number }>>({})
  const draggedInitialPosRef = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    if (groupRef.current) groupRef.current.draggable(false)
    const handleUp = () => {
      if (groupRef.current) groupRef.current.draggable(false)
    }
    document.addEventListener('mouseup', handleUp)
    document.addEventListener('touchend', handleUp)
    return () => {
      document.removeEventListener('mouseup', handleUp)
      document.removeEventListener('touchend', handleUp)
    }
  }, [])
  const [isHovered, setIsHovered] = useState(false)

  const resizeWithAspect = (
    direction: 'nw' | 'ne' | 'sw' | 'se',
    dx: number,
    dy: number,
    minW: number,
    minH: number
  ) => {
    const aspect = width / height
    let wFromDx = direction === 'se' || direction === 'ne' ? width + dx : width - dx
    wFromDx = Math.max(minW, wFromDx)
    let hFromDx = Math.round(wFromDx / aspect)
    hFromDx = Math.max(minH, hFromDx)
    wFromDx = Math.round(hFromDx * aspect)

    let hFromDy = direction === 'se' || direction === 'sw' ? height + dy : height - dy
    hFromDy = Math.max(minH, hFromDy)
    let wFromDy = Math.round(hFromDy * aspect)
    wFromDy = Math.max(minW, wFromDy)
    hFromDy = Math.round(wFromDy / aspect)

    const useHorizontal = Math.abs(dx) > Math.abs(dy)
    let newW = useHorizontal ? wFromDx : wFromDy
    let newH = useHorizontal ? hFromDx : hFromDy

    let newX = x
    let newY = y
    if (direction === 'nw') {
      newX = x + (width - newW)
      newY = y + (height - newH)
    } else if (direction === 'ne') {
      newY = y + (height - newH)
    } else if (direction === 'sw') {
      newX = x + (width - newW)
    }

    onUpdate(id, { x: newX, y: newY, width: newW, height: newH })
  }

  // 自由リサイズ: 四隅ハンドル用（縦横独立）
  const resizeFree = (
    direction: 'nw' | 'ne' | 'sw' | 'se',
    dx: number,
    dy: number,
    minW: number,
    minH: number
  ) => {
    let newW = width
    let newH = height
    let newX = x
    let newY = y

    // 各方向に応じて縦横独立でリサイズ
    if (direction === 'nw') {
      newW = Math.max(minW, width - dx)
      newH = Math.max(minH, height - dy)
      newX = x + (width - newW)
      newY = y + (height - newH)
    } else if (direction === 'ne') {
      newW = Math.max(minW, width + dx)
      newH = Math.max(minH, height - dy)
      newY = y + (height - newH)
    } else if (direction === 'sw') {
      newW = Math.max(minW, width - dx)
      newH = Math.max(minH, height + dy)
      newX = x + (width - newW)
    } else if (direction === 'se') {
      newW = Math.max(minW, width + dx)
      newH = Math.max(minH, height + dy)
    }

    onUpdate(id, { x: newX, y: newY, width: newW, height: newH })
  }

  const triggerContextMenu = (clientX: number, clientY: number) => {
    if (onContextMenu) {
      const element = { id, x, y, width, height, fill, stroke, strokeWidth, radius, type: 'rect' }
      const position = { x: clientX, y: clientY }
      onContextMenu(id, element, position)
    }
  }


  const konvaResizeHandles = getKonvaResizeHandlePositions({ x, y, width, height })


  return (
    <>
      <Group
        ref={groupRef}
        id={`element-${id}`}
        x={x}
        y={y}
        onMouseDown={(e: any) => {
          if (e?.evt?.button !== 0) return
          // 既に複数選択に含まれている場合は選択状態を維持してそのままドラッグへ
          try {
            const state: any = useBoardStore.getState()
            const sel: string[] = state.selectedIds || []
            const partOfMulti = sel.length > 1 && sel.includes(id)
            if (!partOfMulti && !isLineMode) {
              selectShapeSafe(id)
            }
          } catch {
            if (!isLineMode) {
              selectShapeSafe(id)
            }
          }
          if (e?.evt?.shiftKey) return
          isPointerDownRef.current = true
          pointerDownPosRef.current = { x: e.evt.clientX, y: e.evt.clientY }
        }}
        onMouseUp={() => {
          isPointerDownRef.current = false
          pointerDownPosRef.current = null
          if (groupRef.current) groupRef.current.draggable(false)
        }}
        onMouseMove={(e: any) => {
          if (!isPointerDownRef.current) return
          if (e?.evt?.shiftKey) return
          if (isEditing) return
          if (!groupRef.current) return
          const start = pointerDownPosRef.current
          if (!start) return
          const dx = e.evt.clientX - start.x
          const dy = e.evt.clientY - start.y
          const moved = Math.hypot(dx, dy)
          if (moved > 3) {
            groupRef.current.draggable(true)
            groupRef.current.startDrag()
            isPointerDownRef.current = false
            pointerDownPosRef.current = null
          }
        }}
        onDragStart={() => {
          // ドラッグ開始時に履歴を記録
          const state: any = useBoardStore.getState()
          if (typeof state.beginElementDrag === 'function') {
            state.beginElementDrag()
          }
          // 複数選択されている場合はまとめて移動
          const selected: string[] = state.selectedIds || []
          if (selected.length > 1 && selected.includes(id)) {
            dragSelectionIdsRef.current = selected.slice()
            dragInitialPositionsRef.current = {}
            for (const sid of selected) {
              const el = state.elements.find((e: any) => e.id === sid)
              if (el) dragInitialPositionsRef.current[sid] = { x: el.x, y: el.y }
            }
            const selfEl = state.elements.find((e: any) => e.id === id)
            if (selfEl) draggedInitialPosRef.current = { x: selfEl.x, y: selfEl.y }
          } else {
            dragSelectionIdsRef.current = null
            dragInitialPositionsRef.current = {}
            draggedInitialPosRef.current = null
          }
        }}
        onDragEnd={(e: any) => {
          // スナッピングガイドラインをクリア
          handleSnapDragEnd(e)
          
          const state: any = useBoardStore.getState()
          const draggedStart = draggedInitialPosRef.current
          if (dragSelectionIdsRef.current && draggedStart) {
            const dx = e.target.x() - draggedStart.x
            const dy = e.target.y() - draggedStart.y
            for (const sid of dragSelectionIdsRef.current) {
              const startPos = dragInitialPositionsRef.current[sid]
              if (!startPos) continue
              const newPos = { x: startPos.x + dx, y: startPos.y + dy }
              state.updateElement(sid, newPos, true, true)
            }
            state.updateConnectors()
          } else {
            const newPosition = { x: e.target.x(), y: e.target.y() }
            state.updateElement(id, newPosition, false, true)
            updateConnectorsSafe()
          }
          if (groupRef.current) groupRef.current.draggable(false)
          dragSelectionIdsRef.current = null
          dragInitialPositionsRef.current = {}
          draggedInitialPosRef.current = null
        }}
        onDragMove={(e: any) => {
          // スナッピング処理を先に実行
          handleSnapDragMove(e)
          
          const state: any = useBoardStore.getState()
          const draggedStart = draggedInitialPosRef.current
          if (dragSelectionIdsRef.current && draggedStart) {
            const dx = e.target.x() - draggedStart.x
            const dy = e.target.y() - draggedStart.y
            for (const sid of dragSelectionIdsRef.current) {
              const startPos = dragInitialPositionsRef.current[sid]
              if (!startPos) continue
              const newPos = { x: startPos.x + dx, y: startPos.y + dy }
              state.updateElement(sid, newPos, true, true)
            }
            state.updateConnectors()
          } else {
            const newPosition = { x: e.target.x(), y: e.target.y() }
            state.updateElement(id, newPosition, true, true)
            updateConnectorsSafe()
          }
        }}
        onClick={(e: any) => {
          e.evt?.stopPropagation?.()
          // 要素を選択（ラインモード中は選択しない）
          if (!isLineMode) {
            selectShapeSafe(id)
          }
        }}
        onDblClick={(e: any) => {
          e.evt?.stopPropagation?.()
          e.evt?.preventDefault?.()
          // 矩形は編集不可
          if (groupRef.current) {
            // ダブルクリック時にドラッグが残らないように停止
            // ダブルクリック時にドラッグが残らないように停止
            if (groupRef.current?.stopDrag) {
              groupRef.current.stopDrag()
            }
            groupRef.current.draggable(false)
          }
          if (onDoubleClick) {
            const element = { id, x, y, width, height, fill, stroke, strokeWidth, radius, type: 'rect' }
            onDoubleClick(id, element, { x: e.evt.clientX, y: e.evt.clientY })
          }
        }}
        onContextMenu={(e: any) => {
          if (e && e.evt) {
            e.evt.preventDefault()
            e.evt.stopPropagation()
            triggerContextMenu(e.evt.clientX, e.evt.clientY)
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 矩形の背景 */}
        <Rect
          width={width}
          height={height}
          fill={fill}
          stroke={isHovered ? '#0066FF' : stroke}
          strokeWidth={isHovered ? 2 : strokeWidth}
          cornerRadius={radius || 0}
        />
      </Group>

      {/* 選択状態かつ編集中でない場合のみリサイズハンドルを表示 */}
      {isSelected && !isEditing && (
        <>
          <KonvaResizeHandle
            elementId={id}
            direction="nw"
            x={konvaResizeHandles.nw.x}
            y={konvaResizeHandles.nw.y}
            isVisible={true}
            onResize={(_, __, deltaX, deltaY, isShiftPressed) => {
              if (isShiftPressed) {
                resizeWithAspect('nw', deltaX, deltaY, 20, 10)
              } else {
                resizeFree('nw', deltaX, deltaY, 20, 10)
              }
            }}
            onResizeEnd={() => { updateConnectorsSafe() }}
            zoom={zoom}
          />
          <KonvaResizeHandle
            elementId={id}
            direction="ne"
            x={konvaResizeHandles.ne.x}
            y={konvaResizeHandles.ne.y}
            isVisible={true}
            onResize={(_, __, deltaX, deltaY, isShiftPressed) => {
              if (isShiftPressed) {
                resizeWithAspect('ne', deltaX, deltaY, 20, 10)
              } else {
                resizeFree('ne', deltaX, deltaY, 20, 10)
              }
            }}
            onResizeEnd={() => { updateConnectorsSafe() }}
            zoom={zoom}
          />
          <KonvaResizeHandle
            elementId={id}
            direction="sw"
            x={konvaResizeHandles.sw.x}
            y={konvaResizeHandles.sw.y}
            isVisible={true}
            onResize={(_, __, deltaX, deltaY, isShiftPressed) => {
              if (isShiftPressed) {
                resizeWithAspect('sw', deltaX, deltaY, 20, 10)
              } else {
                resizeFree('sw', deltaX, deltaY, 20, 10)
              }
            }}
            onResizeEnd={() => { updateConnectorsSafe() }}
            zoom={zoom}
          />
          <KonvaResizeHandle
            elementId={id}
            direction="se"
            x={konvaResizeHandles.se.x}
            y={konvaResizeHandles.se.y}
            isVisible={true}
            onResize={(_, __, deltaX, deltaY, isShiftPressed) => {
              if (isShiftPressed) {
                resizeWithAspect('se', deltaX, deltaY, 20, 10)
              } else {
                resizeFree('se', deltaX, deltaY, 20, 10)
              }
            }}
            onResizeEnd={() => { updateConnectorsSafe() }}
            zoom={zoom}
          />
        </>
      )}

      {/* 接続ポイント（線モード中、またはコネクタ端点ドラッグ中に表示） */}
      <ConnectionPoints
        element={{ id, x, y, width, height }}
        visible={!!showConnectionPoints}
        onClick={onConnectionPointClick}
      />
    </>
  )
}, arePropsEqual)
