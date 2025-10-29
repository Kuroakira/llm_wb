# Clipboard Debug Guide

## Testing Copy/Paste Functionality

### Steps to Test:

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Open http://localhost:3000 in your browser**

3. **Create a sticky note:**
   - Click the "Sticky" button in the toolbar
   - Click anywhere on the canvas to create a note

4. **Select the sticky note:**
   - Click the "Select" tool (arrow icon) in the toolbar
   - Click on the sticky note to select it (should show selection handles)

5. **Test Copy & Paste:**
   - With the sticky note selected, press `Ctrl+C` (or `Cmd+C` on Mac)
   - Then press `Ctrl+V` (or `Cmd+V` on Mac)
   - A duplicate sticky note should appear 10px to the right and 10px down

6. **Test Cut & Paste:**
   - Select a sticky note
   - Press `Ctrl+X` (or `Cmd+X` on Mac) - the note should disappear
   - Press `Ctrl+V` (or `Cmd+V` on Mac) - the note should reappear

### Expected Behavior:

- ✅ Copy: Original stays, duplicate appears with +10px offset
- ✅ Cut: Original disappears
- ✅ Paste: New element appears at offset position
- ✅ Multiple Paste: Can paste same clipboard content multiple times

### Troubleshooting:

If copy/paste doesn't work, check:

1. **Console Errors**: Open browser DevTools (F12) and check Console tab
2. **Element Selection**: Make sure the element is actually selected (shows handles)
3. **Tool Mode**: Must be in "Select" tool mode, not editing mode
4. **Focus**: Canvas should have focus, not an input field

### Debug Commands (in Browser Console):

```javascript
// Check if element is selected
useBoardStore.getState().selectedIds

// Check clipboard content
useBoardStore.getState().clipboard

// Manual test copy
useBoardStore.getState().copySelected()

// Manual test paste
useBoardStore.getState().paste()

// Check elements
useBoardStore.getState().elements
```

### Known Working Scenarios:

- ✅ Unit tests pass (see tests/unit/clipboard.test.ts)
- ✅ TypeScript compilation succeeds
- ✅ Store functions are properly implemented
- ✅ Keyboard shortcuts are registered in useCanvasEvents.ts

### If Still Not Working:

1. Check if `shouldAllowNativeKeyboard()` is blocking the shortcuts
2. Verify editor state is not active (`editorState.isVisible === false`)
3. Confirm keyboard event is reaching the handler (add console.log)
4. Test manually calling the store functions from browser console
