import { test, expect } from '@playwright/test'

test.describe('Data persistence', () => {
  test.beforeEach(async ({ page }) => {
    // localStorageをClear
    await page.evaluate(() => {
      localStorage.clear()
    })
  })

  test('sticky notecreate後restored after reload', async ({ page }) => {
    // Given: access homepage
    await page.goto('/')
    
    // When: sticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    
    // And: textを入力
    const sticky = page.getByTestId('sticky').first()
    await sticky.dblclick()
    await page.keyboard.type('Persistence test')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(100)
    
    // And: デバウンス時間をwait（1秒）
    await page.waitForTimeout(1200)
    
    // And: ページをリロード
    await page.reload()
    await page.waitForTimeout(500)
    
    // Then: sticky noteがrestoreされる
    const restoredSticky = page.getByTestId('sticky').first()
    await expect(restoredSticky).toBeVisible()
    await expect(restoredSticky).toContainText('Persistence test')
  })

  test('複数要素のrestore', async ({ page }) => {
    // Given: access homepage
    await page.goto('/')
    
    // When: 複数の要素をcreate
    
    // sticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 100, y: 100 } })
    
    // rectangleをcreate
    const rectButton = page.getByTestId('tool-rect')
    await rectButton.click()
    await page.getByTestId('canvas').click({ position: { x: 300, y: 100 } })
    
    // textをcreate
    const textButton = page.getByTestId('tool-text')
    await textButton.click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 300 } })
    
    // And: デバウンス時間をwait
    await page.waitForTimeout(1200)
    
    // And: ページをリロード
    await page.reload()
    await page.waitForTimeout(500)
    
    // Then: 全ての要素がrestoreされる
    await expect(page.getByTestId('sticky')).toHaveCount(1)
    await expect(page.getByTestId('rect')).toHaveCount(1)
    await expect(page.getByTestId('textbox')).toHaveCount(1)
  })

  test('要素delete後のrestore', async ({ page }) => {
    // Given: sticky noteがexists状態
    await page.goto('/')
    
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    await page.waitForTimeout(1200) // auto-save待ち
    
    // When: sticky noteをdelete
    const sticky = page.getByTestId('sticky').first()
    await sticky.click()
    await page.keyboard.press('Delete')
    await page.waitForTimeout(1200) // auto-save待ち
    
    // And: ページをリロード
    await page.reload()
    await page.waitForTimeout(500)
    
    // Then: sticky noteはrestoreされない（delete状態が保持される）
    await expect(page.getByTestId('sticky')).toHaveCount(0)
  })

  test('初回アクセス時は空の状態', async ({ page }) => {
    // Given: 新しいセッション（localStorageが空）
    await page.goto('/')
    await page.waitForTimeout(500)
    
    // Then: 要素は存在しない
    await expect(page.getByTestId('sticky')).toHaveCount(0)
    await expect(page.getByTestId('rect')).toHaveCount(0)
    await expect(page.getByTestId('textbox')).toHaveCount(0)
  })
})