import { describe, test, expect } from 'vitest'

describe('Coordinate Transform Calculations', () => {
  test('スクリーン座標からcanvas座標への変換', () => {
    // Given: ビューポート設定
    const viewport = { zoom: 1.5, panX: -50, panY: -30 }
    const screenPoint = { x: 300, y: 200 }
    
    // When: canvas座標に変換
    const canvasX = (screenPoint.x - viewport.panX) / viewport.zoom
    const canvasY = (screenPoint.y - viewport.panY) / viewport.zoom
    
    // Then: 正しく変換される
    expect(canvasX).toBeCloseTo(233.33, 2) // (300 - (-50)) / 1.5
    expect(canvasY).toBeCloseTo(153.33, 2) // (200 - (-30)) / 1.5
  })

  test('canvas座標からスクリーン座標への変換', () => {
    // Given: ビューポート設定
    const viewport = { zoom: 0.8, panX: 100, panY: 50 }
    const canvasPoint = { x: 400, y: 300 }
    
    // When: スクリーン座標に変換
    const screenX = canvasPoint.x * viewport.zoom + viewport.panX
    const screenY = canvasPoint.y * viewport.zoom + viewport.panY
    
    // Then: 正しく変換される
    expect(screenX).toBe(420) // 400 * 0.8 + 100
    expect(screenY).toBe(290) // 300 * 0.8 + 50
  })

  test('ズーム中心点での座標変換', () => {
    // Given: ズーム操作
    const oldZoom = 1.0
    const newZoom = 1.5
    const zoomCenter = { x: 400, y: 300 } // スクリーン座標での中心点
    const oldPan = { x: 0, y: 0 }
    
    // When: ズーム中心を基準としたパン調整を計算
    const scaleFactor = newZoom / oldZoom
    const newPanX = oldPan.x + zoomCenter.x * (1 - scaleFactor)
    const newPanY = oldPan.y + zoomCenter.y * (1 - scaleFactor)
    
    // Then: 中心点が固定されるようなパン値が計算される
    expect(newPanX).toBeCloseTo(-200, 2) // 400 * (1 - 1.5)
    expect(newPanY).toBeCloseTo(-150, 2) // 300 * (1 - 1.5)
  })

  test('回転変換計算', () => {
    // Given: 回転角度と座標
    const angle = Math.PI / 4 // 45度
    const point = { x: 100, y: 0 }
    const center = { x: 0, y: 0 }
    
    // When: 回転変換を適用
    const relX = point.x - center.x
    const relY = point.y - center.y
    const rotatedX = relX * Math.cos(angle) - relY * Math.sin(angle) + center.x
    const rotatedY = relX * Math.sin(angle) + relY * Math.cos(angle) + center.y
    
    // Then: 正しく回転される
    expect(rotatedX).toBeCloseTo(70.71, 2) // 100 * cos(45°)
    expect(rotatedY).toBeCloseTo(70.71, 2) // 100 * sin(45°)
  })

  test('バウンディングボックス計算', () => {
    // Given: 複数の要素
    const elements = [
      { x: 100, y: 150, width: 80, height: 60 },
      { x: 200, y: 100, width: 100, height: 120 },
      { x: 50, y: 200, width: 120, height: 80 }
    ]
    
    // When: 全体のバウンディングボックスを計算
    const minX = Math.min(...elements.map(el => el.x))
    const minY = Math.min(...elements.map(el => el.y))
    const maxX = Math.max(...elements.map(el => el.x + el.width))
    const maxY = Math.max(...elements.map(el => el.y + el.height))
    
    const boundingBox = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
    
    // Then: 全体を囲むボックスが計算される
    expect(boundingBox).toEqual({
      x: 50,   // 最小X
      y: 100,  // 最小Y
      width: 250, // 300 - 50
      height: 180 // 280 - 100
    })
  })

  test('rectangleの中心点計算', () => {
    // Given: rectangle要素
    const rect = { x: 100, y: 150, width: 200, height: 120 }
    
    // When: 中心点を計算
    const centerX = rect.x + rect.width / 2
    const centerY = rect.y + rect.height / 2
    
    // Then: 正しい中心点が得られる
    expect(centerX).toBe(200) // 100 + 200/2
    expect(centerY).toBe(210) // 150 + 120/2
  })

  test('rectangle間の距離計算', () => {
    // Given: 2つのrectangle
    const rect1 = { x: 0, y: 0, width: 100, height: 100 }
    const rect2 = { x: 150, y: 200, width: 80, height: 60 }
    
    // When: 中心間距離を計算
    const center1 = { x: rect1.x + rect1.width / 2, y: rect1.y + rect1.height / 2 }
    const center2 = { x: rect2.x + rect2.width / 2, y: rect2.y + rect2.height / 2 }
    const distance = Math.sqrt(
      Math.pow(center2.x - center1.x, 2) + Math.pow(center2.y - center1.y, 2)
    )
    
    // Then: 正しい距離が計算される
    // center1 = (50, 50), center2 = (190, 230)
    // distance = √((190-50)² + (230-50)²) = √(140² + 180²) = √(19600 + 32400) = √52000 ≈ 228.04
    expect(distance).toBeCloseTo(228.04, 1)
  })
})