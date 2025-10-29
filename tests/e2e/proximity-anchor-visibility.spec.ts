import { test, expect } from '@playwright/test'

test.describe('Proximity-based Anchor Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    
    // Wait for the canvas to be ready
    await page.waitForSelector('[data-testid="canvas"]')
    
    // Create two sticky notes for testing connections
    await page.getByRole('button', { name: 'Sticky' }).click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    await page.getByRole('button', { name: 'Sticky' }).click() 
    await page.getByTestId('canvas').click({ position: { x: 500, y: 200 } })
    
    // Switch to line tool for connector operations
    await page.getByRole('button', { name: 'Line' }).click()
  })

  test('should only show anchors near cursor during line tool usage', async ({ page }) => {
    // Move mouse near first sticky note - should show its anchors
    await page.mouse.move(200, 200)
    await page.waitForTimeout(100) // Allow for anchor visibility update
    
    // Check that first sticky note shows connection points
    const firstStickyAnchors = page.locator('[data-testid^="connection-point-"]').first()
    await expect(firstStickyAnchors).toBeVisible()
    
    // Move mouse far from any sticky note - should hide anchors
    await page.mouse.move(350, 350)
    await page.waitForTimeout(100)
    
    // Connection points should be hidden when cursor is far
    const connectionPoints = page.locator('[data-testid^="connection-point-"]')
    const visibleCount = await connectionPoints.evaluateAll(elements => 
      elements.filter(el => getComputedStyle(el).visibility !== 'hidden').length
    )
    expect(visibleCount).toBe(0)
    
    // Move mouse near second sticky note - should show its anchors
    await page.mouse.move(500, 200) 
    await page.waitForTimeout(100)
    
    // Second sticky note anchors should now be visible
    await expect(connectionPoints.first()).toBeVisible()
  })

  test('should show anchors during connector drag operation based on proximity', async ({ page }) => {
    // Start a connection from first sticky note
    const firstSticky = page.getByTestId('canvas').locator('.Group').first()
    await firstSticky.click()
    
    // Drag towards second sticky note
    await page.mouse.move(200, 200) // Start position
    await page.mouse.move(350, 200) // Middle position - should hide first, not show second
    
    // At middle position, no anchors should be visible (too far from both)
    await page.waitForTimeout(100)
    let connectionPoints = page.locator('[data-testid^="connection-point-"]')
    let visibleCount = await connectionPoints.evaluateAll(elements => 
      elements.filter(el => getComputedStyle(el).visibility !== 'hidden').length
    )
    expect(visibleCount).toBe(0)
    
    // Move closer to second sticky note
    await page.mouse.move(480, 200)
    await page.waitForTimeout(100)
    
    // Now second sticky note anchors should be visible
    visibleCount = await connectionPoints.evaluateAll(elements => 
      elements.filter(el => getComputedStyle(el).visibility !== 'hidden').length
    )
    expect(visibleCount).toBeGreaterThan(0)
  })

  test('should respect zoom-aware proximity thresholds', async ({ page }) => {
    // Zoom in to test stricter proximity thresholds
    await page.keyboard.down('Meta') // Or 'Control' on Windows/Linux
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, -100) // Scroll up to zoom in
    }
    await page.keyboard.up('Meta')
    
    await page.waitForTimeout(200) // Allow zoom to settle
    
    // At high zoom, cursor needs to be closer to show anchors
    await page.mouse.move(250, 200) // Moderately close to first sticky
    await page.waitForTimeout(100)
    
    // At high zoom, this distance might not show anchors (stricter threshold)
    const connectionPoints = page.locator('[data-testid^="connection-point-"]')
    const visibleCountZoomedIn = await connectionPoints.evaluateAll(elements => 
      elements.filter(el => getComputedStyle(el).visibility !== 'hidden').length
    )
    
    // Zoom out to test more lenient proximity thresholds
    await page.keyboard.down('Meta')
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 100) // Scroll down to zoom out
    }
    await page.keyboard.up('Meta')
    
    await page.waitForTimeout(200) // Allow zoom to settle
    
    // At same cursor position, zoomed out should be more likely to show anchors
    const visibleCountZoomedOut = await connectionPoints.evaluateAll(elements => 
      elements.filter(el => getComputedStyle(el).visibility !== 'hidden').length
    )
    
    // Zoomed out should show anchors more readily (more lenient thresholds)
    expect(visibleCountZoomedOut).toBeGreaterThanOrEqual(visibleCountZoomedIn)
  })

  test('should clear cursor tracking when exiting line tool', async ({ page }) => {
    // Move mouse near first sticky in line mode
    await page.mouse.move(200, 200)
    await page.waitForTimeout(100)
    
    // Anchors should be visible
    const connectionPoints = page.locator('[data-testid^="connection-point-"]')
    await expect(connectionPoints.first()).toBeVisible()
    
    // Switch to select tool
    await page.getByRole('button', { name: 'Select' }).click()
    await page.waitForTimeout(100)
    
    // Cursor tracking should be cleared, anchors should be hidden (except on hover)
    // Move to a position that would show anchors in line mode but shouldn't in select mode
    await page.mouse.move(220, 220)
    await page.waitForTimeout(100)
    
    // In select mode, anchors should only show on direct hover, not proximity
    const visibleCount = await connectionPoints.evaluateAll(elements => 
      elements.filter(el => getComputedStyle(el).visibility !== 'hidden').length
    )
    
    // Should be 0 unless directly hovering the sticky note
    expect(visibleCount).toBe(0)
  })

  test('should handle escape key to cancel connector operations and clear cursor', async ({ page }) => {
    // Start a connection
    await page.mouse.move(200, 200)
    await page.mouse.click(200, 200) // Start connection from first sticky
    
    // Move cursor to show proximity-based anchors
    await page.mouse.move(480, 200)
    await page.waitForTimeout(100)
    
    // Should show anchors near second sticky
    const connectionPoints = page.locator('[data-testid^="connection-point-"]')
    let visibleCount = await connectionPoints.evaluateAll(elements => 
      elements.filter(el => getComputedStyle(el).visibility !== 'hidden').length
    )
    expect(visibleCount).toBeGreaterThan(0)
    
    // Press Escape to cancel
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    
    // Cursor tracking should be cleared, anchors should be hidden
    visibleCount = await connectionPoints.evaluateAll(elements => 
      elements.filter(el => getComputedStyle(el).visibility !== 'hidden').length
    )
    expect(visibleCount).toBe(0)
  })

  test('should maintain hover-based anchor visibility for direct element hovering', async ({ page }) => {
    // Switch to select tool (non-connector mode)
    await page.getByRole('button', { name: 'Select' }).click()
    
    // Direct hover over sticky note should still show anchors
    const firstStickyBounds = await page.getByTestId('canvas').locator('.Group').first().boundingBox()
    if (firstStickyBounds) {
      // Hover directly over the sticky note
      await page.mouse.move(
        firstStickyBounds.x + firstStickyBounds.width / 2, 
        firstStickyBounds.y + firstStickyBounds.height / 2
      )
      await page.waitForTimeout(100)
      
      // Should show anchors on direct hover even in select mode
      const connectionPoints = page.locator('[data-testid^="connection-point-"]')
      await expect(connectionPoints.first()).toBeVisible()
      
      // Move away from sticky note
      await page.mouse.move(firstStickyBounds.x + firstStickyBounds.width + 100, firstStickyBounds.y)
      await page.waitForTimeout(100)
      
      // Anchors should be hidden when not hovering
      const visibleCount = await connectionPoints.evaluateAll(elements => 
        elements.filter(el => getComputedStyle(el).visibility !== 'hidden').length
      )
      expect(visibleCount).toBe(0)
    }
  })
})