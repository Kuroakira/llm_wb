'use client'

import React, { useRef, useState, useEffect } from 'react'
import { KonvaResizeHandle, getKonvaResizeHandlePositions } from './ResizeHandle'
import { ConnectionPoints } from './ConnectionPoints'
import { useBoardStore } from '@/store/boardStore'
import { handleSnapDragMove, handleSnapDragEnd } from '@/lib/snapUtils'

import { Image, Group } from 'react-konva'

type ImageShapeProps = {
  id: string
  x: number
  y: number
  width: number
  height: number
  src: string
  originalWidth: number
  originalHeight: number
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

export function ImageShape({
  id,
  x,
  y,
  width,
  height,
  src,
  originalWidth,
  originalHeight,
  onUpdate,
  onDoubleClick,
  onContextMenu,
  showConnectionPoints = false,
  onConnectionPointClick,
  isLineMode = false,
  zoom = 1,
  zIndex = 0
}: ImageShapeProps) {
  // 状態アクセスを1か所に集約
  const store: any = useBoardStore()
  const mode = store.mode
  const selectedIds: string[] = store.selectedIds ?? store.selection ?? []
  const editingTextId = store.editingTextId
  const isSelected = selectedIds.includes(id)
  const isEditing = mode === 'editingText' && editingTextId === id
  const connectorDrag = store.connectorDrag

  const selectShapeSafe = (elementId: string) => {
    if (typeof store.selectShape === 'function') return store.selectShape(elementId)
    if (typeof store.setSelection === 'function') return store.setSelection([elementId])
  }
  const updateConnectorsSafe = () => {
    if (typeof store.updateConnectors === 'function') return store.updateConnectors()
  }

  const groupRef = useRef<any>()
  const imageRef = useRef<any>()
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)
  const isPointerDownRef = useRef(false)
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null)
  // 複数選択ドラッグ用の参照
  const dragSelectionIdsRef = useRef<string[] | null>(null)
  const dragInitialPositionsRef = useRef<Record<string, { x: number; y: number }>>({})
  const draggedInitialPosRef = useRef<{ x: number; y: number } | null>(null)

  // 画像の読み込み
  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setImageElement(img)
      if (imageRef.current) {
        imageRef.current.getLayer()?.batchDraw()
      }
    }
    img.src = src
  }, [src])

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
  const [isResizing, setIsResizing] = useState(false)

  const resizeWithAspect = (
    direction: 'nw' | 'ne' | 'sw' | 'se',
    dx: number,
    dy: number,
    minW: number,
    minH: number
  ) => {
    const aspect = originalWidth / originalHeight
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
      const element = { id, x, y, width, height, src, originalWidth, originalHeight, type: 'image' }
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
          // ドラッグ開始時に履歴を一度だけ積む
          try { useBoardStore.getState().beginElementDrag() } catch {}
          // 複数選択されている場合はまとめて移動
          const state: any = useBoardStore.getState()
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
          // ラインモード中は選択しない
          if (!isLineMode) {
            selectShapeSafe(id)
          }
        }}
        onDblClick={(e: any) => {
          e.evt?.stopPropagation?.()
          e.evt?.preventDefault?.()
          if (groupRef.current) {
            try { groupRef.current.stopDrag?.() } catch {}
            groupRef.current.draggable(false)
          }
          if (onDoubleClick) {
            const element = { id, x, y, width, height, src, originalWidth, originalHeight, type: 'image' }
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
        {/* 画像 */}
        {imageElement && (
          <Image
            ref={imageRef}
            width={width}
            height={height}
            image={imageElement}
            stroke={isHovered ? '#0066FF' : undefined}
            strokeWidth={isHovered ? 2 : 0}
          />
        )}
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
              setIsResizing(true)
              if (isShiftPressed) {
                resizeWithAspect('nw', deltaX, deltaY, 20, 10)
              } else {
                resizeFree('nw', deltaX, deltaY, 20, 10)
              }
            }}
            onResizeEnd={() => { setIsResizing(false); updateConnectorsSafe() }}
            zoom={zoom}
          />
          <KonvaResizeHandle
            elementId={id}
            direction="ne"
            x={konvaResizeHandles.ne.x}
            y={konvaResizeHandles.ne.y}
            isVisible={true}
            onResize={(_, __, deltaX, deltaY, isShiftPressed) => {
              setIsResizing(true)
              if (isShiftPressed) {
                resizeWithAspect('ne', deltaX, deltaY, 20, 10)
              } else {
                resizeFree('ne', deltaX, deltaY, 20, 10)
              }
            }}
            onResizeEnd={() => { setIsResizing(false); updateConnectorsSafe() }}
            zoom={zoom}
          />
          <KonvaResizeHandle
            elementId={id}
            direction="sw"
            x={konvaResizeHandles.sw.x}
            y={konvaResizeHandles.sw.y}
            isVisible={true}
            onResize={(_, __, deltaX, deltaY, isShiftPressed) => {
              setIsResizing(true)
              if (isShiftPressed) {
                resizeWithAspect('sw', deltaX, deltaY, 20, 10)
              } else {
                resizeFree('sw', deltaX, deltaY, 20, 10)
              }
            }}
            onResizeEnd={() => { setIsResizing(false); updateConnectorsSafe() }}
            zoom={zoom}
          />
          <KonvaResizeHandle
            elementId={id}
            direction="se"
            x={konvaResizeHandles.se.x}
            y={konvaResizeHandles.se.y}
            isVisible={true}
            onResize={(_, __, deltaX, deltaY, isShiftPressed) => {
              setIsResizing(true)
              if (isShiftPressed) {
                resizeWithAspect('se', deltaX, deltaY, 20, 10)
              } else {
                resizeFree('se', deltaX, deltaY, 20, 10)
              }
            }}
            onResizeEnd={() => { setIsResizing(false); updateConnectorsSafe() }}
            zoom={zoom}
          />
          {/* 辺ハンドル: 片方向リサイズ */}
          <KonvaResizeHandle
            elementId={id}
            direction="n"
            x={konvaResizeHandles.n.x}
            y={konvaResizeHandles.n.y}
            isVisible={true}
            onResize={(_, __, deltaX, deltaY) => {
              setIsResizing(true)
              const minH = 10
              const h = Math.max(minH, height - deltaY)
              const appliedDeltaY = height - h
              onUpdate(id, { y: y + appliedDeltaY, height: h })
            }}
            onResizeEnd={() => { setIsResizing(false); updateConnectorsSafe() }}
            zoom={zoom}
          />
          <KonvaResizeHandle
            elementId={id}
            direction="e"
            x={konvaResizeHandles.e.x}
            y={konvaResizeHandles.e.y}
            isVisible={true}
            onResize={(_, __, deltaX) => {
              setIsResizing(true)
              const minW = 20
              const w = Math.max(minW, width + deltaX)
              onUpdate(id, { width: w })
            }}
            onResizeEnd={() => { setIsResizing(false); updateConnectorsSafe() }}
            zoom={zoom}
          />
          <KonvaResizeHandle
            elementId={id}
            direction="s"
            x={konvaResizeHandles.s.x}
            y={konvaResizeHandles.s.y}
            isVisible={true}
            onResize={(_, __, deltaX, deltaY) => {
              setIsResizing(true)
              const minH = 10
              const h = Math.max(minH, height + deltaY)
              onUpdate(id, { height: h })
            }}
            onResizeEnd={() => { setIsResizing(false); updateConnectorsSafe() }}
            zoom={zoom}
          />
          <KonvaResizeHandle
            elementId={id}
            direction="w"
            x={konvaResizeHandles.w.x}
            y={konvaResizeHandles.w.y}
            isVisible={true}
            onResize={(_, __, deltaX) => {
              setIsResizing(true)
              const minW = 20
              const w = Math.max(minW, width - deltaX)
              const appliedDeltaX = width - w
              onUpdate(id, { x: x + appliedDeltaX, width: w })
            }}
            onResizeEnd={() => { setIsResizing(false); updateConnectorsSafe() }}
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
}