'use client'

import React from 'react'

type ShortcutsModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null

  const shortcuts = [
    {
      category: 'Tools',
      items: [
        { keys: ['V'], description: 'Select tool' },
        { keys: ['S'], description: 'Sticky note tool' },
        { keys: ['T'], description: 'Text tool' },
        { keys: ['R'], description: 'Rectangle tool' },
        { keys: ['L'], description: 'Line/Connector tool' },
        { keys: ['Space'], description: 'Pan tool (hold)' },
      ]
    },
    {
      category: 'Editing',
      items: [
        { keys: ['Ctrl/Cmd', 'C'], description: 'Copy selected elements' },
        { keys: ['Ctrl/Cmd', 'X'], description: 'Cut selected elements' },
        { keys: ['Ctrl/Cmd', 'V'], description: 'Paste elements' },
        { keys: ['Delete'], description: 'Delete selected elements' },
        { keys: ['Backspace'], description: 'Delete selected elements' },
        { keys: ['Enter'], description: 'Edit text element' },
        { keys: ['Esc'], description: 'Cancel current operation' },
      ]
    },
    {
      category: 'History',
      items: [
        { keys: ['Ctrl/Cmd', 'Z'], description: 'Undo' },
        { keys: ['Ctrl/Cmd', 'Shift', 'Z'], description: 'Redo' },
      ]
    },
    {
      category: 'View',
      items: [
        { keys: ['Mouse Wheel'], description: 'Zoom in/out' },
        { keys: ['Space', 'Drag'], description: 'Pan canvas' },
      ]
    },
    {
      category: 'Layer Order',
      items: [
        { keys: ['Ctrl/Cmd', ']'], description: 'Bring to front' },
        { keys: ['Ctrl/Cmd', '['], description: 'Send to back' },
      ]
    },
    {
      category: 'Help',
      items: [
        { keys: ['?'], description: 'Show this shortcuts panel' },
      ]
    }
  ]

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '700px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px 8px',
              color: '#666'
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gap: '24px' }}>
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: 600,
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {section.category}
              </h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                {section.items.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '6px'
                    }}
                  >
                    <span style={{ fontSize: '14px', color: '#333' }}>
                      {item.description}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {item.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <kbd
                            style={{
                              backgroundColor: 'white',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '12px',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              color: '#333',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                              minWidth: '24px',
                              textAlign: 'center'
                            }}
                          >
                            {key}
                          </kbd>
                          {keyIndex < item.keys.length - 1 && (
                            <span style={{ color: '#999', padding: '0 4px' }}>+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#f0f7ff',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#0066cc'
        }}>
          <strong>💡 Tip:</strong> Press <kbd style={{
            backgroundColor: 'white',
            padding: '2px 6px',
            borderRadius: '3px',
            border: '1px solid #ccc',
            fontFamily: 'monospace'
          }}>?</kbd> anytime to view this shortcuts panel
        </div>
      </div>
    </div>
  )
}
