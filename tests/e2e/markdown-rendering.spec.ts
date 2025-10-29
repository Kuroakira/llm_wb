import { test, expect } from '@playwright/test'

test.describe('Markdown Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    
    // Wait for the canvas to be ready
    await page.waitForSelector('[data-testid="canvas"]', { timeout: 10000 })
  })

  test('should auto-detect markdown in sticky notes and show MD indicator', async ({ page }) => {
    // Click sticky note tool
    await page.getByRole('button', { name: /sticky/i }).click()
    
    // Click on canvas to create a sticky note
    await page.getByTestId('canvas').click({ position: { x: 200, y: 200 } })
    
    // Wait for sticky note to appear
    const stickyNote = page.getByTestId('sticky').first()
    await expect(stickyNote).toBeVisible()
    
    // Double click to edit the sticky note
    await stickyNote.dblclick()
    
    // Type markdown content
    const markdownText = '# Header\n**Bold text**\n- List item'
    await page.keyboard.type(markdownText)
    
    // Press Enter to save
    await page.keyboard.press('Enter')
    
    // Should show markdown indicator
    await expect(page.getByTestId('markdown-indicator')).toBeVisible()
    
    // The MD indicator should contain "MD" text
    await expect(page.getByTestId('markdown-indicator')).toContainText('MD')
  })

  test('should render markdown formatting correctly', async ({ page }) => {
    // Click sticky note tool
    await page.getByRole('button', { name: /sticky/i }).click()
    
    // Click on canvas to create a sticky note
    await page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
    
    // Wait for sticky note to appear
    const stickyNote = page.getByTestId('sticky').first()
    await expect(stickyNote).toBeVisible()
    
    // Double click to edit
    await stickyNote.dblclick()
    
    // Type markdown with headers and formatting
    await page.keyboard.type('## Important Note\nThis is **bold** and this is *italic*')
    
    // Press Enter to save
    await page.keyboard.press('Enter')
    
    // Should show markdown indicator
    await expect(page.getByTestId('markdown-indicator')).toBeVisible()
    
    // The content should be rendered as HTML (when not editing)
    // This would require the markdown renderer to be active
    await expect(stickyNote).toContainText('Important Note')
    await expect(stickyNote).toContainText('bold')
    await expect(stickyNote).toContainText('italic')
  })

  test('should work with text elements too', async ({ page }) => {
    // Click text tool
    await page.getByRole('button', { name: /text/i }).click()
    
    // Click on canvas to create a text element
    await page.getByTestId('canvas').click({ position: { x: 400, y: 400 } })
    
    // Wait for text element to appear  
    const textElement = page.getByTestId('textbox').first()
    await expect(textElement).toBeVisible()
    
    // Double click to edit
    await textElement.dblclick()
    
    // Type markdown content
    await page.keyboard.type('`code` and [link](https://example.com)')
    
    // Press Enter to save
    await page.keyboard.press('Enter')
    
    // Should show markdown indicator
    await expect(page.getByTestId('markdown-indicator')).toBeVisible()
  })

  test('should not show MD indicator for plain text', async ({ page }) => {
    // Click sticky note tool
    await page.getByRole('button', { name: /sticky/i }).click()
    
    // Click on canvas to create a sticky note
    await page.getByTestId('canvas').click({ position: { x: 500, y: 500 } })
    
    // Wait for sticky note to appear
    const stickyNote = page.getByTestId('sticky').first()
    await expect(stickyNote).toBeVisible()
    
    // Double click to edit
    await stickyNote.dblclick()
    
    // Type plain text
    await page.keyboard.type('This is just plain text without any markdown')
    
    // Press Enter to save
    await page.keyboard.press('Enter')
    
    // Should NOT show markdown indicator
    await expect(page.getByTestId('markdown-indicator')).not.toBeVisible()
  })

  test('should maintain edit functionality with markdown content', async ({ page }) => {
    // Click sticky note tool
    await page.getByRole('button', { name: /sticky/i }).click()
    
    // Click on canvas to create a sticky note
    await page.getByTestId('canvas').click({ position: { x: 150, y: 150 } })
    
    // Wait for sticky note to appear
    const stickyNote = page.getByTestId('sticky').first()
    await expect(stickyNote).toBeVisible()
    
    // Double click to edit
    await stickyNote.dblclick()
    
    // Type markdown content
    const originalText = '# Original Header'
    await page.keyboard.type(originalText)
    await page.keyboard.press('Enter')
    
    // Should show markdown indicator
    await expect(page.getByTestId('markdown-indicator')).toBeVisible()
    
    // Edit again
    await stickyNote.dblclick()
    
    // Clear and type new content
    await page.keyboard.press('Meta+a') // Select all
    const newText = '## Updated Header\n**New content**'
    await page.keyboard.type(newText)
    await page.keyboard.press('Enter')
    
    // Should still show markdown indicator
    await expect(page.getByTestId('markdown-indicator')).toBeVisible()
    
    // Should contain the new content
    await expect(stickyNote).toContainText('Updated Header')
    await expect(stickyNote).toContainText('New content')
  })
})