'use client'

import React, { useState, useEffect } from 'react'
import { useEnhancedPerformanceMonitor, logPerformanceMetrics } from '@/hooks/useEnhancedPerformanceMonitor'
import { useBoardStore } from '@/store/boardStore'
import { createModuleLogger } from '@/lib/logger'

const logger = createModuleLogger('PerformanceDebugger')

interface PerformanceDebuggerProps {
  isVisible?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export function PerformanceDebugger({ 
  isVisible = false, 
  position = 'top-right' 
}: PerformanceDebuggerProps) {
  const elements = useBoardStore(state => state.elements)
  const connectors = useBoardStore(state => state.connectors)
  const { metrics, testUtils } = useEnhancedPerformanceMonitor(elements.length)
  const [isExpanded, setIsExpanded] = useState(false)

  // Auto-log performance metrics when they change significantly
  useEffect(() => {
    if (metrics.fps < 30 || metrics.longTasks > 5 || metrics.memoryUsage > 100) {
      logger.warn('⚠️ Performance degradation detected!')
      logPerformanceMetrics(metrics)
    }
  }, [metrics])

  if (!isVisible && process.env.NODE_ENV !== 'development') {
    return null
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  }

  const handleStressTest = () => {
    logger.info('🧪 Starting performance stress test...')
    const testElements = testUtils.simulateLoad(100)
    logger.info(`Generated ${testElements.length} test elements`)
    
    // Measure memory before and after
    const memoryBefore = testUtils.trackMemoryUsage()
    setTimeout(() => {
      const memoryAfter = testUtils.trackMemoryUsage()
      logger.info(`Memory delta: ${((memoryAfter - memoryBefore) / (1024 * 1024)).toFixed(2)}MB`)
    }, 1000)
  }

  const getPerformanceColor = (fps: number) => {
    if (fps >= 50) return 'text-green-500'
    if (fps >= 30) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getMemoryColor = (memory: number) => {
    if (memory < 50) return 'text-green-500'
    if (memory < 100) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 bg-black bg-opacity-80 text-white text-xs font-mono rounded-lg p-2 min-w-[200px]`}>
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="font-bold">🔍 Performance</span>
        <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="mt-2 space-y-1">
          <div className="flex justify-between">
            <span>FPS:</span>
            <span className={getPerformanceColor(metrics.fps)}>
              {metrics.fps}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Elements:</span>
            <span className="text-blue-400">
              {elements.length}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Connectors:</span>
            <span className="text-blue-400">
              {connectors.length}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Memory:</span>
            <span className={getMemoryColor(metrics.memoryUsage)}>
              {metrics.memoryUsage}MB
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Render:</span>
            <span className="text-purple-400">
              {metrics.renderTime.toFixed(1)}ms
            </span>
          </div>
          
          {metrics.longTasks > 0 && (
            <div className="flex justify-between">
              <span>Long Tasks:</span>
              <span className="text-red-400">
                {metrics.longTasks}
              </span>
            </div>
          )}
          
          {metrics.layoutShifts > 0 && (
            <div className="flex justify-between">
              <span>Layout Shifts:</span>
              <span className="text-orange-400">
                {metrics.layoutShifts}
              </span>
            </div>
          )}

          <div className="border-t border-gray-600 pt-2 mt-2 space-y-1">
            <button
              onClick={() => logPerformanceMetrics(metrics)}
              className="w-full text-left text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
            >
              📋 Log Metrics
            </button>
            
            <button
              onClick={handleStressTest}
              className="w-full text-left text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
            >
              🧪 Stress Test
            </button>
            
            <button
              onClick={() => {
                const memoryUsage = testUtils.trackMemoryUsage()
                logger.info(`Current memory usage: ${(memoryUsage / (1024 * 1024)).toFixed(2)}MB`)
              }}
              className="w-full text-left text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
            >
              💾 Check Memory
            </button>
          </div>
          
          <div className="text-xs text-gray-400 pt-1">
            Updated: {new Date(metrics.lastUpdate).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  )
}