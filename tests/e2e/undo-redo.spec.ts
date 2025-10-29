import { test, expect } from '@playwright/test'

test.describe('Undo/Redo functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(500)
  })

  test('Ctrl+Z でsticky notecreateをcan be undone', async ({ page }) => {
    // Given: sticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    
    // Then: sticky noteがexists
    await expect(page.getByTestId('sticky')).toHaveCount(1)
    
    // When: Ctrl+Z (Undo)
    await page.keyboard.press('ControlOrMeta+z')
    await page.waitForTimeout(100)
    
    // Then: sticky noteがdeleteされる
    await expect(page.getByTestId('sticky')).toHaveCount(0)
  })

  test('Ctrl+Shift+Z でsticky notecreateをcan be redone', async ({ page }) => {
    // Given: sticky noteをcreateしてUndoした状態
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    await page.keyboard.press('ControlOrMeta+z') // Undo
    await page.waitForTimeout(100)
    
    // Then: sticky noteが存在しない
    await expect(page.getByTestId('sticky')).toHaveCount(0)
    
    // When: Ctrl+Shift+Z (Redo)
    await page.keyboard.press('ControlOrMeta+Shift+z')
    await page.waitForTimeout(100)
    
    // Then: sticky noteが復活する
    await expect(page.getByTestId('sticky')).toHaveCount(1)
  })

  test('toolbarのUndo buttonがfunctionalityする', async ({ page }) => {
    // Given: sticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    
    // Then: sticky noteが存在し、Undo buttonがenabled
    await expect(page.getByTestId('sticky')).toHaveCount(1)
    await expect(page.getByTestId('tool-undo')).toBeEnabled()
    
    // When: Undo buttonclick
    await page.getByTestId('tool-undo').click()
    await page.waitForTimeout(100)
    
    // Then: sticky noteがdeleteされる
    await expect(page.getByTestId('sticky')).toHaveCount(0)
  })

  test('toolbarのRedo buttonがfunctionalityする', async ({ page }) => {
    // Given: sticky noteをcreateしてUndoした状態
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    await page.getByTestId('tool-undo').click()
    await page.waitForTimeout(100)
    
    // Then: sticky noteが存在せず、Redo buttonがenabled
    await expect(page.getByTestId('sticky')).toHaveCount(0)
    await expect(page.getByTestId('tool-redo')).toBeEnabled()
    
    // When: Redo buttonclick
    await page.getByTestId('tool-redo').click()
    await page.waitForTimeout(100)
    
    // Then: sticky noteが復活する
    await expect(page.getByTestId('sticky')).toHaveCount(1)
  })

  test('複数操作のUndo/Redo', async ({ page }) => {
    // Given: 複数のsticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    
    // 1つ目のsticky note
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    await page.waitForTimeout(100)
    
    // 2つ目のsticky note（ツールを再selection）
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 400, y: 200 } })
    await page.waitForTimeout(100)
    
    // 3つ目のsticky note（ツールを再selection）
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
    await page.waitForTimeout(100)
    
    // Then: 3つのsticky noteが存在
    await expect(page.getByTestId('sticky')).toHaveCount(3)
    
    // When: 2回Undo
    await page.keyboard.press('ControlOrMeta+z')
    await page.waitForTimeout(100)
    await page.keyboard.press('ControlOrMeta+z')
    await page.waitForTimeout(100)
    
    // Then: 1つのsticky noteのみremains
    await expect(page.getByTestId('sticky')).toHaveCount(1)
    
    // When: 1回Redo
    await page.keyboard.press('ControlOrMeta+Shift+z')
    await page.waitForTimeout(100)
    
    // Then: 2つのsticky noteに戻る
    await expect(page.getByTestId('sticky')).toHaveCount(2)
  })

  test('history is emptyの時はUndo/Redo buttonがdisabled', async ({ page }) => {
    // Given: initial state（history is empty）
    
    // Then: Undo/Redo buttonがdisabled
    await expect(page.getByTestId('tool-undo')).toBeDisabled()
    await expect(page.getByTestId('tool-redo')).toBeDisabled()
  })

  test('要素deleteのUndo/Redo', async ({ page }) => {
    // Given: sticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    
    // When: sticky noteをselectionしてdelete
    const sticky = page.getByTestId('sticky').first()
    await sticky.click()
    await page.keyboard.press('Delete')
    
    // Then: sticky noteがdeleteされる
    await expect(page.getByTestId('sticky')).toHaveCount(0)
    
    // When: Undo
    await page.keyboard.press('ControlOrMeta+z')
    await page.waitForTimeout(100)
    
    // Then: sticky noteが復活する
    await expect(page.getByTestId('sticky')).toHaveCount(1)
    
    // When: Redo
    await page.keyboard.press('ControlOrMeta+Shift+z')
    await page.waitForTimeout(100)
    
    // Then: sticky noteが再びdeleteされる
    await expect(page.getByTestId('sticky')).toHaveCount(0)
  })
})