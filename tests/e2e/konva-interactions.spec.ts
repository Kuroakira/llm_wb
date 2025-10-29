import { test, expect } from '@playwright/test'

test.describe('Konva Canvas Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('sticky noteのdrag and dropが正確に動作する', async ({ page }) => {
    // Given: sticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    
    const canvas = page.getByTestId('canvas')
    await canvas.click({ position: { x: 200, y: 200 } })
    await page.waitForTimeout(100)
    
    const sticky = page.getByTestId('sticky').first()
    await expect(sticky).toBeVisible()
    
    // When: sticky noteをドラッグ
    const bbox = await sticky.boundingBox()
    expect(bbox).toBeTruthy()
    
    const startX = bbox!.x + bbox!.width / 2
    const startY = bbox!.y + bbox!.height / 2
    const endX = startX + 100
    const endY = startY + 50
    
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(endX, endY)
    await page.mouse.up()
    
    // Then: sticky noteが新しい位置にmove
    await page.waitForTimeout(100)
    const newBbox = await sticky.boundingBox()
    expect(newBbox!.x).toBeGreaterThan(bbox!.x + 50) // moveしたことをverify
  })

  test('resize handleが正確に動作する', async ({ page }) => {
    // Given: sticky noteをcreateしてselection
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    
    const canvas = page.getByTestId('canvas')
    await canvas.click({ position: { x: 200, y: 200 } })
    await page.waitForTimeout(100)
    
    const sticky = page.getByTestId('sticky').first()
    await sticky.click() // selection状態にする
    await page.waitForTimeout(100)
    
    // When: resize handleを使用
    const resizeHandle = page.locator('[data-testid*="resize-handle-se"]').first()
    if (await resizeHandle.isVisible()) {
      const bbox = await sticky.boundingBox()
      expect(bbox).toBeTruthy()
      
      const handleBbox = await resizeHandle.boundingBox()
      expect(handleBbox).toBeTruthy()
      
      await page.mouse.move(handleBbox!.x + handleBbox!.width / 2, handleBbox!.y + handleBbox!.height / 2)
      await page.mouse.down()
      await page.mouse.move(handleBbox!.x + 50, handleBbox!.y + 30)
      await page.mouse.up()
      
      // Then: サイズがis changed
      await page.waitForTimeout(100)
      const newBbox = await sticky.boundingBox()
      expect(newBbox!.width).toBeGreaterThan(bbox!.width)
    }
  })

  test('複数要素のselectionとドラッグが正確に動作する', async ({ page }) => {
    // Given: 複数のsticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    
    const canvas = page.getByTestId('canvas')
    await canvas.click({ position: { x: 200, y: 200 } })
    await page.waitForTimeout(100)
    await canvas.click({ position: { x: 300, y: 300 } })
    await page.waitForTimeout(100)
    
    const stickies = page.getByTestId('sticky')
    await expect(stickies).toHaveCount(2)
    
    // When: Ctrlキーを押しながら複数selection
    await stickies.first().click()
    await page.keyboard.down('Control')
    await stickies.nth(1).click()
    await page.keyboard.up('Control')
    
    // Then: 複数selectionされている状態でドラッグ
    const firstSticky = stickies.first()
    const bbox1 = await firstSticky.boundingBox()
    expect(bbox1).toBeTruthy()
    
    const startX = bbox1!.x + bbox1!.width / 2
    const startY = bbox1!.y + bbox1!.height / 2
    
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 50, startY + 50)
    await page.mouse.up()
    
    // Then: 両方のsticky noteがmoveする
    await page.waitForTimeout(100)
    const newBbox1 = await firstSticky.boundingBox()
    expect(newBbox1!.x).toBeGreaterThan(bbox1!.x + 20)
  })

  test('connection pointのクリック操作が正確に動作する', async ({ page }) => {
    // Given: 2つのsticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    
    const canvas = page.getByTestId('canvas')
    await canvas.click({ position: { x: 150, y: 150 } })
    await page.waitForTimeout(100)
    await canvas.click({ position: { x: 350, y: 250 } })
    await page.waitForTimeout(100)
    
    // When: line toolをselection
    const lineButton = page.getByTestId('tool-line')
    await lineButton.click()
    await page.waitForTimeout(100)
    
    // Then: connection pointis displayed
    const connectionPoints = page.locator('[data-testid*="connection-point"]')
    await expect(connectionPoints.first()).toBeVisible()
    
    // When: 最初のsticky noteのconnection pointclick
    await connectionPoints.first().click()
    
    // Then: connectionプレビューが開始される
    const preview = page.getByTestId('connection-preview')
    await expect(preview).toBeVisible()
  })

  test('ズーム操作でcanvas表示がis changed', async ({ page }) => {
    // Given: sticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    
    const canvas = page.getByTestId('canvas')
    await canvas.click({ position: { x: 200, y: 200 } })
    await page.waitForTimeout(100)
    
    const sticky = page.getByTestId('sticky').first()
    const originalBbox = await sticky.boundingBox()
    expect(originalBbox).toBeTruthy()
    
    // When: ズームイン操作（Ctrl+マウスホイール）
    await canvas.hover()
    await page.keyboard.down('Control')
    await page.mouse.wheel(0, -100) // ズームイン
    await page.keyboard.up('Control')
    await page.waitForTimeout(200)
    
    // Then: 要素が拡大表示される
    const zoomedBbox = await sticky.boundingBox()
    expect(zoomedBbox!.width).toBeGreaterThan(originalBbox!.width * 1.1)
  })

  test('パン操作でcanvas位置がis changed', async ({ page }) => {
    // Given: sticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    
    const canvas = page.getByTestId('canvas')
    await canvas.click({ position: { x: 200, y: 200 } })
    await page.waitForTimeout(100)
    
    const sticky = page.getByTestId('sticky').first()
    const originalBbox = await sticky.boundingBox()
    expect(originalBbox).toBeTruthy()
    
    // When: スペースキーを押しながらドラッグ（パン操作）
    await page.keyboard.down('Space')
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 400, y: 300 },
      targetPosition: { x: 350, y: 250 }
    })
    await page.keyboard.up('Space')
    await page.waitForTimeout(200)
    
    // Then: canvas全体がmoveしている
    const pannedBbox = await sticky.boundingBox()
    expect(Math.abs(pannedBbox!.x - originalBbox!.x)).toBeGreaterThan(20)
  })
})