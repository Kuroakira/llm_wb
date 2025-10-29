import { anchorForConnection, recalcConnectorPoints, isPointInRect } from '@/lib/geometry'
import { expect, test, describe } from 'vitest'

describe('geometry functions', () => {
  test('snap to nearest edge (horizontal direction)', () => {
    // Given: Two rectangular elements
    const from = { x: 0, y: 0, width: 100, height: 100 }
    const to = { x: 300, y: 20, width: 120, height: 80 }

    // When: Calculate connection anchor points
    const { fromPoint, toPoint } = anchorForConnection(from, to)

    // Then: Right edge center of 'from' and near left edge of 'to' should be selected
    expect(fromPoint.x).toBeCloseTo(100, 1) // Right edge of 'from'
    expect(fromPoint.y).toBeCloseTo(50, 1)  // Center Y of 'from'
    // toPoint.x has 12px margin from edge to avoid resize handle overlap
    expect(toPoint.x).toBeCloseTo(312, 1)   // Left edge of 'to' + 12px margin
    expect(toPoint.y).toBeCloseTo(60, 1)    // Near center Y of 'to'
  })

  test('snap to nearest edge (vertical direction)', () => {
    const from = { x: 0, y: 0, width: 100, height: 100 }
    const to = { x: 20, y: 200, width: 80, height: 60 }
    const { fromPoint, toPoint } = anchorForConnection(from, to)

    // Vertical connection, so connect bottom edge of 'from' and top edge of 'to'
    expect(fromPoint.x).toBeCloseTo(50, 1)  // Center X of 'from'
    expect(fromPoint.y).toBeCloseTo(100, 1) // Bottom edge of 'from'
    expect(toPoint.x).toBeCloseTo(60, 1)    // Center X of 'to'
    expect(toPoint.y).toBeCloseTo(212, 1)   // Top edge of 'to' + 12px margin
  })

  test('recalculate connector points', () => {
    const connector = { fromId: 'from', toId: 'to' }
    const elements = [
      { id: 'from', x: 0, y: 0, width: 100, height: 100 },
      { id: 'to', x: 200, y: 0, width: 100, height: 100 }
    ]

    const points = recalcConnectorPoints(connector, elements)

    // Use more flexible assertion for calculated points
    expect(points).toHaveLength(4) // Should have 4 coordinates
    expect(points[0]).toBeCloseTo(100, 1) // from X
    expect(points[1]).toBeCloseTo(50, 1)  // from Y
    expect(points[2]).toBeCloseTo(212, 1) // to X + 12px margin
    expect(points[3]).toBeCloseTo(50, 1)  // to Y
  })

  test('fallback when element is not found', () => {
    const connector = { fromId: 'missing', toId: 'to' }
    const elements = [
      { id: 'to', x: 200, y: 0, width: 100, height: 100 }
    ]

    const points = recalcConnectorPoints(connector, elements)

    expect(points).toEqual([0, 0, 0, 0]) // Default value
  })

  test('point and rectangle collision detection', () => {
    const rect = { x: 100, y: 100, width: 200, height: 150 }

    // Points inside the rectangle
    expect(isPointInRect({ x: 150, y: 150 }, rect)).toBe(true)
    expect(isPointInRect({ x: 100, y: 100 }, rect)).toBe(true)
    expect(isPointInRect({ x: 300, y: 250 }, rect)).toBe(true)

    // Points outside the rectangle
    expect(isPointInRect({ x: 50, y: 150 }, rect)).toBe(false)
    expect(isPointInRect({ x: 150, y: 50 }, rect)).toBe(false)
    expect(isPointInRect({ x: 350, y: 150 }, rect)).toBe(false)
    expect(isPointInRect({ x: 150, y: 300 }, rect)).toBe(false)
  })
})