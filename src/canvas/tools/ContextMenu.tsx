'use client'

import React, { memo, useCallback, useMemo } from 'react'

type ContextMenuProps = {
  isVisible: boolean
  position: { x: number; y: number }
  onClose: () => void
  onChangeColor: () => void
  onBringToFront: () => void
  onSendToBack: () => void
  elementType: 'rect' | 'sticky' | 'text' | null
}

// Performance optimized ContextMenu with React.memo
export const ContextMenu = memo<ContextMenuProps>(function ContextMenu({ 
  isVisible, 
  position, 
  onClose, 
  onChangeColor, 
  onBringToFront, 
  onSendToBack,
  elementType
}) {
  // Memoize menu items to prevent recreation on every render
  const menuItems = useMemo(() => {
    const items = []

    // Add z-axis control for all element types
    if (elementType) {
      items.push({
        label: 'Bring to Front',
        icon: '⬆️',
        shortcut: ']',
        action: onBringToFront
      })
      items.push({
        label: 'Send to Back',
        icon: '⬇️',
        shortcut: '[',
        action: onSendToBack
      })
    }

    return items
  }, [elementType, onBringToFront, onSendToBack])

  // Callback to handle menu item clicks
  const handleItemClick = useCallback((action: () => void) => {
    action()
    onClose()
  }, [onClose])

  if (!isVisible) return null

  // Don't show anything if there are no menu items
  if (menuItems.length === 0) return null

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

      {/* Context menu */}
      <div
        data-testid="context-menu"
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 1001,
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          border: '1px solid #E0E0E0',
          minWidth: '150px',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {menuItems.map((item, index) => (
          <button
            key={index}
            data-testid={`context-menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={() => handleItemClick(item.action)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F5F5F5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              {item.label}
            </div>
            {(item as any).shortcut && (
              <span style={{ 
                fontSize: '12px', 
                color: '#666',
                backgroundColor: '#F0F0F0',
                padding: '2px 6px',
                borderRadius: '4px',
                fontFamily: 'monospace'
              }}>
                {(item as any).shortcut}
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  )
})