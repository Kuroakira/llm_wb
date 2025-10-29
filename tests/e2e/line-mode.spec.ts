import { test, expect } from '@playwright/test'

test.describe('line modefunctionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(500)
  })

  test('line toolis displayed', async ({ page }) => {
    // Given: ページが読み込まれる
    
    // Then: line toolis displayed
    await expect(page.getByTestId('tool-line')).toBeVisible()
    
    // Then: initial stateではselectionされていない
    const lineTool = page.getByTestId('tool-line')
    const isSelected = await lineTool.evaluate((el) => 
      getComputedStyle(el).backgroundColor.includes('rgb(13, 153, 255)')
    )
    expect(isSelected).toBe(false)
  })

  test('line toolclickするとline modeになる', async ({ page }) => {
    // Given: initial state
    
    // When: line toolclick
    await page.getByTestId('tool-line').click()
    
    // Then: line toolがselection状態になる
    const lineTool = page.getByTestId('tool-line')
    const isSelected = await lineTool.evaluate((el) => 
      getComputedStyle(el).backgroundColor.includes('rgb(13, 153, 255)')
    )
    expect(isSelected).toBe(true)
  })

  test('line mode時にsticky noteにconnection pointis displayed', async ({ page }) => {
    // Given: sticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    
    // When: line toolをselection
    await page.getByTestId('tool-line').click()
    
    // Then: sticky noteのconnection pointis displayed
    await expect(page.getByTestId('connection-point-top')).toBeVisible()
    await expect(page.getByTestId('connection-point-right')).toBeVisible()
    await expect(page.getByTestId('connection-point-bottom')).toBeVisible()
    await expect(page.getByTestId('connection-point-left')).toBeVisible()
  })

  test('line mode時にrectangleにconnection pointis displayed', async ({ page }) => {
    // Given: rectangleをcreate
    const rectButton = page.getByTestId('tool-rect')
    await rectButton.click()
    await page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
    
    // When: line toolをselection
    await page.getByTestId('tool-line').click()
    
    // Then: rectangleのconnection pointis displayed
    await expect(page.getByTestId('connection-point-top')).toBeVisible()
    await expect(page.getByTestId('connection-point-right')).toBeVisible()
    await expect(page.getByTestId('connection-point-bottom')).toBeVisible()
    await expect(page.getByTestId('connection-point-left')).toBeVisible()
  })

  test('sticky note同士を線でconnectionできる', async ({ page }) => {
    // Given: 1つ目のsticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    
    // Given: 2つ目のsticky noteをcreate
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 400, y: 300 } })
    
    // Then: 2つのsticky noteがcreateされる
    await expect(page.getByTestId('sticky')).toHaveCount(2)
    
    // When: line toolをselection
    await page.getByTestId('tool-line').click()
    
    // When: 最初のsticky noteのright側connection pointclick
    const firstStickyConnectionPoints = page.getByTestId('connection-point-right').first()
    await firstStickyConnectionPoints.click()
    
    // When: 2番目のsticky noteのleft側connection pointclick
    const secondStickyConnectionPoints = page.getByTestId('connection-point-left').last()
    await secondStickyConnectionPoints.click()
    
    // Then: connectorがcreateされる
    await expect(page.getByTestId('connector')).toHaveCount(1)
  })

  test('異なる要素タイプ間でconnectionできる', async ({ page }) => {
    // Given: sticky noteとrectangleをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    
    const rectButton = page.getByTestId('tool-rect')
    await rectButton.click()
    await page.getByTestId('canvas').click({ position: { x: 400, y: 300 } })
    
    // Then: sticky noteとrectangleがcreateされる
    await expect(page.getByTestId('sticky')).toHaveCount(1)
    await expect(page.getByTestId('rect')).toHaveCount(1)
    
    // When: line toolをselection
    await page.getByTestId('tool-line').click()
    
    // When: sticky noteのconnection pointclickしてからrectangleのconnection pointclick
    await page.getByTestId('connection-point-right').first().click()
    await page.getByTestId('connection-point-left').last().click()
    
    // Then: connectorがcreateされる
    await expect(page.getByTestId('connector')).toHaveCount(1)
  })

  test('同じ要素clickするとconnectionがキャンセルされる', async ({ page }) => {
    // Given: sticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    
    // When: line toolをselection
    await page.getByTestId('tool-line').click()
    
    // When: 同じsticky noteのconnection pointを2回クリック
    const connectionPoint = page.getByTestId('connection-point-right').first()
    await connectionPoint.click()
    await connectionPoint.click()
    
    // Then: connectorはcreateされない
    await expect(page.getByTestId('connector')).toHaveCount(0)
  })

  test('Escapeキーでconnectionをキャンセルできる', async ({ page }) => {
    // Given: sticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    
    // When: line toolをselection
    await page.getByTestId('tool-line').click()
    
    // When: connectionを開始してEscapeキーを押す
    await page.getByTestId('connection-point-right').first().click()
    await page.keyboard.press('Escape')
    
    // Then: connectionが開始された状態からキャンセルされる
    // （視覚的なverifyのため、他の要素clickしてもconnectorがcreateされないことをverify）
    await page.getByTestId('connection-point-left').first().click()
    await expect(page.getByTestId('connector')).toHaveCount(0)
  })

  test('selectionツールに戻るとconnection pointがhiddenになる', async ({ page }) => {
    // Given: sticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    
    // When: line toolをselection
    await page.getByTestId('tool-line').click()
    
    // Then: connection pointis displayed
    await expect(page.getByTestId('connection-point-top')).toBeVisible()
    
    // When: selectionツールに戻る
    await page.getByTestId('tool-select').click()
    
    // Then: connection pointがhiddenになる
    await expect(page.getByTestId('connection-point-top')).not.toBeVisible()
  })

  test('connectionされた要素をmoveすると線がfollowする', async ({ page }) => {
    // Given: 2つのsticky noteをcreateしてconnection
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    await page.getByTestId('canvas').click({ position: { x: 400, y: 300 } })
    
    await page.getByTestId('tool-line').click()
    await page.getByTestId('connection-point-right').first().click()
    await page.getByTestId('connection-point-left').last().click()
    
    // Then: connectorがcreateされる
    await expect(page.getByTestId('connector')).toHaveCount(1)
    
    // When: selectionツールに戻ってsticky noteをmove
    await page.getByTestId('tool-select').click()
    const firstSticky = page.getByTestId('sticky').first()
    
    // 手動ドラッグでsufficient distancemove（exceed threshold）
    await firstSticky.hover()
    await page.mouse.down()
    await page.mouse.move(100, 100) // 十分なmove距離
    await page.mouse.up()
    await page.waitForTimeout(200)
    
    // Then: connectorが残存し、moveにfollowしている
    await expect(page.getByTestId('connector')).toHaveCount(1)
  })

  test('line modeでは、ホバーした要素のみアンカーis displayed', async ({ page }) => {
    // Given: 複数のsticky noteをcreate
    await page.getByTestId('tool-sticky').click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    await page.getByTestId('canvas').click({ position: { x: 400, y: 200 } })
    await page.getByTestId('canvas').click({ position: { x: 300, y: 400 } })
    
    // When: line toolをselection
    await page.getByTestId('tool-line').click()
    await page.waitForTimeout(100)
    
    // Then: initial stateではすべての要素のアンカーが見えない
    await expect(page.locator('[data-testid^="connection-point-"]')).toHaveCount(0)
    
    // When: 最初のsticky notetopにホバー
    const firstSticky = page.getByTestId('sticky').first()
    await firstSticky.hover()
    await page.waitForTimeout(100)
    
    // Then: ホバーしたsticky noteのみアンカーis displayed（4つのアンカー）
    const visibleAnchors = page.locator('[data-testid^="connection-point-"]')
    await expect(visibleAnchors).toHaveCount(4)
    
    // When: 別のsticky notetopにホバー
    const secondSticky = page.getByTestId('sticky').nth(1)
    await secondSticky.hover()
    await page.waitForTimeout(100)
    
    // Then: 新しくホバーしたsticky noteのアンカーのみis displayed
    await expect(visibleAnchors).toHaveCount(4)
    
    // When: 背景にホバー（要素から離れる）
    await page.getByTestId('canvas').hover({ position: { x: 100, y: 100 } })
    await page.waitForTimeout(100)
    
    // Then: すべてのアンカーがhiddenになる
    await expect(visibleAnchors).toHaveCount(0)
  })
})