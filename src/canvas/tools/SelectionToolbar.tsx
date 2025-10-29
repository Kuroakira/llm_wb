'use client'

import React, { useState, useRef, useEffect } from 'react'
import type { CanvasElement, TextAlignment, VerticalAlignment } from '@/types'
import { FontSizeSelector, FontSizeTrigger } from './FontSizeSelector'

type SelectionToolbarProps = {
  isVisible: boolean
  position: { x: number; y: number }
  selectedElements: CanvasElement[]
  onTextAlignChange: (align: TextAlignment) => void
  onVerticalAlignChange: (align: VerticalAlignment) => void
  onColorChange: (color: string) => void
  onFontSizeChange?: (fontSize: number) => void
  viewport: { zoom: number; panX: number; panY: number }
}

// Reuse predefined colors from ColorPicker
const PREDEFINED_COLORS = [
  '#FFF2B2', // Default sticky yellow
  '#E3F2FD', // Light blue
  '#F3E5F5', // Light purple
  '#E8F5E9', // Light green
  '#FFF3E0', // Light orange
  '#FFEBEE', // Light red
  '#F9FBE7', // Light yellow-green
  '#E0F2F1', // Light teal
  '#FCE4EC', // Light pink
  '#F1F8E9', // Light lime
  '#E8EAF6', // Light indigo
  '#FFFFFF', // White
  '#F5F5F5', // Light gray
  'transparent', // Transparent (no background)
]

// Icon components (reused from TextAlignmentPanel)
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

const ColorDropdownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="6" cy="6" r="1" fill="#ff4444" />
    <circle cx="10" cy="6" r="1" fill="#44ff44" />
    <circle cx="8" cy="10" r="1" fill="#4444ff" />
    <polygon points="11,11 13,13 9,13" fill="currentColor" />
  </svg>
)


export function SelectionToolbar({
  isVisible,
  position,
  selectedElements,
  onTextAlignChange,
  onVerticalAlignChange,
  onColorChange,
  onFontSizeChange,
  viewport
}: SelectionToolbarProps) {
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false)
  const [isFontSizeDropdownOpen, setIsFontSizeDropdownOpen] = useState(false)
  const colorDropdownRef = useRef<HTMLDivElement>(null)
  const fontSizeDropdownRef = useRef<HTMLDivElement>(null)

  // Check if selected elements support text alignment
  const hasTextElements = selectedElements.some(
    el => el.type === 'sticky' || el.type === 'text'
  )

  // Check if selected elements support color changes
  const hasColorableElements = selectedElements.some(
    el => el.type === 'sticky' || el.type === 'rect'
  )

  // Check if selected elements support font size changes (text elements only)
  const hasTextBoxElements = selectedElements.some(
    el => el.type === 'text'
  )
  

  // Get current state from first applicable element
  const getFirstTextElement = () => {
    return selectedElements.find(el => el.type === 'sticky' || el.type === 'text')
  }

  const getFirstColorableElement = () => {
    return selectedElements.find(el => el.type === 'sticky' || el.type === 'rect')
  }

  const getFirstTextBoxElement = () => {
    return selectedElements.find(el => el.type === 'text')
  }

  const firstTextElement = getFirstTextElement()
  const firstColorableElement = getFirstColorableElement()
  const firstTextBoxElement = getFirstTextBoxElement()

  const currentTextAlign = (firstTextElement as any)?.textAlign || 'left'
  const currentVerticalAlign = (firstTextElement as any)?.verticalAlign || 'top'
  const currentColor = (() => {
    if (firstColorableElement?.type === 'sticky') {
      return (firstColorableElement as any).color || '#FFF2B2'
    }
    if (firstColorableElement?.type === 'rect') {
      return (firstColorableElement as any).fill || '#FFFFFF'
    }
    return '#FFF2B2'
  })()
  
  const currentFontSize = (firstTextBoxElement as any)?.fontSize || 16

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(event.target as Node)) {
        setIsColorDropdownOpen(false)
      }
      if (fontSizeDropdownRef.current && !fontSizeDropdownRef.current.contains(event.target as Node)) {
        // Check if click is inside FontSizeSelector before closing
        const fontSizeSelector = document.querySelector('[data-testid="font-size-selector"]')
        if (!fontSizeSelector || !fontSizeSelector.contains(event.target as Node)) {
          setIsFontSizeDropdownOpen(false)
        }
      }
    }

    if (isColorDropdownOpen || isFontSizeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isColorDropdownOpen, isFontSizeDropdownOpen])

  if (!isVisible || selectedElements.length === 0) return null

  const handleColorSelect = (color: string) => {
    onColorChange(color)
    setIsColorDropdownOpen(false)
  }


  const buttonStyle = {
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  }

  const getButtonStyle = (isActive: boolean) => ({
    ...buttonStyle,
    backgroundColor: isActive ? '#E3F2FD' : 'transparent',
    color: isActive ? '#1976D2' : '#666666',
  })

  return (
    <>
      <div
        data-testid="selection-toolbar"
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y - 70, // Position 70px above
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
      {/* Text Alignment Section */}
      {hasTextElements && (
        <>
          <div style={{ display: 'flex', gap: '2px' }}>
            <button
              data-testid="selection-align-left"
              onClick={() => onTextAlignChange('left')}
              style={getButtonStyle(currentTextAlign === 'left')}
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
              data-testid="selection-align-center"
              onClick={() => onTextAlignChange('center')}
              style={getButtonStyle(currentTextAlign === 'center')}
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
              data-testid="selection-align-right"
              onClick={() => onTextAlignChange('right')}
              style={getButtonStyle(currentTextAlign === 'right')}
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

          {/* Vertical Alignment Section */}
          <div style={{ display: 'flex', gap: '2px' }}>
            <button
              data-testid="selection-align-top"
              onClick={() => onVerticalAlignChange('top')}
              style={getButtonStyle(currentVerticalAlign === 'top')}
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
              data-testid="selection-align-middle"
              onClick={() => onVerticalAlignChange('middle')}
              style={getButtonStyle(currentVerticalAlign === 'middle')}
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
              data-testid="selection-align-bottom"
              onClick={() => onVerticalAlignChange('bottom')}
              style={getButtonStyle(currentVerticalAlign === 'bottom')}
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

          {(hasColorableElements || hasTextBoxElements) && (
            <div style={{
              width: '1px',
              height: '20px',
              backgroundColor: '#E0E0E0',
              margin: '0 4px'
            }} />
          )}
        </>
      )}

      {/* Font Size Section - Only for TextBox elements */}
      {hasTextBoxElements && onFontSizeChange && (
        <>
          <div ref={fontSizeDropdownRef} style={{ position: 'relative' }}>
            <FontSizeTrigger
              currentFontSize={currentFontSize}
              onClick={() => setIsFontSizeDropdownOpen(!isFontSizeDropdownOpen)}
              isOpen={isFontSizeDropdownOpen}
            />
          </div>

          {hasColorableElements && (
            <div style={{
              width: '1px',
              height: '20px',
              backgroundColor: '#E0E0E0',
              margin: '0 4px'
            }} />
          )}
        </>
      )}

      {/* Color Picker Section */}
      {hasColorableElements && (
        <div style={{ position: 'relative' }} ref={colorDropdownRef}>
          <button
            data-testid="selection-color-picker"
            onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
            style={{
              ...buttonStyle,
              backgroundColor: isColorDropdownOpen ? '#E3F2FD' : 'transparent',
              color: isColorDropdownOpen ? '#1976D2' : '#666666',
            }}
            onMouseEnter={(e) => {
              if (!isColorDropdownOpen) {
                e.currentTarget.style.backgroundColor = '#F5F5F5'
              }
            }}
            onMouseLeave={(e) => {
              if (!isColorDropdownOpen) {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
            title="Change Color"
          >
            <ColorDropdownIcon />
          </button>

          {/* Color Dropdown */}
          {isColorDropdownOpen && (
            <div
              data-testid="selection-color-dropdown"
              style={{
                position: 'absolute',
                top: '32px',
                left: '-80px', // Center the dropdown relative to button
                zIndex: 1002,
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                border: '1px solid #E0E0E0',
                padding: '12px',
                width: '160px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '6px'
              }}>
                {PREDEFINED_COLORS.map((color) => (
                  <button
                    key={color}
                    data-testid={`selection-color-option-${color}`}
                    onClick={() => handleColorSelect(color)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      border: currentColor === color ? '2px solid #2196F3' : '1px solid #CCCCCC',
                      backgroundColor: color === 'transparent' ? '#FFFFFF' : color,
                      backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #cccccc 25%, transparent 25%), linear-gradient(-45deg, #cccccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cccccc 75%), linear-gradient(-45deg, transparent 75%, #cccccc 75%)' : 'none',
                      backgroundSize: color === 'transparent' ? '4px 4px' : 'auto',
                      backgroundPosition: color === 'transparent' ? '0 0, 0 2px, 2px -2px, -2px 0px' : 'auto',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (currentColor !== color) {
                        e.currentTarget.style.transform = 'scale(1.1)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                  >
                    {color === 'transparent' && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: '6px',
                        color: '#666',
                        fontWeight: 'bold',
                        pointerEvents: 'none'
                      }}>
                        ✕
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
      
      {/* Font Size Dropdown */}
      <FontSizeSelector
        isVisible={isFontSizeDropdownOpen}
        position={(() => {
          if (!fontSizeDropdownRef.current) {
            return { x: position.x, y: position.y }
          }
          const rect = fontSizeDropdownRef.current.getBoundingClientRect()
          return {
            x: rect.left,
            y: rect.bottom
          }
        })()}
        currentFontSize={currentFontSize}
        onFontSizeChange={(fontSize) => {
          if (onFontSizeChange) {
            onFontSizeChange(fontSize)
          }
          setIsFontSizeDropdownOpen(false)
        }}
        onClose={() => setIsFontSizeDropdownOpen(false)}
      />
    </>
  )
}