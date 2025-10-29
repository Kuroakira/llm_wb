import { describe, it, expect, vi } from 'vitest'
import { containsMarkdown, markdownToPlainText } from '../../src/canvas/shapes/MarkdownRenderer'

describe('Markdown Detection and Processing', () => {
  describe('containsMarkdown', () => {
    it('should detect headers', () => {
      expect(containsMarkdown('# Header 1')).toBe(true)
      expect(containsMarkdown('## Header 2')).toBe(true)
      expect(containsMarkdown('### Header 3')).toBe(true)
      expect(containsMarkdown('Regular text')).toBe(false)
    })

    it('should detect bold text', () => {
      expect(containsMarkdown('**bold text**')).toBe(true)
      expect(containsMarkdown('This is **bold** text')).toBe(true)
      expect(containsMarkdown('This is *italic* text')).toBe(true)
      expect(containsMarkdown('Regular text')).toBe(false)
    })

    it('should detect inline code', () => {
      expect(containsMarkdown('`code`')).toBe(true)
      expect(containsMarkdown('This has `inline code`')).toBe(true)
      expect(containsMarkdown('Regular text')).toBe(false)
    })

    it('should detect lists', () => {
      expect(containsMarkdown('- List item')).toBe(true)
      expect(containsMarkdown('* List item')).toBe(true)
      expect(containsMarkdown('+ List item')).toBe(true)
      expect(containsMarkdown('1. Numbered item')).toBe(true)
      expect(containsMarkdown('Regular text')).toBe(false)
    })

    it('should detect links', () => {
      expect(containsMarkdown('[Link text](https://example.com)')).toBe(true)
      expect(containsMarkdown('Check out [this link](https://example.com)')).toBe(true)
      expect(containsMarkdown('Regular text')).toBe(false)
    })

    it('should return false for empty or null text', () => {
      expect(containsMarkdown('')).toBe(false)
      expect(containsMarkdown(null as any)).toBe(false)
      expect(containsMarkdown(undefined as any)).toBe(false)
    })
  })

  describe('markdownToPlainText', () => {
    it('should remove markdown formatting', () => {
      expect(markdownToPlainText('# Header')).toBe('Header')
      expect(markdownToPlainText('**bold**')).toBe('bold')
      expect(markdownToPlainText('*italic*')).toBe('italic')
      expect(markdownToPlainText('`code`')).toBe('code')
      expect(markdownToPlainText('[Link](https://example.com)')).toBe('Link')
    })

    it('should remove list markers', () => {
      expect(markdownToPlainText('- List item')).toBe('List item')
      expect(markdownToPlainText('1. Numbered item')).toBe('Numbered item')
    })

    it('should handle empty text', () => {
      expect(markdownToPlainText('')).toBe('')
      expect(markdownToPlainText(null as any)).toBe('')
      expect(markdownToPlainText(undefined as any)).toBe('')
    })

    it('should handle complex markdown', () => {
      const input = `# Title
- **Bold** list item
- [Link](https://example.com)
- \`code\` example`

      const result = markdownToPlainText(input)
      expect(result).toContain('Title')
      expect(result).toContain('Bold')
      expect(result).toContain('Link')
      expect(result).toContain('code')
      expect(result).not.toContain('#')
      expect(result).not.toContain('**')
      expect(result).not.toContain('[')
      expect(result).not.toContain('](')
    })
  })
})