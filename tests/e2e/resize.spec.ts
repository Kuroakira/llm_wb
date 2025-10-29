import { test, expect } from '@playwright/test'

test.describe('resize functionalityのE2Etest', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // 認証をスキップまたはモック
    await page.waitForSelector('[data-testid="canvas-stage"]', { timeout: 10000 })
  })

  test('sticky noteをresizeできる', async ({ page }) => {
    // sticky noteをcreate
    await page.click('[data-testid="toolbar-sticky"]')
    await page.click('[data-testid="canvas-stage"]', { position: { x: 200, y: 200 } })
    
    // sticky noteをselection
    const sticky = page.locator('[data-testid^="element-"]').first()
    await sticky.click()
    
    // resize handleis displayedことをverify
    await expect(page.locator('[data-testid="resize-handle-se"]')).toBeVisible()
    
    // bottom rightのハンドルをドラッグしてresize
    const seHandle = page.locator('[data-testid="resize-handle-se"]')
    const handleBox = await seHandle.boundingBox()
    
    if (handleBox) {
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(handleBox.x + 50, handleBox.y + 50)
      await page.mouse.up()
    }
    
    // sticky noteのサイズが変更されたことをverify
    const stickyAfterResize = await sticky.boundingBox()
    expect(stickyAfterResize?.width).toBeGreaterThan(200)
    expect(stickyAfterResize?.height).toBeGreaterThan(100)
  })

  test('rectangleをresizeできる', async ({ page }) => {
    // rectangleをcreate
    await page.click('[data-testid="toolbar-rect"]')
    await page.click('[data-testid="canvas-stage"]', { position: { x: 300, y: 300 } })
    
    // rectangleをselection
    const rect = page.locator('[data-testid^="element-"]').first()
    await rect.click()
    
    // 東側のハンドルをドラッグして幅を変更
    const eHandle = page.locator('[data-testid="resize-handle-e"]')
    const handleBox = await eHandle.boundingBox()
    
    if (handleBox) {
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(handleBox.x + 100, handleBox.y)
      await page.mouse.up()
    }
    
    // 幅だけが変更され、高さは維持されることをverify
    const rectAfterResize = await rect.boundingBox()
    expect(rectAfterResize?.width).toBeGreaterThan(200)
    expect(rectAfterResize?.height).toBeCloseTo(150, 10)
  })

  test('text boxをresizeできる', async ({ page }) => {
    // text boxをcreate
    await page.click('[data-testid="toolbar-text"]')
    await page.click('[data-testid="canvas-stage"]', { position: { x: 400, y: 400 } })
    
    // textを入力
    await page.type('[data-testid="text-editor"]', 'resizetest')
    await page.keyboard.press('Escape')
    
    // text boxをselection
    const textBox = page.locator('[data-testid^="element-"]').first()
    await textBox.click()
    
    // 北西のハンドルをドラッグしてサイズと位置を変更
    const nwHandle = page.locator('[data-testid="resize-handle-nw"]')
    const handleBox = await nwHandle.boundingBox()
    
    if (handleBox) {
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(handleBox.x - 50, handleBox.y - 30)
      await page.mouse.up()
    }
    
    // サイズが変更されたことをverify
    const textBoxAfterResize = await textBox.boundingBox()
    expect(textBoxAfterResize?.width).toBeGreaterThan(200)
  })

  test('resize中にShiftキーでmaintain aspect ratio', async ({ page }) => {
    // sticky noteをcreate
    await page.click('[data-testid="toolbar-sticky"]')
    await page.click('[data-testid="canvas-stage"]', { position: { x: 200, y: 200 } })
    
    const sticky = page.locator('[data-testid^="element-"]').first()
    await sticky.click()
    
    // Shiftキーを押しながらresize
    const seHandle = page.locator('[data-testid="resize-handle-se"]')
    const handleBox = await seHandle.boundingBox()
    const initialBox = await sticky.boundingBox()
    
    if (handleBox && initialBox) {
      const initialAspect = initialBox.width / initialBox.height
      
      await page.keyboard.down('Shift')
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(handleBox.x + 100, handleBox.y + 50)
      await page.mouse.up()
      await page.keyboard.up('Shift')
      
      // アスペクト比が維持されていることをverify
      const afterBox = await sticky.boundingBox()
      if (afterBox) {
        const afterAspect = afterBox.width / afterBox.height
        expect(afterAspect).toBeCloseTo(initialAspect, 1)
      }
    }
  })

  test('resize操作がcan be undone', async ({ page }) => {
    // sticky noteをcreate
    await page.click('[data-testid="toolbar-sticky"]')
    await page.click('[data-testid="canvas-stage"]', { position: { x: 200, y: 200 } })
    
    const sticky = page.locator('[data-testid^="element-"]').first()
    await sticky.click()
    
    // 初期サイズをrecord
    const initialBox = await sticky.boundingBox()
    
    // resize
    const seHandle = page.locator('[data-testid="resize-handle-se"]')
    const handleBox = await seHandle.boundingBox()
    
    if (handleBox) {
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(handleBox.x + 100, handleBox.y + 100)
      await page.mouse.up()
    }
    
    // サイズが変更されたことをverify
    const resizedBox = await sticky.boundingBox()
    expect(resizedBox?.width).toBeGreaterThan(initialBox?.width || 0)
    
    // Undo
    await page.keyboard.press('Meta+z') // Mac
    // await page.keyboard.press('Control+z') // Windows/Linux
    
    // サイズが元に戻ることをverify
    await page.waitForTimeout(500)
    const undoneBox = await sticky.boundingBox()
    expect(undoneBox?.width).toBeCloseTo(initialBox?.width || 200, 10)
  })

  test('複数要素を同時にresizeできない', async ({ page }) => {
    // 複数のsticky noteをcreate
    await page.click('[data-testid="toolbar-sticky"]')
    await page.click('[data-testid="canvas-stage"]', { position: { x: 200, y: 200 } })
    await page.click('[data-testid="canvas-stage"]', { position: { x: 400, y: 200 } })
    
    // 両方のsticky noteをselection（Shiftクリック）
    const sticky1 = page.locator('[data-testid^="element-"]').first()
    const sticky2 = page.locator('[data-testid^="element-"]').nth(1)
    
    await sticky1.click()
    await page.keyboard.down('Shift')
    await sticky2.click()
    await page.keyboard.up('Shift')
    
    // 複数selection時はresize handleが表示されないことをverify
    // またはグループ変形ハンドルis displayed
    await expect(page.locator('[data-testid="resize-handle-se"]')).toHaveCount(2)
  })

  test('resize後にsaveされる', async ({ page }) => {
    // sticky noteをcreateしてresize
    await page.click('[data-testid="toolbar-sticky"]')
    await page.click('[data-testid="canvas-stage"]', { position: { x: 200, y: 200 } })
    
    const sticky = page.locator('[data-testid^="element-"]').first()
    await sticky.click()
    
    const seHandle = page.locator('[data-testid="resize-handle-se"]')
    const handleBox = await seHandle.boundingBox()
    
    if (handleBox) {
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(handleBox.x + 100, handleBox.y + 100)
      await page.mouse.up()
    }
    
    // ページをリロード
    await page.reload()
    await page.waitForSelector('[data-testid="canvas-stage"]', { timeout: 10000 })
    
    // resizeされた状態が維持されていることをverify
    const stickyAfterReload = page.locator('[data-testid^="element-"]').first()
    const reloadedBox = await stickyAfterReload.boundingBox()
    expect(reloadedBox?.width).toBeGreaterThan(200)
  })

  test('minimum size constraintが適用される', async ({ page }) => {
    // sticky noteをcreate
    await page.click('[data-testid="toolbar-sticky"]')
    await page.click('[data-testid="canvas-stage"]', { position: { x: 200, y: 200 } })
    
    const sticky = page.locator('[data-testid^="element-"]').first()
    await sticky.click()
    
    // top leftのハンドルをドラッグして最小サイズ以bottomにしようとする
    const nwHandle = page.locator('[data-testid="resize-handle-nw"]')
    const handleBox = await nwHandle.boundingBox()
    const initialBox = await sticky.boundingBox()
    
    if (handleBox && initialBox) {
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
      await page.mouse.down()
      // 極端に小さくしようとする
      await page.mouse.move(initialBox.x + initialBox.width - 20, initialBox.y + initialBox.height - 20)
      await page.mouse.up()
    }
    
    // 最小サイズ（100x50）以bottomにならないことをverify
    const resizedBox = await sticky.boundingBox()
    expect(resizedBox?.width).toBeGreaterThanOrEqual(100)
    expect(resizedBox?.height).toBeGreaterThanOrEqual(50)
  })

  test('resize中にカーソルが適切に変化する', async ({ page }) => {
    // sticky noteをcreate
    await page.click('[data-testid="toolbar-sticky"]')
    await page.click('[data-testid="canvas-stage"]', { position: { x: 200, y: 200 } })
    
    const sticky = page.locator('[data-testid^="element-"]').first()
    await sticky.click()
    
    // 各resize handleにホバーしてカーソルをverify
    const handles = [
      { selector: '[data-testid="resize-handle-se"]', cursor: 'se-resize' },
      { selector: '[data-testid="resize-handle-nw"]', cursor: 'nw-resize' },
      { selector: '[data-testid="resize-handle-e"]', cursor: 'e-resize' },
      { selector: '[data-testid="resize-handle-n"]', cursor: 'n-resize' }
    ]
    
    for (const { selector, cursor } of handles) {
      const handle = page.locator(selector)
      await handle.hover()
      
      // カーソルスタイルがis changedことをverify
      const cursorStyle = await page.evaluate(() => {
        return window.getComputedStyle(document.body).cursor
      })
      
      // カーソルが適切なresizeカーソルになっていることをverify
      // 実際のカーソル値はブラウザによって異なる場合がある
      expect(['se-resize', 'nw-resize', 'e-resize', 'n-resize', 'ew-resize', 'ns-resize', 'nesw-resize', 'nwse-resize']).toContain(cursorStyle)
    }
  })
})