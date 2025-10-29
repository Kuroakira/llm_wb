export type ElementID = string

export type BaseElement = {
  id: ElementID
  type: 'sticky' | 'text' | 'rect' | 'image'
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  zIndex: number
  locked?: boolean
  createdAt: number
  updatedAt: number
}

export type StickyElement = BaseElement & {
  type: 'sticky'
  text: string
  color: string // e.g., '#FFF2B2'
  isMarkdown?: boolean
  textAlign?: TextAlignment
  verticalAlign?: VerticalAlignment
}

export type TextElement = BaseElement & {
  type: 'text'
  text: string
  fontSize: number
  fontFamily: string
  isMarkdown?: boolean
  textAlign?: TextAlignment
  verticalAlign?: VerticalAlignment
}

export type RectElement = BaseElement & {
  type: 'rect'
  fill: string
  stroke: string
  strokeWidth: number
  radius?: number
}

export type ImageElement = BaseElement & {
  type: 'image'
  src: string // base64 data URL or blob URL
  originalWidth: number
  originalHeight: number
}

export type CanvasElement = StickyElement | TextElement | RectElement | ImageElement

// Connection anchor positions (edge centers)
export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left'

// Resize anchor directions (corners only)
export type CornerDirection = 'nw' | 'ne' | 'sw' | 'se'

// Edge directions (for connection points)
export type EdgeDirection = 'n' | 'e' | 's' | 'w'

export type Connector = {
  id: ElementID
  fromId: ElementID
  toId: ElementID
  fromAnchor?: AnchorPosition
  toAnchor?: AnchorPosition
  points: number[] // [x1,y1,x2,y2]（描画時に再計算可）
  zIndex: number
  createdAt: number
  updatedAt: number
}

export type Viewport = {
  zoom: number
  panX: number
  panY: number
}

export type Position = {
  x: number
  y: number
}

export type BoardState = {
  elements: CanvasElement[]
  connectors: Connector[]
  selection: ElementID[]
  viewport: Viewport
  history: {
    past: any[]
    future: any[]
  }
}

export type Tool = 'select' | 'pan' | 'sticky' | 'text' | 'rect' | 'connector' | 'line' | 'image'

// Figma/Google Slides風のモード管理
export type Mode = 'idle' | 'select' | 'transform' | 'editingText' | 'placing' | 'panning'


// テキスト配置関連の型
export type TextAlignment = 'left' | 'center' | 'right'
export type VerticalAlignment = 'top' | 'middle' | 'bottom'

// イベントハンドラー関連の型
export type EventHandler<T = any> = (event: T) => void
export type ElementEventHandler = (id: ElementID, ...args: any[]) => void

// チャット関連の型
export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string     // 全文（表示用）
  summary?: string    // サマリ（assistantのみ）
  timestamp: number
}

// メインテーマ型
export type MainTheme = {
  id: string
  content: string
  createdAt: number
  updatedAt: number
}

// LLM API レスポンス型
export type LLMResponse = {
  text: string
  summary: string
}