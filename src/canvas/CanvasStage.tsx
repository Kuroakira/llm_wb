'use client'

import React, { useEffect, useMemo, useCallback, memo, useRef } from 'react'
import { StickyNote } from './shapes/StickyNote'
import { RectShape } from './shapes/RectShape'
import { TextBox } from './shapes/TextBox'
import { ImageShape } from './shapes/ImageShape'
import { Connector } from './edges/Connector'
import { StickyNoteEditor } from './StickyNoteEditor'
import { ConnectionPreview } from './shapes/ConnectionPreview'
import { ColorPicker } from './tools/ColorPicker'
import { ContextMenu } from './tools/ContextMenu'
import { SelectionToolbar } from './tools/SelectionToolbar'
import { ResizePreview } from './shapes/ResizePreview'
import { 
  useSortedElements,
  useConnectors,
  useSelectedTool,
  useSelectedElements,
  useViewport as useViewportSelector,
  useStoreActions,
  useConnectionMode,
  useConnectorDrag,
  useHoveredElementId,
  useCursorPosition
} from '@/store/selectors'
import { useCanvasEvents } from './hooks/useCanvasEvents'
import { useViewport } from './hooks/useViewport'
import { useCanvasPerformanceMonitor } from '@/hooks/usePerformanceMonitor'
import { useThrottle } from '@/hooks/useThrottle'
import { isWithinHoverBuffer } from '@/lib/interaction-utils'

// Dynamic import of Konva components
let Stage: any, Layer: any, RectK: any

if (typeof window !== 'undefined') {
  try {
    const konva = require('react-konva')
    Stage = konva.Stage
    Layer = konva.Layer
    RectK = konva.Rect
  } catch (e) {
  }
}

type CanvasStageProps = {
  width: number
  height: number
}

// Performance optimized CanvasStage with React.memo
export const CanvasStage = memo<CanvasStageProps>(function CanvasStage({ width, height }) {
  // Use optimized selectors to prevent unnecessary re-renders
  const elements = useSortedElements()
  const connectors = useConnectors()
  const selectedTool = useSelectedTool()
  const selectedElements = useSelectedElements()
  const viewport = useViewportSelector()
  const connectionMode = useConnectionMode()
  const connectorDrag = useConnectorDrag()
  const hoveredElementId = useHoveredElementId()

  // Use stable action references
  const {
    addImage,
    updateTextAlignment,
    updateVerticalAlignment,
    updateElementColor,
    updateFontSize,
    deleteConnector,
    setHoveredElementId,
  } = useStoreActions()

  // Get required functionality from custom hooks
  const {
    editorState,
    colorPickerState,
    contextMenuState,
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
    isLineMode,
    selectionRect,
    panState,
    isPointOverElement
  } = useCanvasEvents()

  const { handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd } = useViewport()

  // Performance monitoring for development
  useCanvasPerformanceMonitor(elements.length, viewport)
  
  // Memoized calculation for SelectionToolbar position
  const selectionToolbarPosition = useMemo(() => {
    if (selectedElements.length === 0) return { x: 0, y: 0 }
    
    // Find the topmost element
    const topY = Math.min(...selectedElements.map(el => el.y))
    const centerX = selectedElements.reduce((sum, el) => sum + el.x + el.width / 2, 0) / selectedElements.length
    
    // Convert canvas coordinates to screen coordinates
    const screenX = centerX * viewport.zoom + viewport.panX
    const screenY = (topY * viewport.zoom + viewport.panY) - 10 // 10px offset above element
    
    return { x: screenX, y: screenY }
  }, [selectedElements, viewport.zoom, viewport.panX, viewport.panY])

  // Memoized callback functions to prevent recreation on every render
  const handleTextAlignmentChange = useCallback((align: any) => {
    const selectedIds = selectedElements.map(el => el.id)
    updateTextAlignment(selectedIds, align)
  }, [selectedElements, updateTextAlignment])

  const handleVerticalAlignmentChange = useCallback((align: any) => {
    const selectedIds = selectedElements.map(el => el.id)
    updateVerticalAlignment(selectedIds, align)  
  }, [selectedElements, updateVerticalAlignment])

  const handleColorChange2 = useCallback((color: string) => {
    const selectedIds = selectedElements.map(el => el.id)
    updateElementColor(selectedIds, color)
  }, [selectedElements, updateElementColor])

  const handleFontSizeChange = useCallback((fontSize: number) => {
    const selectedIds = selectedElements.map(el => el.id)
    updateFontSize(selectedIds, fontSize)
  }, [selectedElements, updateFontSize])

  // Mouse movement handler for hover detection (throttled for performance)
  const handleMouseMoveRaw = useCallback((e: any) => {
    const stage = e.target.getStage()
    const pos = stage?.getPointerPosition()
    if (!pos) return

    // Convert screen position to canvas position
    const canvasX = (pos.x - viewport.panX) / viewport.zoom
    const canvasY = (pos.y - viewport.panY) / viewport.zoom

    // Find the topmost element under the cursor (highest z-index)
    let topElement = null
    let maxZIndex = -1

    for (const element of elements) {
      // Use centralized hover buffer logic for consistency
      const canvasPoint = { x: canvasX, y: canvasY }
      
      if (isWithinHoverBuffer(canvasPoint, element) && element.zIndex > maxZIndex) {
        topElement = element
        maxZIndex = element.zIndex
      }
    }

    const newHoveredId = topElement ? topElement.id : null
    if (newHoveredId !== hoveredElementId) {
      setHoveredElementId(newHoveredId)
    }

    // Cursor management is now handled centrally in useCanvasEvents hook
  }, [selectedTool, viewport, elements, hoveredElementId, setHoveredElementId, panState.isActive, isPointOverElement])

  // Throttle mouse move events to 60fps (16ms) for better performance
  const handleMouseMove = useThrottle(handleMouseMoveRaw, 16)

  // Image paste handling from clipboard (optimized version)
  const viewportRef = useRef(viewport)
  const dimensionsRef = useRef({ width, height })
  useEffect(() => {
    viewportRef.current = viewport
    dimensionsRef.current = { width, height }
  }, [viewport, width, height])

  const stableHandlePaste = useCallback(async (event: ClipboardEvent) => {
    event.preventDefault()

    const items = event.clipboardData?.items
    if (!items) return

    for (const item of Array.from(items)) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (!file) continue

        // Convert file to data URL
        const reader = new FileReader()
        reader.onload = (e) => {
          if (!e.target?.result) return

          const src = e.target.result as string

          // Get image dimensions
          const img = new Image()
          img.onload = () => {
            // Place in center of screen (get current values from refs)
            const currentViewport = viewportRef.current
            const currentDimensions = dimensionsRef.current
            const centerX = (currentDimensions.width / 2) - (currentViewport.panX / currentViewport.zoom)
            const centerY = (currentDimensions.height / 2) - (currentViewport.panY / currentViewport.zoom)

            // Add image with 1/8 screen size constraint
            addImage({
              x: centerX,
              y: centerY,
              src,
              originalWidth: img.naturalWidth,
              originalHeight: img.naturalHeight
            })
          }
          img.src = src
        }
        reader.readAsDataURL(file)
        break // Process only the first image
      }
    }
  }, [addImage]) // Minimize dependency array

  useEffect(() => {
    document.addEventListener('paste', stableHandlePaste)
    return () => {
      document.removeEventListener('paste', stableHandlePaste)
    }
  }, [stableHandlePaste])


  return (
    <div
      data-testid="canvas"
      className="canvas-container"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        touchAction: 'none', // Disable browser default touch behavior
        userSelect: 'none'    // Disable text selection
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Stage
        width={width}
        height={height}
        scaleX={viewport.zoom}
        scaleY={viewport.zoom}
        x={viewport.panX}
        y={viewport.panY}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onDblClick={handleStageDoubleClick}
        onDblTap={handleStageDoubleClick}
        onWheel={handleWheel}
        onMouseDown={handleSelectionMouseDown}
        onMouseMove={(e: any) => {
          handleSelectionMouseMove(e)
          handleMouseMove(e)
        }}
        onMouseUp={handleSelectionMouseUp}
      >
        <Layer>
          {elements.map((element) => {
              if (element.type === 'sticky') {
                return (
                  <StickyNote
                    key={element.id}
                    id={element.id}
                    x={element.x}
                    y={element.y}
                    width={element.width}
                    height={element.height}
                    text={element.text}
                    color={element.color}
                    isMarkdown={element.isMarkdown}
                    textAlign={element.textAlign}
                    verticalAlign={element.verticalAlign}
                    onUpdate={handleElementUpdate}
                    onDoubleClick={handleElementDoubleClick}
                    onContextMenu={handleContextMenu}
                    zoom={viewport.zoom}
                    zIndex={element.zIndex}
                    showConnectionPoints={element.id === hoveredElementId}
                    onConnectionPointClick={handleConnectionPointClick}
                  />
                )
              } else if (element.type === 'rect') {
                return (
                  <RectShape
                    key={element.id}
                    id={element.id}
                    x={element.x}
                    y={element.y}
                    width={element.width}
                    height={element.height}
                    fill={element.fill}
                    stroke={element.stroke}
                    strokeWidth={element.strokeWidth}
                    radius={element.radius}
                    onUpdate={handleElementUpdate}
                    onContextMenu={handleContextMenu}
                    showConnectionPoints={element.id === hoveredElementId}
                    onConnectionPointClick={handleConnectionPointClick}
                    zoom={viewport.zoom}
                    zIndex={element.zIndex}
                  />
                )
              } else if (element.type === 'text') {
                return (
                  <TextBox
                    key={element.id}
                    id={element.id}
                    x={element.x}
                    y={element.y}
                    width={element.width}
                    height={element.height}
                    text={element.text}
                    fontSize={element.fontSize}
                    fontFamily={element.fontFamily}
                    isMarkdown={element.isMarkdown}
                    textAlign={element.textAlign}
                    verticalAlign={element.verticalAlign}
                    onUpdate={handleElementUpdate}
                    onDoubleClick={handleElementDoubleClick}
                    showConnectionPoints={element.id === hoveredElementId}
                    onConnectionPointClick={handleConnectionPointClick}
                  />
                )
              } else if (element.type === 'image') {
                return (
                  <ImageShape
                    key={element.id}
                    id={element.id}
                    x={element.x}
                    y={element.y}
                    width={element.width}
                    height={element.height}
                    src={element.src}
                    originalWidth={element.originalWidth}
                    originalHeight={element.originalHeight}
                    onUpdate={handleElementUpdate}
                    onDoubleClick={handleElementDoubleClick}
                    onContextMenu={handleContextMenu}
                    zoom={viewport.zoom}
                    zIndex={element.zIndex}
                    showConnectionPoints={element.id === hoveredElementId}
                    onConnectionPointClick={handleConnectionPointClick}
                  />
                )
              }
              return null
            })}

          {/* Connectors */}
          {connectors.map((connector) => (
            <Connector
              key={connector.id}
              id={connector.id}
              fromId={connector.fromId}
              toId={connector.toId}
              points={connector.points}
              onDelete={deleteConnector}
            />
          ))}

          {/* Connection preview during line mode */}
          <ConnectionPreview
            isActive={connectionMode.isActive}
            fromElementId={connectionMode.fromElementId}
            fromAnchor={connectionMode.fromAnchor}
            elements={elements}
          />
        </Layer>

        {connectorDrag.isActive && (
          <Layer>
            <RectK x={-99999} y={-99999} width={1} height={1} />
          </Layer>
        )}
        {selectionRect.isActive && (
          <Layer>
            <RectK
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              fill={'rgba(13,153,255,0.1)'}
              stroke={'#0D99FF'}
              dash={[4, 4]}
            />
          </Layer>
        )}
      </Stage>

      {/* React Portal Editor - rendered outside Konva */}
      {editorState.isVisible && (
        <StickyNoteEditor
          isVisible={editorState.isVisible}
          position={editorState.position}
          width={editorState.element?.width || 200}
          height={editorState.element?.height || 100}
          color={editorState.element?.color || '#FFF2B2'}
          text={editorState.text}
          onTextChange={handleEditorTextChange}
          onFinish={handleEditorFinish}
          elementType={editorState.elementType}
          elementId={editorState.elementId || undefined}
          element={editorState.originalElement}
          zoom={viewport.zoom}
        />
      )}

      {/* Context Menu - rendered outside Konva */}
      <ContextMenu
        isVisible={contextMenuState.isVisible}
        position={contextMenuState.position}
        elementType={contextMenuState.elementType}
        onClose={handleContextMenuClose}
        onChangeColor={handleContextMenuColorChange}
        onBringToFront={handleContextMenuBringToFront}
        onSendToBack={handleContextMenuSendToBack}
      />

      {/* Color Picker for rectangles - rendered outside Konva */}
      <ColorPicker
        isVisible={colorPickerState.isVisible}
        position={colorPickerState.position}
        currentColor={colorPickerState.currentColor}
        onColorChange={handleColorChange}
        onClose={handleColorPickerClose}
      />

      {/* Selection Toolbar - rendered outside Konva */}
      <SelectionToolbar
        isVisible={
          selectedElements.length > 0 && 
          selectedTool === 'select' &&
          selectedElements.some(el => el.type !== 'image') // Hide toolbar if only images are selected
        }
        position={selectionToolbarPosition}
        selectedElements={selectedElements}
        onTextAlignChange={handleTextAlignmentChange}
        onVerticalAlignChange={handleVerticalAlignmentChange}
        onColorChange={handleColorChange2}
        onFontSizeChange={handleFontSizeChange}
        viewport={viewport}
      />

      {/* Resize Preview - rendered outside Konva */}
      <ResizePreview />
    </div>
  )
})
