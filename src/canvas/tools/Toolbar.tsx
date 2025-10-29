'use client'

import React from 'react'
import { useBoardStore } from '@/store/boardStore'
import { Tooltip } from '@/components/Tooltip'
import type { Tool } from '@/types'
import { createModuleLogger } from '@/lib/logger'
import { CiLocationArrow1, CiImageOn } from 'react-icons/ci'
import { FaLongArrowAltRight, FaHandPaper } from 'react-icons/fa'
import { IoText, IoSquareOutline } from 'react-icons/io5'
import { RiStickyNoteAddLine } from 'react-icons/ri'

const logger = createModuleLogger('Toolbar')

const TOOLS = [
  { id: 'select' as Tool, name: 'Select Tool', icon: CiLocationArrow1 },
  { id: 'pan' as Tool, name: 'Pan Tool (H key, or hold Space)', icon: FaHandPaper },
  { id: 'sticky' as Tool, name: 'Add Sticky Note', icon: RiStickyNoteAddLine },
  { id: 'text' as Tool, name: 'Add Text', icon: IoText },
  { id: 'rect' as Tool, name: 'Add Rectangle', icon: IoSquareOutline },
  { id: 'line' as Tool, name: 'Draw Line', icon: FaLongArrowAltRight },
  { id: 'image' as Tool, name: 'Add Image', icon: CiImageOn }
]

export function Toolbar() {
  const { selectedTool, selectTool, undo, redo, viewport, setViewport, history, addImage } = useBoardStore()

  // Function to zoom centered on screen
  const zoomAtCenter = (newZoom: number) => {
    const zoomRatio = newZoom / viewport.zoom
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2

    // Screen center in world coordinates
    const worldX = (centerX - viewport.panX) / viewport.zoom
    const worldY = (centerY - viewport.panY) / viewport.zoom

    // Adjust pan so screen center stays at same screen position after zoom
    const newPanX = centerX - worldX * newZoom
    const newPanY = centerY - worldY * newZoom
    
    setViewport({
      zoom: newZoom,
      panX: newPanX,
      panY: newPanY
    })
  }

  // Use store history
  const resetViewport = () => {
    zoomAtCenter(1)
  }

  // Function to select and add image file
  const handleImageFileSelect = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.style.display = 'none'

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return

      // File size check (10MB limit)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        alert('File size is too large. Please select a file under 10MB.')
        return
      }

      // File format check
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.')
        return
      }

      try {
        // Convert file to data URL
        const reader = new FileReader()
        reader.onload = (e) => {
          if (!e.target?.result) return

          const src = e.target.result as string

          // Get image size
          const img = new Image()
          img.onload = () => {
            // Place at screen center (same logic as clipboard handling)
            const centerX = (window.innerWidth / 2) - (viewport.panX / viewport.zoom)
            const centerY = (window.innerHeight / 2) - (viewport.panY / viewport.zoom)

            // Add image
            addImage({
              x: centerX,
              y: centerY,
              src,
              originalWidth: img.naturalWidth,
              originalHeight: img.naturalHeight
            })

            // Switch to select tool after adding
            selectTool('select')
          }
          img.onerror = () => {
            alert('Failed to load image.')
          }
          img.src = src
        }
        reader.onerror = () => {
          alert('Failed to read file.')
        }
        reader.readAsDataURL(file)
      } catch (error) {
        logger.error('Image processing error', error)
        alert('An error occurred while processing the image.')
      }

      // Clean up
      input.remove()
    }

    document.body.appendChild(input)
    input.click()
  }

  return (
    <div
      data-testid="toolbar"
      style={{
        backgroundColor: '#2C2C2C',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        padding: '8px',
        gap: '4px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      {TOOLS.map((tool) => {
        const IconComponent = tool.icon
        return (
          <Tooltip key={tool.id} text={tool.name} position="top" delay={500}>
            <button
              data-testid={`tool-${tool.id}`}
              onClick={() => {
                if (tool.id === 'image') {
                  handleImageFileSelect()
                } else {
                  selectTool(tool.id)
                }
              }}
              style={{
                width: '44px',
                height: '44px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: (selectedTool === tool.id && tool.id !== 'image') ? '#0D99FF' : 'transparent',
                color: (selectedTool === tool.id && tool.id !== 'image') ? '#FFFFFF' : '#CCCCCC',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                transition: 'all 0.2s ease',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
              onMouseEnter={(e) => {
                if (selectedTool !== tool.id || tool.id === 'image') {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedTool !== tool.id || tool.id === 'image') {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              <IconComponent size={18} />
            </button>
          </Tooltip>
        )
      })}

      {/* セパレーター */}
      <div style={{
        width: '1px',
        height: '24px',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        margin: '0 4px'
      }} />

      {/* Undo ボタン */}
      <Tooltip text="Undo (Ctrl+Z / Cmd+Z)" position="top" delay={500}>
        <button
          data-testid="tool-undo"
          onClick={undo}
          disabled={history.past.length === 0}
          style={{
            width: '36px',
            height: '36px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: history.past.length > 0 ? '#CCCCCC' : '#666666',
            cursor: history.past.length > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            transition: 'all 0.2s ease',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
          onMouseEnter={(e) => {
            if (history.past.length > 0) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          ↶
        </button>
      </Tooltip>

      {/* Redo ボタン */}
      <Tooltip text="Redo (Ctrl+Shift+Z / Cmd+Shift+Z)" position="top" delay={500}>
        <button
          data-testid="tool-redo"
          onClick={redo}
          disabled={history.future.length === 0}
          style={{
            width: '36px',
            height: '36px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: history.future.length > 0 ? '#CCCCCC' : '#666666',
            cursor: history.future.length > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            transition: 'all 0.2s ease',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
          onMouseEnter={(e) => {
            if (history.future.length > 0) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          ↷
        </button>
      </Tooltip>

      {/* セパレーター */}
      <div style={{
        width: '1px',
        height: '24px',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        margin: '0 4px'
      }} />

      {/* ズームアウト */}
      <Tooltip text="Zoom Out" position="top" delay={500}>
        <button
          data-testid="tool-zoom-out"
          onClick={() => zoomAtCenter(viewport.zoom * 0.8)}
          style={{
            width: '36px',
            height: '36px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: '#CCCCCC',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            transition: 'all 0.2s ease',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          −
        </button>
      </Tooltip>

      {/* ズーム表示 */}
      <div style={{
        minWidth: '60px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#CCCCCC',
        fontSize: '12px',
        fontFamily: 'system-ui, -apple-system, monospace'
      }}>
        {Math.round(viewport.zoom * 100)}%
      </div>

      {/* ズームイン */}
      <Tooltip text="Zoom In" position="top" delay={500}>
        <button
          data-testid="tool-zoom-in"
          onClick={() => zoomAtCenter(viewport.zoom * 1.25)}
          style={{
            width: '36px',
            height: '36px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: '#CCCCCC',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            transition: 'all 0.2s ease',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          +
        </button>
      </Tooltip>

      {/* ズームリセット */}
      <Tooltip text="Reset Zoom (100%)" position="top" delay={500}>
        <button
          data-testid="tool-zoom-reset"
          onClick={resetViewport}
          style={{
            width: '36px',
            height: '36px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: '#CCCCCC',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            transition: 'all 0.2s ease',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          ⌂
        </button>
      </Tooltip>
    </div>
  )
}
