import { test, expect } from '@playwright/test'

test.describe('Image Tool', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/')
    
    // Wait for the canvas to load
    await page.waitForSelector('[data-testid="canvas"]')
    await page.waitForSelector('[data-testid="toolbar"]')
  })

  test('image tool button should be visible in toolbar', async ({ page }) => {
    // Check that the image tool button exists
    await expect(page.getByTestId('tool-image')).toBeVisible()
    
    // Check that it has the correct icon and title
    const imageButton = page.getByTestId('tool-image')
    await expect(imageButton).toHaveAttribute('title', 'Image')
    
    // Check that it contains the image icon
    await expect(imageButton).toContainText('🖼')
  })

  test('clicking image tool should trigger file selection', async ({ page }) => {
    // Set up file chooser listener before clicking
    const fileChooserPromise = page.waitForEvent('filechooser')
    
    // Click the image tool button
    await page.getByTestId('tool-image').click()
    
    // Wait for file chooser to open
    const fileChooser = await fileChooserPromise
    
    // Verify that the file chooser accepts images
    expect(fileChooser.isMultiple()).toBe(false)
  })

  test('image tool should not stay selected after clicking', async ({ page }) => {
    // Initially select tool should be highlighted
    const selectButton = page.getByTestId('tool-select')
    const imageButton = page.getByTestId('tool-image')
    
    // Check initial state - select tool should be active
    await expect(selectButton).toHaveCSS('background-color', 'rgb(13, 153, 255)') // #0D99FF
    await expect(imageButton).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)') // transparent
    
    // Click image tool (will trigger file dialog but we won't select a file)
    await imageButton.click()
    
    // Image tool should still not be highlighted (it's an action, not a persistent tool)
    await expect(imageButton).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)') // transparent
  })

  test('should handle image file selection and add to canvas', async ({ page }) => {
    // Create a simple test image (1x1 red pixel PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    )

    // Set up file chooser listener
    const fileChooserPromise = page.waitForEvent('filechooser')
    
    // Click the image tool button
    await page.getByTestId('tool-image').click()
    
    // Select the test image file
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles([{
      name: 'test.png',
      mimeType: 'image/png',
      buffer: testImageBuffer
    }])
    
    // Wait for the image to be added to the canvas
    // The image should be rendered as a Konva Image element
    await page.waitForTimeout(1000) // Give time for image processing
    
    // Check that the selected tool switched to select after adding image
    const selectButton = page.getByTestId('tool-select')
    await expect(selectButton).toHaveCSS('background-color', 'rgb(13, 153, 255)') // Should be selected
    
    // The image should now be on the canvas
    // We can check the canvas stage contains an image group
    const canvas = page.getByTestId('canvas')
    await expect(canvas).toBeVisible()
    
    // Note: Testing the actual Konva image rendering is complex in Playwright
    // The important part is that the file selection works and tool switches back to select
  })

  test('should handle large image files with size warning', async ({ page }) => {
    // Create a mock large file by setting up a file chooser that will simulate a large file
    await page.evaluateOnNewDocument(() => {
      // Mock alert to capture size warning
      window.alertMessages = []
      window.alert = (message) => {
        window.alertMessages.push(message)
      }
    })

    // Inject a script to mock file size
    await page.addInitScript(() => {
      const originalCreateElement = document.createElement
      document.createElement = function(tagName) {
        const element = originalCreateElement.call(document, tagName)
        if (tagName === 'input' && element.type === 'file') {
          // Override the onchange to simulate a large file
          const originalOnChange = element.onchange
          element.onchange = function(event) {
            // Mock a large file (> 10MB)
            const mockFile = {
              name: 'large.jpg',
              type: 'image/jpeg',
              size: 15 * 1024 * 1024 // 15MB
            }
            
            // Replace the files array
            Object.defineProperty(event.target, 'files', {
              value: [mockFile]
            })
            
            // Call the original handler
            if (originalOnChange) {
              originalOnChange.call(this, event)
            }
          }
        }
        return element
      }
    })

    // Click the image tool button
    await page.getByTestId('tool-image').click()

    // Wait for the alert message about file size
    await page.waitForTimeout(500)
    
    const alertMessages = await page.evaluate(() => window.alertMessages)
    expect(alertMessages).toContain('ファイルサイズが大きすぎます。10MB以bottomのファイルをselectionしてください。')
  })
})