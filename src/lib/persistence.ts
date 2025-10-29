import type { CanvasElement, Connector, Viewport } from '@/types'
import { logger } from '@/lib/logger'

// localStorage keys
const STORAGE_KEY = 'llm-whiteboard-data'
const VIEWPORT_KEY = 'llm-whiteboard-viewport'

// Type for data to persist
export interface PersistedBoardData {
  elements: CanvasElement[]
  connectors: Connector[]
  version: string
  savedAt: number
}

// Viewport information type (Konva-based)
export interface PersistedViewport {
  zoom: number
  panX: number
  panY: number
  savedAt: number
}

// Save data to localStorage
export function saveBoardData(elements: CanvasElement[], connectors: Connector[]): void {
  // Execute only on client-side
  if (typeof window === 'undefined') return

  try {
    const data: PersistedBoardData = {
      elements,
      connectors,
      version: '1.0.0',
      savedAt: Date.now()
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    logger.warn('Failed to save board data to localStorage', error)
  }
}

// Restore data from localStorage
export function loadBoardData(): PersistedBoardData | null {
  // Execute only on client-side
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const data = JSON.parse(stored) as PersistedBoardData

    // Version check (for future migrations)
    if (!data.version || !data.elements || !data.connectors) {
      logger.warn('Invalid board data format, ignoring stored data')
      return null
    }

    return data
  } catch (error) {
    logger.warn('Failed to load board data from localStorage', error)
    return null
  }
}

// Clear data from localStorage
export function clearBoardData(): void {
  // Execute only on client-side
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    logger.warn('Failed to clear board data from localStorage', error)
  }
}

// Save viewport information (Konva-based)
export function saveViewport(viewport: PersistedViewport): void {
  // Execute only on client-side
  if (typeof window === 'undefined') return

  try {
    const dataToSave = {
      ...viewport,
      savedAt: Date.now()
    }

    const jsonString = JSON.stringify(dataToSave)
    localStorage.setItem(VIEWPORT_KEY, jsonString)
  } catch (error) {
    logger.warn('Failed to save viewport to localStorage', error)
  }
}

// Restore viewport information
export function loadViewport(): PersistedViewport | null {
  // Execute only on client-side
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(VIEWPORT_KEY)

    if (!stored) {
      return null
    }

    const viewport = JSON.parse(stored) as PersistedViewport
    return viewport
  } catch (error) {
    logger.warn('Failed to load viewport from localStorage', error)
    return null
  }
}

// Clear viewport information
export function clearViewport(): void {
  // Execute only on client-side
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(VIEWPORT_KEY)
  } catch (error) {
    logger.warn('Failed to clear viewport from localStorage', error)
  }
}

// Timer management for debouncing
let saveTimer: NodeJS.Timeout | null = null
let viewportTimer: NodeJS.Timeout | null = null

// Debounced save (wait 1 second before saving)
export function debouncedSaveBoardData(
  elements: CanvasElement[],
  connectors: Connector[],
  delayMs: number = 1000
): void {
  // Clear existing timer
  if (saveTimer) {
    clearTimeout(saveTimer)
  }

  // Set new timer
  saveTimer = setTimeout(() => {
    saveBoardData(elements, connectors)
    saveTimer = null
  }, delayMs)
}

// Debounced viewport save (Konva-based)
export function debouncedSaveViewport(
  viewport: PersistedViewport,
  delayMs: number = 200
): void {
  // Clear existing timer
  if (viewportTimer) {
    clearTimeout(viewportTimer)
  }

  // Set new timer
  viewportTimer = setTimeout(() => {
    saveViewport(viewport)
    viewportTimer = null
  }, delayMs)
}

// Save viewport immediately (no debounce)
export function saveViewportImmediate(viewport: PersistedViewport): void {
  saveViewport(viewport)
}