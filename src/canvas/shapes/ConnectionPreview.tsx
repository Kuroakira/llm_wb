'use client'

import React, { useState, useEffect } from 'react'
import { useBoardStore } from '@/store/boardStore'
import { screenToCanvas } from '@/lib/coordinates'
import type { AnchorPosition } from '@/types'

import { Line, Circle } from 'react-konva'

type ConnectionPreviewProps = {
  isActive: boolean
  fromElementId: string | null
  fromAnchor: AnchorPosition | null
  elements: any[]
  mousePosition?: { x: number; y: number }
}

function getAnchorPoint(element: { x: number; y: number; width: number; height: number }, anchor: AnchorPosition) {
  const { x, y, width, height } = element

  switch (anchor) {
    case 'top':
      return { x: x + width / 2, y: y }
    case 'right':
      return { x: x + width, y: y + height / 2 }
    case 'bottom':
      return { x: x + width / 2, y: y + height }
    case 'left':
      return { x: x, y: y + height / 2 }
  }
}

export function ConnectionPreview({ isActive, fromElementId, fromAnchor, elements, mousePosition }: ConnectionPreviewProps) {
  const [currentMousePos, setCurrentMousePos] = useState({ x: 0, y: 0 })
  const { connectorHoverTarget, viewport } = useBoardStore()

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Konvaステージのコンテナ要素を探す
      const konvaContainer = document.querySelector('.konvajs-content') as HTMLElement | null
      if (!konvaContainer) {
        // フォールバック: canvas-containerを探す
        const fallbackContainer = document.querySelector('.canvas-container') as HTMLElement | null
        if (!fallbackContainer) {
          return
        }
        const rect = fallbackContainer.getBoundingClientRect()
        const screenX = e.clientX - rect.left
        const screenY = e.clientY - rect.top
        const canvasPos = screenToCanvas(screenX, screenY, viewport)
        setCurrentMousePos(canvasPos)
        return
      }
      
      // Konvaコンテナ相対の座標を取得
      const rect = konvaContainer.getBoundingClientRect()
      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top
      const canvasPos = screenToCanvas(screenX, screenY, viewport)
      setCurrentMousePos(canvasPos)
    }

    if (isActive) {
      // 2クリック方式：接続開始時に即座にマウス位置を初期化
      // 最初のクリックが完了した直後から、スムーズなプレビューラインを表示
      const currentEvent = (window as Window & { lastMouseEvent?: MouseEvent }).lastMouseEvent
      if (currentEvent) {
        handleMouseMove(currentEvent)
      }
      
      // 高頻度でスムーズな追従を実現（パフォーマンス最適化済み）
      document.addEventListener('mousemove', handleMouseMove, { passive: true })
      return () => document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [isActive, viewport.panX, viewport.panY, viewport.zoom])

  // Store last mouse event for initialization
  useEffect(() => {
    const storeMouseEvent = (e: MouseEvent) => {
      (window as Window & { lastMouseEvent?: MouseEvent }).lastMouseEvent = e
    }
    document.addEventListener('mousemove', storeMouseEvent, { passive: true })
    return () => document.removeEventListener('mousemove', storeMouseEvent)
  }, [])

  if (!isActive || !fromElementId || !fromAnchor) return null

  const fromElement = elements.find(el => el.id === fromElementId)
  if (!fromElement) return null

  const fromPoint = getAnchorPoint(fromElement, fromAnchor)
  // Always use our internal mouse tracking for more reliable positioning
  const toPoint = currentMousePos

  const isHoveringStart = connectorHoverTarget && connectorHoverTarget.elementId === fromElement.id && connectorHoverTarget.anchor === fromAnchor

  // Enhanced time-based animations for smoother visual feedback
  const time = Date.now() * 0.001
  const pulseIntensity = Math.abs(Math.sin(time * 2.5)) // Faster, more visible pulsing
  const connectionProgress = Math.min(1, (time % 4) / 1) // 4-second cycle for connection hint

  return (
    <>
      {/* 接続開始点の小さなインジケーター（サイズ固定、色のみで状態表現） */}
      {Circle && (
        <Circle
          x={fromPoint.x}
          y={fromPoint.y}
          radius={6} // 固定サイズ（アンカーポイントと同じ）
          fill={'#059669'} // 緑色で「接続開始済み」状態を表現
          stroke={'#047857'}
          strokeWidth={2}
          shadowColor={'rgba(5, 150, 105, 0.5)'}
          shadowBlur={3} // 控えめなシャドウ
          shadowOpacity={0.3}
          listening={false}
          scaleX={1} // スケール固定
          scaleY={1} // スケール固定
          opacity={1}
        />
      )}
      
      {/* プレビューライン（適度な太さ、ダッシュで仮接続を表現） */}
      <Line
        points={[fromPoint.x, fromPoint.y, toPoint.x, toPoint.y]}
        stroke="#059669" // ソースアンカーと統一された緑色
        strokeWidth={2} // 固定の細いライン
        dash={[8, 4]} // 標準的なダッシュパターン
        opacity={0.7} // 控えめな不透明度
        lineCap="round"
        lineJoin="round"
        listening={false}
        shadowColor="rgba(5, 150, 105, 0.3)"
        shadowBlur={2}
        shadowOpacity={0.3}
        // ダッシュアニメーション：接続の進行感を演出
        dashOffset={-(time * 20) % 12} // スムーズなダッシュ流れ
      />
      
      {/* ターゲット位置のインジケーター（控えめなサイズ） */}
      {Circle && (
        <Circle
          x={toPoint.x}
          y={toPoint.y}
          radius={4} // 小さく固定サイズ
          fill={'rgba(5, 150, 105, 0.4)'}
          stroke={'#059669'}
          strokeWidth={2}
          listening={false}
          opacity={0.7}
          scaleX={1} // スケール固定
          scaleY={1} // スケール固定
          shadowColor="rgba(5, 150, 105, 0.3)"
          shadowBlur={2}
          shadowOpacity={0.3}
        />
      )}
      
      {/* 2クリック方式：接続完了のヒントテキスト（オプション：一定時間後に表示） */}
      {connectorHoverTarget && connectionProgress > 0.5 && (
        <Circle
          x={toPoint.x + 40}
          y={toPoint.y - 20}
          radius={3}
          fill="rgba(5, 150, 105, 0.9)"
          listening={false}
          opacity={connectionProgress}
        />
      )}
    </>
  )
}

