import { test, expect } from '@playwright/test'

test.describe('Clipboard Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="canvas"]', { timeout: 10000 })
    
    // Wait a bit for all event listeners to be attached
    await page.waitForTimeout(1000)
  })

  test('should allow copy and paste in chat input', async ({ page }) => {
    // Navigate to the chat input
    const chatInput = page.getByPlaceholder('Enter your idea...').first()
    await chatInput.click()
    await chatInput.fill('Test text for copy paste')
    
    // Select all text and copy
    await chatInput.selectText()
    await page.keyboard.press('Ctrl+C')
    
    // Clear the input and paste
    await chatInput.clear()
    await page.keyboard.press('Ctrl+V')
    
    // Verify the text was pasted
    await expect(chatInput).toHaveValue('Test text for copy paste')
  })

  test('should allow copy and paste when editing sticky notes', async ({ page }) => {
    // Create a sticky note
    await page.getByRole('button', { name: 'Sticky' }).click()
    await page.getByTestId('canvas').click({ position: { x: 300, y: 200 } })
    
    // Wait for the sticky note to appear and double-click to edit
    const stickyNote = page.getByTestId('sticky').first()
    await expect(stickyNote).toBeVisible()
    await stickyNote.dblclick()
    
    // Wait for the editor to appear
    const editor = page.getByTestId('sticky-editor')
    await expect(editor).toBeVisible()
    
    // Type some text
    await editor.fill('Copy paste test text')
    
    // Select all text and copy
    await page.keyboard.press('Ctrl+A')
    await page.keyboard.press('Ctrl+C')
    
    // Clear and paste
    await editor.clear()
    await page.keyboard.press('Ctrl+V')
    
    // Verify the text was pasted
    await expect(editor).toHaveValue('Copy paste test text')
    
    // Finish editing
    await page.keyboard.press('Enter')
    
    // Verify the sticky note has the pasted text
    await expect(stickyNote).toContainText('Copy paste test text')
  })

  test('should allow copy and paste when editing text elements', async ({ page }) => {
    // Create a text element
    await page.getByRole('button', { name: 'Text' }).click()
    await page.getByTestId('canvas').click({ position: { x: 400, y: 300 } })
    
    // Wait for the text element to appear and double-click to edit
    const textElement = page.getByTestId('text').first()
    await expect(textElement).toBeVisible()
    await textElement.dblclick()
    
    // Wait for the editor to appear
    const editor = page.getByTestId('text-editor')
    await expect(editor).toBeVisible()
    
    // Type some text
    await editor.fill('Text element clipboard test')
    
    // Select all text and copy
    await page.keyboard.press('Ctrl+A')
    await page.keyboard.press('Ctrl+C')
    
    // Clear and paste
    await editor.clear()
    await page.keyboard.press('Ctrl+V')
    
    // Verify the text was pasted
    await expect(editor).toHaveValue('Text element clipboard test')
    
    // Finish editing
    await page.keyboard.press('Enter')
    
    // Verify the text element has the pasted text
    await expect(textElement).toContainText('Text element clipboard test')
  })

  test('should not interfere with clipboard when canvas has focus', async ({ page }) => {
    // Focus on the canvas (background)
    await page.getByTestId('canvas').click({ position: { x: 100, y: 100 } })
    
    // Create a sticky note first
    await page.getByRole('button', { name: 'Sticky' }).click()
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    
    // Enter edit mode
    const stickyNote = page.getByTestId('sticky').first()
    await stickyNote.dblclick()
    
    const editor = page.getByTestId('sticky-editor')
    await expect(editor).toBeVisible()
    
    // Type test text
    await editor.fill('Clipboard interference test')
    
    // Test that clipboard operations work even when canvas event listeners are active
    await page.keyboard.press('Ctrl+A')
    await page.keyboard.press('Ctrl+C')
    
    await editor.clear()
    await page.keyboard.press('Ctrl+V')
    
    // Verify clipboard still works
    await expect(editor).toHaveValue('Clipboard interference test')
    
    // Finish editing
    await page.keyboard.press('Enter')
  })

  test('should allow cut operation', async ({ page }) => {
    // Create a sticky note and edit it
    await page.getByRole('button', { name: 'Sticky' }).click()
    await page.getByTestId('canvas').click({ position: { x: 300, y: 200 } })
    
    const stickyNote = page.getByTestId('sticky').first()
    await stickyNote.dblclick()
    
    const editor = page.getByTestId('sticky-editor')
    await expect(editor).toBeVisible()
    
    // Type some text
    await editor.fill('Text to cut')
    
    // Select part of the text and cut
    await page.keyboard.press('Ctrl+A')
    await page.keyboard.press('Ctrl+X')
    
    // Verify the text was cut (field should be empty)
    await expect(editor).toHaveValue('')
    
    // Paste it back
    await page.keyboard.press('Ctrl+V')
    
    // Verify the text was pasted back
    await expect(editor).toHaveValue('Text to cut')
    
    await page.keyboard.press('Enter')
  })

  test('should allow select all operation', async ({ page }) => {
    // Create a sticky note and edit it
    await page.getByRole('button', { name: 'Sticky' }).click()
    await page.getByTestId('canvas').click({ position: { x: 300, y: 200 } })
    
    const stickyNote = page.getByTestId('sticky').first()
    await stickyNote.dblclick()
    
    const editor = page.getByTestId('sticky-editor')
    await expect(editor).toBeVisible()
    
    // Type some text
    await editor.fill('Select all test text')
    
    // Position cursor in the middle
    await page.keyboard.press('Home')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    
    // Select all with Ctrl+A
    await page.keyboard.press('Ctrl+A')
    
    // Type new text - should replace all selected text
    await editor.type('Replaced')
    
    // Verify all text was replaced
    await expect(editor).toHaveValue('Replaced')
    
    await page.keyboard.press('Enter')
  })

  test('should work with contentEditable elements (debug test component)', async ({ page }) => {
    // The ClipboardTest component should be visible in development mode
    const clipboardTest = page.locator('h3:has-text("Clipboard Fix Test")')
    
    // Only run this test if the debug component is visible (development mode)
    if (await clipboardTest.isVisible()) {
      // Test the contentEditable div in the debug component
      const contentEditableDiv = page.locator('[contenteditable="true"]').first()
      await contentEditableDiv.click()
      
      // Clear existing content and add new text
      await contentEditableDiv.selectText()
      await page.keyboard.press('Delete')
      await contentEditableDiv.type('ContentEditable test')
      
      // Test clipboard operations
      await page.keyboard.press('Ctrl+A')
      await page.keyboard.press('Ctrl+C')
      
      await contentEditableDiv.selectText()
      await page.keyboard.press('Delete')
      await page.keyboard.press('Ctrl+V')
      
      // Verify the text was pasted
      await expect(contentEditableDiv).toContainText('ContentEditable test')
    }
  })
})