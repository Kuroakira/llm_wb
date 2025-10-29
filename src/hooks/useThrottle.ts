import { useRef, useCallback } from 'react'

/**
 * Creates a throttled version of a callback function
 * @param callback The function to throttle
 * @param delay The minimum delay between calls in milliseconds
 * @returns A throttled version of the callback
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef<number>(0)
  const lastCallTimer = useRef<NodeJS.Timeout | null>(null)

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    const timeSinceLastCall = now - lastCall.current

    if (lastCallTimer.current) {
      clearTimeout(lastCallTimer.current)
    }

    if (timeSinceLastCall >= delay) {
      lastCall.current = now
      callback(...args)
    } else {
      // Schedule a call at the end of the throttle period
      lastCallTimer.current = setTimeout(() => {
        lastCall.current = Date.now()
        callback(...args)
      }, delay - timeSinceLastCall)
    }
  }, [callback, delay]) as T
}

/**
 * Creates a debounced version of a callback function
 * @param callback The function to debounce
 * @param delay The delay in milliseconds
 * @returns A debounced version of the callback
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timer = useRef<NodeJS.Timeout | null>(null)

  return useCallback((...args: Parameters<T>) => {
    if (timer.current) {
      clearTimeout(timer.current)
    }

    timer.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay]) as T
}