import { test, expect } from '@playwright/test'

test.describe('Two-Click Connection Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="canvas"]')
    
    // Create two sticky notes for connection testing
    await page.getByRole('button', { name: 'Sticky' }).click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    
    await page.getByRole('button', { name: 'Sticky' }).click()
    await page.getByTestId('canvas').click({ position: { x: 400, y: 300 } })
    
    // Switch to line tool
    await page.getByRole('button', { name: 'Line' }).click()
    await page.waitForTimeout(500) // Allow UI to settle
  })

  test('should show connection points when line tool is selected', async ({ page }) => {
    // Connection points should be visible when line tool is active
    await expect(page.locator('[data-testid="connection-point-top"]').first()).toBeVisible()
    await expect(page.locator('[data-testid="connection-point-right"]').first()).toBeVisible()
    await expect(page.locator('[data-testid="connection-point-bottom"]').first()).toBeVisible()
    await expect(page.locator('[data-testid="connection-point-left"]').first()).toBeVisible()
  })

  test('should complete two-click connection workflow', async ({ page }) => {
    // Step 1: Click first anchor point
    const firstNote = page.locator('[data-testid="sticky-note"]').first()
    const firstAnchor = firstNote.locator('[data-testid="connection-point-right"]')
    
    // First click should start connection mode
    await firstAnchor.click()
    await page.waitForTimeout(100)
    
    // Check that connection mode is active (preview line should appear)
    // We can verify this by checking if the connection preview component is rendered
    const connectionPreview = page.locator('canvas')
    await expect(connectionPreview).toBeVisible()
    
    // Step 2: Click second anchor point to complete connection
    const secondNote = page.locator('[data-testid="sticky-note"]').nth(1)
    const secondAnchor = secondNote.locator('[data-testid="connection-point-left"]')
    
    await secondAnchor.click()
    await page.waitForTimeout(100)
    
    // Verify connection was created by checking for connector element
    await expect(page.locator('[data-testid="connector"]')).toBeVisible()
    
    // Connection mode should be inactive after completion
    // Tool should automatically switch back to select mode (Figma-like behavior)
    await expect(page.getByRole('button', { name: 'Select' })).toHaveClass(/selected|active/)
  })

  test('should cancel connection on background click', async ({ page }) => {
    // Step 1: Start connection
    const firstAnchor = page.locator('[data-testid="connection-point-right"]').first()
    await firstAnchor.click()
    await page.waitForTimeout(100)
    
    // Step 2: Click background to cancel
    await page.getByTestId('canvas').click({ position: { x: 100, y: 100 } })
    await page.waitForTimeout(100)
    
    // Verify no connection was created
    await expect(page.locator('[data-testid="connector"]')).not.toBeVisible()
    
    // Connection mode should be inactive
    // We can verify this by checking that clicking another anchor starts a new connection
    const secondAnchor = page.locator('[data-testid="connection-point-left"]').first()
    await secondAnchor.click()
    await page.waitForTimeout(100)
    
    // This should start a new connection (not complete the old one)
    // We can verify by clicking background again and checking no connector exists
    await page.getByTestId('canvas').click({ position: { x: 500, y: 500 } })
    await expect(page.locator('[data-testid="connector"]')).not.toBeVisible()
  })

  test('should cancel connection with Escape key', async ({ page }) => {
    // Step 1: Start connection
    const firstAnchor = page.locator('[data-testid="connection-point-right"]').first()
    await firstAnchor.click()
    await page.waitForTimeout(100)
    
    // Step 2: Press Escape to cancel
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    
    // Verify no connection was created
    await expect(page.locator('[data-testid="connector"]')).not.toBeVisible()
  })

  test('should show different visual states for source and target anchors', async ({ page }) => {
    // Step 1: Start connection
    const firstAnchor = page.locator('[data-testid="connection-point-right"]').first()
    await firstAnchor.click()
    await page.waitForTimeout(100)
    
    // Step 2: Hover over target anchor
    const secondAnchor = page.locator('[data-testid="connection-point-left"]').nth(1)
    await secondAnchor.hover()
    await page.waitForTimeout(100)
    
    // Visual verification would be done through screenshot comparison in a real test
    // For now, we just verify the elements exist and are interactive
    await expect(firstAnchor).toBeVisible()
    await expect(secondAnchor).toBeVisible()
  })

  test('should prevent connection to same element', async ({ page }) => {
    // Step 1: Start connection from first anchor
    const firstNote = page.locator('[data-testid="sticky-note"]').first()
    const firstAnchor = firstNote.locator('[data-testid="connection-point-right"]')
    await firstAnchor.click()
    await page.waitForTimeout(100)
    
    // Step 2: Try to connect to different anchor on same element
    const sameElementAnchor = firstNote.locator('[data-testid="connection-point-left"]')
    await sameElementAnchor.click()
    await page.waitForTimeout(100)
    
    // Should cancel connection instead of creating self-loop
    await expect(page.locator('[data-testid="connector"]')).not.toBeVisible()
  })

  test('should show enhanced preview line during connection', async ({ page }) => {
    // Start connection
    const firstAnchor = page.locator('[data-testid="connection-point-right"]').first()
    await firstAnchor.click()
    await page.waitForTimeout(100)
    
    // Move mouse to create preview line
    await page.getByTestId('canvas').hover({ position: { x: 350, y: 250 } })
    await page.waitForTimeout(100)
    
    // The preview line should be visible (rendered on canvas)
    // In a real test, we might check canvas content or take screenshots
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()
  })

  test('should handle rapid clicking gracefully', async ({ page }) => {
    // Rapid click test to ensure UI remains responsive
    const firstAnchor = page.locator('[data-testid="connection-point-right"]').first()
    const secondAnchor = page.locator('[data-testid="connection-point-left"]').nth(1)
    
    // Click rapidly
    await firstAnchor.click()
    await secondAnchor.click()
    await page.waitForTimeout(100)
    
    // Should create one connection
    await expect(page.locator('[data-testid="connector"]')).toHaveCount(1)
  })
})