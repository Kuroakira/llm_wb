'use client'

import React, { useState, useRef, useEffect } from 'react'

interface TooltipProps {
  text: string
  children: React.ReactNode
  delay?: number
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ text, children, delay = 700, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const tooltipRef = useRef<HTMLDivElement>(null)

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const getTooltipStyle = () => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      padding: '6px 8px',
      borderRadius: '6px',
      fontSize: '12px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      whiteSpace: 'nowrap',
      zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      pointerEvents: 'none',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(-4px)',
      transition: 'opacity 0.2s ease, transform 0.2s ease',
    }

    switch (position) {
      case 'top':
        return {
          ...baseStyle,
          bottom: '100%',
          left: '50%',
          transform: `translateX(-50%) ${isVisible ? 'translateY(-8px)' : 'translateY(-4px)'}`,
        }
      case 'bottom':
        return {
          ...baseStyle,
          top: '100%',
          left: '50%',
          transform: `translateX(-50%) ${isVisible ? 'translateY(8px)' : 'translateY(4px)'}`,
        }
      case 'left':
        return {
          ...baseStyle,
          right: '100%',
          top: '50%',
          transform: `translateY(-50%) ${isVisible ? 'translateX(-8px)' : 'translateX(-4px)'}`,
        }
      case 'right':
        return {
          ...baseStyle,
          left: '100%',
          top: '50%',
          transform: `translateY(-50%) ${isVisible ? 'translateX(8px)' : 'translateX(4px)'}`,
        }
      default:
        return baseStyle
    }
  }

  const getArrowStyle = () => {
    const baseArrowStyle: React.CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
      pointerEvents: 'none',
    }

    switch (position) {
      case 'top':
        return {
          ...baseArrowStyle,
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: '4px solid #1a1a1a',
        }
      case 'bottom':
        return {
          ...baseArrowStyle,
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderBottom: '4px solid #1a1a1a',
        }
      case 'left':
        return {
          ...baseArrowStyle,
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          borderTop: '4px solid transparent',
          borderBottom: '4px solid transparent',
          borderLeft: '4px solid #1a1a1a',
        }
      case 'right':
        return {
          ...baseArrowStyle,
          right: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          borderTop: '4px solid transparent',
          borderBottom: '4px solid transparent',
          borderRight: '4px solid #1a1a1a',
        }
      default:
        return baseArrowStyle
    }
  }

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      <div ref={tooltipRef} style={getTooltipStyle()}>
        {text}
        <div style={getArrowStyle()} />
      </div>
    </div>
  )
}