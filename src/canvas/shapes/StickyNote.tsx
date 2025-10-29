'use client'

import React, { useRef, useState, useEffect, memo, useCallback } from 'react'
import { KonvaResizeHandle, getKonvaResizeHandlePositions } from './ResizeHandle'
import { ConnectionPoints } from './ConnectionPoints'
import { MarkdownRenderer, containsMarkdown } from './MarkdownRenderer'
import { MarkdownIndicator } from './MarkdownIndicator'
import { useBoardStore } from '@/store/boardStore'
import { useIsElementSelected, useMode, useEditingTextId, useConnectorDrag } from '@/store/selectors'
import { handleSnapDragMove, handleSnapDragEnd } from '@/lib/snapUtils'
import { TYPOGRAPHY_TOKENS, getOptimalTextColor, TEXT_SPACING, getResponsiveFontSize } from '@/design-system/typography'
import type { TextAlignment, VerticalAlignment } from '@/types'

import { Rect, Text, Group } from 'react-konva'
import { Html } from 'react-konva-utils'

type StickyNoteProps = {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
  color: string
  isMarkdown?: boolean
  textAlign?: TextAlignment
  verticalAlign?: VerticalAlignment
  onUpdate: (id: string, updates: any) => void
  onDoubleClick?: (elementId: string, element: any, groupRef: any) => void
  onContextMenu?: (elementId: string, element: any, position: { x: number; y: number }) => void
  // Viewport related
  zoom?: number
  zIndex?: number
  // Line mode related
  showConnectionPoints?: boolean
  onConnectionPointClick?: (elementId: string, anchor: any) => void
  isLineMode?: boolean
}

// Performance optimized StickyNote with React.memo
export const StickyNote = memo<StickyNoteProps>(function StickyNote({
  id,
  x,
  y,
  width,
  height,
  text,
  color,
  isMarkdown = false,
  textAlign = 'left',
  verticalAlign = 'top',
  onUpdate,
  onDoubleClick,
  onContextMenu,
  zoom = 1,
  zIndex = 0,
  showConnectionPoints = false,
  onConnectionPointClick,
  isLineMode = false
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [isResizing, setIsResizing] = useState(false)

  // Auto-detect markdown and update element if needed
  const shouldRenderMarkdown = isMarkdown || containsMarkdown(text)
  
  useEffect(() => {
    // Auto-enable markdown if we detect markdown patterns and it's not already enabled
    if (!isMarkdown && containsMarkdown(text)) {
      onUpdate(id, { isMarkdown: true })
    }
  }, [text, isMarkdown, id, onUpdate])

  // Use optimized selectors for performance
  const isSelected = useIsElementSelected(id)
  const mode = useMode()
  const editingTextId = useEditingTextId()
  const connectorDrag = useConnectorDrag()
  const isEditing = mode === 'editingText' && editingTextId === id

  // Use stable store references
  const store = useBoardStore()
  const selectShape = useCallback((elementId: string) => {
    store.selectShape(elementId)
  }, [store])
  
  const startEditingText = useCallback((elementId: string) => {
    store.startEditingText(elementId)
  }, [store])
  
  const updateConnectors = useCallback(() => {
    store.updateConnectors()
  }, [store])

  const groupRef = useRef<any>()
  const isPointerDownRef = useRef(false)
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null)
  // References for multi-selection dragging
  const dragSelectionIdsRef = useRef<string[] | null>(null)
  const dragInitialPositionsRef = useRef<Record<string, { x: number; y: number }>>({})
  const draggedInitialPosRef = useRef<{ x: number; y: number } | null>(null)

  // Corner handles: Resize with aspect ratio locked
  const resizeWithAspect = (
    direction: 'nw' | 'ne' | 'sw' | 'se',
    dx: number,
    dy: number,
    minW: number,
    minH: number
  ) => {
    const aspect = width / height
    // Candidate A: Calculate from horizontal direction
    let wFromDx = width
    let hFromDx = height
    if (direction === 'se' || direction === 'ne') {
      wFromDx = width + dx
    } else {
      // Includes west: dx > 0 shrinks width
      wFromDx = width - dx
    }
    wFromDx = Math.max(minW, wFromDx)
    hFromDx = Math.max(minH, Math.round(wFromDx / aspect))
    wFromDx = Math.round(hFromDx * aspect)

    // Candidate B: Calculate from vertical direction
    let hFromDy = height
    let wFromDy = width
    if (direction === 'se' || direction === 'sw') {
      hFromDy = height + dy
    } else {
      // Includes north: dy > 0 shrinks height
      hFromDy = height - dy
    }
    hFromDy = Math.max(minH, hFromDy)
    wFromDy = Math.max(minW, Math.round(hFromDy * aspect))
    hFromDy = Math.round(wFromDy / aspect)

    // Determine which operation has greater magnitude
    const useHorizontal = Math.abs(dx) > Math.abs(dy)
    let newW = useHorizontal ? wFromDx : wFromDy
    let newH = useHorizontal ? hFromDx : hFromDy

    // Final position adjustment (anchor point is diagonal opposite)
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

  // Free resize: For corner handles (independent vertical/horizontal)
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
  }

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

  const triggerContextMenu = (clientX: number, clientY: number) => {
    if (onContextMenu) {
      const element = { id, x, y, width, height, text, color, type: 'sticky' }
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
        name="object" // スナップ用のクラス名
        x={x}
        y={y}
        onMouseDown={(e: any) => {
          if (e?.evt?.button !== 0) return
          try {
            const state: any = useBoardStore.getState()
            const sel: string[] = state.selectedIds || []
            const partOfMulti = sel.length > 1 && sel.includes(id)
            if (!partOfMulti && !isLineMode) {
              selectShape(id)
            }
          } catch {
            if (!isLineMode) {
              selectShape(id)
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
        onClick={(e: any) => {
          e.evt?.stopPropagation?.()
          // Single click = select only (don't select during line mode)
          if (!isLineMode) {
            selectShape(id)
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
          startEditingText(id)

          // Also call legacy edit handler (for compatibility)
          if (onDoubleClick) {
            const element = { id, x, y, width, height, text, color, type: 'sticky' }
            onDoubleClick(id, element, groupRef.current)
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
        {/* Sticky note background */}
        <Rect
          width={width}
          height={height}
          fill={color}
          shadowColor="black"
          shadowBlur={5}
          shadowOpacity={0.1}
          shadowOffsetX={2}
          shadowOffsetY={2}
          stroke={isHovered ? '#0066FF' : 'transparent'}
          strokeWidth={isHovered ? 2 : 0}
        />

        {/* Text display - Markdown support */}
        {shouldRenderMarkdown && Html ? (
          <Html
            divProps={{
              style: {
                position: 'absolute',
                top: 10,
                left: 10,
                width: width - 20,
                height: height - 20,
                pointerEvents: 'none',
                overflow: 'hidden'
              }
            }}
          >
            <MarkdownRenderer
              text={text}
              maxWidth={width - parseInt(TEXT_SPACING.padding.md) * 2}
              maxHeight={height - parseInt(TEXT_SPACING.padding.md) * 2}
              fontSize={parseInt(TYPOGRAPHY_TOKENS.fontSize.base)}
              fontFamily={TYPOGRAPHY_TOKENS.fontFamily.primary}
              backgroundColor="transparent"
              textColor={getOptimalTextColor(color)}
              textAlign={textAlign}
              verticalAlign={verticalAlign}
              className="sticky-markdown-content"
            />
          </Html>
        ) : (
          <Text
            text={text || ''}
            x={parseInt(TEXT_SPACING.padding.md)}
            y={parseInt(TEXT_SPACING.padding.md)}
            width={width - parseInt(TEXT_SPACING.padding.md) * 2}
            height={height - parseInt(TEXT_SPACING.padding.md) * 2}
            fontSize={parseInt(getResponsiveFontSize(TYPOGRAPHY_TOKENS.fontSize.base, zoom))}
            fontFamily={TYPOGRAPHY_TOKENS.fontFamily.primary}
            fill={getOptimalTextColor(color)}
            align={textAlign}
            verticalAlign={verticalAlign}
            lineHeight={parseFloat(TYPOGRAPHY_TOKENS.lineHeight.normal.toString())}
            wrap="word"
          />
        )}
      </Group>

      {/* Connection points (displayed during line mode or connector endpoint dragging) */}
      {/* Rendered before resize handles to keep z-index lower */}
      <ConnectionPoints
        element={{ id, x, y, width, height }}
        visible={!!showConnectionPoints}
        onClick={onConnectionPointClick}
      />

      {/* Show resize handles only when selected and not editing */}
      {/* Rendered after connection points with higher z-index to prioritize event handling */}
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
                resizeWithAspect('nw', deltaX, deltaY, 100, 50)
              } else {
                resizeFree('nw', deltaX, deltaY, 100, 50)
              }
            }}
            onResizeEnd={() => { setIsResizing(false); updateConnectors() }}
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
                resizeWithAspect('ne', deltaX, deltaY, 100, 50)
              } else {
                resizeFree('ne', deltaX, deltaY, 100, 50)
              }
            }}
            onResizeEnd={() => { setIsResizing(false); updateConnectors() }}
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
                resizeWithAspect('sw', deltaX, deltaY, 100, 50)
              } else {
                resizeFree('sw', deltaX, deltaY, 100, 50)
              }
            }}
            onResizeEnd={() => { setIsResizing(false); updateConnectors() }}
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
                resizeWithAspect('se', deltaX, deltaY, 100, 50)
              } else {
                resizeFree('se', deltaX, deltaY, 100, 50)
              }
            }}
            onResizeEnd={() => { setIsResizing(false); updateConnectors() }}
            zoom={zoom}
          />
        </>
      )}

      {/* Markdown indicator */}
      {shouldRenderMarkdown && (
        <MarkdownIndicator
          x={x}
          y={y}
          width={width}
          height={height}
          zoom={zoom}
          visible={true}
        />
      )}
    </>
  )
})
