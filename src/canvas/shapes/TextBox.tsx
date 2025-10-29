'use client'

import React, { useRef, useState, useEffect, useCallback, memo } from 'react'
import { KonvaResizeHandle, getKonvaResizeHandlePositions } from './ResizeHandle'
import { ConnectionPoints } from './ConnectionPoints'
import { useBoardStore } from '@/store/boardStore'
import { handleSnapDragMove, handleSnapDragEnd } from '@/lib/snapUtils'
import { shouldAllowNativeKeyboard } from '@/lib/keyboard-utils'
import type { TextAlignment, VerticalAlignment } from '@/types'

// Dynamic import of Konva components
let Text: any, Group: any, Html: any

if (typeof window !== 'undefined') {
  try {
    const konva = require('react-konva')
    const konvaUtils = require('react-konva-utils')
    Text = konva.Text
    Group = konva.Group
    Html = konvaUtils.Html
  } catch (e) {
  }
}

type TextBoxProps = {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
  fontSize: number
  fontFamily: string
  isMarkdown?: boolean
  textAlign?: TextAlignment
  verticalAlign?: VerticalAlignment
  onUpdate: (id: string, updates: any) => void
  onDoubleClick?: (elementId: string, element: any, groupRef: any) => void
  // Line mode related
  showConnectionPoints?: boolean
  onConnectionPointClick?: (elementId: string, anchor: any) => void
  isLineMode?: boolean
  // Viewport related
  zoom?: number
  zIndex?: number
}

// Memoization comparison function
function arePropsEqual(prevProps: TextBoxProps, nextProps: TextBoxProps) {
  // Compare basic properties
  if (
    prevProps.id !== nextProps.id ||
    prevProps.x !== nextProps.x ||
    prevProps.y !== nextProps.y ||
    prevProps.width !== nextProps.width ||
    prevProps.height !== nextProps.height ||
    prevProps.text !== nextProps.text ||
    prevProps.fontSize !== nextProps.fontSize ||
    prevProps.fontFamily !== nextProps.fontFamily ||
    prevProps.isMarkdown !== nextProps.isMarkdown ||
    prevProps.textAlign !== nextProps.textAlign ||
    prevProps.verticalAlign !== nextProps.verticalAlign ||
    prevProps.showConnectionPoints !== nextProps.showConnectionPoints ||
    prevProps.isLineMode !== nextProps.isLineMode ||
    prevProps.zoom !== nextProps.zoom ||
    prevProps.zIndex !== nextProps.zIndex
  ) {
    return false
  }

  // Prevent re-render even if function references change, as actual behavior is the same
  return true
}

export const TextBox = memo(function TextBox({
  id,
  x,
  y,
  width,
  height,
  text,
  fontSize,
  fontFamily,
  textAlign = 'left',
  verticalAlign = 'top',
  onUpdate,
  onDoubleClick,
  showConnectionPoints = false,
  onConnectionPointClick,
  isLineMode = false,
  zoom = 1,
  zIndex = 1
}: TextBoxProps) {
  // Consolidate state access in one place (mock compatible)
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
  const startEditingTextSafe = (elementId: string) => {
    if (typeof store.startEditingText === 'function') return store.startEditingText(elementId)
  }
  const updateConnectorsSafe = () => {
    if (typeof store.updateConnectors === 'function') return store.updateConnectors()
  }

  const groupRef = useRef<any>()
  const isPointerDownRef = useRef(false)
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null)
  // For multi-selection dragging
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
  const [isResizing, setIsResizing] = useState(false)

  // Adjust font size (8-64px)
  const adjustFontSize = (delta: number) => {
    const newFontSize = Math.max(8, Math.min(64, fontSize + delta))
    if (newFontSize !== fontSize) {
      onUpdate(id, { fontSize: newFontSize })
    }
  }

  // Keyboard event handler
  useEffect(() => {
    if (!isSelected || isEditing) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow native keyboard behavior for clipboard operations and input fields
      if (shouldAllowNativeKeyboard(e)) {
        return
      }

      // Adjust font size with Ctrl/Cmd + Plus/Minus
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault()
          adjustFontSize(1)
        } else if (e.key === '-') {
          e.preventDefault()
          adjustFontSize(-1)
        }
      }
      // Adjust in larger increments with Shift + Ctrl/Cmd + Plus/Minus
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault()
          adjustFontSize(4)
        } else if (e.key === '-') {
          e.preventDefault()
          adjustFontSize(-4)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSelected, isEditing, fontSize, id, onUpdate])

  // Resize with locked aspect ratio (unified)
  const resizeWithAspect = useCallback((
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
  }, [width, height, x, y, id, onUpdate])

  // Free resize (unified)
  const resizeFree = useCallback((
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

    // Resize independently in each direction
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
  }, [width, height, x, y, id, onUpdate])


  const konvaResizeHandles = getKonvaResizeHandlePositions({ x, y, width, height })

  return (
    <>
      <Group
        ref={groupRef}
        id={`element-${id}`}
        x={x}
        y={y}
        zIndex={zIndex}
        onMouseDown={(e: any) => {
          if (e?.evt?.button !== 0) return
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
          // Push history once when drag starts
          try { useBoardStore.getState().beginElementDrag() } catch {}
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
          // Clear snapping guidelines
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
              state.updateElement(sid, newPos, false, true)
            }
            state.updateConnectors()
          } else {
            const newPosition = { x: e.target.x(), y: e.target.y() }
            state.updateElement(id, newPosition, false, true)
            state.updateConnectors()
          }
          if (groupRef.current) groupRef.current.draggable(false)
          dragSelectionIdsRef.current = null
          dragInitialPositionsRef.current = {}
          draggedInitialPosRef.current = null
        }}
        onDragMove={(e: any) => {
          // Execute snapping process first
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
            state.updateConnectors()
          }
        }}
        onClick={(e: any) => {
          e.evt?.stopPropagation?.()
          // Select element (don't select during line mode)
          if (!isLineMode) {
            selectShapeSafe(id)
          }
        }}
        onDblClick={(e: any) => {
          // Completely stop event propagation
          e.evt?.stopPropagation?.()
          e.evt?.preventDefault?.()
          e.cancelBubble = true

          // Double click = text editing mode
          if (groupRef.current) {
            // Stop dragging to prevent drag state on double click
            try { groupRef.current.stopDrag?.() } catch {}
            groupRef.current.draggable(false)
          }
          isPointerDownRef.current = false
          pointerDownPosRef.current = null
          startEditingTextSafe(id)

          // Also call legacy edit handler (for compatibility)
          if (onDoubleClick) {
            const element = { id, x, y, width, height, text, fontSize, fontFamily, type: 'text' }
            onDoubleClick(id, element, groupRef.current)
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Text display - Plain text only */}
        <Text
          text={text || ''}
          width={width}
          height={height}
          fontSize={fontSize}
          fontFamily={fontFamily}
          fill="#333"
          stroke={isHovered ? '#0066FF' : 'transparent'}
          strokeWidth={isHovered ? 1 : 0}
          padding={4}
          align={textAlign}
          verticalAlign={verticalAlign}
        />
      </Group>

      {/* Show resize handles only when selected and not editing */}
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
                resizeWithAspect('nw', deltaX, deltaY, 100, 30)
              } else {
                resizeFree('nw', deltaX, deltaY, 100, 30)
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
                resizeWithAspect('ne', deltaX, deltaY, 100, 30)
              } else {
                resizeFree('ne', deltaX, deltaY, 100, 30)
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
                resizeWithAspect('sw', deltaX, deltaY, 100, 30)
              } else {
                resizeFree('sw', deltaX, deltaY, 100, 30)
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
                resizeWithAspect('se', deltaX, deltaY, 100, 30)
              } else {
                resizeFree('se', deltaX, deltaY, 100, 30)
              }
            }}
            onResizeEnd={() => { setIsResizing(false); updateConnectorsSafe() }}
            zoom={zoom}
          />
        </>
      )}

      {/* Connection points (displayed during line mode or connector endpoint dragging) */}
      <ConnectionPoints
        element={{ id, x, y, width, height }}
        visible={!!showConnectionPoints}
        onClick={onConnectionPointClick}
      />

      {/* Font size is displayed in SelectionToolbar, not shown here */}
    </>
  )
}, arePropsEqual)
