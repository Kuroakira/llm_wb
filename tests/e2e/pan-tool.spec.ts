import { test, expect } from '@playwright/test'

test.describe('Pan Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    
    // Wait for the canvas to be ready
    await page.waitForSelector('[data-testid="canvas"]')
  })

  test('should have pan tool button in toolbar', async ({ page }) => {
    const panTool = page.getByTestId('tool-pan')
    await expect(panTool).toBeVisible()
    
    // Check tooltip shows keyboard shortcuts
    await panTool.hover()
    await expect(page.getByText('Pan Tool (H key, or hold Space)')).toBeVisible()
  })

  test('should switch to pan tool when clicked', async ({ page }) => {
    // Click pan tool
    await page.click('[data-testid="tool-pan"]')
    
    // Pan tool should be active (highlighted)
    const panTool = page.getByTestId('tool-pan')
    const backgroundColor = await panTool.evaluate(el => getComputedStyle(el).backgroundColor)
    
    // Should have active styling (non-transparent background)
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(backgroundColor).not.toBe('transparent')
  })

  test('should show grab cursor when pan tool is active', async ({ page }) => {
    // Switch to pan tool
    await page.click('[data-testid="tool-pan"]')
    
    // Move mouse over canvas
    await page.hover('[data-testid="canvas"]', { position: { x: 300, y: 300 } })
    
    // Should show grab cursor
    await page.waitForTimeout(100)
    const cursorStyle = await page.evaluate(() => document.body.style.cursor)
    expect(cursorStyle).toBe('grab')
  })

  test('should pan viewport when dragging with pan tool active', async ({ page }) => {
    // Create a sticky note as reference point
    await page.click('[data-testid="tool-sticky"]')
    await page.click('[data-testid="canvas"]', { position: { x: 400, y: 300 } })
    
    // Switch to pan tool
    await page.click('[data-testid="tool-pan"]')
    
    // Get initial position of the sticky note
    const initialNote = page.getByTestId('sticky').first()
    const initialBox = await initialNote.boundingBox()
    
    // Drag anywhere on canvas to pan
    await page.mouse.move(200, 200)
    await page.mouse.down()
    await page.mouse.move(300, 250)
    await page.mouse.up()
    
    // Wait for the viewport to update
    await page.waitForTimeout(100)
    
    // Check that the sticky note has moved (indicating viewport panning)
    const finalBox = await initialNote.boundingBox()
    
    if (initialBox && finalBox) {
      // The note should have moved due to panning
      expect(Math.abs(finalBox.x - initialBox.x)).toBeGreaterThan(50)
      expect(Math.abs(finalBox.y - initialBox.y)).toBeGreaterThan(20)
    }
  })

  test('should show grabbing cursor during drag with pan tool', async ({ page }) => {
    // Switch to pan tool
    await page.click('[data-testid="tool-pan"]')
    
    // Start dragging anywhere on canvas
    await page.mouse.move(300, 300)
    await page.mouse.down()
    await page.mouse.move(320, 320)
    
    // Check cursor changed to grabbing during drag
    await page.waitForTimeout(50)
    const cursorStyle = await page.evaluate(() => document.body.style.cursor)
    expect(cursorStyle).toBe('grabbing')
    
    // Release mouse
    await page.mouse.up()
    
    // Cursor should return to grab (not default) for pan tool
    await page.waitForTimeout(50)
    const finalCursor = await page.evaluate(() => document.body.style.cursor)
    expect(finalCursor).toBe('grab')
  })

  test('should not create elements when pan tool is active', async ({ page }) => {
    // Switch to pan tool
    await page.click('[data-testid="tool-pan"]')
    
    // Click on canvas (should not create anything)
    await page.click('[data-testid="canvas"]', { position: { x: 400, y: 300 } })
    
    // No elements should be created
    const elements = page.getByTestId('sticky')
    await expect(elements).toHaveCount(0)
  })

  test('should not allow element interactions when pan tool is active', async ({ page }) => {
    // Create a sticky note first with sticky tool
    await page.click('[data-testid="tool-sticky"]')
    await page.click('[data-testid="canvas"]', { position: { x: 400, y: 300 } })
    
    // Switch to pan tool
    await page.click('[data-testid="tool-pan"]')
    
    // Try to click on the sticky note (should pan, not select)
    const stickyNote = page.getByTestId('sticky').first()
    const initialBox = await stickyNote.boundingBox()
    
    // Click and drag on the sticky note area (should pan the viewport)
    await page.mouse.move(400, 300)
    await page.mouse.down()
    await page.mouse.move(450, 350)
    await page.mouse.up()
    
    await page.waitForTimeout(100)
    
    // Check that panning occurred (sticky note moved on screen)
    const finalBox = await stickyNote.boundingBox()
    
    if (initialBox && finalBox) {
      // The note should have moved due to panning (not element movement)
      expect(Math.abs(finalBox.x - initialBox.x)).toBeGreaterThan(30)
      expect(Math.abs(finalBox.y - initialBox.y)).toBeGreaterThan(30)
    }
  })

  test('should switch to pan tool with H key', async ({ page }) => {
    // Start with select tool
    await page.click('[data-testid="tool-select"]')
    
    // Press H key
    await page.keyboard.press('h')
    
    // Pan tool should be active
    const panTool = page.getByTestId('tool-pan')
    const backgroundColor = await panTool.evaluate(el => getComputedStyle(el).backgroundColor)
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(backgroundColor).not.toBe('transparent')
    
    // Press H again to return to select tool
    await page.keyboard.press('h')
    
    // Select tool should be active
    const selectTool = page.getByTestId('tool-select')
    const selectBackgroundColor = await selectTool.evaluate(el => getComputedStyle(el).backgroundColor)
    expect(selectBackgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(selectBackgroundColor).not.toBe('transparent')
  })

  test('should temporarily switch to pan tool with spacebar hold', async ({ page }) => {
    // Start with sticky tool
    await page.click('[data-testid="tool-sticky"]')
    
    // Hold spacebar
    await page.keyboard.down('Space')
    await page.waitForTimeout(100)
    
    // Pan tool should be active
    const panTool = page.getByTestId('tool-pan')
    const backgroundColor = await panTool.evaluate(el => getComputedStyle(el).backgroundColor)
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(backgroundColor).not.toBe('transparent')
    
    // Release spacebar
    await page.keyboard.up('Space')
    await page.waitForTimeout(100)
    
    // Should return to sticky tool
    const stickyTool = page.getByTestId('tool-sticky')
    const stickyBackgroundColor = await stickyTool.evaluate(el => getComputedStyle(el).backgroundColor)
    expect(stickyBackgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(stickyBackgroundColor).not.toBe('transparent')
  })

  test('should pan with spacebar temporary mode', async ({ page }) => {
    // Create a sticky note as reference
    await page.click('[data-testid="tool-sticky"]')
    await page.click('[data-testid="canvas"]', { position: { x: 400, y: 300 } })
    
    // Get initial position
    const initialNote = page.getByTestId('sticky').first()
    const initialBox = await initialNote.boundingBox()
    
    // Hold spacebar and drag
    await page.keyboard.down('Space')
    await page.mouse.move(200, 200)
    await page.mouse.down()
    await page.mouse.move(300, 250)
    await page.mouse.up()
    await page.keyboard.up('Space')
    
    await page.waitForTimeout(100)
    
    // Check that panning occurred
    const finalBox = await initialNote.boundingBox()
    
    if (initialBox && finalBox) {
      expect(Math.abs(finalBox.x - initialBox.x)).toBeGreaterThan(50)
      expect(Math.abs(finalBox.y - initialBox.y)).toBeGreaterThan(20)
    }
  })

  test('should return cursor to default when switching away from pan tool', async ({ page }) => {
    // Switch to pan tool
    await page.click('[data-testid="tool-pan"]')
    
    // Move over canvas to trigger grab cursor
    await page.hover('[data-testid="canvas"]', { position: { x: 300, y: 300 } })
    await page.waitForTimeout(100)
    
    // Verify grab cursor is set
    let cursorStyle = await page.evaluate(() => document.body.style.cursor)
    expect(cursorStyle).toBe('grab')
    
    // Switch to select tool
    await page.click('[data-testid="tool-select"]')
    await page.waitForTimeout(100)
    
    // Cursor should reset to default
    cursorStyle = await page.evaluate(() => document.body.style.cursor)
    expect(['default', '']).toContain(cursorStyle)
  })
})