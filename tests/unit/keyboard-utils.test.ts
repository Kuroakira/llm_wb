import { describe, it, expect, beforeEach } from 'vitest'
import { 
  isInputElement, 
  isClipboardOperation, 
  shouldAllowNativeKeyboard,
  isPrecisionModeActive,
  isDensityOverrideActive,
  getKeyboardModifiedHoverConfig,
  DEFAULT_KEYBOARD_CONFIG
} from '@/lib/keyboard-utils'

describe('keyboard-utils', () => {
  describe('isInputElement', () => {
    it('should detect input elements', () => {
      const input = document.createElement('input')
      expect(isInputElement(input)).toBe(true)
      
      const textarea = document.createElement('textarea')
      expect(isInputElement(textarea)).toBe(true)
      
      const div = document.createElement('div')
      expect(isInputElement(div)).toBe(false)
    })
    
    it('should detect contentEditable elements', () => {
      const div = document.createElement('div')
      div.contentEditable = 'true'
      expect(isInputElement(div)).toBe(true)
    })
    
    it('should detect textbox role elements', () => {
      const div = document.createElement('div')
      div.setAttribute('role', 'textbox')
      expect(isInputElement(div)).toBe(true)
    })
    
    it('should return false for null', () => {
      expect(isInputElement(null)).toBe(false)
    })
  })
  
  describe('isClipboardOperation', () => {
    const createKeyboardEvent = (key: string, ctrlKey = false, metaKey = false) =>
      new KeyboardEvent('keydown', { key, ctrlKey, metaKey })
    
    it('should detect copy operations', () => {
      expect(isClipboardOperation(createKeyboardEvent('c', true))).toBe(true)
      expect(isClipboardOperation(createKeyboardEvent('C', true))).toBe(true)
      expect(isClipboardOperation(createKeyboardEvent('c', false, true))).toBe(true)
    })
    
    it('should detect paste operations', () => {
      expect(isClipboardOperation(createKeyboardEvent('v', true))).toBe(true)
      expect(isClipboardOperation(createKeyboardEvent('V', true))).toBe(true)
      expect(isClipboardOperation(createKeyboardEvent('v', false, true))).toBe(true)
    })
    
    it('should detect cut operations', () => {
      expect(isClipboardOperation(createKeyboardEvent('x', true))).toBe(true)
      expect(isClipboardOperation(createKeyboardEvent('X', true))).toBe(true)
      expect(isClipboardOperation(createKeyboardEvent('x', false, true))).toBe(true)
    })
    
    it('should detect select all operations', () => {
      expect(isClipboardOperation(createKeyboardEvent('a', true))).toBe(true)
      expect(isClipboardOperation(createKeyboardEvent('A', true))).toBe(true)
      expect(isClipboardOperation(createKeyboardEvent('a', false, true))).toBe(true)
    })
    
    it('should not detect non-clipboard operations', () => {
      expect(isClipboardOperation(createKeyboardEvent('z', true))).toBe(false)
      expect(isClipboardOperation(createKeyboardEvent('c', false))).toBe(false)
      expect(isClipboardOperation(createKeyboardEvent('Enter'))).toBe(false)
    })
  })
  
  describe('shouldAllowNativeKeyboard', () => {
    let input: HTMLInputElement
    let div: HTMLDivElement
    
    beforeEach(() => {
      input = document.createElement('input')
      div = document.createElement('div')
      document.body.appendChild(input)
      document.body.appendChild(div)
    })
    
    const createMockEvent = (key: string, ctrlKey = false, metaKey = false, target: Element) => {
      const event = new KeyboardEvent('keydown', { key, ctrlKey, metaKey })
      Object.defineProperty(event, 'target', { value: target })
      return event
    }
    
    it('should allow clipboard operations everywhere', () => {
      const copyEvent = createMockEvent('c', true, false, div)
      expect(shouldAllowNativeKeyboard(copyEvent)).toBe(true)
      
      const pasteEvent = createMockEvent('v', true, false, div)
      expect(shouldAllowNativeKeyboard(pasteEvent)).toBe(true)
      
      const cutEvent = createMockEvent('x', true, false, div)
      expect(shouldAllowNativeKeyboard(cutEvent)).toBe(true)
      
      const selectAllEvent = createMockEvent('a', true, false, div)
      expect(shouldAllowNativeKeyboard(selectAllEvent)).toBe(true)
    })
    
    it('should allow all operations in input fields', () => {
      const deleteEvent = createMockEvent('Delete', false, false, input)
      expect(shouldAllowNativeKeyboard(deleteEvent)).toBe(true)
      
      const arrowEvent = createMockEvent('ArrowLeft', false, false, input)
      expect(shouldAllowNativeKeyboard(arrowEvent)).toBe(true)
    })
    
    it('should not allow non-clipboard operations outside input fields', () => {
      const deleteEvent = createMockEvent('Delete', false, false, div)
      expect(shouldAllowNativeKeyboard(deleteEvent)).toBe(false)
      
      const arrowEvent = createMockEvent('ArrowLeft', false, false, div)
      expect(shouldAllowNativeKeyboard(arrowEvent)).toBe(false)
    })
  })

  // Extended hover areas keyboard functionality
  describe('Extended Hover Areas', () => {
    describe('isPrecisionModeActive', () => {
      const createKeyboardEvent = (shiftKey = false, ctrlKey = false, metaKey = false) =>
        ({ shiftKey, ctrlKey, metaKey } as KeyboardEvent)

      it('should detect shift key for precision mode', () => {
        const event = createKeyboardEvent(true)
        expect(isPrecisionModeActive(event)).toBe(true)
      })

      it('should return false when shift key is not pressed', () => {
        const event = createKeyboardEvent(false)
        expect(isPrecisionModeActive(event)).toBe(false)
      })

      it('should return false when no event provided', () => {
        expect(isPrecisionModeActive()).toBe(false)
      })
    })

    describe('isDensityOverrideActive', () => {
      const createKeyboardEvent = (shiftKey = false, ctrlKey = false, metaKey = false) =>
        ({ shiftKey, ctrlKey, metaKey } as KeyboardEvent)

      it('should detect ctrl key for density override', () => {
        const event = createKeyboardEvent(false, true, false)
        expect(isDensityOverrideActive(event)).toBe(true)
      })

      it('should detect meta key for density override (Mac)', () => {
        const event = createKeyboardEvent(false, false, true)
        expect(isDensityOverrideActive(event)).toBe(true)
      })

      it('should return false when neither ctrl nor meta is pressed', () => {
        const event = createKeyboardEvent(false, false, false)
        expect(isDensityOverrideActive(event)).toBe(false)
      })
    })

    describe('getKeyboardModifiedHoverConfig', () => {
      const baseConfig = {
        baseBufferSize: 20,
        denseBufferSize: 10
      }

      const createKeyboardEvent = (shiftKey = false, ctrlKey = false, metaKey = false) =>
        ({ shiftKey, ctrlKey, metaKey } as KeyboardEvent)

      it('should return unmodified config without keyboard modifiers', () => {
        const event = createKeyboardEvent(false, false, false)
        const result = getKeyboardModifiedHoverConfig(baseConfig, event)
        
        expect(result.config).toEqual(baseConfig)
        expect(result.densityOverride).toBe(false)
      })

      it('should halve buffer sizes in precision mode', () => {
        const event = createKeyboardEvent(true, false, false) // Shift pressed
        const result = getKeyboardModifiedHoverConfig(baseConfig, event)
        
        expect(result.config.baseBufferSize).toBe(10) // 20 * 0.5
        expect(result.config.denseBufferSize).toBe(5) // 10 * 0.5
        expect(result.densityOverride).toBe(false)
      })

      it('should enable density override with ctrl key', () => {
        const event = createKeyboardEvent(false, true, false) // Ctrl pressed
        const result = getKeyboardModifiedHoverConfig(baseConfig, event)
        
        expect(result.config).toEqual(baseConfig) // Unmodified buffer sizes
        expect(result.densityOverride).toBe(true)
      })

      it('should apply both precision mode and density override', () => {
        const event = createKeyboardEvent(true, true, false) // Both Shift and Ctrl pressed
        const result = getKeyboardModifiedHoverConfig(baseConfig, event)
        
        expect(result.config.baseBufferSize).toBe(10) // Halved
        expect(result.config.denseBufferSize).toBe(5) // Halved
        expect(result.densityOverride).toBe(true)
      })

      it('should not modify original config object', () => {
        const event = createKeyboardEvent(true, false, false)
        const originalConfig = { ...baseConfig }
        
        getKeyboardModifiedHoverConfig(baseConfig, event)
        
        expect(baseConfig).toEqual(originalConfig)
      })
    })
  })
})