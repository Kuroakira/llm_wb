import { describe, test, expect } from 'vitest'

describe('Snap Calculations', () => {
  test('グリッドスナップ計算', () => {
    // Given: グリッドサイズ
    const gridSize = 10
    
    // When: 様々な座標をグリッドにスナップ
    const snapToGrid = (value: number) => Math.round(value / gridSize) * gridSize
    
    // Then: 正しくスナップされる
    expect(snapToGrid(23)).toBe(20)
    expect(snapToGrid(27)).toBe(30)
    expect(snapToGrid(35)).toBe(40)
    expect(snapToGrid(0)).toBe(0)
    expect(snapToGrid(-13)).toBe(-10)
  })

  test('要素間スナップ距離計算', () => {
    // Given: 2つの要素
    const element1 = { x: 100, y: 100, width: 100, height: 80 }
    const element2 = { x: 250, y: 120, width: 120, height: 100 }
    
    // When: 要素間の最短距離を計算
    const getDistance = (el1: any, el2: any) => {
      const center1 = { x: el1.x + el1.width / 2, y: el1.y + el1.height / 2 }
      const center2 = { x: el2.x + el2.width / 2, y: el2.y + el2.height / 2 }
      return Math.sqrt(
        Math.pow(center2.x - center1.x, 2) + Math.pow(center2.y - center1.y, 2)
      )
    }
    
    const distance = getDistance(element1, element2)
    
    // Then: 距離が正しく計算される  
    // √((310-150)² + (170-140)²) = √(160² + 30²) = √(25600 + 900) = √26500 ≈ 162.79
    expect(distance).toBeCloseTo(162.79, 1)
  })

  test('エッジアライメント検出', () => {
    // Given: 基準要素とmove要素
    const baseElement = { x: 100, y: 100, width: 100, height: 80 }
    const movingElement = { x: 98, y: 180, width: 120, height: 60 }
    const tolerance = 5
    
    // When: エッジアライメントをチェック
    const isLeftAligned = Math.abs(baseElement.x - movingElement.x) <= tolerance
    const isRightAligned = Math.abs(
      (baseElement.x + baseElement.width) - (movingElement.x + movingElement.width)
    ) <= tolerance
    const isCenterAligned = Math.abs(
      (baseElement.x + baseElement.width / 2) - (movingElement.x + movingElement.width / 2)
    ) <= tolerance
    
    // Then: アライメント状態が正しく検出される
    expect(isLeftAligned).toBe(true)  // 98 ≈ 100 (tolerance 5以内)
    expect(isRightAligned).toBe(false) // 200 vs 218
    expect(isCenterAligned).toBe(false) // 150 vs 158
  })

  test('スナップガイドライン座標計算', () => {
    // Given: アライメント対象の要素群
    const elements = [
      { x: 100, y: 100, width: 100, height: 80 },
      { x: 300, y: 150, width: 120, height: 100 },
      { x: 150, y: 300, width: 80, height: 60 }
    ]
    const movingElement = { x: 98, y: 200, width: 100, height: 80 }
    
    // When: 垂直ガイドラインを計算
    const verticalGuides = elements.flatMap(el => [
      el.x, // left端
      el.x + el.width, // right端
      el.x + el.width / 2 // 中央
    ])
    
    const horizontalGuides = elements.flatMap(el => [
      el.y, // top端
      el.y + el.height, // bottom端
      el.y + el.height / 2 // 中央
    ])
    
    // Then: ガイドラインが正しく生成される
    expect(verticalGuides).toContain(100) // 1番目の要素のleft端
    expect(verticalGuides).toContain(200) // 1番目の要素のright端
    expect(verticalGuides).toContain(150) // 1番目の要素の中央
    expect(horizontalGuides).toContain(100) // 1番目の要素のtop端
    expect(horizontalGuides).toContain(180) // 1番目の要素のbottom端
  })

  test('磁気スナップ範囲計算', () => {
    // Given: スナップ感度
    const snapSensitivity = 10
    const targetPosition = 100
    
    // When: 現在位置がスナップ範囲内かチェック
    const positions = [91, 95, 105, 111, 120]  // 89 を 91 に変更（90以topがスナップ範囲内）
    const snappedPositions = positions.map(pos => {
      return Math.abs(pos - targetPosition) <= snapSensitivity ? targetPosition : pos
    })
    
    // Then: 範囲内の位置がスナップされる
    expect(snappedPositions).toEqual([100, 100, 100, 111, 120])
  })

  test('複数軸同時スナップ計算', () => {
    // Given: スナップターゲット
    const snapTargets = {
      x: [100, 200, 300],
      y: [150, 250, 350]
    }
    const currentPos = { x: 198, y: 248 }
    const tolerance = 5
    
    // When: 両軸でスナップ可能性をチェック
    const snappedX = snapTargets.x.find(target => 
      Math.abs(currentPos.x - target) <= tolerance
    ) ?? currentPos.x
    
    const snappedY = snapTargets.y.find(target => 
      Math.abs(currentPos.y - target) <= tolerance
    ) ?? currentPos.y
    
    // Then: 両軸がスナップされる
    expect(snappedX).toBe(200) // 198 → 200
    expect(snappedY).toBe(250) // 248 → 250
  })
})