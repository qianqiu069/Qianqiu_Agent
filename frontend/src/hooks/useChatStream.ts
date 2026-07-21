import { useCallback, useEffect, useRef, useState } from 'react'
import { streamChat, type ChatMessage } from '../api/chat'
import {
  createConversation,
  deleteConversation,
  getMessages,
  listConversations,
  type Conversation,
} from '../api/conversations'

const TOOL_LABELS: Record<string, string> = {
  generate_image: 'AI 绘画',
  search_knowledge_base: '知识库检索',
}

export function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name
}

export function useChatStream() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const refreshConversations = useCallback(async () => {
    try {
      const { conversations } = await listConversations()
      setConversations(conversations)
    } catch {
      /* 401 已由 request 层处理 */
    }
  }, [])

  useEffect(() => {
    refreshConversations()
  }, [refreshConversations])

  const selectConversation = useCallback(async (id: number) => {
    abortRef.current?.abort()
    setActiveId(id)
    try {
      const { messages } = await getMessages(id)
      setMessages(messages)
    } catch {
      setMessages([])
    }
  }, [])

  const newConversation = useCallback(() => {
    abortRef.current?.abort()
    setActiveId(null)
    setMessages([])
  }, [])

  const removeConversation = useCallback(
    async (id: number) => {
      await deleteConversation(id)
      if (id === activeId) {
        setActiveId(null)
        setMessages([])
      }
      refreshConversations()
    },
    [activeId, refreshConversations],
  )

  const send = useCallback(
    async (content: string, useRag: boolean) => {
      let convId = activeId
      if (convId == null) {
        const conv = await createConversation()
        convId = conv.id
        setActiveId(convId)
      }

      setMessages((prev) => [
        ...prev,
        { role: 'user', content },
        { role: 'assistant', content: '', reasoning: '', toolCalls: [] },
      ])
      setStreaming(true)

      const controller = new AbortController()
      abortRef.current = controller

      const patchLast = (fn: (m: ChatMessage) => ChatMessage) =>
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = fn(next[next.length - 1])
          return next
        })

      try {
        await streamChat(convId, content, useRag, {
          onDelta: (t) => patchLast((m) => ({ ...m, content: m.content + t })),
          onReasoning: (t) => patchLast((m) => ({ ...m, reasoning: (m.reasoning ?? '') + t })),
          onSources: (sources) => patchLast((m) => ({ ...m, sources })),
          onToolCall: (name) =>
            patchLast((m) => ({
              ...m,
              toolCalls: [...(m.toolCalls ?? []), { name, status: 'running' }],
            })),
          onToolResult: (name, result) =>
            patchLast((m) => ({
              ...m,
              toolCalls: (m.toolCalls ?? []).map((tc) =>
                tc.name === name && tc.status === 'running' ? { ...tc, status: 'done' } : tc,
              ),
              images:
                name === 'generate_image' && result.startsWith('http')
                  ? [...(m.images ?? []), result]
                  : m.images,
            })),
          onError: (msg) =>
            patchLast((m) => ({ ...m, content: m.content + `\n\n> ⚠️ ${msg}` })),
        }, controller.signal)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          patchLast((m) => ({ ...m, content: m.content || `⚠️ ${(e as Error).message}` }))
        }
      } finally {
        setStreaming(false)
        abortRef.current = null
        refreshConversations()
      }
    },
    [activeId, refreshConversations],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return {
    conversations,
    activeId,
    messages,
    streaming,
    send,
    stop,
    selectConversation,
    newConversation,
    removeConversation,
  }
}
