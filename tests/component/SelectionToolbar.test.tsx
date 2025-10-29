import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SelectionToolbar } from '@/canvas/tools/SelectionToolbar'
import type { CanvasElement } from '@/types'

// Mock functions for toolbar handlers
const mockHandlers = {
  onTextAlignChange: vi.fn(),
  onVerticalAlignChange: vi.fn(), 
  onColorChange: vi.fn(),
  onFontSizeChange: vi.fn()
}

const mockViewport = { zoom: 1, panX: 0, panY: 0 }
const mockPosition = { x: 100, y: 100 }

describe('SelectionToolbar', () => {
  it('should render when isVisible is true and has non-image elements', () => {
    const selectedElements: CanvasElement[] = [
      {
        id: 'sticky-1',
        type: 'sticky',
        x: 0, y: 0, width: 200, height: 100,
        text: 'Test sticky',
        color: '#FFF2B2',
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]

    render(
      <SelectionToolbar
        isVisible={true}
        position={mockPosition}
        selectedElements={selectedElements}
        {...mockHandlers}
        viewport={mockViewport}
      />
    )

    expect(screen.getByTestId('selection-toolbar')).toBeVisible()
  })

  it('should not render when isVisible is false', () => {
    const selectedElements: CanvasElement[] = [
      {
        id: 'sticky-1',
        type: 'sticky', 
        x: 0, y: 0, width: 200, height: 100,
        text: 'Test sticky',
        color: '#FFF2B2',
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]

    render(
      <SelectionToolbar
        isVisible={false}
        position={mockPosition}
        selectedElements={selectedElements}
        {...mockHandlers}
        viewport={mockViewport}
      />
    )

    expect(screen.queryByTestId('selection-toolbar')).not.toBeInTheDocument()
  })

  it('should not render when no elements are selected', () => {
    render(
      <SelectionToolbar
        isVisible={true}
        position={mockPosition}
        selectedElements={[]}
        {...mockHandlers}
        viewport={mockViewport}
      />
    )

    expect(screen.queryByTestId('selection-toolbar')).not.toBeInTheDocument()
  })

  it('should render text alignment controls for sticky elements', () => {
    const selectedElements: CanvasElement[] = [
      {
        id: 'sticky-1',
        type: 'sticky',
        x: 0, y: 0, width: 200, height: 100,
        text: 'Test sticky',
        color: '#FFF2B2',
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]

    render(
      <SelectionToolbar
        isVisible={true}
        position={mockPosition}
        selectedElements={selectedElements}
        {...mockHandlers}
        viewport={mockViewport}
      />
    )

    expect(screen.getByTestId('selection-align-left')).toBeInTheDocument()
    expect(screen.getByTestId('selection-align-center')).toBeInTheDocument()
    expect(screen.getByTestId('selection-align-right')).toBeInTheDocument()
  })

  it('should render color controls for sticky elements', () => {
    const selectedElements: CanvasElement[] = [
      {
        id: 'sticky-1',
        type: 'sticky',
        x: 0, y: 0, width: 200, height: 100, 
        text: 'Test sticky',
        color: '#FFF2B2',
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]

    render(
      <SelectionToolbar
        isVisible={true}
        position={mockPosition}
        selectedElements={selectedElements}
        {...mockHandlers}
        viewport={mockViewport}
      />
    )

    expect(screen.getByTestId('selection-color-picker')).toBeInTheDocument()
  })

  it('should render font size controls for text elements', () => {
    const selectedElements: CanvasElement[] = [
      {
        id: 'text-1', 
        type: 'text',
        x: 0, y: 0, width: 200, height: 100,
        text: 'Test text',
        fontSize: 16,
        fontFamily: 'Arial',
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]

    render(
      <SelectionToolbar
        isVisible={true}
        position={mockPosition}
        selectedElements={selectedElements}
        {...mockHandlers}
        viewport={mockViewport}
      />
    )

    expect(screen.getByTestId('selection-fontsize-decrease')).toBeInTheDocument()
    expect(screen.getByTestId('selection-fontsize-increase')).toBeInTheDocument()
  })

  it('should not render any controls for image-only selections', () => {
    const selectedElements: CanvasElement[] = [
      {
        id: 'image-1',
        type: 'image',
        x: 0, y: 0, width: 300, height: 200,
        src: 'data:image/png;base64,test',
        originalWidth: 300,
        originalHeight: 200,
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]

    render(
      <SelectionToolbar
        isVisible={true}
        position={mockPosition}
        selectedElements={selectedElements}
        {...mockHandlers}
        viewport={mockViewport}
      />
    )

    // The toolbar should render (isVisible=true) but have no controls for images
    const toolbar = screen.getByTestId('selection-toolbar')
    expect(toolbar).toBeInTheDocument()
    
    // But should not have any interactive controls
    expect(screen.queryByTestId('selection-align-left')).not.toBeInTheDocument()
    expect(screen.queryByTestId('selection-color-picker')).not.toBeInTheDocument()
    expect(screen.queryByTestId('selection-fontsize-decrease')).not.toBeInTheDocument()
  })

  it('should render controls for mixed selection with images and other elements', () => {
    const selectedElements: CanvasElement[] = [
      {
        id: 'image-1',
        type: 'image',
        x: 0, y: 0, width: 300, height: 200,
        src: 'data:image/png;base64,test',
        originalWidth: 300,
        originalHeight: 200,
        zIndex: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'sticky-1',
        type: 'sticky',
        x: 100, y: 100, width: 200, height: 100,
        text: 'Test sticky',
        color: '#FFF2B2',
        zIndex: 2,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]

    render(
      <SelectionToolbar
        isVisible={true}
        position={mockPosition}
        selectedElements={selectedElements}
        {...mockHandlers}
        viewport={mockViewport}
      />
    )

    // Should show controls for the sticky note (text alignment and color)
    expect(screen.getByTestId('selection-align-left')).toBeInTheDocument()
    expect(screen.getByTestId('selection-color-picker')).toBeInTheDocument()
  })
})