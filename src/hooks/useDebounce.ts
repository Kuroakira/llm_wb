import { useCallback, useRef, useEffect } from 'react'

/**
 * Performance optimization hook for debouncing high-frequency operations
 * Particularly useful for canvas operations like dragging, resizing, and viewport changes
 */
export function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback(
    ((...args: Parameters<T>) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    }) as T,
    [delay]
  )
}

/**
 * Throttle hook for high-frequency events (like mouse move, scroll)
 * Ensures callback is called at most once per specified interval
 */
export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0)
  const callbackRef = useRef(callback)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now()
      
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now
        callbackRef.current(...args)
      }
    }) as T,
    [delay]
  )
}

/**
 * Optimized version of useDebounce specifically for canvas drag operations
 * Uses requestAnimationFrame for smoother animation performance
 */
export function useCanvasDebounce<T extends (...args: any[]) => void>(
  callback: T,
  immediate = false
): T {
  const rafRef = useRef<number | null>(null)
  const callbackRef = useRef(callback)
  const argsRef = useRef<Parameters<T> | null>(null)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  return useCallback(
    ((...args: Parameters<T>) => {
      argsRef.current = args

      if (immediate && !rafRef.current) {
        // Call immediately for first invocation
        callbackRef.current(...args)
        immediate = false
      }

      // Cancel existing RAF
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }

      // Schedule new RAF
      rafRef.current = requestAnimationFrame(() => {
        if (argsRef.current) {
          callbackRef.current(...argsRef.current)
          argsRef.current = null
        }
        rafRef.current = null
      })
    }) as T,
    []
  )
}