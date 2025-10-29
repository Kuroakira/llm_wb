import { test, expect } from '@playwright/test'

test.describe('Font Size Selector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should show font size dropdown when textbox is selected', async ({ page }) => {
    // Create a text element
    await page.getByRole('button', { name: /text/i }).click()
    await page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
    
    // Add some text to make it visible
    await page.keyboard.type('Test text for font size')
    await page.keyboard.press('Enter')
    
    // Wait for text editing to complete
    await page.waitForTimeout(500)
    
    // Click to select the text element
    await page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
    
    // The selection toolbar should appear with font size trigger
    await expect(page.getByTestId('selection-toolbar')).toBeVisible()
    await expect(page.getByTestId('font-size-trigger')).toBeVisible()
  })

  test('should open font size dropdown when trigger is clicked', async ({ page }) => {
    // Create and select a text element
    await page.getByRole('button', { name: /text/i }).click()
    await page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
    await page.keyboard.type('Test text')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    await page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
    
    // Click the font size trigger
    await page.getByTestId('font-size-trigger').click()
    
    // Font size selector should be visible
    await expect(page.getByTestId('font-size-selector')).toBeVisible()
    
    // Should show all predefined font sizes
    const expectedSizes = [10, 12, 14, 16, 18, 24, 32, 48, 64, 96]
    for (const size of expectedSizes) {
      await expect(page.getByTestId(`font-size-option-${size}`)).toBeVisible()
    }
  })

  test('should change font size when option is selected', async ({ page }) => {
    // Create a text element
    await page.getByRole('button', { name: /text/i }).click()
    await page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
    await page.keyboard.type('Test text')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    
    // Select the text element
    await page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
    
    // Open font size dropdown
    await page.getByTestId('font-size-trigger').click()
    
    // Select a different font size (24px)
    await page.getByTestId('font-size-option-24').click()
    
    // Dropdown should close
    await expect(page.getByTestId('font-size-selector')).not.toBeVisible()
    
    // Trigger should show new font size
    await expect(page.getByTestId('font-size-trigger')).toContainText('24')
  })

  test('should close dropdown when clicking outside', async ({ page }) => {
    // Create and select a text element
    await page.getByRole('button', { name: /text/i }).click()
    await page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
    await page.keyboard.type('Test text')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    await page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
    
    // Open font size dropdown
    await page.getByTestId('font-size-trigger').click()
    await expect(page.getByTestId('font-size-selector')).toBeVisible()
    
    // Click outside the dropdown
    await page.getByTestId('canvas').click({ position: { x: 100, y: 100 } })
    
    // Dropdown should close
    await expect(page.getByTestId('font-size-selector')).not.toBeVisible()
  })

  test('should support keyboard navigation', async ({ page }) => {
    // Create and select a text element with default font size
    await page.getByRole('button', { name: /text/i }).click()
    await page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
    await page.keyboard.type('Test text')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    await page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
    
    // Open font size dropdown
    await page.getByTestId('font-size-trigger').click()
    await expect(page.getByTestId('font-size-selector')).toBeVisible()
    
    // Press Escape to close
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('font-size-selector')).not.toBeVisible()
  })

  test('should not show font size selector for non-text elements', async ({ page }) => {
    // Create a rectangle
    await page.getByRole('button', { name: /rect/i }).click()
    await page.getByTestId('canvas').click({ position: { x: 400, y: 400 } })
    
    // Select the rectangle
    await page.getByTestId('canvas').click({ position: { x: 400, y: 400 } })
    
    // Selection toolbar should be visible but font size trigger should not
    await expect(page.getByTestId('selection-toolbar')).toBeVisible()
    await expect(page.getByTestId('font-size-trigger')).not.toBeVisible()
  })

  test('should integrate with undo/redo system', async ({ page }) => {
    // Create a text element
    await page.getByRole('button', { name: /text/i }).click()
    await page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
    await page.keyboard.type('Test text')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    await page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
    
    // Change font size to 32px
    await page.getByTestId('font-size-trigger').click()
    await page.getByTestId('font-size-option-32').click()
    
    // Verify font size changed
    await expect(page.getByTestId('font-size-trigger')).toContainText('32')
    
    // Undo the change
    await page.keyboard.press('Meta+z')
    
    // Font size should revert (assuming original was 16px)
    await expect(page.getByTestId('font-size-trigger')).toContainText('16')
    
    // Redo the change
    await page.keyboard.press('Meta+Shift+z')
    
    // Font size should be 32px again
    await expect(page.getByTestId('font-size-trigger')).toContainText('32')
  })
})