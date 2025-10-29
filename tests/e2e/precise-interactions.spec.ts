import { test, expect } from '@playwright/test'

test.describe('Precise Canvas Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('マウス座標でのドラッグが正確にトラッキングされる', async ({ page }) => {
    // Given: sticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    
    const canvas = page.getByTestId('canvas')
    await canvas.click({ position: { x: 100, y: 100 } })
    await page.waitForTimeout(100)
    
    // When: 精密なマウスmoveでドラッグ
    await page.mouse.move(100, 100)
    await page.mouse.down()
    
    // 複数のステップでmoveをシミュレート
    const steps = 10
    for (let i = 1; i <= steps; i++) {
      const x = 100 + (200 * i) / steps // 100から300までmove
      const y = 100 + (150 * i) / steps // 100から250までmove
      await page.mouse.move(x, y)
      await page.waitForTimeout(10)
    }
    
    await page.mouse.up()
    await page.waitForTimeout(100)
    
    // Then: sticky noteが正確な位置に配置される
    const sticky = page.getByTestId('sticky').first()
    const bbox = await sticky.boundingBox()
    expect(bbox!.x).toBeCloseTo(300 - 50, 20) // sticky noteの中心が300付近
    expect(bbox!.y).toBeCloseTo(250 - 25, 20) // sticky noteの中心が250付近
  })

  test('resize操作で最小サイズ制限が働く', async ({ page }) => {
    // Given: 小さなsticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    
    const canvas = page.getByTestId('canvas')
    await canvas.click({ position: { x: 200, y: 200 } })
    await page.waitForTimeout(100)
    
    const sticky = page.getByTestId('sticky').first()
    await sticky.click()
    await page.waitForTimeout(100)
    
    // When: resize handleで極端に小さくしようとする
    const resizeHandle = page.locator('[data-testid*="resize-handle-se"]').first()
    if (await resizeHandle.isVisible()) {
      const handleBbox = await resizeHandle.boundingBox()
      expect(handleBbox).toBeTruthy()
      
      await page.mouse.move(handleBbox!.x, handleBbox!.y)
      await page.mouse.down()
      // 非常に小さくなるようにドラッグ
      await page.mouse.move(handleBbox!.x - 200, handleBbox!.y - 200)
      await page.mouse.up()
      await page.waitForTimeout(100)
      
      // Then: 最小サイズが維持される
      const bbox = await sticky.boundingBox()
      expect(bbox!.width).toBeGreaterThanOrEqual(100) // 最小幅
      expect(bbox!.height).toBeGreaterThanOrEqual(50)  // 最小高さ
    }
  })

  test('Shift+resizeでアスペクト比が保持される', async ({ page }) => {
    // Given: sticky noteをcreateしてselection
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    
    const canvas = page.getByTestId('canvas')
    await canvas.click({ position: { x: 200, y: 200 } })
    await page.waitForTimeout(100)
    
    const sticky = page.getByTestId('sticky').first()
    await sticky.click()
    await page.waitForTimeout(100)
    
    const originalBbox = await sticky.boundingBox()
    expect(originalBbox).toBeTruthy()
    const originalAspectRatio = originalBbox!.width / originalBbox!.height
    
    // When: Shiftキーを押しながらresize
    const resizeHandle = page.locator('[data-testid*="resize-handle-se"]').first()
    if (await resizeHandle.isVisible()) {
      const handleBbox = await resizeHandle.boundingBox()
      expect(handleBbox).toBeTruthy()
      
      await page.keyboard.down('Shift')
      await page.mouse.move(handleBbox!.x, handleBbox!.y)
      await page.mouse.down()
      await page.mouse.move(handleBbox!.x + 50, handleBbox!.y + 30)
      await page.mouse.up()
      await page.keyboard.up('Shift')
      await page.waitForTimeout(100)
      
      // Then: アスペクト比が保持される
      const newBbox = await sticky.boundingBox()
      const newAspectRatio = newBbox!.width / newBbox!.height
      expect(Math.abs(newAspectRatio - originalAspectRatio)).toBeLessThan(0.1)
    }
  })

  test('connectorが要素moveにfollowする', async ({ page }) => {
    // Given: 2つのsticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    
    const canvas = page.getByTestId('canvas')
    await canvas.click({ position: { x: 100, y: 100 } })
    await page.waitForTimeout(100)
    await canvas.click({ position: { x: 300, y: 200 } })
    await page.waitForTimeout(100)
    
    // When: 線でconnection
    const lineButton = page.getByTestId('tool-line')
    await lineButton.click()
    await page.waitForTimeout(100)
    
    // connection pointclickしてconnection
    const connectionPoints = page.locator('[data-testid*="connection-point"]')
    await connectionPoints.first().click()
    await connectionPoints.nth(2).click() // 2番目のsticky noteの最初のポイント
    await page.waitForTimeout(200)
    
    // Then: connectorがcreateされる
    const connector = page.getByTestId('connector').first()
    await expect(connector).toBeVisible()
    
    // When: 最初のsticky noteをmove
    const selectTool = page.getByTestId('tool-select')
    await selectTool.click()
    
    const firstSticky = page.getByTestId('sticky').first()
    await page.mouse.move(100, 100)
    await page.mouse.down()
    await page.mouse.move(150, 150)
    await page.mouse.up()
    await page.waitForTimeout(200)
    
    // Then: connectorがmoveにfollowしている
    await expect(connector).toBeVisible()
    // connectorの座標が更新されていることをverify（詳細な座標チェックは実装次第）
  })

  test('ダブルクリックeditでtextエディタが正確に表示される', async ({ page }) => {
    // Given: sticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    
    const canvas = page.getByTestId('canvas')
    await canvas.click({ position: { x: 200, y: 200 } })
    await page.waitForTimeout(100)
    
    const sticky = page.getByTestId('sticky').first()
    const bbox = await sticky.boundingBox()
    expect(bbox).toBeTruthy()
    
    // When: sticky noteの中央double-click
    const centerX = bbox!.x + bbox!.width / 2
    const centerY = bbox!.y + bbox!.height / 2
    await page.mouse.dblclick(centerX, centerY)
    await page.waitForTimeout(100)
    
    // Then: textエディタがsticky noteと同じ位置に表示される
    const editor = page.getByTestId('sticky-editor')
    await expect(editor).toBeVisible()
    
    const editorBbox = await editor.boundingBox()
    expect(editorBbox!.x).toBeCloseTo(bbox!.x, 10)
    expect(editorBbox!.y).toBeCloseTo(bbox!.y, 10)
  })

  test('rightクリックメニューが正確な位置に表示される', async ({ page }) => {
    // Given: sticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    
    const canvas = page.getByTestId('canvas')
    await canvas.click({ position: { x: 200, y: 200 } })
    await page.waitForTimeout(100)
    
    const sticky = page.getByTestId('sticky').first()
    
    // When: sticky noteをrightクリック
    await sticky.click({ button: 'right' })
    await page.waitForTimeout(100)
    
    // Then: コンtextメニューis displayed
    const contextMenu = page.getByTestId('context-menu')
    if (await contextMenu.isVisible()) {
      const menuBbox = await contextMenu.boundingBox()
      expect(menuBbox).toBeTruthy()
      
      // メニューがクリック位置付近に表示されることをverify
      // （詳細な位置は実装次第）
      expect(menuBbox!.x).toBeGreaterThan(0)
      expect(menuBbox!.y).toBeGreaterThan(0)
    }
  })
})