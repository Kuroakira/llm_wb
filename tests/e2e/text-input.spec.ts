import { test, expect } from '@playwright/test'

test.describe('text入力functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(500)
  })

  test('チャットtextエリアでバックスペースが正常に動作する', async ({ page }) => {
    // Given: chat panelのtextエリア
    const textArea = page.getByTestId('chat-input')
    
    // When: textを入力
    await textArea.fill('Hello World')
    await expect(textArea).toHaveValue('Hello World')
    
    // When: Ctrl+A（全selection）してから一部だけ残してdeleteをtest
    await textArea.selectText()
    await textArea.type('Test')
    
    // Then: 正しく置換される
    await expect(textArea).toHaveValue('Test')
    
    // When: バックスペースで1文字delete
    await textArea.press('Backspace')
    
    // Then: 正しく文字がdeleteされる
    await expect(textArea).toHaveValue('Tes')
  })

  test('sticky noteエディターでバックスペースが正常に動作する', async ({ page }) => {
    // Given: sticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    
    // When: sticky notedouble-clickしてエディターを開く
    const sticky = page.getByTestId('sticky').first()
    await sticky.dblclick()
    
    // Then: エディターが開く
    const editor = page.getByTestId('sticky-editor')
    await expect(editor).toBeVisible()
    
    // When: エディターにtextを入力
    await editor.fill('test文章です')
    
    // When: 最後の2文字をバックスペースでdelete
    await editor.focus()
    await page.keyboard.press('End') // カーソルを末尾にmove
    await page.keyboard.press('Backspace')
    await page.keyboard.press('Backspace')
    
    // When: エディターを閉じる
    await page.keyboard.press('Control+Enter')
    await page.waitForTimeout(200)
    
    // Then: 正しくeditされた内容が反映される
    await expect(sticky).toContainText('test文章')
    await expect(sticky).not.toContainText('test文章です')
  })

  test('canvastopでのDelete/Backspaceキーによる要素deleteが正常に動作する', async ({ page }) => {
    // Given: sticky noteをcreate
    const stickyButton = page.getByTestId('tool-sticky')
    await stickyButton.click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    
    // When: sticky noteをselection
    const sticky = page.getByTestId('sticky').first()
    await sticky.click()
    
    // Then: sticky noteがexists
    await expect(page.getByTestId('sticky')).toHaveCount(1)
    
    // When: Deleteキーを押す
    await page.keyboard.press('Delete')
    
    // Then: sticky noteがdeleteされる
    await expect(page.getByTestId('sticky')).toHaveCount(0)
  })
})