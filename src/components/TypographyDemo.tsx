'use client'

import React from 'react'
import { TYPOGRAPHY_TOKENS, getOptimalTextColor, TEXT_COLORS } from '@/design-system/typography'

type TypographyDemoProps = {
  stickyColor?: string
}

export const TypographyDemo: React.FC<TypographyDemoProps> = ({ 
  stickyColor = '#FFF2B2' 
}) => {
  const textColor = getOptimalTextColor(stickyColor)
  
  const sampleTexts = {
    short: "Quick note",
    medium: "This is a medium-length sticky note with multiple lines of text to demonstrate improved readability.",
    long: `# Meeting Notes

## Action Items
- **Review** the typography changes
- *Test* on different backgrounds  
- Update documentation

### Code Example
\`\`\`javascript
const textColor = getOptimalTextColor(bgColor)
\`\`\`

> "Good typography makes reading effortless and enjoyable."

Visit [our docs](https://example.com) for more information.`,
    
    multilingual: `日本語テキスト
English Text
中文文本
한국어 텍스트

Mixed content with **bold** and *italic* formatting.`
  }

  const colors = [
    '#FFF2B2', // Yellow
    '#E3F2FD', // Light Blue  
    '#FFEBEE', // Light Red
    '#E8F5E9', // Light Green
    '#F3E5F5', // Light Purple
    '#2D3748', // Dark Gray
  ]

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f5f5f5',
      fontFamily: TYPOGRAPHY_TOKENS.fontFamily.primary
    }}>
      <h1 style={{ 
        fontSize: TYPOGRAPHY_TOKENS.fontSize.h1,
        fontWeight: TYPOGRAPHY_TOKENS.fontWeight.bold,
        marginBottom: '20px',
        color: TEXT_COLORS.light.primary
      }}>
        Typography Redesign Demo
      </h1>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        {/* Different text lengths */}
        {Object.entries(sampleTexts).map(([key, text]) => (
          <div key={key} style={{
            width: '280px',
            minHeight: key === 'short' ? '80px' : key === 'medium' ? '120px' : '200px',
            backgroundColor: stickyColor,
            boxShadow: '2px 2px 5px rgba(0,0,0,0.1)',
            padding: '12px',
            borderRadius: '4px',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '-5px',
              left: '10px',
              backgroundColor: TEXT_COLORS.light.primary,
              color: 'white',
              padding: '2px 6px',
              fontSize: '11px',
              borderRadius: '3px',
              fontWeight: TYPOGRAPHY_TOKENS.fontWeight.medium
            }}>
              {key} text
            </div>
            
            <div style={{
              fontSize: TYPOGRAPHY_TOKENS.fontSize.base,
              fontFamily: TYPOGRAPHY_TOKENS.fontFamily.primary,
              lineHeight: TYPOGRAPHY_TOKENS.lineHeight.normal,
              color: textColor,
              wordBreak: 'break-word',
              marginTop: '10px'
            }}>
              {key === 'long' ? (
                <div dangerouslySetInnerHTML={{ 
                  __html: text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')
                }} />
              ) : (
                text
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Color contrast examples */}
      <h2 style={{ 
        fontSize: TYPOGRAPHY_TOKENS.fontSize.h2,
        fontWeight: TYPOGRAPHY_TOKENS.fontWeight.bold,
        marginBottom: '16px',
        color: TEXT_COLORS.light.primary
      }}>
        Color Contrast Examples
      </h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '40px'
      }}>
        {colors.map(color => {
          const textColor = getOptimalTextColor(color)
          return (
            <div key={color} style={{
              backgroundColor: color,
              padding: '16px',
              borderRadius: '4px',
              boxShadow: '1px 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                fontSize: TYPOGRAPHY_TOKENS.fontSize.sm,
                color: TEXT_COLORS.light.muted,
                marginBottom: '4px'
              }}>
                {color} → {textColor}
              </div>
              <div style={{
                fontSize: TYPOGRAPHY_TOKENS.fontSize.base,
                fontFamily: TYPOGRAPHY_TOKENS.fontFamily.primary,
                lineHeight: TYPOGRAPHY_TOKENS.lineHeight.normal,
                color: textColor,
                fontWeight: TYPOGRAPHY_TOKENS.fontWeight.medium
              }}>
                Sample Text
              </div>
              <div style={{
                fontSize: TYPOGRAPHY_TOKENS.fontSize.sm,
                color: textColor,
                opacity: 0.8,
                marginTop: '4px'
              }}>
                Automatic contrast optimization
              </div>
            </div>
          )
        })}
      </div>

      {/* Typography scale */}
      <h2 style={{ 
        fontSize: TYPOGRAPHY_TOKENS.fontSize.h2,
        fontWeight: TYPOGRAPHY_TOKENS.fontWeight.bold,
        marginBottom: '16px',
        color: TEXT_COLORS.light.primary
      }}>
        Typography Scale
      </h2>
      
      <div style={{ 
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {Object.entries(TYPOGRAPHY_TOKENS.fontSize).map(([key, size]) => (
          <div key={key} style={{
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'baseline',
            gap: '16px'
          }}>
            <code style={{
              fontSize: '12px',
              fontFamily: TYPOGRAPHY_TOKENS.fontFamily.mono,
              backgroundColor: '#f0f0f0',
              padding: '2px 4px',
              borderRadius: '2px',
              minWidth: '80px',
              color: TEXT_COLORS.light.secondary
            }}>
              {key}: {size}
            </code>
            <span style={{
              fontSize: size,
              fontFamily: TYPOGRAPHY_TOKENS.fontFamily.primary,
              color: TEXT_COLORS.light.primary
            }}>
              The quick brown fox jumps
            </span>
          </div>
        ))}
      </div>

      {/* Key improvements summary */}
      <div style={{ 
        marginTop: '40px',
        backgroundColor: '#e8f4fd',
        padding: '20px',
        borderRadius: '8px',
        borderLeft: `4px solid ${TEXT_COLORS.light.secondary}`
      }}>
        <h3 style={{ 
          fontSize: TYPOGRAPHY_TOKENS.fontSize.h3,
          fontWeight: TYPOGRAPHY_TOKENS.fontWeight.semibold,
          marginBottom: '12px',
          color: TEXT_COLORS.light.primary
        }}>
          Key Improvements
        </h3>
        <ul style={{
          fontSize: TYPOGRAPHY_TOKENS.fontSize.base,
          lineHeight: TYPOGRAPHY_TOKENS.lineHeight.normal,
          color: TEXT_COLORS.light.secondary,
          paddingLeft: '20px'
        }}>
          <li>Increased base font size from 13-14px to 16px</li>
          <li>Improved line height from 1.4 to 1.5</li>
          <li>Dynamic color contrast (WCAG AA compliant)</li>
          <li>Platform-optimized font stacks</li>
          <li>Multilingual support (Japanese, Chinese)</li>
          <li>Systematic spacing scale</li>
          <li>Enhanced markdown typography</li>
          <li>Accessibility features built-in</li>
        </ul>
      </div>
    </div>
  )
}