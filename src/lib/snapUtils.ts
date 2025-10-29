// Type definitions not used for dynamic import

// Variable for dynamic import
let Konva: any
if (typeof window !== 'undefined') {
  Konva = require('konva')
}

const GUIDELINE_OFFSET = 5

type Snap = 'start' | 'center' | 'end'
type SnappingEdges = {
  vertical: Array<{
    guide: number
    offset: number
    snap: Snap
  }>
  horizontal: Array<{
    guide: number
    offset: number
    snap: Snap
  }>
}

export const getLineGuideStops = (skipShape: any) => {
  const stage = skipShape.getStage()
  if (!stage) return { vertical: [], horizontal: [] }

  // Can snap to Stage boundaries and center
  const vertical = [0, stage.width() / 2, stage.width()]
  const horizontal = [0, stage.height() / 2, stage.height()]

  // Can snap to edges and center of each object on Canvas
  stage.find('.object').forEach((guideItem: any) => {
    if (guideItem === skipShape) {
      return
    }
    const box = guideItem.getClientRect()
    // Can snap to all edges of the shape
    vertical.push(box.x, box.x + box.width, box.x + box.width / 2)
    horizontal.push(box.y, box.y + box.height, box.y + box.height / 2)
  })
  return {
    vertical,
    horizontal,
  }
}

export const getObjectSnappingEdges = (node: any): SnappingEdges => {
  const box = node.getClientRect()
  const absPos = node.absolutePosition()

  return {
    vertical: [
      {
        guide: Math.round(box.x),
        offset: Math.round(absPos.x - box.x),
        snap: 'start',
      },
      {
        guide: Math.round(box.x + box.width / 2),
        offset: Math.round(absPos.x - box.x - box.width / 2),
        snap: 'center',
      },
      {
        guide: Math.round(box.x + box.width),
        offset: Math.round(absPos.x - box.x - box.width),
        snap: 'end',
      },
    ],
    horizontal: [
      {
        guide: Math.round(box.y),
        offset: Math.round(absPos.y - box.y),
        snap: 'start',
      },
      {
        guide: Math.round(box.y + box.height / 2),
        offset: Math.round(absPos.y - box.y - box.height / 2),
        snap: 'center',
      },
      {
        guide: Math.round(box.y + box.height),
        offset: Math.round(absPos.y - box.y - box.height),
        snap: 'end',
      },
    ],
  }
}

export const getGuides = (
  lineGuideStops: ReturnType<typeof getLineGuideStops>,
  itemBounds: ReturnType<typeof getObjectSnappingEdges>
) => {
  const resultV: Array<{
    lineGuide: number
    diff: number
    snap: Snap
    offset: number
  }> = []

  const resultH: Array<{
    lineGuide: number
    diff: number
    snap: Snap
    offset: number
  }> = []

  lineGuideStops.vertical.forEach((lineGuide) => {
    itemBounds.vertical.forEach((itemBound) => {
      const diff = Math.abs(lineGuide - itemBound.guide)
      if (diff < GUIDELINE_OFFSET) {
        resultV.push({
          lineGuide: lineGuide,
          diff: diff,
          snap: itemBound.snap,
          offset: itemBound.offset,
        })
      }
    })
  })

  lineGuideStops.horizontal.forEach((lineGuide) => {
    itemBounds.horizontal.forEach((itemBound) => {
      const diff = Math.abs(lineGuide - itemBound.guide)
      if (diff < GUIDELINE_OFFSET) {
        resultH.push({
          lineGuide: lineGuide,
          diff: diff,
          snap: itemBound.snap,
          offset: itemBound.offset,
        })
      }
    })
  })

  const guides: Array<{
    lineGuide: number
    offset: number
    orientation: 'V' | 'H'
    snap: 'start' | 'center' | 'end'
  }> = []

  const minV = resultV.sort((a, b) => a.diff - b.diff)[0]
  const minH = resultH.sort((a, b) => a.diff - b.diff)[0]

  if (minV) {
    guides.push({
      lineGuide: minV.lineGuide,
      offset: minV.offset,
      orientation: 'V',
      snap: minV.snap,
    })
  }

  if (minH) {
    guides.push({
      lineGuide: minH.lineGuide,
      offset: minH.offset,
      orientation: 'H',
      snap: minH.snap,
    })
  }

  return guides
}

export const drawGuides = (guides: ReturnType<typeof getGuides>, layer: any) => {
  if (!Konva) return
  
  guides.forEach((lg) => {
    if (lg.orientation === 'H') {
      const line = new Konva.Line({
        points: [-6000, 0, 6000, 0],
        stroke: 'rgb(0, 161, 255)',
        strokeWidth: 1,
        name: 'guid-line',
        dash: [4, 6],
      })
      layer.add(line)
      line.absolutePosition({
        x: 0,
        y: lg.lineGuide,
      })
    } else if (lg.orientation === 'V') {
      const line = new Konva.Line({
        points: [0, -6000, 0, 6000],
        stroke: 'rgb(0, 161, 255)',
        strokeWidth: 1,
        name: 'guid-line',
        dash: [4, 6],
      })
      layer.add(line)
      line.absolutePosition({
        x: lg.lineGuide,
        y: 0,
      })
    }
  })
}

export const applySnap = (
  target: any,
  guides: ReturnType<typeof getGuides>
) => {
  if (!guides.length) return

  const absPos = target.absolutePosition()
  
  guides.forEach((lg) => {
    switch (lg.snap) {
      case 'start': {
        switch (lg.orientation) {
          case 'V': {
            absPos.x = lg.lineGuide + lg.offset
            break
          }
          case 'H': {
            absPos.y = lg.lineGuide + lg.offset
            break
          }
        }
        break
      }
      case 'center': {
        switch (lg.orientation) {
          case 'V': {
            absPos.x = lg.lineGuide + lg.offset
            break
          }
          case 'H': {
            absPos.y = lg.lineGuide + lg.offset
            break
          }
        }
        break
      }
      case 'end': {
        switch (lg.orientation) {
          case 'V': {
            absPos.x = lg.lineGuide + lg.offset
            break
          }
          case 'H': {
            absPos.y = lg.lineGuide + lg.offset
            break
          }
        }
        break
      }
    }
  })
  
  target.absolutePosition(absPos)
}

// Drag move handler with snapping
export const handleSnapDragMove = (e: any) => {
  const target = e.target
  const layer = target.getLayer()
  if (!layer) return

  // Remove all guidelines from screen
  layer.find('.guid-line').forEach((l: any) => l.destroy())

  // Find lines that can be snapped to
  const lineGuideStops = getLineGuideStops(target)
  // Find snap points of current object
  const itemBounds = getObjectSnappingEdges(target)

  // Find where current object can snap
  const guides = getGuides(lineGuideStops, itemBounds)

  // If no snap available, do nothing
  if (!guides.length) {
    return
  }

  drawGuides(guides, layer)
  applySnap(target, guides)
}

// Drag end handler with snapping
export const handleSnapDragEnd = (e: any) => {
  const target = e.target
  const layer = target.getLayer()
  if (!layer) return

  // Remove all guidelines from screen
  layer.find('.guid-line').forEach((l: any) => l.destroy())
}