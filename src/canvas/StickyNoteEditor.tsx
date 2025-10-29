'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { TYPOGRAPHY_TOKENS, getOptimalTextColor, TEXT_SPACING } from '@/design-system/typography'
import { handleTextareaPaste } from '@/lib/clipboard-utils'
// Removed old textAutoSize - now using Konva-based measurement
import { useBoardStore } from '@/store/boardStore'

type StickyNoteEditorProps = {
  isVisible: boolean
  position: { x: number; y: number }
  width: number
  height: number
  color: string
  text: string
  onTextChange: (text: string) => void
  onFinish: () => void
  // Which element type is being edited (sticky/text/etc.)
  elementType?: 'sticky' | 'text' | 'rect'
  // Auto-sizing support
  elementId?: string
  element?: any
  zoom?: number
}

export function StickyNoteEditor({
  isVisible,
  position,
  width,
  height,
  color,
  text,
  onTextChange,
  onFinish,
  elementType,
  elementId,
  element,
  zoom = 1
}: StickyNoteEditorProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { updateElement } = useBoardStore()

  // Create debounced auto-resize using Konva measurement
  const debouncedAutoResize = useCallback(() => {
    const timeouts = new Map<string, NodeJS.Timeout>()

    return function autoResizeElement(elementId: string, newText: string) {
      // Clear existing timeout for this element
      const existingTimeout = timeouts.get(elementId)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }

      // Set new timeout for debounced resize
      const timeout = setTimeout(() => {
        // Use store's Konva-based auto-resize
        useBoardStore.getState().autoResizeElementHeight(elementId)
        timeouts.delete(elementId)
      }, 150)

      timeouts.set(elementId, timeout)
    }
  }, [])

  const autoResize = useCallback(debouncedAutoResize(), [debouncedAutoResize])

  useEffect(() => {
    if (isVisible && inputRef.current) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.select()
        }
      }, 50)
    }
  }, [isVisible])

  const handleTextChange = useCallback((newText: string) => {
    onTextChange(newText)

    // Trigger Konva-based auto-resize if we have the necessary data
    if (elementId && element && (elementType === 'sticky' || elementType === 'text')) {
      autoResize(elementId, newText)
    }
  }, [onTextChange, elementId, element, elementType, autoResize])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
      return
    }

    // Finish editing with Ctrl+Enter (Windows) or Cmd+Enter (Mac)
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onFinish()
    }
    // Also finish editing with Escape key
    if (e.key === 'Escape') {
      e.preventDefault()
      onFinish()
    }
    // Normal Enter is treated as line break (default behavior)
  }

  if (!isVisible || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <textarea
      ref={inputRef}
      data-testid="sticky-editor"
      value={text}
      onChange={(e) => handleTextChange(e.target.value)}
      onBlur={onFinish}
      onPaste={(e) => {
        if (!inputRef.current) return
        handleTextareaPaste(e, (newText) => {
          handleTextChange(newText)
          // Immediate auto-resize for paste operations (no debounce)
          if (elementId && element && (elementType === 'sticky' || elementType === 'text')) {
            setTimeout(() => {
              updateElement(elementId, { text: newText })
              // Use the store's Konva-based auto-resize function for immediate processing
              useBoardStore.getState().autoResizeElementHeight(elementId)
            }, 50)
          }
        })
      }}
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${width}px`,
        height: `${height}px`,
        padding: TEXT_SPACING.padding.md,
        border: '2px solid #0066FF',
        borderRadius: '4px',
        fontSize: TYPOGRAPHY_TOKENS.fontSize.base,
        fontFamily: TYPOGRAPHY_TOKENS.fontFamily.primary,
        fontWeight: TYPOGRAPHY_TOKENS.fontWeight.normal,
        // White background only during TextBox editing, otherwise use element color
        backgroundColor: elementType === 'text' ? '#FFFFFF' : color,
        color: elementType === 'text' ? getOptimalTextColor('#FFFFFF') : getOptimalTextColor(color),
        resize: 'none',
        outline: 'none',
        zIndex: 10000,
        lineHeight: TYPOGRAPHY_TOKENS.lineHeight.normal,
        letterSpacing: TYPOGRAPHY_TOKENS.letterSpacing.normal,
        boxSizing: 'border-box',
        wordBreak: 'break-word',
        overflowWrap: 'break-word'
      }}
    />,
    document.body
  )
}
