'use client'

import React from 'react'
import { getCursorForDirection, setCursor, resetCursor } from '@/lib/cursor-utils'
import type { CornerDirection, EdgeDirection } from '@/types'

// Combined type for backwards compatibility
export type ResizeDirection = CornerDirection | EdgeDirection

interface ResizeHandleProps {
  elementId: string
  direction: ResizeDirection
  x: number
  y: number
  isVisible: boolean
  onResize: (elementId: string, direction: ResizeDirection, deltaX: number, deltaY: number, isShiftPressed?: boolean) => void
  onResizeEnd?: () => void
  zoom?: number
}

// リサイズハンドル用のKonva動的インポート
let Rect: any, Group: any

if (typeof window !== 'undefined') {
  try {
    const konva = require('react-konva')
    Rect = konva.Rect
    Group = konva.Group
  } catch (e) {
  }
}

export function KonvaResizeHandle({ elementId, direction, x, y, isVisible, onResize, onResizeEnd, zoom = 1 }: ResizeHandleProps) {
  if (!isVisible || !Rect) return null

  // Only show handles for corner anchors (resize-only)
  const cornerDirections: CornerDirection[] = ['nw', 'ne', 'sw', 'se']
  const isCornerAnchor = cornerDirections.includes(direction as CornerDirection)
  if (!isCornerAnchor) return null

  // ズームに応じてハンドルサイズを調整（正方形のサイズ：最小8px、最大14px）
  const handleSize = Math.max(8, Math.min(14, 10 / zoom))

  // クリック判定エリアはさらに大きく（終点の競合を防ぐため2.2倍に拡大）
  const hitAreaSize = handleSize * 2.2

  const [isHovered, setIsHovered] = React.useState(false)
  const [isActive, setIsActive] = React.useState(false)

  // リサイズ状態を管理するRef
  const isResizingRef = React.useRef(false)
  const lastClickTimeRef = React.useRef(0)
  const cleanupFunctionsRef = React.useRef<(() => void)[]>([])

  // 既存のリスナーを強制クリーンアップ
  const forceCleanup = React.useCallback(() => {
    cleanupFunctionsRef.current.forEach(cleanup => cleanup())
    cleanupFunctionsRef.current = []
    isResizingRef.current = false
    setIsActive(false)
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'default'
    }
    // Stageのリサイズフラグもクリア
    if (typeof document !== 'undefined' && document.querySelector) {
      const konvaContainer = document.querySelector('.konvajs-content')
      if (konvaContainer) {
        const canvas = konvaContainer.querySelector('canvas')
        if (canvas && (canvas as any).__konvaStage) {
          const stage = (canvas as any).__konvaStage
          if (stage._konva_resize_active) {
            stage._konva_resize_active = false
          }
        }
      }
    }
  }, [])

  // コンポーネントアンマウント時のクリーンアップ
  React.useEffect(() => {
    return forceCleanup
  }, [forceCleanup])

  const handleMouseDown = (e: any) => {
    // イベント伝播を完全に停止してアンカーポイントとの競合を防ぐ
    e.evt?.stopPropagation?.()
    e.evt?.stopImmediatePropagation?.()
    e.evt?.preventDefault?.()
    e.cancelBubble = true
    
    // イベントハンドリングの優先権を明示的に設定
    if (e.evt) {
      e.evt._konva_prevent_click = true
      e.evt._resize_handle_priority = true
    }
    
    // Konvaイベントのキャプチャフラグも設定
    if (e.target && e.target.getStage) {
      const stage = e.target.getStage()
      if (stage) {
        stage._konva_resize_active = true
      }
    }

    // ダブルクリック検出（300ms以内の連続クリックは無視）
    const currentTime = Date.now()
    if (currentTime - lastClickTimeRef.current < 300) {
      return // ダブルクリックの2回目は無視
    }
    lastClickTimeRef.current = currentTime

    // 既にリサイズ中の場合は無視
    if (isResizingRef.current) {
      return
    }

    // 既存のリスナーをクリーンアップ
    forceCleanup()

    const startClientX = e.evt.clientX
    const startClientY = e.evt.clientY
    let hasStartedResizing = false

    // ドラッグ意図検出
    const handleDragIntentDetection = (e: MouseEvent) => {
      if (!isResizingRef.current) return // 既にクリーンアップされている場合は無視

      const totalDeltaX = e.clientX - startClientX
      const totalDeltaY = e.clientY - startClientY

      // 5px以上移動したらドラッグ意図ありと判定
      const euclideanDistance = Math.sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY)
      if (euclideanDistance >= 5) {
        hasStartedResizing = true
        setIsActive(true)

        // ドラッグ意図検出リスナーを削除して、リサイズリスナーに切り替え
        document.removeEventListener('mousemove', handleDragIntentDetection)
        cleanupFunctionsRef.current = cleanupFunctionsRef.current.filter(fn => fn !== cleanupDragIntent)

        // リサイズリスナーを追加
        const handleResize = (e: MouseEvent) => {
          if (!isResizingRef.current) return
          e.preventDefault()
          const totalDeltaX = e.clientX - startClientX
          const totalDeltaY = e.clientY - startClientY
          // 累積変化量をキャンバス座標系に変換してリサイズ
          const scale = zoom || 1
          const canvasDeltaX = totalDeltaX / scale
          const canvasDeltaY = totalDeltaY / scale
          onResize(elementId, direction, canvasDeltaX, canvasDeltaY, e.shiftKey)
        }

        document.addEventListener('mousemove', handleResize)
        const cleanupResize = () => document.removeEventListener('mousemove', handleResize)
        cleanupFunctionsRef.current.push(cleanupResize)

        // 最初のリサイズ処理も実行
        const scale = zoom || 1
        const canvasDeltaX = totalDeltaX / scale
        const canvasDeltaY = totalDeltaY / scale
        onResize(elementId, direction, canvasDeltaX, canvasDeltaY, e.shiftKey)
      }
    }

    const handleMouseUp = () => {
      forceCleanup()

      // リサイズ完了コールバック
      if (hasStartedResizing && onResizeEnd) {
        onResizeEnd()
      }
    }

    // リサイズ状態を開始
    isResizingRef.current = true

    // リスナーを登録
    document.addEventListener('mousemove', handleDragIntentDetection)
    document.addEventListener('mouseup', handleMouseUp)

    // クリーンアップ関数を登録
    const cleanupDragIntent = () => document.removeEventListener('mousemove', handleDragIntentDetection)
    const cleanupMouseUp = () => document.removeEventListener('mouseup', handleMouseUp)
    cleanupFunctionsRef.current.push(cleanupDragIntent, cleanupMouseUp)
  }

  return (
    <Group>
      {/* 大きなクリック判定エリア（透明） - 高いz-index相当の優先度 */}
      <Rect
        x={x - hitAreaSize / 2}
        y={y - hitAreaSize / 2}
        width={hitAreaSize}
        height={hitAreaSize}
        fill="transparent"
        // リサイズハンドルを最高優先度でレンダリング（接続ポイントより確実に上位）
        zIndex={10000}
        onMouseDown={handleMouseDown}
        onDblClick={(e: any) => {
          // ダブルクリックイベントを停止して意図しないリサイズを防ぐ
          e.evt?.stopPropagation?.()
          e.evt?.stopImmediatePropagation?.()
          e.evt?.preventDefault?.()
          e.cancelBubble = true
        }}
        onMouseEnter={() => {
          setIsHovered(true)
          setCursor(getCursorForDirection(direction))
        }}
        onMouseLeave={() => {
          setIsHovered(false)
          resetCursor()
        }}
      />

      {/* 実際の見た目のハンドル（角丸正方形） */}
      <Rect
        x={x - handleSize / 2}
        y={y - handleSize / 2}
        width={handleSize}
        height={handleSize}
        cornerRadius={3} // より角丸で現代的なデザイン
        fill={isActive ? '#1F2937' : isHovered ? '#4B5563' : '#6B7280'}
        stroke="#fff"
        strokeWidth={1.5}
        shadowColor={isActive ? 'rgba(31, 41, 55, 0.5)' : isHovered ? 'rgba(75, 85, 99, 0.4)' : 'rgba(107, 114, 128, 0.3)'}
        shadowBlur={isActive ? 6 : isHovered ? 4 : 2}
        shadowOffset={{ x: 0, y: isActive ? 2 : isHovered ? 1 : 0 }}
        scaleX={isActive ? 1.2 : isHovered ? 1.15 : 1}
        scaleY={isActive ? 1.2 : isHovered ? 1.15 : 1}
        zIndex={9999} // ハンドルの見た目も高優先度
        listening={false} // このRectはイベントを受け取らない
      />
    </Group>
  )
}

// リサイズハンドル位置計算（後方互換性のため全位置を返す）
export function getKonvaResizeHandlePositions(element: { x: number; y: number; width: number; height: number }) {
  const { x, y, width, height } = element

  // 後方互換性のため全位置を返すが、実際の表示はコーナーのみ
  return {
    // Corner anchors (actually used)
    nw: { x: x, y: y },
    ne: { x: x + width, y: y },
    sw: { x: x, y: y + height },
    se: { x: x + width, y: y + height },
    // Edge anchors (for backwards compatibility only)
    n: { x: x + width / 2, y: y },
    e: { x: x + width, y: y + height / 2 },
    s: { x: x + width / 2, y: y + height },
    w: { x: x, y: y + height / 2 }
  }
}

// エッジ位置計算（接続ポイント用）
export function getEdgeAnchorPositions(element: { x: number; y: number; width: number; height: number }) {
  const { x, y, width, height } = element

  return {
    // Edge anchors (connection only)
    n: { x: x + width / 2, y: y },
    e: { x: x + width, y: y + height / 2 },
    s: { x: x + width / 2, y: y + height },
    w: { x: x, y: y + height / 2 }
  }
}

// 全ての位置計算（後方互換性のため）
export function getAllAnchorPositions(element: { x: number; y: number; width: number; height: number }) {
  const { x, y, width, height } = element

  return {
    // Corner anchors (resize)
    nw: { x: x, y: y },
    ne: { x: x + width, y: y },
    sw: { x: x, y: y + height },
    se: { x: x + width, y: y + height },
    // Edge anchors (connection)
    n: { x: x + width / 2, y: y },
    e: { x: x + width, y: y + height / 2 },
    s: { x: x + width / 2, y: y + height },
    w: { x: x, y: y + height / 2 }
  }
}
