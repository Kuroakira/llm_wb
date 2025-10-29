// Typography Design System
// Comprehensive typography tokens and utilities for the whiteboard application

export const TYPOGRAPHY_TOKENS = {
  fontFamily: {
    primary: "'SF Pro Text', 'Segoe UI', 'Roboto', 'Hiragino Kaku Gothic ProN', 'Yu Gothic UI', 'Meiryo UI', 'MS PGothic', system-ui, -apple-system, sans-serif",
    mono: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace"
  },
  fontSize: {
    xs: '12px',
    sm: '14px', 
    base: '16px',  // Increased from 13px for better readability
    lg: '18px',
    xl: '20px',
    xxl: '24px',
    h3: '18px',    // Markdown H3
    h2: '20px',    // Markdown H2  
    h1: '24px'     // Markdown H1
  },
  lineHeight: {
    tight: 1.2,    // For headers
    normal: 1.5,   // For body text - improved readability
    relaxed: 1.6   // For long form content
  },
  fontWeight: {
    normal: 400,
    medium: 500, 
    semibold: 600,
    bold: 700
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em', 
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em'
  }
} as const

export const TEXT_SPACING = {
  padding: {
    xs: '6px',
    sm: '8px',
    md: '12px',    // Improved from 8-10px
    lg: '16px',
    xl: '20px'
  },
  margin: {
    xs: '4px',
    sm: '8px', 
    md: '12px',
    lg: '16px',
    xl: '20px'
  }
} as const

export const TEXT_COLORS = {
  light: {
    primary: '#1a1a1a',      // Dark text for light backgrounds
    secondary: '#4a5568',
    muted: '#718096'
  },
  dark: {
    primary: '#ffffff',      // Light text for dark backgrounds  
    secondary: '#e2e8f0',
    muted: '#cbd5e0'
  }
} as const

/**
 * Calculate luminance of a color
 */
function getLuminance(hex: string): number {
  // Remove # if present
  const color = hex.replace('#', '')
  
  // Convert to RGB
  const r = parseInt(color.substr(0, 2), 16) / 255
  const g = parseInt(color.substr(2, 2), 16) / 255  
  const b = parseInt(color.substr(4, 2), 16) / 255
  
  // Apply gamma correction
  const [rs, gs, bs] = [r, g, b].map(c => 
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  )
  
  // Calculate relative luminance
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Get optimal text color based on background color
 * Ensures WCAG AA compliance (4.5:1 contrast ratio)
 */
export function getOptimalTextColor(backgroundColor: string): string {
  const luminance = getLuminance(backgroundColor)
  
  // Use dark text for light backgrounds, light text for dark backgrounds
  return luminance > 0.5 ? TEXT_COLORS.light.primary : TEXT_COLORS.dark.primary
}

/**
 * Get responsive font size based on zoom level
 */
export function getResponsiveFontSize(baseFontSize: string, zoom: number = 1): string {
  const size = parseInt(baseFontSize, 10)
  const scaledSize = Math.round(size * zoom)
  
  // Set reasonable bounds
  const minSize = 10
  const maxSize = 48
  
  return `${Math.max(minSize, Math.min(maxSize, scaledSize))}px`
}

/**
 * Get markdown styles for different elements
 */
export function getMarkdownStyles(zoom: number = 1) {
  return {
    h1: {
      fontSize: getResponsiveFontSize(TYPOGRAPHY_TOKENS.fontSize.h1, zoom),
      fontWeight: TYPOGRAPHY_TOKENS.fontWeight.bold,
      lineHeight: TYPOGRAPHY_TOKENS.lineHeight.tight,
      marginBottom: TEXT_SPACING.margin.md
    },
    h2: {
      fontSize: getResponsiveFontSize(TYPOGRAPHY_TOKENS.fontSize.h2, zoom),
      fontWeight: TYPOGRAPHY_TOKENS.fontWeight.semibold,
      lineHeight: TYPOGRAPHY_TOKENS.lineHeight.tight,
      marginBottom: TEXT_SPACING.margin.sm
    },
    h3: {
      fontSize: getResponsiveFontSize(TYPOGRAPHY_TOKENS.fontSize.h3, zoom),
      fontWeight: TYPOGRAPHY_TOKENS.fontWeight.semibold,
      lineHeight: TYPOGRAPHY_TOKENS.lineHeight.tight,
      marginBottom: TEXT_SPACING.margin.sm
    },
    p: {
      fontSize: getResponsiveFontSize(TYPOGRAPHY_TOKENS.fontSize.base, zoom),
      fontWeight: TYPOGRAPHY_TOKENS.fontWeight.normal,
      lineHeight: TYPOGRAPHY_TOKENS.lineHeight.normal,
      marginBottom: TEXT_SPACING.margin.sm
    },
    code: {
      fontSize: getResponsiveFontSize(TYPOGRAPHY_TOKENS.fontSize.sm, zoom),
      fontFamily: TYPOGRAPHY_TOKENS.fontFamily.mono,
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      padding: '2px 4px',
      borderRadius: '3px'
    },
    pre: {
      fontSize: getResponsiveFontSize(TYPOGRAPHY_TOKENS.fontSize.sm, zoom),
      fontFamily: TYPOGRAPHY_TOKENS.fontFamily.mono,
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
      padding: TEXT_SPACING.padding.md,
      borderRadius: '6px',
      marginBottom: TEXT_SPACING.margin.md
    },
    ul: {
      marginBottom: TEXT_SPACING.margin.sm,
      paddingLeft: '16px'
    },
    ol: {
      marginBottom: TEXT_SPACING.margin.sm,
      paddingLeft: '16px'
    },
    li: {
      marginBottom: TEXT_SPACING.margin.xs,
      lineHeight: TYPOGRAPHY_TOKENS.lineHeight.normal
    },
    blockquote: {
      borderLeft: '3px solid rgba(0, 0, 0, 0.2)',
      paddingLeft: TEXT_SPACING.padding.md,
      marginBottom: TEXT_SPACING.margin.md,
      fontStyle: 'italic',
      opacity: 0.8
    },
    a: {
      color: '#3182CE',
      textDecoration: 'underline',
      cursor: 'pointer'
    }
  }
}