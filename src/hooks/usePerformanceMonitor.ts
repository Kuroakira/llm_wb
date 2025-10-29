import { useEffect, useRef, useState } from 'react'

interface PerformanceMetrics {
  renderTime: number
  memoryUsage?: number
  elementCount: number
  fps: number
  lastMeasurement: number
}

/**
 * Performance monitoring hook for React components
 * Tracks render times, FPS, and memory usage for optimization insights
 */
export function usePerformanceMonitor(
  componentName: string,
  elementCount: number = 0,
  enabled = process.env.NODE_ENV === 'development'
) {
  const renderStartRef = useRef<number>(0)
  const frameCountRef = useRef(0)
  const lastFpsCheckRef = useRef(Date.now())
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    elementCount: 0,
    fps: 60,
    lastMeasurement: Date.now()
  })

  // Track render start time
  useEffect(() => {
    if (!enabled) return
    renderStartRef.current = performance.now()
  })

  // Track render completion and calculate metrics
  useEffect(() => {
    if (!enabled) return

    const renderEnd = performance.now()
    const renderTime = renderEnd - renderStartRef.current

    // Update frame count for FPS calculation
    frameCountRef.current++
    const now = Date.now()
    const timeSinceFpsCheck = now - lastFpsCheckRef.current

    // Calculate FPS every second
    if (timeSinceFpsCheck >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / timeSinceFpsCheck)
      frameCountRef.current = 0
      lastFpsCheckRef.current = now

      setMetrics(prev => ({
        ...prev,
        renderTime,
        elementCount,
        fps,
        lastMeasurement: now,
        memoryUsage: (performance as any).memory?.usedJSHeapSize
      }))
    } else {
      setMetrics(prev => ({
        ...prev,
        renderTime,
        elementCount,
        lastMeasurement: now
      }))
    }

    // Log performance warnings
    if (renderTime > 16) { // 16ms = 60fps threshold
      console.warn(`[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms (>${elementCount} elements)`)
    }
  }, [enabled, componentName, elementCount])

  return metrics
}

/**
 * Hook to track canvas performance specifically
 * Monitors element count, viewport changes, and rendering performance
 */
export function useCanvasPerformanceMonitor(
  elementCount: number,
  viewport: { zoom: number; panX: number; panY: number },
  enabled = process.env.NODE_ENV === 'development'
) {
  const metrics = usePerformanceMonitor('CanvasStage', elementCount, enabled)
  const [performanceLevel, setPerformanceLevel] = useState<'good' | 'warning' | 'poor'>('good')

  useEffect(() => {
    if (!enabled) return

    // Determine performance level based on metrics
    let level: 'good' | 'warning' | 'poor' = 'good'

    // Poor performance indicators
    if (metrics.fps < 30 || metrics.renderTime > 33) {
      level = 'poor'
    }
    // Warning performance indicators  
    else if (metrics.fps < 45 || metrics.renderTime > 16 || elementCount > 100) {
      level = 'warning'
    }

    setPerformanceLevel(level)

    // Log performance recommendations
    if (level === 'poor') {
      console.warn('[Performance] Canvas performance is poor:', {
        fps: metrics.fps,
        renderTime: metrics.renderTime,
        elementCount,
        recommendations: [
          'Consider enabling viewport culling',
          'Reduce element count if possible',
          'Check for unnecessary re-renders',
          'Consider using React.memo for expensive components'
        ]
      })
    }
  }, [metrics, elementCount, enabled])

  return {
    ...metrics,
    performanceLevel,
    suggestions: getSuggestionsForPerformance(performanceLevel, elementCount, metrics)
  }
}

function getSuggestionsForPerformance(
  level: 'good' | 'warning' | 'poor',
  elementCount: number,
  metrics: PerformanceMetrics
): string[] {
  const suggestions: string[] = []

  if (level === 'poor') {
    if (elementCount > 50) {
      suggestions.push('Enable viewport culling to render only visible elements')
    }
    if (metrics.renderTime > 33) {
      suggestions.push('Components are taking too long to render - check for expensive calculations')
    }
    if (metrics.fps < 30) {
      suggestions.push('Frame rate is too low - consider reducing animation complexity')
    }
  } else if (level === 'warning') {
    if (elementCount > 25) {
      suggestions.push('Consider optimizing for higher element counts')
    }
    if (metrics.renderTime > 16) {
      suggestions.push('Render time approaching 60fps threshold')
    }
  }

  return suggestions
}