'use client'

import React, { memo, useCallback } from 'react'

type ColorPickerProps = {
  isVisible: boolean
  position: { x: number; y: number }
  currentColor: string
  onColorChange: (color: string) => void
  onClose: () => void
}

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

// Performance optimized ColorPicker with React.memo
export const ColorPicker = memo<ColorPickerProps>(function ColorPicker({ 
  isVisible, 
  position, 
  currentColor, 
  onColorChange, 
  onClose 
}) {
  const handleColorSelect = useCallback((color: string) => {
    onColorChange(color)
  }, [onColorChange])

  const handleNoFill = useCallback(() => {
    onColorChange('transparent')
  }, [onColorChange])

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
        onClick={onClose}
      />

      {/* Color picker panel */}
      <div
        data-testid="color-picker"
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 1001,
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          border: '1px solid #E0E0E0',
          padding: '12px',
          minWidth: '200px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '12px'
        }}>
          {PREDEFINED_COLORS.map((color) => (
            <button
              key={color}
              data-testid={`color-option-${color}`}
              onClick={() => handleColorSelect(color)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '4px',
                border: currentColor === color ? '2px solid #2196F3' : '1px solid #CCCCCC',
                backgroundColor: color === 'transparent' ? '#FFFFFF' : color,
                backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #cccccc 25%, transparent 25%), linear-gradient(-45deg, #cccccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cccccc 75%), linear-gradient(-45deg, transparent 75%, #cccccc 75%)' : 'none',
                backgroundSize: color === 'transparent' ? '6px 6px' : 'auto',
                backgroundPosition: color === 'transparent' ? '0 0, 0 3px, 3px -3px, -3px 0px' : 'auto',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (currentColor !== color) {
                  e.currentTarget.style.transform = 'scale(1.05)'
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
                  fontSize: '8px',
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

        {/* No Fill option */}
        <div style={{
          borderTop: '1px solid #E0E0E0',
          paddingTop: '12px'
        }}>
          <button
            data-testid="no-fill-option"
            onClick={handleNoFill}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: currentColor === 'transparent' ? '2px solid #2196F3' : '1px solid #CCCCCC',
              borderRadius: '4px',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (currentColor !== 'transparent') {
                e.currentTarget.style.backgroundColor = '#F5F5F5'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF'
            }}
          >
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '2px',
              background: 'linear-gradient(-45deg, transparent 40%, #FF0000 40%, #FF0000 60%, transparent 60%)',
              border: '1px solid #CCCCCC'
            }} />
            No Fill
          </button>
        </div>
      </div>
    </>
  )
})