import { describe, it, expect, beforeEach } from 'vitest'
import { useBoardStore } from '@/store/boardStore'
import type { ChatMessage } from '@/types'

describe('LLM Summary Feature', () => {
  beforeEach(() => {
    // チャット履歴をClear
    useBoardStore.getState().clearChatHistory()
  })

  it('should add chat messages with summary', () => {
    const store = useBoardStore.getState()

    // ユーザーメッセージ追加
    store.addChatMessage({
      role: 'user',
      content: 'testユーザーメッセージ',
      timestamp: Date.now()
    })

    // アシスタントメッセージ（サマリ付き）追加
    store.addChatMessage({
      role: 'assistant',
      content: 'これは詳細な回答です。歴史的背景を含めて説明すると、多くの要因が重なって...',
      summary: '歴史的背景を含めた詳細回答',
      timestamp: Date.now() + 1
    })

    const { chatHistory } = useBoardStore.getState()
    expect(chatHistory).toHaveLength(2)
    expect(chatHistory[0].role).toBe('user')
    expect(chatHistory[1].role).toBe('assistant')
    expect(chatHistory[1].summary).toBe('歴史的背景を含めた詳細回答')
  })

  it('should generate context from assistant message summaries', () => {
    const store = useBoardStore.getState()

    // 複数のアシスタントメッセージを追加
    store.addChatMessage({
      role: 'assistant',
      content: '長い回答1...',
      summary: 'サマリ1',
      timestamp: Date.now()
    })

    store.addChatMessage({
      role: 'assistant',
      content: '長い回答2...',
      summary: 'サマリ2',
      timestamp: Date.now() + 1
    })

    const context = store.getChatContext()
    expect(context).toContain('サマリ1')
    expect(context).toContain('サマリ2')
    expect(context).toContain('過去の会話')
  })

  it('should limit context to recent 5 assistant messages', () => {
    const store = useBoardStore.getState()

    // 6つのアシスタントメッセージを追加
    for (let i = 1; i <= 6; i++) {
      store.addChatMessage({
        role: 'assistant',
        content: `長い回答${i}...`,
        summary: `サマリ${i}`,
        timestamp: Date.now() + i
      })
    }

    const context = store.getChatContext()
    // 最新の5つのみが含まれているはず
    expect(context).not.toContain('サマリ1')
    expect(context).toContain('サマリ2')
    expect(context).toContain('サマリ6')
  })

  it('should return empty context when no assistant messages', () => {
    const store = useBoardStore.getState()

    store.addChatMessage({
      role: 'user',
      content: 'ユーザーメッセージのみ',
      timestamp: Date.now()
    })

    const context = store.getChatContext()
    expect(context).toBe('')
  })

  it('should clear chat history', () => {
    const store = useBoardStore.getState()

    store.addChatMessage({
      role: 'user',
      content: 'testメッセージ',
      timestamp: Date.now()
    })

    store.clearChatHistory()
    const { chatHistory } = useBoardStore.getState()
    expect(chatHistory).toHaveLength(0)
  })
})