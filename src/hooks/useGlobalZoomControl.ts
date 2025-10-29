import { useEffect, useRef } from 'react'
import { useBoardStore } from '@/store/boardStore'

/**
 * グローバルなズーム制御を行うフック
 * ピンチジェスチャーとタッチイベントをドキュメントレベルで処理し、
 * ブラウザのデフォルト動作を無効化してアプリのズーム機能を有効にする
 */
export function useGlobalZoomControl(isEnabled: boolean = true) {
  const gestureStateRef = useRef({
    initialDistance: 0,
    initialCenter: { x: 0, y: 0 },
    isZooming: false,
    isPanning: false,
    gestureStarted: false
  })

  useEffect(() => {
    if (!isEnabled) return

    // AbortController for better cleanup management
    const abortController = new AbortController()
    const signal = abortController.signal

    // 2本指間の距離を計算
    const getDistance = (touches: TouchList): number => {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    // 2本指の中心点を計算
    const getCenter = (touches: TouchList) => {
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
      }
    }

    // タッチスタート: ジェスチャーの初期化
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const state = gestureStateRef.current
        state.initialDistance = getDistance(e.touches)
        state.initialCenter = getCenter(e.touches)
        state.gestureStarted = true
        state.isZooming = false
        state.isPanning = false
        
        // まだズームかパンか決定していないので、ブラウザの動作は許可
        return
      }
      
      // 1本指または3本指以上は通常通り
      if (e.touches.length > 2) {
        e.preventDefault()
      }
    }

    // タッチムーブ: ズームかパンかを判定して処理
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !gestureStateRef.current.gestureStarted) {
        return
      }

      const state = gestureStateRef.current
      const currentDistance = getDistance(e.touches)
      const currentCenter = getCenter(e.touches)
      
      const distanceChange = Math.abs(currentDistance - state.initialDistance)
      const centerMovement = Math.sqrt(
        Math.pow(currentCenter.x - state.initialCenter.x, 2) +
        Math.pow(currentCenter.y - state.initialCenter.y, 2)
      )

      // ジェスチャーの種類を判定（まだ決定していない場合）
      if (!state.isZooming && !state.isPanning) {
        const zoomThreshold = 20  // 距離変化の閾値（少し厳しく）
        const panThreshold = 5    // 中心移動の閾値（非常に敏感に）

        if (distanceChange > zoomThreshold) {
          // ピンチズームとして判定
          state.isZooming = true
        } else if (centerMovement > panThreshold) {
          // 2本指パンとして判定
          state.isPanning = true
        } else {
          // まだ判定できない
          return
        }
      }

      // キャンバス領域かチェック
      const target = e.target as Element
      const isScrollArea = target.closest('.canvas-scroll') !== null
      const isChatArea = target.closest('.chat-scroll-area') !== null
      const isCanvasArea = target.closest('.canvas-container') !== null ||
                          target.tagName.toLowerCase() === 'canvas' ||
                          target.classList.contains('konvajs-content')

      if (isChatArea) {
        return
      }

      // スクロール領域での通常スクロールを優先
      if (isScrollArea && !isCanvasArea) {
        return  // 通常のスクロールを許可
      }

      if (!isCanvasArea) {
        return  // キャンバス外では何もしない
      }

      if (state.isZooming) {
        // ピンチズーム処理
        e.preventDefault()
        e.stopPropagation()

        const { setViewport, viewport } = useBoardStore.getState()
        const zoomScale = currentDistance / state.initialDistance
        const newZoom = Math.max(0.05, Math.min(5.0, viewport.zoom * zoomScale))
        
        // ピンチの中心点を基準にズーム調整（左パネル考慮）
        const zoomRatio = newZoom / viewport.zoom
        
        // ピンチ中心点（スクリーン座標、左パネル考慮）
        const leftPanelOffset = document.querySelector('.canvas-scroll')?.getBoundingClientRect()?.left || 0
        const centerX = currentCenter.x - leftPanelOffset
        const centerY = currentCenter.y
        
        // ワールド座標系でのピンチ中心点
        const worldX = (centerX - viewport.panX) / viewport.zoom
        const worldY = (centerY - viewport.panY) / viewport.zoom
        
        // 新しいズーム後でもピンチ中心が同じスクリーン位置になるようにパンを調整
        const newPanX = centerX - worldX * newZoom
        const newPanY = centerY - worldY * newZoom
        
        // ズームとパンを同時に設定
        setViewport({
          zoom: newZoom,
          panX: newPanX,
          panY: newPanY
        })
        
        // 次回の計算のために現在値を更新
        state.initialDistance = currentDistance
        state.initialCenter = currentCenter
        
      } else if (state.isPanning) {
        // 2本指パン処理
        e.preventDefault()
        e.stopPropagation()

        const { setViewport, viewport } = useBoardStore.getState()
        const deltaX = currentCenter.x - state.initialCenter.x
        const deltaY = currentCenter.y - state.initialCenter.y
        
        setViewport({
          zoom: viewport.zoom,
          panX: viewport.panX + deltaX,
          panY: viewport.panY + deltaY
        })
        
        // 次回の計算のために現在値を更新
        state.initialCenter = currentCenter
      }
    }

    // タッチエンド: ジェスチャー状態をリセット
    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        gestureStateRef.current.gestureStarted = false
        gestureStateRef.current.isZooming = false
        gestureStateRef.current.isPanning = false
      }
    }

    // ジェスチャーイベントを無効化（Safari対応）
    const preventGesture = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
    }

    // キーボードイベントは完全にパススルー
    const handleKeyDown = (e: KeyboardEvent) => {
      // 何もしない - 他のハンドラーに処理を委譲
      return
    }

    // wheelイベントでのピンチ・ズーム処理（macOS Safari）
    const handleWheelZoom = (e: WheelEvent) => {
      // スクロール領域かチェック
      const target = e.target as Element
      const isScrollArea = target.closest('.canvas-scroll') !== null
      const isChatArea = target.closest('.chat-scroll-area') !== null
      const isCanvasArea = target.closest('.canvas-container') !== null ||
                          target.tagName.toLowerCase() === 'canvas' ||
                          target.classList.contains('konvajs-content')
      
      if (isChatArea) {
        return
      }
      
      // スクロール領域では通常のスクロールを優先
      if (isScrollArea && !isCanvasArea) {
        // 通常のスクロール動作を許可
        return
      }
      
      if (isCanvasArea && (e.ctrlKey || e.metaKey)) {
        const activeElement = document.activeElement
        const isInputFocused = activeElement && (
          activeElement.tagName.toLowerCase() === 'input' ||
          activeElement.tagName.toLowerCase() === 'textarea' ||
          (activeElement as HTMLElement).contentEditable === 'true' ||
          activeElement.getAttribute('role') === 'textbox'
        )
        
        if (isInputFocused) {
          return
        }
        
        e.preventDefault()
        e.stopPropagation()
        
        // zustandのsetViewport関数を直接呼び出し
        const { setViewport, viewport } = useBoardStore.getState()
        
        // ズーム計算
        const zoomSpeed = e.ctrlKey ? 0.02 : 0.002  // ピンチは高感度
        const zoomDelta = -e.deltaY * zoomSpeed
        let newZoom = viewport.zoom * (1 + zoomDelta)
        newZoom = Math.max(0.05, Math.min(5.0, newZoom))
        
        // マウス位置を中心にズーム調整（左パネル考慮）
        const zoomRatio = newZoom / viewport.zoom
        // 左パネルが表示されている場合は400px分オフセットを考慮
        const leftPanelOffset = document.querySelector('.canvas-scroll')?.getBoundingClientRect()?.left || 0
        const mouseX = e.clientX - leftPanelOffset
        const mouseY = e.clientY
        
        // ワールド座標系でのマウス位置
        const worldX = (mouseX - viewport.panX) / viewport.zoom
        const worldY = (mouseY - viewport.panY) / viewport.zoom
        
        // 新しいズーム後でもマウス位置が同じスクリーン位置になるようにパンを調整
        const newPanX = mouseX - worldX * newZoom
        const newPanY = mouseY - worldY * newZoom
        
        // ズームとパンを同時に設定
        setViewport({
          zoom: newZoom,
          panX: newPanX,
          panY: newPanY
        })
        return
      }
      
      // キャンバス領域での2本指パン（macOS trackpad）
      if (isCanvasArea && !e.ctrlKey && !e.metaKey && !e.shiftKey && (Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) > 0)) {
        e.preventDefault()
        e.stopPropagation()
        
        const { setViewport, viewport } = useBoardStore.getState()
        
        
        // パン速度（macOS trackpadは感度が高いので小さめに）
        const panSpeed = 1
        const deltaX = e.deltaX * panSpeed
        const deltaY = e.deltaY * panSpeed
        
        setViewport({
          zoom: viewport.zoom,
          panX: viewport.panX - deltaX,
          panY: viewport.panY - deltaY
        })
        return
      }
      
      // キャンバス領域でのShift+ホイールパン
      if (isCanvasArea && e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        
        const { setViewport, viewport } = useBoardStore.getState()
        
        // パン速度
        const panSpeed = 2
        const deltaX = e.deltaX * panSpeed
        const deltaY = e.deltaY * panSpeed
        
        setViewport({
          zoom: viewport.zoom,
          panX: viewport.panX - deltaX,
          panY: viewport.panY - deltaY
        })
        return
      }
      
      // その他の領域でのブラウザズーム無効化
      if (!isScrollArea && !isCanvasArea) {
        e.preventDefault()
      }
    }

    // イベントリスナー設定を一元管理 - TypeScript 互換性のため型を調整
    const eventListeners = [
      { type: 'touchstart' as const, handler: handleTouchStart as EventListener, options: { passive: false, capture: true, signal } },
      { type: 'touchmove' as const, handler: handleTouchMove as EventListener, options: { passive: false, capture: true, signal } },
      { type: 'touchend' as const, handler: handleTouchEnd as EventListener, options: { passive: false, capture: true, signal } },
      { type: 'gesturestart' as const, handler: preventGesture as EventListener, options: { passive: false, capture: true, signal } },
      { type: 'gesturechange' as const, handler: preventGesture as EventListener, options: { passive: false, capture: true, signal } },
      { type: 'gestureend' as const, handler: preventGesture as EventListener, options: { passive: false, capture: true, signal } },
      { type: 'wheel' as const, handler: handleWheelZoom as EventListener, options: { passive: false, capture: false, signal } },
      { type: 'keydown' as const, handler: handleKeyDown as EventListener, options: { passive: false, capture: true, signal } }
    ]

    // Safety check for AbortController support
    const hasAbortControllerSupport = typeof AbortController !== 'undefined'

    // イベントリスナーを登録
    eventListeners.forEach(({ type, handler, options }) => {
      try {
        if (hasAbortControllerSupport) {
          document.addEventListener(type, handler, options)
        } else {
          // Fallback for older browsers without AbortController support
          const { signal: _, ...fallbackOptions } = options
          document.addEventListener(type, handler, fallbackOptions)
        }
      } catch (error) {
        // Silent fallback - event listeners are optional
      }
    })

    // クリーンアップ - AbortController を使用するか手動削除
    return () => {
      try {
        if (hasAbortControllerSupport && !signal.aborted) {
          abortController.abort()
        } else {
          // Manual cleanup for older browsers
          eventListeners.forEach(({ type, handler, options }) => {
            const { signal: _, ...cleanupOptions } = options
            document.removeEventListener(type, handler, cleanupOptions)
          })
        }
      } catch (error) {
        // Silent cleanup - errors during cleanup are not critical
      }
    }
  }, [isEnabled])
}