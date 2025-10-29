/**
 * Keyboard event utilities for handling clipboard operations, input field detection,
 * and extended hover areas in connector mode
 */

/**
 * Check if the user is currently interacting with an input element
 */
export function isInputElement(element: Element | null): boolean {
  if (!element || !element.tagName) {
    return false
  }
  
  const tagName = element.tagName.toLowerCase()
  return tagName === 'input' ||
         tagName === 'textarea' ||
         (element as HTMLElement).contentEditable === 'true' ||
         element.getAttribute('role') === 'textbox'
}

/**
 * Check if the keyboard event is a clipboard operation (copy, paste, cut, select all)
 */
export function isClipboardOperation(event: KeyboardEvent): boolean {
  const { key, ctrlKey, metaKey } = event
  const isModifierPressed = ctrlKey || metaKey
  
  if (!isModifierPressed) {
    return false
  }
  
  // Standard clipboard operations
  const clipboardKeys = ['c', 'v', 'x', 'a']
  return clipboardKeys.includes(key.toLowerCase())
}

/**
 * Check if the user is in an input context and using clipboard operations
 * In these cases, we should NOT preventDefault() to allow native clipboard functionality
 */
export function shouldAllowNativeKeyboard(event: KeyboardEvent): boolean {
  const target = event.target as Element
  const isInInputField = isInputElement(target)
  const isClipboard = isClipboardOperation(event)

  // Allow clipboard operations ONLY in input fields
  // This lets canvas clipboard work for elements, but preserves text editing
  if (isClipboard && isInInputField) {
    return true
  }

  // Allow all keyboard operations in input fields
  if (isInInputField) {
    return true
  }

  return false
}

// Extended hover areas configuration for keyboard modifiers
export interface HoverKeyboardConfig {
  precisionKey: string // Key for precision mode (smaller buffer)
  densityOverrideKey: string // Key to override density detection
}

export const DEFAULT_KEYBOARD_CONFIG: HoverKeyboardConfig = {
  precisionKey: 'Shift',
  densityOverrideKey: 'Control'
}

/**
 * Check if precision mode is active (Shift key pressed)
 */
export function isPrecisionModeActive(event?: KeyboardEvent): boolean {
  if (event) {
    return event.shiftKey
  }
  
  // Check if Shift is currently pressed globally
  if (typeof window !== 'undefined') {
    return false // Would need global keyboard state tracking for this
  }
  
  return false
}

/**
 * Check if density override is active (Control key pressed)
 */
export function isDensityOverrideActive(event?: KeyboardEvent): boolean {
  if (event) {
    return event.ctrlKey || event.metaKey
  }
  
  return false
}

/**
 * Get modified hover configuration based on keyboard state
 */
export function getKeyboardModifiedHoverConfig(baseConfig: any, event?: KeyboardEvent) {
  const modifiedConfig = { ...baseConfig }
  
  // Precision mode reduces buffer size
  if (isPrecisionModeActive(event)) {
    modifiedConfig.baseBufferSize *= 0.5
    modifiedConfig.denseBufferSize *= 0.5
  }
  
  return {
    config: modifiedConfig,
    densityOverride: isDensityOverrideActive(event)
  }
}