/**
 * Connection point color calculation utilities
 * 
 * Centralizes the complex color logic for connection points based on their state:
 * - Connection mode states (source, target, available)
 * - Hover states
 * - Connection count (multi-connected anchors)
 * - Line mode visibility
 */

export type ConnectionState = {
  isConnectionSource: boolean
  isConnectionTarget: boolean
  isLineMode: boolean
  isHovered: boolean
  connectionCount: number
}

export type ConnectionColors = {
  fill: string
  stroke: string
  shadowColor: string
  shadowIntensity: number
  pulseFrequency?: number
}

/**
 * Color schemes for different connection states
 */
const COLOR_SCHEMES = {
  // Active connection source (first click completed)
  CONNECTION_SOURCE: {
    fill: '#059669',
    stroke: '#047857',
    shadowColor: 'rgba(5, 150, 105, 1.0)',
    shadowIntensity: 28,
    pulseFrequency: 0.008
  },
  
  // Connection target (second click available)
  CONNECTION_TARGET: {
    fill: '#7C3AED', 
    stroke: '#5B21B6',
    shadowColor: 'rgba(124, 58, 237, 1.0)',
    shadowIntensity: 20,
    pulseFrequency: 0.005
  },
  
  // Connected anchor (has existing connections)
  CONNECTED: {
    normal: {
      fill: '#10B981',
      stroke: '#065F46',
      shadowColor: 'rgba(16, 185, 129, 0.6)',
      shadowIntensity: 4
    },
    hovered: {
      fill: '#059669',
      stroke: '#047857', 
      shadowColor: 'rgba(5, 150, 105, 1.0)',
      shadowIntensity: 16
    },
    multiConnected: {
      fill: '#10B981',
      stroke: '#065F46',
      shadowColor: 'rgba(16, 185, 129, 0.6)', 
      shadowIntensity: 8
    }
  },
  
  // Line mode (connection available)
  LINE_MODE: {
    normal: {
      fill: '#60A5FA',
      stroke: '#3B82F6',
      shadowColor: 'rgba(59, 130, 246, 0.9)',
      shadowIntensity: 8
    },
    hovered: {
      fill: '#1D4ED8',
      stroke: '#1E40AF', 
      shadowColor: 'rgba(29, 78, 216, 1.0)',
      shadowIntensity: 22
    }
  },
  
  // Default state
  DEFAULT: {
    normal: {
      fill: '#3B82F6',
      stroke: '#2563EB',
      shadowColor: 'rgba(59, 130, 246, 0.4)',
      shadowIntensity: 2
    },
    hovered: {
      fill: '#1D4ED8',
      stroke: '#1E40AF',
      shadowColor: 'rgba(29, 78, 216, 0.8)',
      shadowIntensity: 8
    }
  }
} as const

/**
 * Get connection point colors based on state
 */
export function getConnectionColors(state: ConnectionState): ConnectionColors {
  const { 
    isConnectionSource, 
    isConnectionTarget, 
    isLineMode, 
    isHovered, 
    connectionCount 
  } = state
  
  // Priority order: source > target > connected > line mode > default
  
  if (isConnectionSource) {
    return COLOR_SCHEMES.CONNECTION_SOURCE
  }
  
  if (isConnectionTarget) {
    return COLOR_SCHEMES.CONNECTION_TARGET
  }
  
  if (connectionCount > 0) {
    const isMultiConnected = connectionCount > 1
    
    if (isHovered) {
      return COLOR_SCHEMES.CONNECTED.hovered
    } else if (isMultiConnected) {
      return COLOR_SCHEMES.CONNECTED.multiConnected
    } else {
      return COLOR_SCHEMES.CONNECTED.normal
    }
  }
  
  if (isLineMode) {
    return isHovered 
      ? COLOR_SCHEMES.LINE_MODE.hovered
      : COLOR_SCHEMES.LINE_MODE.normal
  }
  
  // Default state
  return isHovered 
    ? COLOR_SCHEMES.DEFAULT.hovered
    : COLOR_SCHEMES.DEFAULT.normal
}

/**
 * Helper to create connection state object
 */
export function createConnectionState(
  connectionMode: any,
  elementId: string,
  anchor: string,
  isHovered: boolean,
  isLineMode: boolean,
  connectionCount: number
): ConnectionState {
  const isConnectionSource = connectionMode.isActive && 
                           connectionMode.fromElementId === elementId && 
                           connectionMode.fromAnchor === anchor
                           
  const isConnectionTarget = connectionMode.isActive && 
                           connectionMode.fromElementId !== elementId && 
                           isHovered
  
  return {
    isConnectionSource,
    isConnectionTarget,
    isLineMode,
    isHovered,
    connectionCount
  }
}