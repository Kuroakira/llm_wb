'use client'

import React, { useState, useEffect } from 'react'
import type { AnchorPosition } from '@/types'
import { useBoardStore } from '@/store/boardStore'
import { getConnectionCursor, getConnectionActiveCursor, getConnectionTargetCursor, getConnectionCancelCursor, setCursor, resetCursor } from '@/lib/cursor-utils'
import { Z_INDEX, getConnectionPointZIndex } from '@/lib/z-index-constants'
import { calculateInteractionRadius, stopEventPropagation, getInteractionProps, INTERACTION_CONFIG } from '@/lib/interaction-utils'
import { getConnectionColors, createConnectionState } from '@/lib/connection-colors'
import { shouldShowConnectionPoints, getZoomAwareThresholds, DEFAULT_PROXIMITY_THRESHOLDS } from '@/lib/proximity-utils'

let Circle: any, Text: any, Group: any
if (typeof window !== 'undefined') {
  try {
    const konva = require('react-konva')
    Circle = konva.Circle
    Text = konva.Text
    Group = konva.Group
  } catch (e) {}
}

type Props = {
  element: { id: string; x: number; y: number; width: number; height: number }
  visible: boolean
  onClick?: (elementId: string, anchor: AnchorPosition) => void
  // Optional proximity override for testing/special cases
  forceProximityCheck?: boolean
}

const anchors: AnchorPosition[] = ['top', 'right', 'bottom', 'left']

function getAnchorXY(el: any, a: AnchorPosition) {
  switch (a) {
    case 'top': return { x: el.x + el.width / 2, y: el.y }
    case 'right': return { x: el.x + el.width, y: el.y + el.height / 2 }
    case 'bottom': return { x: el.x + el.width / 2, y: el.y + el.height }
    case 'left': return { x: el.x, y: el.y + el.height / 2 }
  }
}


export function ConnectionPoints({ element, visible, onClick, forceProximityCheck = false }: Props) {
  const { connectorHoverTarget, selectedIds, connectorDrag, connectors, connectionMode, selectedTool, viewport, elements, cursorPosition } = useBoardStore()
  
  // No animation - just static display with color changes
  const pulseScale = 1  // Always 1, no scaling
  const pulseIntensity = 0  // No intensity changes
  
  if (!Circle) return null

  // Enhanced visibility logic with proximity-based anchor showing
  const isConnectorMode = selectedTool === 'line' || selectedTool === 'connector'
  const isConnectorDragActive = connectorDrag && connectorDrag.isActive
  
  // Calculate proximity-based visibility during connector operations
  const shouldUseProximityCheck = forceProximityCheck || isConnectorDragActive
  let proximityBasedVisible = false
  
  if (shouldUseProximityCheck && cursorPosition) {
    // Apply zoom-aware proximity thresholds
    const zoomAwareThresholds = getZoomAwareThresholds(
      DEFAULT_PROXIMITY_THRESHOLDS, 
      viewport?.zoom || 1
    )
    
    proximityBasedVisible = shouldShowConnectionPoints(
      element.id,
      elements,
      cursorPosition,
      zoomAwareThresholds
    )
  }
  
  // Final visibility determination:
  // 1. Always show if explicitly visible (hover-based)
  // 2. Show during connector drag if within proximity
  // 3. Show in line mode when hovered
  const finalVisible = visible || proximityBasedVisible
  
  if (!finalVisible) return null

  const shouldShowExtendedHover = isConnectorMode && finalVisible

  // 選択された要素の場合は接続ポイントのイベント優先度を下げる
  const isSelected = selectedIds?.includes?.(element.id) ?? false
  
  // コネクタドラッグ中でない場合、選択中の要素では接続ポイントを非表示に
  // ただし、lineモード中（finalVisible=true）は常に表示する
  const shouldHideForResize = isSelected && !isConnectorDragActive && !finalVisible

  // 各アンカーポイントに接続されているコネクタの数をカウント
  const getConnectionCount = (anchor: AnchorPosition) => {
    return connectors.filter(c => 
      (c.fromId === element.id && c.fromAnchor === anchor) ||
      (c.toId === element.id && c.toAnchor === anchor)
    ).length
  }

  return (
    <>
      {anchors.map((a) => {
        const p = getAnchorXY(element, a)
        const isHovered = connectorHoverTarget && connectorHoverTarget.elementId === element.id && connectorHoverTarget.anchor === a
        const connectionCount = getConnectionCount(a)
        
        // Calculate connection colors using centralized logic
        const connectionState = createConnectionState(
          connectionMode,
          element.id,
          a,
          !!isHovered, // Convert to boolean
          visible, // line mode is when connection points are visible
          connectionCount
        )
        const colors = getConnectionColors(connectionState)
        
        // Fixed visual radius - don't change size, only color
        const enhancedRadius = INTERACTION_CONFIG.ANCHOR_VISUAL_RADIUS
        
        // Connection count badge for multiple connections
        const showConnectionBadge = connectionCount > 2
        const badgeOffset = enhancedRadius + 8
        
        // Calculate interaction radius using centralized logic
        const interactionRadius = calculateInteractionRadius(viewport, {
          isExtendedHover: shouldShowExtendedHover
        })

        return (
          <Group key={`anchor-group-${element.id}-${a}`}>
            {/* Invisible interaction overlay for maximum click reliability */}
            <Circle
              x={p.x}
              y={p.y}
              zIndex={Z_INDEX.CONNECTION_INTERACTION}
              listening={!shouldHideForResize}
              visible={!shouldHideForResize}
              {...getInteractionProps(interactionRadius)}
              onClick={(e: any) => {
                stopEventPropagation(e)
                if (onClick) {
                  onClick(element.id, a)
                }
              }}
              onTap={(e: any) => {
                stopEventPropagation(e)
                if (onClick) {
                  onClick(element.id, a)
                }
              }}
              onMouseDown={stopEventPropagation}
              onMouseEnter={() => {
                const { setConnectorHoverTarget } = useBoardStore.getState()
                setConnectorHoverTarget({ elementId: element.id, anchor: a })
                
                // Set appropriate cursor based on connection state
                if (connectionState.isConnectionSource) {
                  setCursor(getConnectionActiveCursor())
                } else if (connectionState.isConnectionTarget) {
                  setCursor(getConnectionTargetCursor())
                } else {
                  setCursor(getConnectionCursor())
                }
              }}
              onMouseLeave={() => {
                const { setConnectorHoverTarget } = useBoardStore.getState()
                setConnectorHoverTarget(null)
                
                // Reset cursor, but consider if we're still in connection mode
                if (connectionMode.isActive) {
                  setCursor(getConnectionActiveCursor())
                } else {
                  resetCursor()
                }
              }}
            />
            {/* Visual anchor point */}
            <Circle
            key={`${element.id}-${a}`}
            x={p.x}
            y={p.y}
            radius={enhancedRadius}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={2}
            // Simple shadow with minimal blur
            shadowColor={colors.shadowColor}
            shadowBlur={3}  // Fixed small blur value
            shadowOffset={{ x: 0, y: 1 }}
            shadowOpacity={0.3}
            // Standardized z-index with consistent hierarchy
            zIndex={shouldHideForResize ? -100 : (isHovered ? Z_INDEX.CONNECTION_POINTS_HOVERED : Z_INDEX.CONNECTION_POINTS_BASE)}
            // 可視性とイベント処理を改善
            listening={false} // Interaction handled by invisible overlay
            visible={!shouldHideForResize}
            data-testid={`connection-point-${a}`}
            // Remove hitStrokeWidth as interaction is handled by overlay
            hitStrokeWidth={0}
            // Connection count badge support (visual enhancement for multiple connections)
            opacity={connectionCount > 3 ? 0.9 : 1.0}
            // No scale changes - only color changes for visual feedback
            scaleX={1}
            scaleY={1}
            // Performance optimizations
            perfectDrawEnabled={false}
            strokeEnabled={true}
            shadowEnabled={true}
            />
            
            {/* Connection count badge for crowded anchors */}
            {showConnectionBadge && Text && (
              <>
                <Circle
                  x={p.x + badgeOffset}
                  y={p.y - badgeOffset}
                  radius={8}
                  fill="#374151"
                  stroke="#6B7280"
                  strokeWidth={1}
                  zIndex={Z_INDEX.CONNECTION_BADGES}
                />
                <Text
                  x={p.x + badgeOffset}
                  y={p.y - badgeOffset}
                  text={connectionCount.toString()}
                  fontSize={10}
                  fontFamily="system-ui, sans-serif"
                  fill="white"
                  align="center"
                  verticalAlign="middle"
                  offsetX={connectionCount > 9 ? 6 : 3}
                  offsetY={5}
                  zIndex={Z_INDEX.CONNECTION_BADGE_TEXT}
                />
              </>
            )}
          </Group>
        )
      })}
    </>
  )
}


