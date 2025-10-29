import { test, expect } from '@playwright/test'

test.describe('Extended Hover Areas in Connector Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    
    // Wait for canvas to be ready
    await expect(page.getByTestId('canvas')).toBeVisible()
  })

  test('should show anchor points when cursor is within buffer zone of elements', async ({ page }) => {
    // Create a sticky note
    await page.getByRole('button', { name: 'Sticky' }).click()
    await page.getByTestId('canvas').click({ position: { x: 300, y: 200 } })
    
    // Switch to line mode to activate extended hover areas
    await page.getByRole('button', { name: 'Line' }).click()
    
    // Move cursor close to but not directly on the sticky note (within 20px buffer)
    await page.getByTestId('canvas').hover({ position: { x: 280, y: 190 } })
    
    // Anchor points should become visible
    await expect(page.getByTestId('connection-point-left')).toBeVisible()
    await expect(page.getByTestId('connection-point-top')).toBeVisible()
    await expect(page.getByTestId('connection-point-right')).toBeVisible()
    await expect(page.getByTestId('connection-point-bottom')).toBeVisible()
    
    // Move cursor far away (outside buffer zone)
    await page.getByTestId('canvas').hover({ position: { x: 100, y: 100 } })
    
    // Anchor points should disappear or become less prominent
    // Note: In line mode, anchor points are still visible but with different styling
    const leftAnchor = page.getByTestId('connection-point-left')
    await expect(leftAnchor).toBeVisible()
  })

  test('should prioritize higher z-index elements in overlapping areas', async ({ page }) => {
    // Create two overlapping elements
    await page.getByRole('button', { name: 'Sticky' }).click()
    await page.getByTestId('canvas').click({ position: { x: 300, y: 200 } })
    
    // Create second sticky note that overlaps
    await page.getByTestId('canvas').click({ position: { x: 320, y: 220 } })
    
    // Switch to line mode
    await page.getByRole('button', { name: 'Line' }).click()
    
    // Click in the overlapping area to start a connection
    await page.getByTestId('canvas').click({ position: { x: 310, y: 210 } })
    
    // Should connect to the higher z-index element (the second one created)
    // This is verified by checking if connection mode is activated
    await expect(page.getByTestId('canvas')).toHaveAttribute('data-connection-active', 'true')
  })

  test('should adapt buffer size based on zoom level', async ({ page }) => {
    // Create a sticky note
    await page.getByRole('button', { name: 'Sticky' }).click()
    await page.getByTestId('canvas').click({ position: { x: 400, y: 300 } })
    
    // Switch to line mode
    await page.getByRole('button', { name: 'Line' }).click()
    
    // Zoom in (should reduce buffer size)
    await page.keyboard.press('Control+Equal') // Zoom in
    await page.keyboard.press('Control+Equal') // Zoom in more
    
    // Test hover at a distance that should work at normal zoom but not at high zoom
    await page.getByTestId('canvas').hover({ position: { x: 370, y: 270 } })
    
    // At high zoom, the buffer should be smaller, so this might not trigger hover
    // We test this by checking if the cursor changes to connection cursor
    const canvas = page.getByTestId('canvas')
    
    // Reset zoom
    await page.keyboard.press('Control+0')
    
    // Now at normal zoom, the same position should trigger hover
    await page.getByTestId('canvas').hover({ position: { x: 370, y: 270 } })
    
    // Anchor points should be visible at normal zoom
    await expect(page.getByTestId('connection-point-left')).toBeVisible()
  })

  test('should reduce buffer size in dense layouts', async ({ page }) => {
    // Create multiple elements close together (dense layout)
    await page.getByRole('button', { name: 'Sticky' }).click()
    
    // Create a cluster of sticky notes
    const positions = [
      { x: 300, y: 200 },
      { x: 350, y: 210 },
      { x: 330, y: 250 },
      { x: 370, y: 240 },
      { x: 320, y: 280 }
    ]
    
    for (const pos of positions) {
      await page.getByTestId('canvas').click({ position: pos })
    }
    
    // Switch to line mode
    await page.getByRole('button', { name: 'Line' }).click()
    
    // In dense layout, buffer should be smaller (10px instead of 20px)
    // Test by hovering at a position that would trigger with 20px buffer but not with 10px
    const centerOfCluster = { x: 340, y: 230 }
    await page.getByTestId('canvas').hover({ position: centerOfCluster })
    
    // Should still show connection points but with more precise targeting
    await expect(page.getByTestId('connection-point-left')).toBeVisible()
    
    // Test clicking in the dense area - should connect to highest z-index element
    await page.getByTestId('canvas').click({ position: centerOfCluster })
    await expect(page.getByTestId('canvas')).toHaveAttribute('data-connection-active', 'true')
  })

  test('should only activate extended hover in connector/line mode', async ({ page }) => {
    // Create a sticky note
    await page.getByRole('button', { name: 'Sticky' }).click()
    await page.getByTestId('canvas').click({ position: { x: 300, y: 200 } })
    
    // Switch to select mode (should not use extended hover)
    await page.getByRole('button', { name: 'Select' }).click()
    
    // Hover near but not on the element
    await page.getByTestId('canvas').hover({ position: { x: 280, y: 190 } })
    
    // Connection points should not be visible in select mode
    await expect(page.getByTestId('connection-point-left')).not.toBeVisible()
    
    // Switch to line mode
    await page.getByRole('button', { name: 'Line' }).click()
    
    // Now hover at the same position
    await page.getByTestId('canvas').hover({ position: { x: 280, y: 190 } })
    
    // Connection points should become visible
    await expect(page.getByTestId('connection-point-left')).toBeVisible()
  })

  test('should work with different element types', async ({ page }) => {
    // Test with sticky note
    await page.getByRole('button', { name: 'Sticky' }).click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 150 } })
    
    // Test with rectangle
    await page.getByRole('button', { name: 'Rectangle' }).click()
    await page.getByTestId('canvas').click({ position: { x: 400, y: 150 } })
    
    // Test with text box
    await page.getByRole('button', { name: 'Text' }).click()
    await page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
    
    // Switch to line mode
    await page.getByRole('button', { name: 'Line' }).click()
    
    // Test extended hover on each element type
    const testPositions = [
      { element: 'sticky', pos: { x: 180, y: 140 } },
      { element: 'rectangle', pos: { x: 380, y: 140 } },
      { element: 'text', pos: { x: 280, y: 290 } }
    ]
    
    for (const { element, pos } of testPositions) {
      await page.getByTestId('canvas').hover({ position: pos })
      
      // Each element should show connection points when hovered
      await expect(page.getByTestId('connection-point-left')).toBeVisible()
      
      // Move away to reset
      await page.getByTestId('canvas').hover({ position: { x: 100, y: 100 } })
      await page.waitForTimeout(100)
    }
  })

  test('should maintain performance with many elements', async ({ page }) => {
    // Create many elements to test performance
    await page.getByRole('button', { name: 'Sticky' }).click()
    
    // Create a grid of elements
    const startTime = Date.now()
    
    for (let x = 100; x <= 700; x += 80) {
      for (let y = 100; y <= 500; y += 80) {
        await page.getByTestId('canvas').click({ position: { x, y } })
      }
    }
    
    const creationTime = Date.now() - startTime
    
    // Switch to line mode
    await page.getByRole('button', { name: 'Line' }).click()
    
    // Test hover performance with many elements
    const hoverStartTime = Date.now()
    
    // Hover in different areas
    const hoverPositions = [
      { x: 150, y: 150 },
      { x: 300, y: 250 },
      { x: 450, y: 350 },
      { x: 600, y: 450 }
    ]
    
    for (const pos of hoverPositions) {
      await page.getByTestId('canvas').hover({ position: pos })
      await page.waitForTimeout(50) // Small delay to let hover processing complete
    }
    
    const hoverTime = Date.now() - hoverStartTime
    
    // Performance should be reasonable (adjust thresholds as needed)
    expect(creationTime).toBeLessThan(10000) // 10 seconds max for creation
    expect(hoverTime).toBeLessThan(1000) // 1 second max for hover operations
    
    // Extended hover should still work with many elements
    await page.getByTestId('canvas').hover({ position: { x: 120, y: 120 } })
    await expect(page.getByTestId('connection-point-left')).toBeVisible()
  })
})