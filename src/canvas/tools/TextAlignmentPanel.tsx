'use client'

import React, { useState, useRef } from 'react'
import type { TextAlignment, VerticalAlignment } from '@/types'
import { FontSizeSelector, FontSizeTrigger } from './FontSizeSelector'

type TextAlignmentPanelProps = {
  isVisible: boolean
  position: { x: number; y: number }
  currentTextAlign: TextAlignment
  currentVerticalAlign: VerticalAlignment
  currentFontSize?: number // Optional for backward compatibility
  onTextAlignChange: (align: TextAlignment) => void
  onVerticalAlignChange: (align: VerticalAlignment) => void
  onColorChange: () => void
  onFontSizeChange?: (fontSize: number) => void // Optional for backward compatibility
  showFontSizeSelector?: boolean // Control whether to show the font size selector
}

// SVG icon components
const AlignLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <rect x="2" y="3" width="8" height="1.5" />
    <rect x="2" y="6" width="6" height="1.5" />
    <rect x="2" y="9" width="10" height="1.5" />
    <rect x="2" y="12" width="7" height="1.5" />
  </svg>
)

const AlignCenterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <rect x="4" y="3" width="8" height="1.5" />
    <rect x="5" y="6" width="6" height="1.5" />
    <rect x="3" y="9" width="10" height="1.5" />
    <rect x="4.5" y="12" width="7" height="1.5" />
  </svg>
)

const AlignRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <rect x="6" y="3" width="8" height="1.5" />
    <rect x="8" y="6" width="6" height="1.5" />
    <rect x="4" y="9" width="10" height="1.5" />
    <rect x="7" y="12" width="7" height="1.5" />
  </svg>
)

const AlignTopIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    {/* Top line */}
    <rect x="2" y="2" width="12" height="1" />
    {/* Upward arrow */}
    <polygon points="8,5 6,7 10,7" />
    {/* Text lines (simplified) */}
    <rect x="4" y="10" width="8" height="1" />
    <rect x="4" y="12" width="6" height="1" />
  </svg>
)

const AlignMiddleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    {/* Center line */}
    <rect x="2" y="8" width="12" height="1" />
    {/* Up/down arrows (indicating center) */}
    <polygon points="8,4 6,6 10,6" />
    <polygon points="8,12 6,10 10,10" />
  </svg>
)

const AlignBottomIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    {/* Bottom line */}
    <rect x="2" y="13" width="12" height="1" />
    {/* Downward arrow */}
    <polygon points="8,11 6,9 10,9" />
    {/* Text lines (simplified) */}
    <rect x="4" y="4" width="8" height="1" />
    <rect x="4" y="6" width="6" height="1" />
  </svg>
)

const ColorPaletteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="6" cy="6" r="1" fill="#ff4444" />
    <circle cx="10" cy="6" r="1" fill="#44ff44" />
    <circle cx="8" cy="10" r="1" fill="#4444ff" />
  </svg>
)

export function TextAlignmentPanel({
  isVisible,
  position,
  currentTextAlign,
  currentVerticalAlign,
  currentFontSize = 16,
  onTextAlignChange,
  onVerticalAlignChange,
  onColorChange,
  onFontSizeChange,
  showFontSizeSelector = false
}: TextAlignmentPanelProps) {
  const [isFontSizeDropdownOpen, setIsFontSizeDropdownOpen] = useState(false)
  const fontSizeTriggerRef = useRef<HTMLDivElement>(null)

  if (!isVisible) return null

  const handleFontSizeChange = (fontSize: number) => {
    if (onFontSizeChange) {
      onFontSizeChange(fontSize)
    }
  }

  const closeFontSizeDropdown = () => {
    setIsFontSizeDropdownOpen(false)
  }

  // Calculate position for font size dropdown
  const getFontSizeDropdownPosition = () => {
    if (!fontSizeTriggerRef.current) {
      return { x: position.x, y: position.y }
    }
    const rect = fontSizeTriggerRef.current.getBoundingClientRect()
    return {
      x: rect.left,
      y: rect.bottom
    }
  }

  return (
    <>
      <div
        data-testid="text-alignment-panel"
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y - 60, // Display above element
          zIndex: 1001,
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          border: '1px solid #E0E0E0',
          padding: '8px',
          display: 'flex',
          gap: '4px',
          alignItems: 'center'
        }}
      >
      {/* Horizontal alignment */}
      <div style={{ display: 'flex', gap: '2px' }}>
        <button
          data-testid="align-left"
          onClick={() => onTextAlignChange('left')}
          style={{
            width: '28px',
            height: '28px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: currentTextAlign === 'left' ? '#E3F2FD' : 'transparent',
            color: currentTextAlign === 'left' ? '#1976D2' : '#666666',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (currentTextAlign !== 'left') {
              e.currentTarget.style.backgroundColor = '#F5F5F5'
            }
          }}
          onMouseLeave={(e) => {
            if (currentTextAlign !== 'left') {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
          title="Align Left"
        >
          <AlignLeftIcon />
        </button>

        <button
          data-testid="align-center"
          onClick={() => onTextAlignChange('center')}
          style={{
            width: '28px',
            height: '28px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: currentTextAlign === 'center' ? '#E3F2FD' : 'transparent',
            color: currentTextAlign === 'center' ? '#1976D2' : '#666666',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (currentTextAlign !== 'center') {
              e.currentTarget.style.backgroundColor = '#F5F5F5'
            }
          }}
          onMouseLeave={(e) => {
            if (currentTextAlign !== 'center') {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
          title="Align Center"
        >
          <AlignCenterIcon />
        </button>

        <button
          data-testid="align-right"
          onClick={() => onTextAlignChange('right')}
          style={{
            width: '28px',
            height: '28px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: currentTextAlign === 'right' ? '#E3F2FD' : 'transparent',
            color: currentTextAlign === 'right' ? '#1976D2' : '#666666',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (currentTextAlign !== 'right') {
              e.currentTarget.style.backgroundColor = '#F5F5F5'
            }
          }}
          onMouseLeave={(e) => {
            if (currentTextAlign !== 'right') {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
          title="Align Right"
        >
          <AlignRightIcon />
        </button>
      </div>

      {/* Separator */}
      <div style={{
        width: '1px',
        height: '20px',
        backgroundColor: '#E0E0E0',
        margin: '0 4px'
      }} />

      {/* Vertical alignment */}
      <div style={{ display: 'flex', gap: '2px' }}>
        <button
          data-testid="align-top"
          onClick={() => onVerticalAlignChange('top')}
          style={{
            width: '28px',
            height: '28px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: currentVerticalAlign === 'top' ? '#E3F2FD' : 'transparent',
            color: currentVerticalAlign === 'top' ? '#1976D2' : '#666666',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (currentVerticalAlign !== 'top') {
              e.currentTarget.style.backgroundColor = '#F5F5F5'
            }
          }}
          onMouseLeave={(e) => {
            if (currentVerticalAlign !== 'top') {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
          title="Align Top"
        >
          <AlignTopIcon />
        </button>

        <button
          data-testid="align-middle"
          onClick={() => onVerticalAlignChange('middle')}
          style={{
            width: '28px',
            height: '28px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: currentVerticalAlign === 'middle' ? '#E3F2FD' : 'transparent',
            color: currentVerticalAlign === 'middle' ? '#1976D2' : '#666666',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (currentVerticalAlign !== 'middle') {
              e.currentTarget.style.backgroundColor = '#F5F5F5'
            }
          }}
          onMouseLeave={(e) => {
            if (currentVerticalAlign !== 'middle') {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
          title="Align Middle"
        >
          <AlignMiddleIcon />
        </button>

        <button
          data-testid="align-bottom"
          onClick={() => onVerticalAlignChange('bottom')}
          style={{
            width: '28px',
            height: '28px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: currentVerticalAlign === 'bottom' ? '#E3F2FD' : 'transparent',
            color: currentVerticalAlign === 'bottom' ? '#1976D2' : '#666666',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (currentVerticalAlign !== 'bottom') {
              e.currentTarget.style.backgroundColor = '#F5F5F5'
            }
          }}
          onMouseLeave={(e) => {
            if (currentVerticalAlign !== 'bottom') {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
          title="Align Bottom"
        >
          <AlignBottomIcon />
        </button>
      </div>

      {/* Font Size Selector - Only show for TextBox elements */}
      {showFontSizeSelector && onFontSizeChange && (
        <>
          {/* Separator */}
          <div style={{
            width: '1px',
            height: '20px',
            backgroundColor: '#E0E0E0',
            margin: '0 4px'
          }} />

          {/* Font size */}
          <div ref={fontSizeTriggerRef} style={{ position: 'relative' }}>
            <FontSizeTrigger
              currentFontSize={currentFontSize}
              onClick={() => setIsFontSizeDropdownOpen(!isFontSizeDropdownOpen)}
              isOpen={isFontSizeDropdownOpen}
            />
          </div>
        </>
      )}

      {/* Separator */}
      <div style={{
        width: '1px',
        height: '20px',
        backgroundColor: '#E0E0E0',
        margin: '0 4px'
      }} />

      {/* Change color */}
      <button
        data-testid="color-change"
        onClick={onColorChange}
        style={{
          width: '28px',
          height: '28px',
          border: 'none',
          borderRadius: '4px',
          backgroundColor: 'transparent',
          color: '#666666',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#F5F5F5'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
        title="Change Color"
      >
        <ColorPaletteIcon />
      </button>
      </div>
      
      {/* Font Size Dropdown */}
      <FontSizeSelector
        isVisible={isFontSizeDropdownOpen}
        position={getFontSizeDropdownPosition()}
        currentFontSize={currentFontSize}
        onFontSizeChange={handleFontSizeChange}
        onClose={closeFontSizeDropdown}
      />
    </>
  )
}
