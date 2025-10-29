'use client'

import React, { useState, useRef, useEffect } from 'react'
import { callLLMWithContext, validatePrompt, LLMAPIError, type LLMState } from '@/lib/llm'
import { SpinnerLoader } from '@/components/SpinnerLoader'
import { handleTextareaPaste } from '@/lib/clipboard-utils'
import { createModuleLogger } from '@/lib/logger'
import { useBoardStore } from '@/store/boardStore'
import { marked } from 'marked'

const logger = createModuleLogger('LeftChatPanel')

// Chat message type (simplified)
export interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: number
  isSelected?: boolean // For context selection
}

type LeftChatPanelProps = {
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

// Configure marked settings
marked.setOptions({
  breaks: true, // Convert line breaks to <br>
  gfm: true // Enable GitHub Flavored Markdown
})

export function LeftChatPanel({ isCollapsed = false, onToggleCollapse }: LeftChatPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [llmState, setLLMState] = useState<LLMState>({
    isLoading: false,
    error: null,
    lastResponse: null
  })

  // Use chat functionality from boardStore
  const { chatHistory, addChatMessage, getChatContext, mainTheme, setMainTheme, updateMainTheme, removeMainTheme } = useBoardStore()

  // Chat history (convert boardStore's chatHistory to local format for backward compatibility)
  const messages = chatHistory.map(msg => ({
    id: msg.id,
    type: msg.role,
    content: msg.content,
    timestamp: msg.timestamp,
    isSelected: false
  }))
  // Initialize with all messages included in context by default
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(() => {
    return new Set(chatHistory.map(msg => msg.id))
  })

  // Track explicitly excluded message IDs
  const [excludedMessageIds, setExcludedMessageIds] = useState<Set<string>>(new Set())

  // Track previous message ID list
  const prevMessageIdsRef = useRef<Set<string>>(new Set(chatHistory.map(msg => msg.id)))

  // Automatically add only new messages to context when chatHistory changes
  useEffect(() => {
    const currentMessageIds = new Set(chatHistory.map(msg => msg.id))
    const prevMessageIds = prevMessageIdsRef.current

    // Identify new messages
    const newMessageIds: string[] = []
    currentMessageIds.forEach(id => {
      if (!prevMessageIds.has(id)) {
        newMessageIds.push(id)
      }
    })

    // Process only if there are new messages
    if (newMessageIds.length > 0) {
      setSelectedMessageIds(currentSelection => {
        const newSelection = new Set(currentSelection)
        const currentExcluded = new Set(excludedMessageIds)

        // Auto-add only new messages that are not in excluded history
        newMessageIds.forEach(id => {
          if (!currentExcluded.has(id)) {
            newSelection.add(id)
          }
        })

        return newSelection
      })
    }

    // Save current message ID list
    prevMessageIdsRef.current = currentMessageIds
  }, [chatHistory, excludedMessageIds])

  // UI state
  const [isComposing, setIsComposing] = useState(false)
  const [isEditingMainTheme, setIsEditingMainTheme] = useState(false)
  const [editingThemeText, setEditingThemeText] = useState('')
  const [isAddingMainTheme, setIsAddingMainTheme] = useState(false)
  const [newThemeText, setNewThemeText] = useState('')

  // Preview sticky note state
  const [previewSticky, setPreviewSticky] = useState<{
    text: string
    isVisible: boolean
    isDragging: boolean
    messageId?: string
  }>({
    text: '',
    isVisible: false,
    isDragging: false
  })

  // Resize functionality state
  const [panelWidth, setPanelWidth] = useState(() => {
    // Get saved width from LocalStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('leftPanelWidth')
      return saved ? parseInt(saved, 10) : 400
    }
    return 400
  })
  const [isResizing, setIsResizing] = useState(false)
  const minWidth = 300
  const maxWidth = 800

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Resize handling
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const newWidth = Math.min(maxWidth, Math.max(minWidth, e.clientX))
      setPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false)
        // Save width
        if (typeof window !== 'undefined') {
          localStorage.setItem('leftPanelWidth', panelWidth.toString())
        }
      }
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      // Disable text selection during resize
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'ew-resize'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isResizing, panelWidth])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validation = validatePrompt(prompt)
    if (!validation.isValid) {
      setLLMState(prev => ({ ...prev, error: validation.error || null }))
      return
    }

    setLLMState({ isLoading: true, error: null, lastResponse: null })

    try {
      // ユーザーメッセージをチャット履歴に追加
      addChatMessage({
        role: 'user',
        content: prompt.trim(),
        timestamp: Date.now()
      })

      // Auto-set main theme if first question and theme not set
      if (!mainTheme && chatHistory.length === 0) {
        setMainTheme(prompt.trim())
      }

      // Get context from boardStore
      const context = getChatContext()

      const response = await callLLMWithContext({
        prompt: prompt.trim()
      }, context, mainTheme?.content)

      // Add assistant response to chat history (with summary)
      addChatMessage({
        role: 'assistant',
        content: response.text,
        summary: response.summary,
        timestamp: Date.now()
      })

      // Don't auto-show preview sticky after response (only on sticky button click)

      setLLMState({
        isLoading: false,
        error: null,
        lastResponse: response
      })

      setPrompt('')

    } catch (error) {
      logger.error('LLM error', error)

      let errorMessage = 'An error occurred'
      if (error instanceof LLMAPIError) {
        if (error.status === 400) {
          errorMessage = 'There is a problem with the input'
        } else if (error.status >= 500) {
          errorMessage = 'A server error occurred'
        } else {
          errorMessage = error.message
        }
      }

      setLLMState({
        isLoading: false,
        error: errorMessage,
        lastResponse: null
      })
    }
  }


  // Create preview sticky note from message
  const createPreviewFromMessage = (message: ChatMessage) => {
    setPreviewSticky({
      text: message.content,
      isVisible: true,
      isDragging: false,
      messageId: message.id
    })
  }

  // Add/remove message from context
  const toggleMessageContext = (messageId: string) => {
    setSelectedMessageIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        // When excluding from context, add to excluded history
        newSet.delete(messageId)
        setExcludedMessageIds(prevExcluded => new Set(prevExcluded).add(messageId))
      } else {
        // When adding to context, remove from excluded history
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

  // Handle preview sticky note drag
  const handlePreviewDragStart = (e: React.DragEvent) => {
    setPreviewSticky(prev => ({ ...prev, isDragging: true }))

    e.dataTransfer.setData('text/plain', previewSticky.text)
    e.dataTransfer.setData('application/sticky-note', JSON.stringify({
      text: previewSticky.text,
      source: 'left-chat-panel',
      messageId: previewSticky.messageId
    }))

    e.dataTransfer.effectAllowed = 'copy'
  }

  const handlePreviewDragEnd = (e: React.DragEvent) => {
    setPreviewSticky(prev => ({ ...prev, isDragging: false }))

    if (e.dataTransfer.dropEffect === 'copy') {
      setTimeout(() => {
        setPreviewSticky({ text: '', isVisible: false, isDragging: false })
      }, 100)
    }
  }

  // Handle message drag
  const handleMessageDragStart = (e: React.DragEvent, message: ChatMessage) => {
    e.dataTransfer.setData('text/plain', message.content)
    e.dataTransfer.setData('application/sticky-note', JSON.stringify({
      text: message.content,
      source: 'chat-history',
      messageId: message.id
    }))
    e.dataTransfer.effectAllowed = 'copy'
  }

  if (isCollapsed) {
    return (
      <div style={{
        position: 'fixed',
        left: '0',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 1000,
        backgroundColor: '#1A1A1A',
        borderRadius: '0 12px 12px 0',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderLeft: 'none',
        padding: '16px 8px',
        boxShadow: '4px 0 20px rgba(0, 0, 0, 0.3)'
      }}>
        <button
          onClick={onToggleCollapse}
          style={{
            background: 'none',
            border: 'none',
            color: '#CCCCCC',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '8px',
            borderRadius: '4px',
            transition: 'all 0.2s',
            transform: 'rotate(90deg)',
            transformOrigin: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.color = '#FFFFFF'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#CCCCCC'
          }}
          title="Open chat panel"
        >
          💬
        </button>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      left: '0',
      top: '0',
      bottom: '0',
      width: `${panelWidth}px`,
      backgroundColor: '#1A1A1A',
      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'grid',
      gridTemplateRows: 'auto auto auto 1fr auto', // Header, main theme, control bar, chat, input
      zIndex: 1000,
      boxShadow: '4px 0 20px rgba(0, 0, 0, 0.2)',
      height: '100vh',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0 // Fix header size
      }}>
        <h3 style={{
          margin: 0,
          color: '#FFFFFF',
          fontSize: '16px',
          fontWeight: '600',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          AI Assistant
        </h3>

        <button
          onClick={onToggleCollapse}
          style={{
            background: 'none',
            border: 'none',
            color: '#888888',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '4px',
            borderRadius: '4px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.color = '#CCCCCC'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#888888'
          }}
          title="Close panel"
        >
          ←
        </button>
      </div>

      {/* Main theme bar */}
      {mainTheme ? (
        <div style={{
          backgroundColor: '#0D4F8C',
          borderBottom: '1px solid #1E88E5',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '48px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flex: 1
          }}>
            <span style={{ fontSize: '16px' }}>📌</span>
            {isEditingMainTheme ? (
              <input
                type="text"
                value={editingThemeText}
                onChange={(e) => setEditingThemeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    updateMainTheme(editingThemeText)
                    setIsEditingMainTheme(false)
                  } else if (e.key === 'Escape') {
                    setIsEditingMainTheme(false)
                    setEditingThemeText(mainTheme.content)
                  }
                }}
                onBlur={() => {
                  updateMainTheme(editingThemeText)
                  setIsEditingMainTheme(false)
                }}
                autoFocus
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '14px',
                  color: '#FFFFFF',
                  outline: 'none'
                }}
              />
            ) : (
              <div style={{
                flex: 1,
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {mainTheme.content}
              </div>
            )}
          </div>
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={() => {
                setEditingThemeText(mainTheme.content)
                setIsEditingMainTheme(true)
              }}
              style={{
                background: 'none',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '4px',
                padding: '4px 8px',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                e.currentTarget.style.color = '#FFFFFF'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'
              }}
            >
              Edit
            </button>
            <button
              onClick={() => removeMainTheme()}
              style={{
                background: 'none',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '4px',
                padding: '4px 8px',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 100, 100, 0.2)'
                e.currentTarget.style.color = '#FF6B6B'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px dashed rgba(255, 255, 255, 0.1)',
          padding: '12px 16px',
          minHeight: '48px'
        }}>
          {isAddingMainTheme ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '16px' }}>📌</span>
              <input
                type="text"
                value={newThemeText}
                onChange={(e) => setNewThemeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (newThemeText.trim()) {
                      setMainTheme(newThemeText.trim())
                      setNewThemeText('')
                      setIsAddingMainTheme(false)
                    }
                  } else if (e.key === 'Escape') {
                    setIsAddingMainTheme(false)
                    setNewThemeText('')
                  }
                }}
                onBlur={() => {
                  if (newThemeText.trim()) {
                    setMainTheme(newThemeText.trim())
                  }
                  setNewThemeText('')
                  setIsAddingMainTheme(false)
                }}
                placeholder="Enter main theme..."
                autoFocus
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  color: '#FFFFFF',
                  outline: 'none'
                }}
              />
              <button
                onClick={() => {
                  setIsAddingMainTheme(false)
                  setNewThemeText('')
                }}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: '#888888',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}>
              <div
                style={{
                  flex: 1,
                  textAlign: 'center',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '6px',
                  transition: 'all 0.2s'
                }}
                onClick={() => setIsAddingMainTheme(true)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <div style={{
                  color: '#888888',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <span>✏️</span>
                  <span>Set main theme</span>
                </div>
              </div>

              {messages.length > 0 && messages[0].type === 'user' && (
                <div style={{
                  borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingLeft: '16px'
                }}>
                  <div
                    style={{
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '6px',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setMainTheme(messages[0].content)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <div style={{
                      color: '#888888',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>📌</span>
                      <span>Use first question</span>
                    </div>
                    <div style={{
                      color: '#666666',
                      fontSize: '11px',
                      marginTop: '2px',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      "{messages[0].content}"
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* チャットコントロールバー */}
      {messages.length > 0 && (
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#CCCCCC'
          }}>
            <input
              type="checkbox"
              checked={messages.length > 0 && selectedMessageIds.size === messages.length}
              onChange={(e) => {
                if (e.target.checked) {
                  // Add all messages to context
                  setSelectedMessageIds(new Set(messages.map(msg => msg.id)))
                  // Clear excluded history
                  setExcludedMessageIds(new Set())
                } else {
                  // Exclude all messages from context
                  setSelectedMessageIds(new Set())
                  // Add all messages to excluded history
                  setExcludedMessageIds(new Set(messages.map(msg => msg.id)))
                }
              }}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#0D99FF'
              }}
            />
            <span>Add all to context</span>
          </label>

          <div style={{
            fontSize: '12px',
            color: '#888888',
            marginLeft: 'auto'
          }}>
            {selectedMessageIds.size}/{messages.length} selected
          </div>
        </div>
      )}

      {/* Chat message area - Grid item */}
      <div
        style={{
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px',
          paddingBottom: '8px',
          WebkitOverflowScrolling: 'touch',
          minHeight: 0 // Enable scrolling for grid item
        }}
        className="chat-scroll-area"
      >
          {messages.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#888888',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              Feel free to ask any questions.<br />
              You can add chat history to context by selecting messages.
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              minHeight: 'min-content'
            }}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: message.type === 'user' ? '0' : '12px',
                    padding: '4px 0',
                    paddingLeft: message.type === 'assistant' ? '24px' : '0',
                    border: '2px solid transparent',
                    borderRadius: '8px',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    // メッセージにホバー時、チェックマークを表示
                    const checkmark = e.currentTarget.querySelector('div[style*="position: absolute"]') as HTMLElement
                    if (checkmark && !selectedMessageIds.has(message.id)) {
                      checkmark.style.opacity = '0.5'
                    }
                  }}
                  onMouseLeave={(e) => {
                    // メッセージからマウスが離れた時、非選択のチェックマークを隠す
                    const checkmark = e.currentTarget.querySelector('div[style*="position: absolute"]') as HTMLElement
                    if (checkmark && !selectedMessageIds.has(message.id)) {
                      checkmark.style.opacity = '0'
                    }
                  }}
                >
                  {message.type === 'user' ? (
                    /* ユーザーメッセージ - 囲いスタイル */
                    <div style={{
                      marginLeft: 'auto',
                      maxWidth: '80%',
                      position: 'relative'
                    }}>
                      {/* コンテキスト選択中の控えめなインジケーター */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleMessageContext(message.id)
                        }}
                        style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-8px',
                          width: '20px',
                          height: '20px',
                          backgroundColor: selectedMessageIds.has(message.id) ? '#0D99FF' : 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          color: selectedMessageIds.has(message.id) ? '#FFFFFF' : '#666666',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          border: selectedMessageIds.has(message.id) ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                          transition: 'all 0.2s',
                          opacity: selectedMessageIds.has(message.id) ? 1 : 0,
                          zIndex: 1
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '1'
                          e.currentTarget.style.backgroundColor = selectedMessageIds.has(message.id) ? '#0D99FF' : 'rgba(255, 255, 255, 0.2)'
                          e.currentTarget.style.transform = 'scale(1.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = selectedMessageIds.has(message.id) ? '1' : '0'
                          e.currentTarget.style.backgroundColor = selectedMessageIds.has(message.id) ? '#0D99FF' : 'rgba(255, 255, 255, 0.1)'
                          e.currentTarget.style.transform = 'scale(1)'
                        }}
                        title={selectedMessageIds.has(message.id) ? 'Remove from context' : 'Add to context'}
                      >
                        {selectedMessageIds.has(message.id) ? '✓' : '+'}
                      </div>

                      <div style={{
                        padding: '12px 16px',
                        backgroundColor: '#2F2F2F',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '16px',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        color: '#FFFFFF',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        userSelect: 'text',
                        cursor: 'text'
                      }}>
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Assistant message content */}
                      <div style={{
                        flex: 1,
                        minWidth: 0,
                        position: 'relative'
                      }}>
                        {/* Context selection indicator */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleMessageContext(message.id)
                          }}
                          style={{
                            position: 'absolute',
                            top: '-4px',
                            left: '-20px',
                            width: '20px',
                            height: '20px',
                            backgroundColor: selectedMessageIds.has(message.id) ? '#0D99FF' : 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            color: selectedMessageIds.has(message.id) ? '#FFFFFF' : '#666666',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            border: selectedMessageIds.has(message.id) ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                            transition: 'all 0.2s',
                            opacity: selectedMessageIds.has(message.id) ? 1 : 0
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1'
                            e.currentTarget.style.backgroundColor = selectedMessageIds.has(message.id) ? '#0D99FF' : 'rgba(255, 255, 255, 0.2)'
                            e.currentTarget.style.transform = 'scale(1.1)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = selectedMessageIds.has(message.id) ? '1' : '0'
                            e.currentTarget.style.backgroundColor = selectedMessageIds.has(message.id) ? '#0D99FF' : 'rgba(255, 255, 255, 0.1)'
                            e.currentTarget.style.transform = 'scale(1)'
                          }}
                          title={selectedMessageIds.has(message.id) ? 'Remove from context' : 'Add to context'}
                        >
                          {selectedMessageIds.has(message.id) ? '✓' : '+'}
                        </div>

                        {/* Sender name */}
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#FFFFFF',
                          marginBottom: '8px'
                        }}>
                          AI Assistant
                        </div>

                        {/* Message text */}
                        <div
                          style={{
                            fontSize: '14px',
                            lineHeight: '1.6',
                            color: '#CCCCCC',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            userSelect: 'text',
                            cursor: 'text'
                          }}
                          className="markdown-content"
                          dangerouslySetInnerHTML={{
                            __html: marked(message.content)
                          }}
                        />

                        {/* Actions and timestamp */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginTop: '12px'
                        }}>
                          <span style={{
                            fontSize: '12px',
                            color: '#888888'
                          }}>
                            {new Date(message.timestamp).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              createPreviewFromMessage(message)
                            }}
                            draggable
                            onDragStart={(e) => handleMessageDragStart(e, message)}
                            style={{
                              background: 'none',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: '#888888',
                              cursor: 'pointer',
                              fontSize: '12px',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              transition: 'all 0.2s',
                              marginRight: '8px'
                            }}
                            title="Place as sticky note (drag & drop also available)"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                              e.currentTarget.style.color = '#CCCCCC'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent'
                              e.currentTarget.style.color = '#888888'
                            }}
                          >
                            🏷️ To Sticky
                          </button>

                          {!mainTheme && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setMainTheme(message.content)
                              }}
                              style={{
                                background: 'none',
                                border: '1px solid rgba(13, 153, 255, 0.3)',
                                color: '#0D99FF',
                                cursor: 'pointer',
                                fontSize: '12px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                transition: 'all 0.2s'
                              }}
                              title="Set as main theme"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(13, 153, 255, 0.1)'
                                e.currentTarget.style.borderColor = '#0D99FF'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                                e.currentTarget.style.borderColor = 'rgba(13, 153, 255, 0.3)'
                              }}
                            >
                              📌 Main Theme
                            </button>
                          )}

                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
      </div>

      {/* Input area - Grid item */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: '#1A1A1A',
          flexShrink: 0 // Prevent input area from shrinking
        }}>

          {/* Input form */}
          <form onSubmit={handleSubmit} style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '8px',
            padding: '12px',
            backgroundColor: '#2A2A2A',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <textarea
              data-testid="left-chat-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mainTheme
                  ? `Ask about "${mainTheme.content.substring(0, 20)}${mainTheme.content.length > 20 ? '...' : ''}"...`
                  : "Enter your message..."
              }
              disabled={llmState.isLoading}
              style={{
                flex: 1,
                minHeight: '24px',
                maxHeight: '120px',
                padding: '8px 0',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '14px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                resize: 'none',
                outline: 'none'
              }}
              onPaste={(e) => handleTextareaPaste(e, setPrompt)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
                  return
                }

                // IME変換中の場合はEnterキーを無視（二重チェック）
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !isComposing) {
                  e.preventDefault()
                  if (prompt.trim() && !llmState.isLoading) {
                    handleSubmit(e as any)
                  }
                }
              }}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
            />

            <button
              data-testid="left-chat-submit"
              type="submit"
              disabled={llmState.isLoading || !prompt.trim()}
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: llmState.isLoading || !prompt.trim() ? '#404040' : '#FFFFFF',
                color: llmState.isLoading || !prompt.trim() ? '#888888' : '#000000',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: llmState.isLoading || !prompt.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {llmState.isLoading ? (
                <SpinnerLoader size={14} color="#888888" />
              ) : '↑'}
            </button>
          </form>

          {/* Error display */}
          {llmState.error && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: 'rgba(220, 53, 69, 0.1)',
              border: '1px solid rgba(220, 53, 69, 0.3)',
              borderRadius: '8px',
              color: '#FF6B6B',
              fontSize: '12px',
              marginTop: '8px'
            }}>
              ⚠️ {llmState.error}
            </div>
          )}
        </div>

      {/* Preview sticky note (overlay) */}
      {previewSticky.isVisible && (
        <div style={{
          position: 'absolute',
          bottom: '140px', // Above input area
          left: '16px',
          right: '16px',
          zIndex: 10
        }}>
          <div
            data-testid="left-chat-preview-sticky"
            draggable
            onDragStart={handlePreviewDragStart}
            onDragEnd={handlePreviewDragEnd}
            style={{
              padding: '12px',
              backgroundColor: '#E3F2FD',
              border: '2px solid #90CAF9',
              borderRadius: '8px',
              color: '#333333',
              fontSize: '13px',
              maxHeight: '200px',
              overflowY: 'auto',
              cursor: previewSticky.isDragging ? 'grabbing' : 'grab',
              opacity: previewSticky.isDragging ? 0.7 : 1,
              transform: previewSticky.isDragging ? 'rotate(2deg)' : 'none',
              transition: 'all 0.2s ease',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              lineHeight: '1.5',
              boxShadow: previewSticky.isDragging
                ? '0 8px 25px rgba(0, 0, 0, 0.3)'
                : '0 2px 8px rgba(0, 0, 0, 0.15)'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '8px',
              gap: '8px'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#666666',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>🏷️</span>
                <span>Drag to place on canvas</span>
              </div>
              <button
                onClick={() => setPreviewSticky({ text: '', isVisible: false, isDragging: false })}
                style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#666666'
                }}
                title="Delete"
              >
                ×
              </button>
            </div>
            <div style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '13px',
              lineHeight: '1.6'
            }}>
              {previewSticky.text}
            </div>
          </div>
        </div>
      )}

      {/* Resize handle */}
      <div
        style={{
          position: 'absolute',
          right: '0',
          top: '0',
          bottom: '0',
          width: '8px',
          cursor: 'ew-resize',
          backgroundColor: isResizing ? 'rgba(13, 153, 255, 0.3)' : 'transparent',
          transition: 'background-color 0.2s',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = 'rgba(13, 153, 255, 0.2)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = 'transparent'
          }
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          setIsResizing(true)
        }}
      >
        {/* Visual indicator when resizing */}
        <div style={{
          width: '2px',
          height: '40px',
          backgroundColor: isResizing ? '#0D99FF' : 'rgba(255, 255, 255, 0.2)',
          borderRadius: '1px',
          transition: 'background-color 0.2s',
          pointerEvents: 'none'
        }} />
      </div>
    </div>
  )
}
