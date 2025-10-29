'use client'

import React from 'react'

type MarkdownIndicatorProps = {
  x: number
  y: number
  width: number
  height: number
  zoom?: number
  visible?: boolean
}

import { Text, Rect, Group } from 'react-konva'

export const MarkdownIndicator: React.FC<MarkdownIndicatorProps> = ({
  x,
  y,
  width,
  height,
  zoom = 1,
  visible = true
}) => {
  if (!visible) return null

  // Position the indicator at the bottom-right corner
  const indicatorSize = Math.max(12, 16 / zoom) // Scale with zoom but keep minimum size
  const indicatorX = x + width - indicatorSize - 4
  const indicatorY = y + height - indicatorSize - 4


  return (
    <Group>
      {/* Background */}
      <Rect
        x={indicatorX}
        y={indicatorY}
        width={indicatorSize}
        height={indicatorSize}
        fill="rgba(74, 144, 226, 0.8)"
        cornerRadius={2}
      />
      {/* Text */}
      <Text
        x={indicatorX}
        y={indicatorY}
        width={indicatorSize}
        height={indicatorSize}
        text="MD"
        fontSize={Math.max(8, 10 / zoom)}
        fontFamily="monospace"
        fontStyle="bold"
        fill="white"
        align="center"
        verticalAlign="middle"
        listening={false}
      />
    </Group>
  )
}

export default MarkdownIndicator