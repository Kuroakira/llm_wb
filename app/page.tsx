'use client'

import React, { useEffect, useState } from 'react'
import { Toolbar } from '@/canvas/tools/Toolbar'
import { LeftChatPanel } from '@/canvas/tools/LeftChatPanel'
import { CanvasStage } from '@/canvas/CanvasStage'
import { useBoardStore } from '@/store/boardStore'
import { useGlobalZoomControl } from '@/hooks/useGlobalZoomControl'


export default function Home() {
  // Use fixed initial values to maintain SSR and client consistency
  const [canvasSize, setCanvasSize] = useState({ width: 1280, height: 720 })
  const [isClient, setIsClient] = useState(false)
  const [isChatCollapsed, setIsChatCollapsed] = useState(false)
  const loadFromStorage = useBoardStore(state => state.loadFromStorage)
  const viewport = useBoardStore(state => state.viewport)

  useEffect(() => {
    // Set flag indicating client-side
    setIsClient(true)

    const updateSize = () => {
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      // Adjust canvas size considering left panel width
      const leftPanelWidth = isChatCollapsed ? 0 : 400
      setCanvasSize({
        width: viewportWidth - leftPanelWidth,
        height: viewportHeight
      })
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [isChatCollapsed])

  // Canvas size remains fixed (screen size) even when zoom changes
  useEffect(() => {
    if (!isClient) return

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const leftPanelWidth = isChatCollapsed ? 0 : 400
    setCanvasSize({
      width: viewportWidth - leftPanelWidth,
      height: viewportHeight
    })
  }, [viewport.zoom, isClient, isChatCollapsed])

  // Enable global zoom control
  useGlobalZoomControl(isClient)

  // Restore data from localStorage on app startup (client-side only)
  useEffect(() => {
    if (!isClient) return

    // Restore board data and viewport
    loadFromStorage()
  }, [isClient, loadFromStorage])

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw' }}>
      {/* Left chat panel */}
      {isClient && (
        <LeftChatPanel
          isCollapsed={isChatCollapsed}
          onToggleCollapse={() => setIsChatCollapsed(!isChatCollapsed)}
        />
      )}

      {/* Extended canvas - scrollable */}
      <div
        className="canvas-scroll"
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden', // Disable scroll
          position: 'relative',
          marginLeft: isChatCollapsed ? '0' : '400px',
          transition: 'margin-left 0.3s ease'
        }}
      >
        {isClient ? (
          <CanvasStage
            width={canvasSize.width}
            height={canvasSize.height}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#666666'
          }}>
            Loading...
          </div>
        )}
      </div>

      {/* Figmaスタイルの浮遊ツールバー */}
      {isClient && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          pointerEvents: 'auto'
        }}>
          <Toolbar />
        </div>
      )}
    </div>
  )
}
