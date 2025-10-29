'use client'

import React, { useMemo } from 'react'
import { marked } from 'marked'
import { TYPOGRAPHY_TOKENS, TEXT_COLORS, TEXT_SPACING, getOptimalTextColor } from '@/design-system/typography'
import type { TextAlignment, VerticalAlignment } from '@/types'
import { createModuleLogger } from '@/lib/logger'

const logger = createModuleLogger('MarkdownRenderer')

type MarkdownRendererProps = {
  text: string
  maxWidth: number
  maxHeight: number
  fontSize?: number
  fontFamily?: string
  className?: string
  backgroundColor?: string
  textColor?: string
  textAlign?: TextAlignment
  verticalAlign?: VerticalAlignment
}

// Enhanced HTML post-processing with improved typography
const addCustomStyles = (html: string, textColor: string = TEXT_COLORS.light.primary): string => {
  return html
    // Style headers with proper hierarchy
    .replace(/<h1([^>]*)>/g, `<h1$1 style="font-size: ${TYPOGRAPHY_TOKENS.fontSize.h1}; font-weight: ${TYPOGRAPHY_TOKENS.fontWeight.bold}; margin: ${TEXT_SPACING.margin.md} 0; line-height: ${TYPOGRAPHY_TOKENS.lineHeight.tight}; color: ${textColor}; font-family: ${TYPOGRAPHY_TOKENS.fontFamily.primary};">`)
    .replace(/<h2([^>]*)>/g, `<h2$1 style="font-size: ${TYPOGRAPHY_TOKENS.fontSize.h2}; font-weight: ${TYPOGRAPHY_TOKENS.fontWeight.bold}; margin: ${TEXT_SPACING.margin.md} 0; line-height: ${TYPOGRAPHY_TOKENS.lineHeight.tight}; color: ${textColor}; font-family: ${TYPOGRAPHY_TOKENS.fontFamily.primary};">`)
    .replace(/<h3([^>]*)>/g, `<h3$1 style="font-size: ${TYPOGRAPHY_TOKENS.fontSize.h3}; font-weight: ${TYPOGRAPHY_TOKENS.fontWeight.semibold}; margin: ${TEXT_SPACING.margin.md} 0; line-height: ${TYPOGRAPHY_TOKENS.lineHeight.tight}; color: ${textColor}; font-family: ${TYPOGRAPHY_TOKENS.fontFamily.primary};">`)
    .replace(/<h[4-6]([^>]*)>/g, `<h4$1 style="font-size: ${TYPOGRAPHY_TOKENS.fontSize.lg}; font-weight: ${TYPOGRAPHY_TOKENS.fontWeight.medium}; margin: ${TEXT_SPACING.margin.md} 0; line-height: ${TYPOGRAPHY_TOKENS.lineHeight.tight}; color: ${textColor}; font-family: ${TYPOGRAPHY_TOKENS.fontFamily.primary};">`)
    
    // Style paragraphs with improved spacing and line height
    .replace(/<p([^>]*)>/g, `<p$1 style="margin: ${TEXT_SPACING.margin.sm} 0; line-height: ${TYPOGRAPHY_TOKENS.lineHeight.normal}; color: ${textColor}; font-family: ${TYPOGRAPHY_TOKENS.fontFamily.primary}; word-break: break-word;">`)
    
    // Style strong/bold with proper weight
    .replace(/<strong([^>]*)>/g, `<strong$1 style="font-weight: ${TYPOGRAPHY_TOKENS.fontWeight.semibold};">`)
    
    // Style em/italic
    .replace(/<em([^>]*)>/g, '<em$1 style="font-style: italic;">')
    
    // Style inline code with better readability
    .replace(/<code([^>]*)>/g, `<code$1 style="font-family: ${TYPOGRAPHY_TOKENS.fontFamily.mono}; background-color: rgba(0,0,0,0.08); color: ${TEXT_COLORS.light.secondary}; padding: 2px 4px; border-radius: 3px; font-size: ${TYPOGRAPHY_TOKENS.fontSize.sm}; font-weight: ${TYPOGRAPHY_TOKENS.fontWeight.medium};">`)
    
    // Style code blocks with improved styling
    .replace(/<pre([^>]*)><code([^>]*)>/g, `<pre$1 style="background-color: rgba(0,0,0,0.06); padding: ${TEXT_SPACING.padding.md}; border-radius: 6px; overflow: auto; margin: ${TEXT_SPACING.margin.sm} 0;"><code$2 style="font-family: ${TYPOGRAPHY_TOKENS.fontFamily.mono}; font-size: ${TYPOGRAPHY_TOKENS.fontSize.sm}; color: ${TEXT_COLORS.light.secondary}; line-height: ${TYPOGRAPHY_TOKENS.lineHeight.relaxed};">`)
    
    // Style links with better colors
    .replace(/<a([^>]*href="[^"]*"[^>]*)>/g, `<a$1 style="color: #3182CE; text-decoration: underline; font-weight: ${TYPOGRAPHY_TOKENS.fontWeight.medium};" onmouseover="this.style.color='#2C5AA0'; this.style.textDecoration='none';" onmouseout="this.style.color='#3182CE'; this.style.textDecoration='underline';">`)
    
    // Style lists with improved spacing
    .replace(/<ul([^>]*)>/g, `<ul$1 style="margin: ${TEXT_SPACING.margin.sm} 0; padding-left: 20px; line-height: ${TYPOGRAPHY_TOKENS.lineHeight.normal};">`)
    .replace(/<ol([^>]*)>/g, `<ol$1 style="margin: ${TEXT_SPACING.margin.sm} 0; padding-left: 20px; line-height: ${TYPOGRAPHY_TOKENS.lineHeight.normal};">`)
    .replace(/<li([^>]*)>/g, `<li$1 style="margin: ${TEXT_SPACING.margin.xs} 0; color: ${textColor};">`)
    
    // Style blockquotes for better readability
    .replace(/<blockquote([^>]*)>/g, `<blockquote$1 style="border-left: 3px solid ${TEXT_COLORS.light.muted}; padding-left: ${TEXT_SPACING.padding.md}; margin: ${TEXT_SPACING.margin.sm} 0; font-style: italic; color: ${TEXT_COLORS.light.secondary};">`)
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({
  text,
  maxWidth,
  maxHeight,
  fontSize = parseInt(TYPOGRAPHY_TOKENS.fontSize.base),
  fontFamily = TYPOGRAPHY_TOKENS.fontFamily.primary,
  className = '',
  backgroundColor,
  textColor = TEXT_COLORS.light.primary,
  textAlign = 'left',
  verticalAlign = 'top'
}) => {
  const htmlContent = useMemo(() => {
    if (!text || text.trim() === '') {
      return ''
    }

    try {
      // Configure marked with enhanced options
      marked.setOptions({
        breaks: true,
        gfm: true
      })
      
      // Parse the markdown and apply custom styles with text color
      const html = marked.parse ? marked.parse(text) : (marked as any)(text)
      const styledHtml = addCustomStyles(typeof html === 'string' ? html : String(html), textColor)
      return styledHtml
    } catch (error) {
      // Fallback to plain text if markdown parsing fails
      logger.warn('Markdown parsing failed', error)
      return `<div style="color: ${textColor}; font-family: ${fontFamily}; line-height: ${TYPOGRAPHY_TOKENS.lineHeight.normal};">${text.replace(/\n/g, '<br>')}</div>`
    }
  }, [text, textColor, fontFamily])

  if (!htmlContent) {
    return null
  }

  return (
    <div
      className={className}
      style={{
        width: maxWidth,
        height: maxHeight,
        fontSize: `${fontSize}px`,
        fontFamily: fontFamily,
        color: textColor,
        backgroundColor: backgroundColor,
        overflow: 'hidden',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        lineHeight: TYPOGRAPHY_TOKENS.lineHeight.normal,
        padding: TEXT_SPACING.padding.sm,
        letterSpacing: TYPOGRAPHY_TOKENS.letterSpacing.normal,
        textAlign: textAlign,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: verticalAlign === 'top' ? 'flex-start' : 
                       verticalAlign === 'middle' ? 'center' : 'flex-end'
      }}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
})

MarkdownRenderer.displayName = 'MarkdownRenderer'

// Helper function to detect if text might contain markdown
export const containsMarkdown = (text: string): boolean => {
  if (!text) return false
  
  // Check for common markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s+/, // Headers
    /\*\*.*\*\*/, // Bold
    /\*.*\*/, // Italic (but not bold)
    /`.*`/, // Inline code
    /^\s*[-*+]\s+/, // Unordered list
    /^\s*\d+\.\s+/, // Ordered list
    /\[.*\]\(.*\)/, // Links
  ]
  
  return markdownPatterns.some(pattern => pattern.test(text))
}

// Helper function to render markdown to plain text (for measurements)
export const markdownToPlainText = (text: string): string => {
  if (!text) return ''
  
  try {
    // Simple markdown removal for size calculations
    return text
      .replace(/^#{1,6}\s+/gm, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
      .replace(/^\s*\d+\.\s+/gm, '') // Remove ordered list markers
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Convert links to text
  } catch (error) {
    return text
  }
}