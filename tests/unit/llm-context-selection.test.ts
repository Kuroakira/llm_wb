import { describe, test, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useState, useEffect, useRef } from 'react'

/**
 * コンtextselectionバグ修正のtest
 * 問題: ユーザーが除外したメッセージが新規メッセージ追加後に自動的に復活する
 */

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

// 修正後のロジックを抽象化した関数
function useFixedMessageSelection(chatHistory: ChatMessage[]) {
  // デフォルトで全てのメッセージをコンtextに含めるように初期化
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(() => {
    return new Set(chatHistory.map(msg => msg.id))
  })

  // 明示的に除外されたメッセージIDを追跡
  const [excludedMessageIds, setExcludedMessageIds] = useState<Set<string>>(new Set())

  // 前回のメッセージIDリストを追跡
  const prevMessageIdsRef = useRef<Set<string>>(new Set(chatHistory.map(msg => msg.id)))

  // chatHistoryが変更されたときに新しいメッセージのみを自動的にコンtextに追加
  useEffect(() => {
    const currentMessageIds = new Set(chatHistory.map(msg => msg.id))
    const prevMessageIds = prevMessageIdsRef.current

    // 新規メッセージを特定
    const newMessageIds: string[] = []
    currentMessageIds.forEach(id => {
      if (!prevMessageIds.has(id)) {
        newMessageIds.push(id)
      }
    })

    // 新規メッセージがある場合のみ処理
    if (newMessageIds.length > 0) {
      setSelectedMessageIds(currentSelection => {
        const newSelection = new Set(currentSelection)
        const currentExcluded = new Set(excludedMessageIds)

        // 新規メッセージで除外履歴にないもののみ自動追加
        newMessageIds.forEach(id => {
          if (!currentExcluded.has(id)) {
            newSelection.add(id)
          }
        })

        return newSelection
      })
    }

    // 現在のメッセージIDリストをsave
    prevMessageIdsRef.current = currentMessageIds
  }, [chatHistory, excludedMessageIds])

  const toggleMessageContext = (messageId: string) => {
    setSelectedMessageIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        // コンtextから除外する場合、除外履歴に追加
        newSet.delete(messageId)
        setExcludedMessageIds(prevExcluded => new Set(prevExcluded).add(messageId))
      } else {
        // コンtextに追加する場合、除外履歴からdelete
        newSet.add(messageId)
        setExcludedMessageIds(prevExcluded => {
          const newExcluded = new Set(prevExcluded)
          newExcluded.delete(messageId)
          return newExcluded
        })
      }
      return newSet
    })
  }

  const clearAllSelection = () => {
    // 全てClearする場合は除外履歴もリセット
    setExcludedMessageIds(new Set())
    setSelectedMessageIds(new Set())
  }

  return {
    selectedMessageIds,
    excludedMessageIds,
    toggleMessageContext,
    clearAllSelection
  }
}

describe('LLM Context Selection Bug Fix', () => {
  let initialMessages: ChatMessage[]

  beforeEach(() => {
    initialMessages = [
      { id: 'msg-1', role: 'user', content: 'Question 1', timestamp: 1000 },
      { id: 'msg-2', role: 'assistant', content: 'Answer 1', timestamp: 1001 }
    ]
  })

  test('初期化時、全メッセージが自動selectionされる', () => {
    const { result } = renderHook(() => useFixedMessageSelection(initialMessages))

    expect(result.current.selectedMessageIds.size).toBe(2)
    expect(result.current.selectedMessageIds.has('msg-1')).toBe(true)
    expect(result.current.selectedMessageIds.has('msg-2')).toBe(true)
    expect(result.current.excludedMessageIds.size).toBe(0)
  })

  test('メッセージをコンtextから除外できる', () => {
    const { result } = renderHook(() => useFixedMessageSelection(initialMessages))

    act(() => {
      result.current.toggleMessageContext('msg-2')
    })

    expect(result.current.selectedMessageIds.has('msg-2')).toBe(false)
    expect(result.current.excludedMessageIds.has('msg-2')).toBe(true)
  })

  test('除外したメッセージをコンtextに再追加できる', () => {
    const { result } = renderHook(() => useFixedMessageSelection(initialMessages))

    // まず除外
    act(() => {
      result.current.toggleMessageContext('msg-2')
    })
    expect(result.current.selectedMessageIds.has('msg-2')).toBe(false)
    expect(result.current.excludedMessageIds.has('msg-2')).toBe(true)

    // 再追加
    act(() => {
      result.current.toggleMessageContext('msg-2')
    })
    expect(result.current.selectedMessageIds.has('msg-2')).toBe(true)
    expect(result.current.excludedMessageIds.has('msg-2')).toBe(false)
  })

  test('【バグ修正の核心】除外したメッセージが新規メッセージ追加後も復活しない', () => {
    const { result, rerender } = renderHook(
      ({ messages }) => useFixedMessageSelection(messages),
      {
        initialProps: { messages: initialMessages }
      }
    )

    // msg-2をコンtextから除外
    act(() => {
      result.current.toggleMessageContext('msg-2')
    })
    expect(result.current.selectedMessageIds.has('msg-2')).toBe(false)
    expect(result.current.excludedMessageIds.has('msg-2')).toBe(true)

    // 新しいメッセージを追加
    const newMessages = [
      ...initialMessages,
      { id: 'msg-3', role: 'user', content: 'Question 2', timestamp: 2000 },
      { id: 'msg-4', role: 'assistant', content: 'Answer 2', timestamp: 2001 }
    ]

    act(() => {
      rerender({ messages: newMessages })
    })

    // 【重要】除外したメッセージは復活しない
    expect(result.current.selectedMessageIds.has('msg-2')).toBe(false)
    expect(result.current.excludedMessageIds.has('msg-2')).toBe(true)

    // 新規メッセージは自動追加される
    expect(result.current.selectedMessageIds.has('msg-3')).toBe(true)
    expect(result.current.selectedMessageIds.has('msg-4')).toBe(true)

    // 既存のselection状態は維持される
    expect(result.current.selectedMessageIds.has('msg-1')).toBe(true)
  })

  test('新規メッセージのみが自動追加される', () => {
    const { result, rerender } = renderHook(
      ({ messages }) => useFixedMessageSelection(messages),
      {
        initialProps: { messages: initialMessages }
      }
    )

    // initial stateのverify
    expect(result.current.selectedMessageIds.size).toBe(2)

    // 新しいメッセージを1つ追加
    const newMessages = [
      ...initialMessages,
      { id: 'msg-3', role: 'user', content: 'Question 2', timestamp: 2000 }
    ]

    act(() => {
      rerender({ messages: newMessages })
    })

    // 1つ増えて3つになる
    expect(result.current.selectedMessageIds.size).toBe(3)
    expect(result.current.selectedMessageIds.has('msg-3')).toBe(true)
  })

  test('Clearfunctionalityが除外履歴もリセットする', () => {
    const { result } = renderHook(() => useFixedMessageSelection(initialMessages))

    // メッセージを除外
    act(() => {
      result.current.toggleMessageContext('msg-2')
    })
    expect(result.current.excludedMessageIds.has('msg-2')).toBe(true)

    // Clear実行
    act(() => {
      result.current.clearAllSelection()
    })

    // selectionと除外履歴の両方がClearされる
    expect(result.current.selectedMessageIds.size).toBe(0)
    expect(result.current.excludedMessageIds.size).toBe(0)
  })

  test('複数の除外操作が正しく動作する', () => {
    const manyMessages = [
      { id: 'msg-1', role: 'user', content: 'Q1', timestamp: 1000 },
      { id: 'msg-2', role: 'assistant', content: 'A1', timestamp: 1001 },
      { id: 'msg-3', role: 'user', content: 'Q2', timestamp: 2000 },
      { id: 'msg-4', role: 'assistant', content: 'A2', timestamp: 2001 }
    ]

    const { result, rerender } = renderHook(
      ({ messages }) => useFixedMessageSelection(messages),
      {
        initialProps: { messages: manyMessages }}
    )

    // 複数のメッセージを除外
    act(() => {
      result.current.toggleMessageContext('msg-2')
      result.current.toggleMessageContext('msg-4')
    })

    expect(result.current.selectedMessageIds.size).toBe(2)
    expect(result.current.excludedMessageIds.size).toBe(2)
    expect(result.current.selectedMessageIds.has('msg-1')).toBe(true)
    expect(result.current.selectedMessageIds.has('msg-3')).toBe(true)

    // 新規メッセージ追加
    const moreMessages = [
      ...manyMessages,
      { id: 'msg-5', role: 'user', content: 'Q3', timestamp: 3000 }
    ]

    act(() => {
      rerender({ messages: moreMessages })
    })

    // 除外したメッセージは復活せず、新規メッセージのみ追加
    expect(result.current.selectedMessageIds.size).toBe(3) // msg-1, msg-3, msg-5
    expect(result.current.selectedMessageIds.has('msg-2')).toBe(false)
    expect(result.current.selectedMessageIds.has('msg-4')).toBe(false)
    expect(result.current.selectedMessageIds.has('msg-5')).toBe(true)
  })
})