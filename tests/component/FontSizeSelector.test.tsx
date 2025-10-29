import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FontSizeSelector, FontSizeTrigger } from '@/canvas/tools/FontSizeSelector'
import { describe, it, expect, vi } from 'vitest'

describe('FontSizeSelector', () => {
  const mockOnFontSizeChange = vi.fn()
  const mockOnClose = vi.fn()
  const position = { x: 100, y: 200 }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when not visible', () => {
    render(
      <FontSizeSelector
        isVisible={false}
        position={position}
        currentFontSize={16}
        onFontSizeChange={mockOnFontSizeChange}
        onClose={mockOnClose}
      />
    )

    expect(screen.queryByTestId('font-size-selector')).not.toBeInTheDocument()
  })

  it('should render font size options when visible', () => {
    render(
      <FontSizeSelector
        isVisible={true}
        position={position}
        currentFontSize={16}
        onFontSizeChange={mockOnFontSizeChange}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByTestId('font-size-selector')).toBeInTheDocument()
    
    // Check that all predefined font sizes are present
    const expectedSizes = [10, 12, 14, 16, 18, 24, 32, 48, 64, 96]
    expectedSizes.forEach(size => {
      expect(screen.getByTestId(`font-size-option-${size}`)).toBeInTheDocument()
    })
  })

  it('should highlight current font size', () => {
    render(
      <FontSizeSelector
        isVisible={true}
        position={position}
        currentFontSize={24}
        onFontSizeChange={mockOnFontSizeChange}
        onClose={mockOnClose}
      />
    )

    const currentOption = screen.getByTestId('font-size-option-24')
    expect(currentOption).toHaveStyle({ backgroundColor: '#E3F2FD', color: '#1976D2' })
  })

  it('should call onFontSizeChange when option is selected', async () => {
    render(
      <FontSizeSelector
        isVisible={true}
        position={position}
        currentFontSize={16}
        onFontSizeChange={mockOnFontSizeChange}
        onClose={mockOnClose}
      />
    )

    const option32 = screen.getByTestId('font-size-option-32')
    fireEvent.click(option32)

    expect(mockOnFontSizeChange).toHaveBeenCalledWith(32)
  })

  it('should handle keyboard navigation', async () => {
    render(
      <FontSizeSelector
        isVisible={true}
        position={position}
        currentFontSize={16}
        onFontSizeChange={mockOnFontSizeChange}
        onClose={mockOnClose}
      />
    )

    // Press Arrow Down to go to next font size (18px)
    fireEvent.keyDown(document, { key: 'ArrowDown' })
    expect(mockOnFontSizeChange).toHaveBeenCalledWith(18)

    // Press Arrow Up to go to previous font size (from 16px to 14px)
    vi.clearAllMocks()
    fireEvent.keyDown(document, { key: 'ArrowUp' })
    expect(mockOnFontSizeChange).toHaveBeenCalledWith(14)
  })

  it('should close on Escape key', () => {
    render(
      <FontSizeSelector
        isVisible={true}
        position={position}
        currentFontSize={16}
        onFontSizeChange={mockOnFontSizeChange}
        onClose={mockOnClose}
      />
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should close on Enter key', () => {
    render(
      <FontSizeSelector
        isVisible={true}
        position={position}
        currentFontSize={16}
        onFontSizeChange={mockOnFontSizeChange}
        onClose={mockOnClose}
      />
    )

    fireEvent.keyDown(document, { key: 'Enter' })
    expect(mockOnClose).toHaveBeenCalled()
  })
})

describe('FontSizeTrigger', () => {
  const mockOnClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render current font size', () => {
    render(
      <FontSizeTrigger
        currentFontSize={24}
        onClick={mockOnClick}
        isOpen={false}
      />
    )

    expect(screen.getByTestId('font-size-trigger')).toHaveTextContent('24')
  })

  it('should show active state when open', () => {
    render(
      <FontSizeTrigger
        currentFontSize={16}
        onClick={mockOnClick}
        isOpen={true}
      />
    )

    const trigger = screen.getByTestId('font-size-trigger')
    expect(trigger).toHaveStyle({ backgroundColor: '#E3F2FD', color: '#1976D2' })
  })

  it('should call onClick when clicked', () => {
    render(
      <FontSizeTrigger
        currentFontSize={16}
        onClick={mockOnClick}
        isOpen={false}
      />
    )

    fireEvent.click(screen.getByTestId('font-size-trigger'))
    expect(mockOnClick).toHaveBeenCalled()
  })

  it('should have proper title attribute', () => {
    render(
      <FontSizeTrigger
        currentFontSize={32}
        onClick={mockOnClick}
        isOpen={false}
      />
    )

    const trigger = screen.getByTestId('font-size-trigger')
    expect(trigger).toHaveAttribute('title', 'Font size: 32px')
  })
})