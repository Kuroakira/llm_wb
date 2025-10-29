import { test, expect } from '@playwright/test'

// Set up authentication bypass for all test cases
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('e2e_bypass_auth', 'true')
  })
  await page.reload()
})

test('toolbar and canvas are displayed', async ({ page }) => {
  // Then: Toolbar is displayed (bottom of the screen)
  await expect(page.getByTestId('toolbar')).toBeVisible()

  // And: Canvas is displayed
  await expect(page.getByTestId('canvas')).toBeVisible()

  // And: Sticky note tool button exists
  const stickyButton = page.getByTestId('tool-sticky')
  await expect(stickyButton).toBeVisible()
})

test('creating and editing a sticky note', async ({ page }) => {
  // Listen to console logs
  page.on('console', msg => console.log('PAGE LOG:', msg.text()))

  // When: Click sticky note tool
  const stickyButton = page.getByTestId('tool-sticky')
  await stickyButton.click()

  // And: Click on canvas
  await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })

  // Wait a bit for the sticky to be created
  await page.waitForTimeout(100)

  // Then: Sticky note is created
  const sticky = page.getByTestId('sticky').first()
  await expect(sticky).toBeVisible()

  // When: Double-click the sticky note
  await sticky.dblclick()

  // Then: Enter edit mode
  const editor = page.getByTestId('sticky-editor')
  await expect(editor).toBeVisible()

  // When: Enter text (including line breaks)
  await editor.fill('First memo\nSecond line\nThird line')
  await page.keyboard.press('Control+Enter')

  // Wait for the edit to complete
  await page.waitForTimeout(100)

  // Then: Text is saved (with line breaks)
  await expect(sticky).toContainText('First memo')
  await expect(sticky).toContainText('Second line')
  await expect(sticky).toContainText('Third line')
})

test('sticky note drag and drop', async ({ page }) => {

  // When: Click sticky note tool
  const stickyButton = page.getByTestId('tool-sticky')
  await stickyButton.click()

  // And: Click on canvas to create sticky note
  await page.getByTestId('canvas').click({ position: { x: 100, y: 100 } })

  // Wait a bit for the sticky to be created
  await page.waitForTimeout(100)

  // Then: Sticky note is created
  const sticky = page.getByTestId('sticky').first()
  await expect(sticky).toBeVisible()

  // Record initial position
  const initialBox = await sticky.boundingBox()

  // When: Drag sticky note a sufficient distance (exceeding 10px threshold)
  await sticky.hover()
  await page.mouse.down()
  await page.mouse.move(300, 200) // Large movement distance to ensure threshold is exceeded
  await page.mouse.up()

  // Wait for drag to complete
  await page.waitForTimeout(200)

  // Then: Sticky note position has changed
  const finalBox = await sticky.boundingBox()
  expect(finalBox?.x).toBeGreaterThan(initialBox!.x + 50) // Moved sufficiently to the right
  expect(finalBox?.y).toBeGreaterThan(initialBox!.y + 50) // Moved sufficiently down
})

test('creating and editing a rectangle', async ({ page }) => {
  // When: Click rectangle tool
  const rectButton = page.getByTestId('tool-rect')
  await rectButton.click()

  // And: Click on canvas
  await page.getByTestId('canvas').click({ position: { x: 150, y: 150 } })

  // Wait a bit for the rect to be created
  await page.waitForTimeout(100)

  // Then: Rectangle is created
  const rect = page.getByTestId('rect').first()
  await expect(rect).toBeVisible()

  // And: Rectangle has correct style
  await expect(rect).toHaveCSS('background-color', 'rgb(227, 242, 253)') // #E3F2FD
})

test('creating and editing text', async ({ page }) => {
  // Given: Access homepage
  await page.goto('/')

  // When: Click text tool
  const textButton = page.getByTestId('tool-text')
  await textButton.click()

  // And: Click on canvas
  await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })

  // Wait a bit for the text to be created
  await page.waitForTimeout(100)

  // Then: Text box is created
  const textbox = page.getByTestId('textbox').first()
  await expect(textbox).toBeVisible()

  // And: Placeholder text is displayed
  await expect(textbox).toContainText('Enter text...')

  // When: Double-click text box
  await textbox.dblclick()

  // Then: Enter edit mode
  const editor = page.getByTestId('sticky-editor')
  await expect(editor).toBeVisible()

  // When: Enter text
  await editor.fill('Sample text\nSecond line text')
  await page.keyboard.press('Control+Enter')

  // Wait for the edit to complete
  await page.waitForTimeout(100)

  // Then: Text is saved
  await expect(textbox).toContainText('Sample text')
  await expect(textbox).toContainText('Second line text')
})

test('sticky note同士のconnection', async ({ page }) => {
  // Given: access homepage
  await page.goto('/')
  
  // When: sticky noteツールclick
  const stickyButton = page.getByTestId('tool-sticky')
  await stickyButton.click()
  
  // And: 2つのsticky noteをcreate
  await page.getByTestId('canvas').click({ position: { x: 100, y: 100 } })
  await page.waitForTimeout(100)
  await page.getByTestId('canvas').click({ position: { x: 300, y: 200 } })
  await page.waitForTimeout(100)
  
  // Then: 2つのsticky noteがcreateされる
  const stickies = page.getByTestId('sticky')
  await expect(stickies).toHaveCount(2)
  
  // When: 最初のsticky noteをselectionしてanchor pointを表示
  const firstSticky = stickies.first()
  await firstSticky.click()
  await page.waitForTimeout(100)
  
  // And: right側のanchor pointclick（connection開始）
  const rightAnchor = page.getByTestId('anchor-right').first()
  await expect(rightAnchor).toBeVisible()
  await rightAnchor.click()
  
  // And: 2番目のsticky noteをselection
  const secondSticky = stickies.nth(1)
  await secondSticky.click()
  await page.waitForTimeout(100)
  
  // And: left側のanchor pointclick（connectioncomplete）
  const leftAnchor = page.getByTestId('anchor-left').nth(1)
  await expect(leftAnchor).toBeVisible()
  await leftAnchor.click()
  
  // Then: connectorがcreateされる
  const connector = page.getByTestId('connector')
  await expect(connector).toBeVisible()
})

test('connectorが要素のmoveにfollowする', async ({ page }) => {
  // Given: 2つのsticky noteがconnectionされている状態
  await page.goto('/')
  
  // sticky noteをcreate
  const stickyButton = page.getByTestId('tool-sticky')
  await stickyButton.click()
  await page.getByTestId('canvas').click({ position: { x: 100, y: 100 } })
  await page.waitForTimeout(100)
  await page.getByTestId('canvas').click({ position: { x: 300, y: 100 } })
  await page.waitForTimeout(100)
  
  // connectionをcreate
  const stickies = page.getByTestId('sticky')
  
  // 最初のsticky noteをselectionしてanchor pointからconnection開始
  await stickies.first().click()
  await page.waitForTimeout(100)
  const rightAnchor = page.getByTestId('anchor-right').first()
  await expect(rightAnchor).toBeVisible()
  await rightAnchor.click()
  
  // 2番目のsticky noteをselectionしてanchor pointでconnectioncomplete
  await stickies.nth(1).click()
  await page.waitForTimeout(100)
  const leftAnchor = page.getByTestId('anchor-left').nth(1)
  await expect(leftAnchor).toBeVisible()
  await leftAnchor.click()
  
  // connectorがexistsことをverify
  const connector = page.getByTestId('connector')
  await expect(connector).toBeVisible()
  
  // When: 最初のsticky noteをsufficient distancemove（手動ドラッグでexceed threshold）
  const firstSticky = stickies.first()
  await firstSticky.hover()
  await page.mouse.down()
  await page.mouse.move(150, 200) // 十分なmove距離
  await page.mouse.up()
  await page.waitForTimeout(200)
  
  // Then: connectorがfollowしている（まだ表示されている）
  await expect(connector).toBeVisible()
})

test('キーボードでの要素delete', async ({ page }) => {
  // Given: sticky noteとrectangleをcreate
  await page.goto('/')
  
  // sticky noteをcreate
  const stickyButton = page.getByTestId('tool-sticky')
  await stickyButton.click()
  await page.getByTestId('canvas').click({ position: { x: 200, y: 100 } })
  await page.waitForTimeout(100)
  
  // rectangleをcreate
  const rectButton = page.getByTestId('tool-rect')
  await rectButton.click()
  await page.getByTestId('canvas').click({ position: { x: 200, y: 250 } })
  await page.waitForTimeout(100)
  
  // Then: 要素がcreateされている
  const stickies = page.getByTestId('sticky')
  await expect(stickies).toHaveCount(1)
  const rects = page.getByTestId('rect')
  await expect(rects).toHaveCount(1)
  
  // When: sticky noteをselectionしてDeleteキーを押す
  await stickies.first().click()
  await page.keyboard.press('Delete')
  
  // Then: sticky noteがdeleteされる
  await expect(stickies).toHaveCount(0)
  await expect(rects).toHaveCount(1) // rectangleはremains
  
  // When: rectangleをselectionしてBackspaceキーを押す
  await rects.first().click()
  await page.keyboard.press('Backspace')
  
  // Then: rectangleもdeleteされる
  await expect(rects).toHaveCount(0)
})

test('connectorのキーボードdelete', async ({ page }) => {
  // Given: connectionされた2つのsticky note
  await page.goto('/')
  
  // sticky noteをcreate
  const stickyButton = page.getByTestId('tool-sticky')
  await stickyButton.click()
  await page.getByTestId('canvas').click({ position: { x: 100, y: 100 } })
  await page.waitForTimeout(100)
  await page.getByTestId('canvas').click({ position: { x: 300, y: 100 } })
  await page.waitForTimeout(100)
  
  // connectionをcreate
  const stickies = page.getByTestId('sticky')
  await stickies.first().click()
  await page.waitForTimeout(100)
  const rightAnchor = page.getByTestId('anchor-right').first()
  await expect(rightAnchor).toBeVisible()
  await rightAnchor.click()
  
  await stickies.nth(1).click()
  await page.waitForTimeout(100)
  const leftAnchor = page.getByTestId('anchor-left').nth(1)
  await expect(leftAnchor).toBeVisible()
  await leftAnchor.click()
  
  // connectorがcreateされている
  const connector = page.getByTestId('connector')
  await expect(connector).toBeVisible()
  
  // When: connectorをselectionしてDeleteキーを押す
  await connector.click()
  await page.keyboard.press('Delete')
  
  // Then: connectorがdeleteされる
  await expect(connector).not.toBeVisible()
  await expect(stickies).toHaveCount(2) // sticky noteはremains
})

test('要素delete時に関連connectorもdeleteされる', async ({ page }) => {
  // Given: connectionされた2つのsticky note
  await page.goto('/')
  
  // sticky noteをcreate
  const stickyButton = page.getByTestId('tool-sticky')
  await stickyButton.click()
  await page.getByTestId('canvas').click({ position: { x: 100, y: 100 } })
  await page.waitForTimeout(100)
  await page.getByTestId('canvas').click({ position: { x: 300, y: 100 } })
  await page.waitForTimeout(100)
  
  // connectionをcreate
  const stickies = page.getByTestId('sticky')
  await stickies.first().click()
  await page.waitForTimeout(100)
  const rightAnchor = page.getByTestId('anchor-right').first()
  await expect(rightAnchor).toBeVisible()
  await rightAnchor.click()
  
  await stickies.nth(1).click()
  await page.waitForTimeout(100)
  const leftAnchor = page.getByTestId('anchor-left').nth(1)
  await expect(leftAnchor).toBeVisible()
  await leftAnchor.click()
  
  // connectorがcreateされている
  const connector = page.getByTestId('connector')
  await expect(connector).toBeVisible()
  
  // When: sticky noteをselectionしてDeleteキーを押す（connectorのconnection元）
  await stickies.first().click()
  await page.keyboard.press('Delete')
  
  // Then: sticky noteとconnectorの両方がdeleteされる
  await expect(stickies).toHaveCount(1) // 1つのsticky noteがremains
  await expect(connector).not.toBeVisible() // connectorはdeleteされる
})

test('要素のresize（bottom right角ハンドル）', async ({ page }) => {
  // Given: sticky noteをcreate
  await page.goto('/')
  
  const stickyButton = page.getByTestId('tool-sticky')
  await stickyButton.click()
  await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
  await page.waitForTimeout(100)
  
  // sticky noteをselectionしてresize handleを表示
  const sticky = page.getByTestId('sticky').first()
  await sticky.click()
  await page.waitForTimeout(100)
  
  // Then: resize handleis displayed
  const resizeHandle = page.getByTestId('resize-handle-se')
  await expect(resizeHandle).toBeVisible()
  
  // 初期サイズをrecord
  const initialBox = await sticky.boundingBox()
  
  // When: bottom right角ハンドルをbottom rightに40px, 30pxドラッグ
  await resizeHandle.hover()
  await page.mouse.down()
  await page.mouse.move(
    (initialBox!.x + initialBox!.width) + 40, 
    (initialBox!.y + initialBox!.height) + 30
  )
  await page.mouse.up()
  await page.waitForTimeout(200)
  
  // Then: sticky noteのサイズが拡大される
  const finalBox = await sticky.boundingBox()
  expect(finalBox!.width).toBeGreaterThan(initialBox!.width + 30) // 十分に拡大されている
  expect(finalBox!.height).toBeGreaterThan(initialBox!.height + 20)
})

test('要素のresize（top left角ハンドル）', async ({ page }) => {
  // Given: rectangleをcreate
  await page.goto('/')
  
  const rectButton = page.getByTestId('tool-rect')
  await rectButton.click()
  await page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
  await page.waitForTimeout(100)
  
  // rectangleをselectionしてresize handleを表示
  const rect = page.getByTestId('rect').first()
  await rect.click()
  await page.waitForTimeout(100)
  
  // Then: resize handleis displayed
  const resizeHandle = page.getByTestId('resize-handle-nw')
  await expect(resizeHandle).toBeVisible()
  
  // 初期位置とサイズをrecord
  const initialBox = await rect.boundingBox()
  
  // When: top left角ハンドルをbottom rightに20px, 15pxドラッグ（縮小）
  await resizeHandle.hover()
  await page.mouse.down()
  await page.mouse.move(
    initialBox!.x + 20, 
    initialBox!.y + 15
  )
  await page.mouse.up()
  await page.waitForTimeout(200)
  
  // Then: rectangleのサイズが縮小され、位置がmoveする
  const finalBox = await rect.boundingBox()
  expect(finalBox!.width).toBeLessThan(initialBox!.width - 10) // 縮小されている
  expect(finalBox!.height).toBeLessThan(initialBox!.height - 10)
  expect(finalBox!.x).toBeGreaterThan(initialBox!.x + 10) // rightにmove
  expect(finalBox!.y).toBeGreaterThan(initialBox!.y + 10) // bottomにmove
})

test('resize方向の逆転', async ({ page }) => {
  // Given: textをcreate
  await page.goto('/')
  
  const textButton = page.getByTestId('tool-text')
  await textButton.click()
  await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
  await page.waitForTimeout(100)
  
  // text boxをselection
  const textbox = page.getByTestId('textbox').first()
  await textbox.click()
  await page.waitForTimeout(100)
  
  // right辺のresize handleを取得
  const resizeHandle = page.getByTestId('resize-handle-e')
  await expect(resizeHandle).toBeVisible()
  
  // 初期サイズをrecord
  const initialBox = await textbox.boundingBox()
  
  // When: right辺をleftに30px縮小
  await resizeHandle.hover()
  await page.mouse.down()
  await page.mouse.move((initialBox!.x + initialBox!.width) - 30, initialBox!.y + initialBox!.height / 2)
  await page.waitForTimeout(100)
  
  // Then: 逆方向に20px拡大
  await page.mouse.move((initialBox!.x + initialBox!.width) - 10, initialBox!.y + initialBox!.height / 2)
  await page.mouse.up()
  await page.waitForTimeout(200)
  
  // Then: 最終的なサイズが期待通り（初期幅 - 10px）
  const finalBox = await textbox.boundingBox()
  expect(finalBox!.width).toBeLessThan(initialBox!.width - 5) // 最終的に縮小されている
  expect(finalBox!.width).toBeGreaterThan(initialBox!.width - 15) // しかし-30pxほどは縮小されていない
})

test('辺からのresize', async ({ page }) => {
  // Given: sticky noteをcreate
  await page.goto('/')
  
  const stickyButton = page.getByTestId('tool-sticky')
  await stickyButton.click()
  await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
  await page.waitForTimeout(100)
  
  // sticky noteをselection
  const sticky = page.getByTestId('sticky').first()
  await sticky.click()
  await page.waitForTimeout(100)
  
  // 初期サイズをrecord
  const initialBox = await sticky.boundingBox()
  
  // When: right辺をドラッグしてresize（EdgeInteraction使用）
  const rightEdge = {
    x: initialBox!.x + initialBox!.width,
    y: initialBox!.y + initialBox!.height / 2
  }
  
  await page.mouse.move(rightEdge.x, rightEdge.y)
  await page.mouse.down()
  await page.mouse.move(rightEdge.x + 50, rightEdge.y) // rightに50px拡大
  await page.mouse.up()
  await page.waitForTimeout(200)
  
  // Then: 幅だけが拡大される（高さは変わらない）
  const finalBox = await sticky.boundingBox()
  expect(finalBox!.width).toBeGreaterThan(initialBox!.width + 40) // 幅が拡大
  expect(Math.abs(finalBox!.height - initialBox!.height)).toBeLessThan(5) // 高さはほぼ同じ
  expect(Math.abs(finalBox!.x - initialBox!.x)).toBeLessThan(5) // 位置は変わらない
  expect(Math.abs(finalBox!.y - initialBox!.y)).toBeLessThan(5)
})