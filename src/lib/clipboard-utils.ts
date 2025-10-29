/**
 * Utility functions for clipboard operations in text areas
 */

/**
 * Handle paste operation for textarea elements with cursor position restoration
 */
export function handleTextareaPaste(
  e: React.ClipboardEvent<HTMLTextAreaElement>,
  onTextChange: (text: string) => void
) {
  const pastedText = e.clipboardData.getData('text')
  
  if (!pastedText) return
  
  const textarea = e.currentTarget as HTMLTextAreaElement
  const { selectionStart: start, selectionEnd: end, value: currentText } = textarea
  
  const newText = currentText.slice(0, start) + pastedText + currentText.slice(end)
  onTextChange(newText)
  
  // Restore cursor position after pasted text
  setTimeout(() => {
    const newCursorPosition = start + pastedText.length
    textarea.setSelectionRange(newCursorPosition, newCursorPosition)
  }, 0)
}