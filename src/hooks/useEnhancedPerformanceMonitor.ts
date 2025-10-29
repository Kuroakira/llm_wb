import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createModuleLogger } from '@/lib/logger'

const logger = createModuleLogger('PerformanceMonitor')

interface PerformanceMetrics {
  renderTime: number
  elementCount: number
  memoryUsage: number
  fps: number
  longTasks: number
  layoutShifts: number
  lastUpdate: number
}

interface PerformanceTestUtils {
  measureRenderTime: (componentName: string) => () => void
  trackMemoryUsage: () => number
  simulateLoad: (elementCount: number) => Array<{
    id: string
    type: 'sticky'
    x: number
    y: number
    width: number
    height: number
    text: string
    color: string
  }>
}

export function useEnhancedPerformanceMonitor(elementCount: number = 0): {
  metrics: PerformanceMetrics
  testUtils: PerformanceTestUtils
} {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    elementCount: 0,
    memoryUsage: 0,
    fps: 60,
    longTasks: 0,
    layoutShifts: 0,
    lastUpdate: Date.now()
  })

  const fpsCounter = useRef({ frames: 0, lastTime: performance.now() })
  const longTaskCount = useRef(0)
  const layoutShiftCount = useRef(0)

  // Track FPS using requestAnimationFrame
  useEffect(() => {
    let animationId: number

    const trackFPS = () => {
      const now = performance.now()
      fpsCounter.current.frames++

      // Update FPS every second
      if (now - fpsCounter.current.lastTime >= 1000) {
        const fps = Math.round(fpsCounter.current.frames * 1000 / (now - fpsCounter.current.lastTime))
        
        setMetrics(prev => ({
          ...prev,
          fps,
          elementCount,
          lastUpdate: Date.now()
        }))

        fpsCounter.current.frames = 0
        fpsCounter.current.lastTime = now
      }

      animationId = requestAnimationFrame(trackFPS)
    }

    animationId = requestAnimationFrame(trackFPS)

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [elementCount])

  // Track Long Tasks API
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Long task threshold (50ms)
              longTaskCount.current++
              setMetrics(prev => ({
                ...prev,
                longTasks: longTaskCount.current,
                lastUpdate: Date.now()
              }))
            }
          }
        })
        
        observer.observe({ entryTypes: ['longtask'] })
        
        return () => observer.disconnect()
      } catch (e) {
        logger.warn('Long Task API not supported', e)
      }
    }
  }, [])

  // Track Layout Shifts
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ((entry as any).value > 0.1) { // Significant layout shift
              layoutShiftCount.current++
              setMetrics(prev => ({
                ...prev,
                layoutShifts: layoutShiftCount.current,
                lastUpdate: Date.now()
              }))
            }
          }
        })
        
        observer.observe({ entryTypes: ['layout-shift'] })
        
        return () => observer.disconnect()
      } catch (e) {
        logger.warn('Layout Shift API not supported', e)
      }
    }
  }, [])

  // Update memory usage periodically
  useEffect(() => {
    const updateMemoryUsage = () => {
      if ((performance as any).memory) {
        const memoryUsage = (performance as any).memory.usedJSHeapSize / (1024 * 1024) // MB
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memoryUsage * 100) / 100,
          lastUpdate: Date.now()
        }))
      }
    }

    // Update memory usage every 5 seconds
    const interval = setInterval(updateMemoryUsage, 5000)
    updateMemoryUsage() // Initial update

    return () => clearInterval(interval)
  }, [])

  // Performance testing utilities
  const testUtils: PerformanceTestUtils = {
    measureRenderTime: useCallback((componentName: string) => {
      const start = performance.now()
      return () => {
        const end = performance.now()
        const renderTime = end - start
        logger.debug(`${componentName} render time: ${renderTime.toFixed(2)}ms`)
        
        setMetrics(prev => ({
          ...prev,
          renderTime: Math.max(prev.renderTime, renderTime),
          lastUpdate: Date.now()
        }))
      }
    }, []),

    trackMemoryUsage: useCallback(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize
      }
      return 0
    }, []),

    simulateLoad: useCallback((elementCount: number) => {
      logger.debug(`Generating ${elementCount} test elements for performance testing`)
      
      return Array.from({ length: elementCount }, (_, i) => ({
        id: `test-element-${i}`,
        type: 'sticky' as const,
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        width: 200,
        height: 150,
        text: `Test element ${i}`,
        color: '#FFF2B2',
        zIndex: i,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }))
    }, [])
  }

  return { metrics, testUtils }
}

// Performance monitoring HOC for components
export function withPerformanceMonitor<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return function PerformanceMonitoredComponent(props: T) {
    const { testUtils } = useEnhancedPerformanceMonitor()
    
    useEffect(() => {
      const endMeasure = testUtils.measureRenderTime(componentName)
      return endMeasure
    })

    return React.createElement(Component, props)
  }
}

// Global performance monitoring
export function logPerformanceMetrics(metrics: PerformanceMetrics) {
  logger.debug('🔍 Performance Metrics', {
    fps: metrics.fps,
    elements: metrics.elementCount,
    memory: `${metrics.memoryUsage}MB`,
    renderTime: `${metrics.renderTime.toFixed(2)}ms`,
    longTasks: metrics.longTasks,
    layoutShifts: metrics.layoutShifts,
    lastUpdate: new Date(metrics.lastUpdate).toLocaleTimeString()
  })
}