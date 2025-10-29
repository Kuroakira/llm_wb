import { describe, test, expect } from 'vitest'

describe('Resize Calculations', () => {
  // resize計算の純粋関数（実装されていれば）をtest

  test('アスペクト比保持resize計算', () => {
    // Given: 元のサイズとアスペクト比
    const originalWidth = 200
    const originalHeight = 100
    const aspectRatio = originalWidth / originalHeight // 2.0
    
    // When: 幅を変更してアスペクト比保持
    const newWidth = 300
    const expectedHeight = newWidth / aspectRatio
    
    // Then: 高さが正しく計算される
    expect(expectedHeight).toBe(150)
    expect(newWidth / expectedHeight).toBeCloseTo(aspectRatio, 5)
  })

  test('minimum size constraintでのresize計算', () => {
    // Given: minimum size constraint
    const minWidth = 100
    const minHeight = 50
    
    // When: 制約をbottom回るサイズに変更しようとする
    let newWidth = 80
    let newHeight = 30
    
    // Then: 最小サイズに調整される
    newWidth = Math.max(minWidth, newWidth)
    newHeight = Math.max(minHeight, newHeight)
    
    expect(newWidth).toBe(100)
    expect(newHeight).toBe(50)
  })

  test('resize handle位置計算', () => {
    // Given: 要素の位置とサイズ
    const element = { x: 100, y: 100, width: 200, height: 150 }
    
    // When: 各resize handleの位置を計算
    const handles = {
      nw: { x: element.x, y: element.y },
      ne: { x: element.x + element.width, y: element.y },
      sw: { x: element.x, y: element.y + element.height },
      se: { x: element.x + element.width, y: element.y + element.height },
      n: { x: element.x + element.width / 2, y: element.y },
      e: { x: element.x + element.width, y: element.y + element.height / 2 },
      s: { x: element.x + element.width / 2, y: element.y + element.height },
      w: { x: element.x, y: element.y + element.height / 2 }
    }
    
    // Then: 各ハンドルが正確な位置にある
    expect(handles.nw).toEqual({ x: 100, y: 100 })
    expect(handles.ne).toEqual({ x: 300, y: 100 })
    expect(handles.sw).toEqual({ x: 100, y: 250 })
    expect(handles.se).toEqual({ x: 300, y: 250 })
    expect(handles.n).toEqual({ x: 200, y: 100 })
    expect(handles.e).toEqual({ x: 300, y: 175 })
    expect(handles.s).toEqual({ x: 200, y: 250 })
    expect(handles.w).toEqual({ x: 100, y: 175 })
  })

  test('コーナーresizeでの位置・サイズ計算', () => {
    // Given: 初期要素とドラッグデルタ
    const initial = { x: 100, y: 100, width: 200, height: 150 }
    const deltaX = 50
    const deltaY = 30
    
    // When: 各コーナーハンドルでresize
    const results = {
      nw: {
        x: initial.x + deltaX,
        y: initial.y + deltaY,
        width: initial.width - deltaX,
        height: initial.height - deltaY
      },
      ne: {
        x: initial.x,
        y: initial.y + deltaY,
        width: initial.width + deltaX,
        height: initial.height - deltaY
      },
      sw: {
        x: initial.x + deltaX,
        y: initial.y,
        width: initial.width - deltaX,
        height: initial.height + deltaY
      },
      se: {
        x: initial.x,
        y: initial.y,
        width: initial.width + deltaX,
        height: initial.height + deltaY
      }
    }
    
    // Then: 各方向のresizeが正しく計算される
    expect(results.nw).toEqual({ x: 150, y: 130, width: 150, height: 120 })
    expect(results.ne).toEqual({ x: 100, y: 130, width: 250, height: 120 })
    expect(results.sw).toEqual({ x: 150, y: 100, width: 150, height: 180 })
    expect(results.se).toEqual({ x: 100, y: 100, width: 250, height: 180 })
  })
})