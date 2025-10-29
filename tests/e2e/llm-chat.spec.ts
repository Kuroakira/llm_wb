import { test, expect } from '@playwright/test'

test.describe('LLMチャットfunctionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(500)
  })

  test('chat panelis displayed', async ({ page }) => {
    // Given: ページが読み込まれる
    
    // Then: chat panelがtop rightに表示される
    await expect(page.getByTestId('chat-panel')).toBeVisible()
    await expect(page.getByTestId('chat-input')).toBeVisible()
    await expect(page.getByTestId('chat-submit')).toBeVisible()
    
    // Then: initial stateではsend buttonがdisabled
    await expect(page.getByTestId('chat-submit')).toBeDisabled()
    
    // Then: ヘッダーに「AI Assistant」is displayed
    await expect(page.getByText('💡 AI Assistant')).toBeVisible()
  })

  test('enter questionするとpreview stickyis displayed', async ({ page }) => {
    // Given: initial stateでsticky noteが0個
    await expect(page.getByTestId('sticky')).toHaveCount(0)
    
    // When: chat inputにenter question
    await page.getByTestId('chat-input').fill('Please organize issues into 3 points')
    
    // Then: send buttonがenabledになる
    await expect(page.getByTestId('chat-submit')).toBeEnabled()
    
    // When: send buttonclick
    await page.getByTestId('chat-submit').click()
    
    // Then: 送信中状態になる
    await expect(page.getByTestId('chat-submit')).toContainText('Generating...')
    await expect(page.getByTestId('chat-submit')).toBeDisabled()
    
    // Then: preview stickyis displayed（最大3秒待機）
    await expect(page.getByTestId('preview-sticky')).toBeVisible({ timeout: 3000 })
    
    // Then: preview stickyにLLMの回答が含まれる
    const previewSticky = page.getByTestId('preview-sticky')
    await expect(previewSticky).toContainText('Key organization points')
    
    // Then: ドラッグ指示is displayed
    await expect(previewSticky).toContainText('Drag to place on canvas')
    
    // Then: 入力欄がClearされる
    await expect(page.getByTestId('chat-input')).toHaveValue('')
  })

  test('preview stickyをdrag and dropして配置できる', async ({ page }) => {
    // Given: preview stickyを生成
    await page.getByTestId('chat-input').fill('test質問')
    await page.getByTestId('chat-submit').click()
    await expect(page.getByTestId('preview-sticky')).toBeVisible({ timeout: 3000 })
    
    // When: preview stickyをcanvas中央にdrag and drop
    const previewSticky = page.getByTestId('preview-sticky')
    const canvas = page.getByTestId('canvas')
    
    // 手動ドラッグでsufficient distancemove
    await previewSticky.hover()
    await page.mouse.down()
    await page.mouse.move(400, 300) // 十分なmove距離
    await page.mouse.up()
    await page.waitForTimeout(200)
    
    // Then: canvasにsticky noteがcreateされる
    await expect(page.getByTestId('sticky')).toHaveCount(1)
    
    // Then: sticky noteにLLMの回答が含まれる
    const sticky = page.getByTestId('sticky').first()
    await expect(sticky).toContainText('Points to consider')
    
    // Then: preview stickyがhiddenになる
    await expect(previewSticky).not.toBeVisible()
  })

  test('preview stickyのdeleteボタンがfunctionalityする', async ({ page }) => {
    // Given: preview stickyを生成
    await page.getByTestId('chat-input').fill('test質問')
    await page.getByTestId('chat-submit').click()
    await expect(page.getByTestId('preview-sticky')).toBeVisible({ timeout: 3000 })
    
    // When: deleteボタンclick
    const previewSticky = page.getByTestId('preview-sticky')
    const deleteButton = previewSticky.locator('button[title="delete"]')
    await deleteButton.click()
    
    // Then: preview stickyがhiddenになる
    await expect(previewSticky).not.toBeVisible()
  })

  test('空の入力では送信できない', async ({ page }) => {
    // Given: 空の入力欄
    await expect(page.getByTestId('chat-input')).toHaveValue('')
    
    // Then: send buttonがdisabled
    await expect(page.getByTestId('chat-submit')).toBeDisabled()
    
    // When: スペースのみ入力
    await page.getByTestId('chat-input').fill('   ')
    
    // Then: send buttonはdisabledのまま
    await expect(page.getByTestId('chat-submit')).toBeDisabled()
  })

  test('drag and dropで生成されたsticky noteはedit可能', async ({ page }) => {
    // Given: preview stickyを生成してドロップ
    await page.getByTestId('chat-input').fill('test質問')
    await page.getByTestId('chat-submit').click()
    await expect(page.getByTestId('preview-sticky')).toBeVisible({ timeout: 3000 })
    
    const previewSticky = page.getByTestId('preview-sticky')
    const canvas = page.getByTestId('canvas')
    
    // 手動ドラッグでsufficient distancemove
    await previewSticky.hover()
    await page.mouse.down()
    await page.mouse.move(400, 300)
    await page.mouse.up()
    await page.waitForTimeout(200)
    await expect(page.getByTestId('sticky')).toHaveCount(1)
    
    // When: 生成されたsticky notedouble-clickしてedit
    const sticky = page.getByTestId('sticky').first()
    await sticky.dblclick()
    
    // Then: エディターが開く
    const editor = page.getByTestId('sticky-editor')
    await expect(editor).toBeVisible()
    
    // When: textを追加
    await page.keyboard.type(' - Additional text')
    await page.keyboard.press('Control+Enter') // editcomplete
    await page.waitForTimeout(200)
    
    // Then: edit内容が反映される
    await expect(sticky).toContainText('Additional text')
  })

  test('ズーム状態でもdrag and dropが正常に動作する', async ({ page }) => {
    // Given: ズームイン
    await page.getByTestId('tool-zoom-in').click()
    await page.waitForTimeout(100)
    
    // When: preview stickyを生成
    await page.getByTestId('chat-input').fill('Zoom test')
    await page.getByTestId('chat-submit').click()
    await expect(page.getByTestId('preview-sticky')).toBeVisible({ timeout: 3000 })
    
    // When: preview stickyをdrag and drop
    const previewSticky = page.getByTestId('preview-sticky')
    const canvas = page.getByTestId('canvas')
    
    // 手動ドラッグでsufficient distancemove
    await previewSticky.hover()
    await page.mouse.down()
    await page.mouse.move(400, 300)
    await page.mouse.up()
    await page.waitForTimeout(200)
    
    // Then: sticky noteがcanvasに配置される
    await expect(page.getByTestId('sticky')).toHaveCount(1)
    
    // Then: sticky noteがvisibleエリア内に配置される
    const sticky = page.getByTestId('sticky').first()
    await expect(sticky).toBeVisible()
  })

  test('長い質問でも正常に動作する', async ({ page }) => {
    // Given: 長い質問文（500文字程度）
    const longPrompt = 'これは長い質問です。'.repeat(25) // 250文字程度
    
    // When: 長いenter question
    await page.getByTestId('chat-input').fill(longPrompt)
    await page.getByTestId('chat-submit').click()
    
    // Then: 正常にsticky noteが生成される
    await expect(page.getByTestId('sticky')).toHaveCount(1, { timeout: 3000 })
    
    // Then: 回答は300文字以内に制限される
    const sticky = page.getByTestId('sticky').first()
    const stickyText = await sticky.textContent()
    expect(stickyText?.length || 0).toBeLessThanOrEqual(300)
  })

  test('Clearボタンで状態をリセットできる', async ({ page }) => {
    // Given: 質問をして成功状態にする
    await page.getByTestId('chat-input').fill('test')
    await page.getByTestId('chat-submit').click()
    await expect(page.getByTestId('chat-success')).toBeVisible({ timeout: 3000 })
    
    // When: Clearボタンclick
    await page.getByText('Clear').click()
    
    // Then: 入力欄とメッセージがClearされる
    await expect(page.getByTestId('chat-input')).toHaveValue('')
    await expect(page.getByTestId('chat-success')).not.toBeVisible()
  })

  test('使い方のヒントis displayed', async ({ page }) => {
    // Then: 使い方のヒントis displayed
    await expect(page.getByText('💡 How to use:')).toBeVisible()
    await expect(page.getByText('「課題を3つに整理して」')).toBeVisible()
  })
})