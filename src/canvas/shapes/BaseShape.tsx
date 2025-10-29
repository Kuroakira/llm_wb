'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { useBoardStore } from '@/store/boardStore'
import { ConnectionPoints } from './ConnectionPoints'
import type { AnchorPosition } from '@/types'

import { Group, Transformer } from 'react-konva'

export interface BaseShapeProps {
  id: string
  x: number
  y: number
  width: number
  height: number
  zIndex?: number
  zoom?: number
  showConnectionPoints?: boolean
  isLineMode?: boolean
  onUpdate?: (id: string, updates: any) => void
  onDoubleClick?: (id: string, element: any, stageRef: any) => void
  onContextMenu?: (id: string, element: any, position: { x: number; y: number }) => void
  onConnectionPointClick?: (elementId: string, anchor: AnchorPosition) => void
}

export interface BaseShapeState {
  isDragging: boolean
  isResizing: boolean
  isSelected: boolean
  dragStartPos: { x: number; y: number } | null
}

/**
 * Base component for all canvas shapes
 * Provides common functionality like selection, dragging, resizing, and connection points
 */
export function useBaseShape(props: BaseShapeProps, elementType: string, elementData: any) {
  const { id, x, y, width, height, zoom = 1, onUpdate, showConnectionPoints, onConnectionPointClick } = props
  
  const groupRef = useRef<any>(null)
  const transformerRef = useRef<any>(null)
  const nodeRef = useRef<any>(null)
  
  const [state, setState] = useState<BaseShapeState>({
    isDragging: false,
    isResizing: false,
    isSelected: false,
    dragStartPos: null
  })
  
  const { selectedIds, selectShape, beginElementDrag, connectorDrag } = useBoardStore()
  const isSelected = selectedIds?.includes(id) ?? false
  
  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !nodeRef.current) return
    
    if (isSelected && !connectorDrag?.isActive) {
      transformerRef.current.nodes([nodeRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    } else {
      transformerRef.current.nodes([])
    }
  }, [isSelected, connectorDrag?.isActive])
  
  // Common event handlers
  const handleClick = useCallback((e: any) => {
    e.cancelBubble = true
    selectShape(id)
  }, [id, selectShape])
  
  const handleDragStart = useCallback((e: any) => {
    beginElementDrag()
    setState(prev => ({
      ...prev,
      isDragging: true,
      dragStartPos: { x: e.target.x(), y: e.target.y() }
    }))
  }, [beginElementDrag])
  
  const handleDragEnd = useCallback((e: any) => {
    const node = e.target
    const newX = node.x()
    const newY = node.y()
    
    setState(prev => ({ ...prev, isDragging: false, dragStartPos: null }))
    
    if (onUpdate && (newX !== x || newY !== y)) {
      onUpdate(id, { x: newX, y: newY })
    }
  }, [id, x, y, onUpdate])
  
  const handleTransformEnd = useCallback(() => {
    const node = nodeRef.current
    if (!node || !onUpdate) return
    
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    
    node.scaleX(1)
    node.scaleY(1)
    
    onUpdate(id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(20, node.width() * scaleX),
      height: Math.max(10, node.height() * scaleY)
    })
    
    setState(prev => ({ ...prev, isResizing: false }))
  }, [id, onUpdate])
  
  const handleContextMenu = useCallback((e: any) => {
    e.evt.preventDefault()
    e.cancelBubble = true
    
    const stage = e.target.getStage()
    const containerRect = stage.container().getBoundingClientRect()
    const position = {
      x: containerRect.left + e.evt.clientX - containerRect.left,
      y: containerRect.top + e.evt.clientY - containerRect.top
    }
    
    if (props.onContextMenu) {
      props.onContextMenu(id, { ...elementData, type: elementType }, position)
    }
  }, [id, elementType, elementData, props])
  
  const handleDoubleClick = useCallback((e: any) => {
    e.cancelBubble = true
    if (props.onDoubleClick) {
      props.onDoubleClick(id, { ...elementData, type: elementType }, e.target)
    }
  }, [id, elementType, elementData, props])
  
  // Calculate responsive dimensions based on zoom
  const getResponsiveDimensions = useCallback(() => {
    const minWidth = 20
    const minHeight = 10
    const actualWidth = Math.max(minWidth, width)
    const actualHeight = Math.max(minHeight, height)
    
    return { width: actualWidth, height: actualHeight }
  }, [width, height])
  
  return {
    // Refs
    groupRef,
    transformerRef,
    nodeRef,
    
    // State
    state,
    isSelected,
    
    // Event handlers
    handleClick,
    handleDragStart,
    handleDragEnd,
    handleTransformEnd,
    handleContextMenu,
    handleDoubleClick,
    
    // Utilities
    getResponsiveDimensions
  }
}

/**
 * Higher-order component that wraps shapes with base functionality
 */
export function withBaseShape<P extends BaseShapeProps>(
  ShapeComponent: React.ComponentType<P & { nodeRef: any }>,
  elementType: string
) {
  return React.forwardRef<any, P>((props, ref) => {
    const elementData = props as any
    const baseShape = useBaseShape(props, elementType, elementData)
    
    
    return (
      <Group
        ref={baseShape.groupRef}
        x={props.x}
        y={props.y}
        draggable
        onClick={baseShape.handleClick}
        onDragStart={baseShape.handleDragStart}
        onDragEnd={baseShape.handleDragEnd}
        onDblClick={baseShape.handleDoubleClick}
        onContextMenu={baseShape.handleContextMenu}
      >
        <ShapeComponent {...(props as unknown as P & { nodeRef: any })} nodeRef={baseShape.nodeRef} />
        
        {/* Connection points for line mode */}
        <ConnectionPoints
          element={{ id: props.id, x: 0, y: 0, width: props.width, height: props.height }}
          visible={props.showConnectionPoints || false}
          onClick={props.onConnectionPointClick}
        />
        
        {/* Transformer for resizing */}
        {baseShape.isSelected && !props.isLineMode && (
          <Transformer
            ref={baseShape.transformerRef}
            boundBoxFunc={(oldBox: any, newBox: any) => {
              if (newBox.width < 20 || newBox.height < 10) {
                return oldBox
              }
              return newBox
            }}
            onTransformEnd={baseShape.handleTransformEnd}
            anchorSize={8}
            borderStroke="#0D99FF"
            borderStrokeWidth={2}
            anchorStroke="#0D99FF"
            anchorStrokeWidth={1}
            anchorFill="#ffffff"
            cornerRadius={2}
          />
        )}
      </Group>
    )
  })
}