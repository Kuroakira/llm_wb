import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { ConnectionPoints } from '@/canvas/shapes/ConnectionPoints'

// Mock Konva components
const mockCircle = vi.fn().mockImplementation(({ children, onClick, onTap, onMouseDown, onMouseEnter, onMouseLeave, ...props }) => (
  <div
    data-testid={`mock-circle-${props.radius}-${props.zIndex || 'no-z'}`}
    data-radius={props.radius}
    data-z-index={props.zIndex || 'no-z'}
    data-fill={props.fill}
    data-listening={props.listening}
    onClick={onClick}
    onTouchStart={onTap}
    onMouseDown={onMouseDown}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    style={{
      position: 'absolute',
      left: props.x - props.radius,
      top: props.y - props.radius,
      width: props.radius * 2,
      height: props.radius * 2,
      borderRadius: '50%',
      backgroundColor: props.fill === 'transparent' ? 'transparent' : props.fill,
      pointerEvents: props.listening === false ? 'none' : 'auto',
    }}
  >
    {children}
  </div>
))

const mockText = vi.fn().mockImplementation((props) => (
  <span data-testid="mock-text" data-text={props.text}>
    {props.text}
  </span>
))

const mockGroup = vi.fn().mockImplementation(({ children }) => (
  <div data-testid="mock-group">{children}</div>
))

// Mock react-konva
vi.mock('react-konva', () => ({
  Circle: mockCircle,
  Text: mockText,
  Group: mockGroup,
}))

// Mock the board store
vi.mock('@/store/boardStore', () => ({
  useBoardStore: vi.fn()
}))

// Mock cursor utils
vi.mock('@/lib/cursor-utils', () => ({
  getConnectionCursor: () => 'crosshair',
  getConnectionActiveCursor: () => 'copy',
  getConnectionTargetCursor: () => 'alias',
  getConnectionCancelCursor: () => 'not-allowed',
  setCursor: vi.fn(),
  resetCursor: vi.fn(),
}))

// Mock geometry utils
vi.mock('@/lib/geometry', () => ({
  detectDenseLayout: vi.fn(() => false),
  DEFAULT_HOVER_CONFIG: {
    denseLayoutThreshold: 80
  }
}))

describe('ConnectionPoints - Enhanced Clickability', () => {
  const mockElement = {
    id: 'test-element',
    x: 100,
    y: 100,
    width: 200,
    height: 100
  }

  const mockStoreState = {
    connectorHoverTarget: null,
    selectedIds: [],
    connectorDrag: { isActive: false },
    connectors: [],
    connectionMode: { isActive: false },
    selectedTool: 'line',
    viewport: { zoom: 1.0, panX: 0, panY: 0 },
    setConnectorHoverTarget: vi.fn()
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    const { useBoardStore } = await import('@/store/boardStore')
    vi.mocked(useBoardStore).mockReturnValue(mockStoreState)
    vi.mocked(useBoardStore).getState = vi.fn().mockReturnValue(mockStoreState)
  })

  test('should render enhanced interaction overlay with 2x visual size minimum', () => {
    const mockOnClick = vi.fn()
    
    render(
      <ConnectionPoints
        element={mockElement}
        visible={true}
        onClick={mockOnClick}
      />
    )

    // Should have interaction overlay circles with larger radius than visual circles
    const interactionOverlays = screen.getAllByTestId(/mock-circle-.*-4000/)
    const visualAnchors = screen.getAllByTestId(/mock-circle-6-3000/)
    
    expect(interactionOverlays).toHaveLength(4) // 4 anchor positions
    expect(visualAnchors).toHaveLength(4) // 4 anchor positions

    // Interaction overlays should have larger radius (minimum 12px)
    interactionOverlays.forEach(overlay => {
      const radius = parseInt(overlay.getAttribute('data-radius') || '0')
      expect(radius).toBeGreaterThanOrEqual(12) // 2x visual size minimum
    })

    // Visual anchors should maintain 6px radius
    visualAnchors.forEach(anchor => {
      const radius = parseInt(anchor.getAttribute('data-radius') || '0')
      expect(radius).toBe(6)
    })
  })

  test('should have proper z-index hierarchy for clickability', () => {
    const mockOnClick = vi.fn()
    
    render(
      <ConnectionPoints
        element={mockElement}
        visible={true}
        onClick={mockOnClick}
      />
    )

    const interactionOverlays = screen.getAllByTestId(/mock-circle-.*-4000/)
    const visualAnchors = screen.getAllByTestId(/mock-circle-6-3000/)

    // Interaction overlays should have highest z-index (4000)
    interactionOverlays.forEach(overlay => {
      const zIndex = overlay.getAttribute('data-z-index')
      expect(zIndex).toBe('4000')
    })

    // Visual anchors should have lower z-index (3000)
    visualAnchors.forEach(anchor => {
      const zIndex = anchor.getAttribute('data-z-index')
      expect(zIndex).toBe('3000')
    })
  })

  test('should handle enhanced click events with proper event isolation', () => {
    const mockOnClick = vi.fn()
    
    render(
      <ConnectionPoints
        element={mockElement}
        visible={true}
        onClick={mockOnClick}
      />
    )

    // Find an interaction overlay for the top anchor
    const interactionOverlay = screen.getByTestId(/mock-circle-.*-4000/)
    
    // Create mock event with stopPropagation methods
    const mockEvent = {
      evt: {
        stopPropagation: vi.fn(),
        stopImmediatePropagation: vi.fn(),
        preventDefault: vi.fn(),
      },
      cancelBubble: false
    }

    // Click on the interaction overlay
    fireEvent.click(interactionOverlay, mockEvent)

    // Should call onClick with correct parameters
    expect(mockOnClick).toHaveBeenCalledWith(mockElement.id, expect.any(String))
    
    // Should stop event propagation
    expect(mockEvent.evt.stopPropagation).toHaveBeenCalled()
    expect(mockEvent.evt.stopImmediatePropagation).toHaveBeenCalled()
    expect(mockEvent.evt.preventDefault).toHaveBeenCalled()
  })

  test('should adapt interaction radius based on zoom level', async () => {
    // Test with zoomed out state (elements appear smaller)
    const { useBoardStore } = await import('@/store/boardStore')
    vi.mocked(useBoardStore).mockReturnValue({
      ...mockStoreState,
      viewport: { zoom: 0.5, panX: 0, panY: 0 } // Zoomed out
    })

    const mockOnClick = vi.fn()
    
    render(
      <ConnectionPoints
        element={mockElement}
        visible={true}
        onClick={mockOnClick}
      />
    )

    const interactionOverlays = screen.getAllByTestId(/mock-circle-.*-4000/)
    
    // At low zoom, interaction radius should be larger to compensate
    interactionOverlays.forEach(overlay => {
      const radius = parseInt(overlay.getAttribute('data-radius') || '0')
      expect(radius).toBeGreaterThan(12) // Should be larger than base minimum
    })
  })

  test('should maintain visual appearance with 6px radius', () => {
    const mockOnClick = vi.fn()
    
    render(
      <ConnectionPoints
        element={mockElement}
        visible={true}
        onClick={mockOnClick}
      />
    )

    const visualAnchors = screen.getAllByTestId(/mock-circle-6-3000/)
    
    // All visual anchors should maintain exactly 6px radius
    visualAnchors.forEach(anchor => {
      const radius = parseInt(anchor.getAttribute('data-radius') || '0')
      expect(radius).toBe(6) // Never changes from visual specification
    })
  })

  test('should handle hovered state with elevated z-index', async () => {
    const { useBoardStore } = await import('@/store/boardStore')
    vi.mocked(useBoardStore).mockReturnValue({
      ...mockStoreState,
      connectorHoverTarget: {
        elementId: mockElement.id,
        anchor: 'top'
      }
    })

    const mockOnClick = vi.fn()
    
    render(
      <ConnectionPoints
        element={mockElement}
        visible={true}
        onClick={mockOnClick}
      />
    )

    // Should have at least one hovered anchor with elevated z-index
    const hoveredAnchors = screen.getAllByTestId(/mock-circle-6-3500/)
    expect(hoveredAnchors.length).toBeGreaterThan(0)
    
    hoveredAnchors.forEach(anchor => {
      const zIndex = anchor.getAttribute('data-z-index')
      expect(zIndex).toBe('3500') // Hovered state z-index
    })
  })

  test('should disable interaction when element is selected for resize', async () => {
    const { useBoardStore } = await import('@/store/boardStore')
    vi.mocked(useBoardStore).mockReturnValue({
      ...mockStoreState,
      selectedIds: [mockElement.id], // Element is selected
      connectorDrag: { isActive: false }, // Not in connector drag mode
      selectedTool: 'select' // Not in line mode
    })

    const mockOnClick = vi.fn()
    
    render(
      <ConnectionPoints
        element={mockElement}
        visible={false} // Not visible when selected for resize
        onClick={mockOnClick}
      />
    )

    // Should render nothing when hidden for resize
    const circles = screen.queryAllByTestId(/mock-circle/)
    expect(circles).toHaveLength(0)
  })
})