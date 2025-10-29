'use client'

import React, { memo, useCallback, useRef, useEffect } from 'react'
import { shouldAllowNativeKeyboard } from '@/lib/keyboard-utils'

type FontSizeSelectorProps = {
  isVisible: boolean
  position: { x: number; y: number }
  currentFontSize: number
  onFontSizeChange: (fontSize: number) => void
  onClose: () => void
}

// Predefined font sizes (10 options)
const FONT_SIZES = [10, 12, 14, 16, 18, 24, 32, 48, 64, 96]


const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
    <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// Performance optimized FontSizeSelector with React.memo
export const FontSizeSelector = memo<FontSizeSelectorProps>(function FontSizeSelector({ 
  isVisible, 
  position, 
  currentFontSize, 
  onFontSizeChange, 
  onClose 
}) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleFontSizeSelect = useCallback((fontSize: number) => {
    onFontSizeChange(fontSize)
    onClose()
  }, [onFontSizeChange, onClose])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return

      // Allow native clipboard operations
      if (shouldAllowNativeKeyboard(e)) {
        return
      }

      const currentIndex = FONT_SIZES.indexOf(currentFontSize)
      let newIndex = currentIndex

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          newIndex = Math.max(0, currentIndex - 1)
          onFontSizeChange(FONT_SIZES[newIndex])
          break
        case 'ArrowDown':
          e.preventDefault()
          newIndex = Math.min(FONT_SIZES.length - 1, currentIndex + 1)
          onFontSizeChange(FONT_SIZES[newIndex])
          break
        case 'Enter':
          e.preventDefault()
          onClose()
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, currentFontSize, onFontSizeChange, onClose])

  // Handle outside click
  useEffect(() => {
    if (!isVisible) return

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isVisible, onClose])

  if (!isVisible) return null


  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000
        }}
        onClick={() => {
          onClose()
        }}
      />
      
      {/* Font Size Selector Panel */}
      <div
        ref={dropdownRef}
        data-testid="font-size-selector"
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y + 4, // 4px gap below trigger
          zIndex: 1001,
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          border: '1px solid #E0E0E0',
          padding: '8px 0',
          minWidth: '100px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {FONT_SIZES.map((fontSize) => (
          <button
            key={fontSize}
            data-testid={`font-size-option-${fontSize}`}
            onClick={() => handleFontSizeSelect(fontSize)}
            style={{
              width: '100%',
              padding: '8px 16px',
              border: 'none',
              backgroundColor: currentFontSize === fontSize ? '#E3F2FD' : 'transparent',
              color: currentFontSize === fontSize ? '#1976D2' : '#333333',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (currentFontSize !== fontSize) {
                e.currentTarget.style.backgroundColor = '#F5F5F5'
              }
            }}
            onMouseLeave={(e) => {
              if (currentFontSize !== fontSize) {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
          >
            <span>{fontSize}px</span>
          </button>
        ))}
      </div>
    </>
  )
})

// Trigger button component for the font size selector
type FontSizeTriggerProps = {
  currentFontSize: number
  onClick: () => void
  isOpen: boolean
}

export const FontSizeTrigger = memo<FontSizeTriggerProps>(function FontSizeTrigger({
  currentFontSize,
  onClick,
  isOpen
}) {
  return (
    <button
      data-testid="font-size-trigger"
      onClick={onClick}
      style={{
        width: '60px',
        height: '28px',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: isOpen ? '#E3F2FD' : 'transparent',
        color: isOpen ? '#1976D2' : '#666666',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        transition: 'all 0.2s',
        fontSize: '12px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
      onMouseEnter={(e) => {
        if (!isOpen) {
          e.currentTarget.style.backgroundColor = '#F5F5F5'
        }
      }}
      onMouseLeave={(e) => {
        if (!isOpen) {
          e.currentTarget.style.backgroundColor = 'transparent'
        }
      }}
      title={`Font size: ${currentFontSize}px`}
    >
      <span>{currentFontSize}</span>
      <ChevronDownIcon />
    </button>
  )
})