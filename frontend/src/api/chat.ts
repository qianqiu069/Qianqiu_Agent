import { clearAuth, notifyAuthRequired } from '../auth'
import { authHeaders } from './request'

export interface ToolCallInfo {
  name: string
  status: 'running' | 'done'
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  reasoning?: string | null
  sources?: string[] | null
  images?: string[] | null
  toolCalls?: ToolCallInfo[]
}

export interface StreamCallbacks {
  onDelta: (text: string) => void
  onReasoning: (text: string) => void
  onToolCall: (name: string) => void
  onToolResult: (name: string, result: string) => void
  onSources: (sources: string[]) => void
  onError: (message: string) => void
}

export async function streamChat(
  conversationId: number,
  message: string,
  useRag: boolean,
  callbacks: StreamCallbacks,
  signal: AbortSignal,
): Promise<void> {
  const resp = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ conversation_id: conversationId, message, use_rag: useRag }),
    signal,
  })
  if (resp.status === 401) {
    clearAuth()
    notifyAuthRequired()
    throw new Error('请先登录')
  }
  if (!resp.ok || !resp.body) {
    throw new Error(`请求失败 (${resp.status})`)
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''

    for (const frame of frames) {
      const line = frame.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') return
      try {
        const data = JSON.parse(payload)
        if (data.type === 'reasoning') callbacks.onReasoning(data.delta ?? '')
        else if (data.type === 'sources') callbacks.onSources(data.sources ?? [])
        else if (data.type === 'tool_call') callbacks.onToolCall(data.name)
        else if (data.type === 'tool_result') callbacks.onToolResult(data.name, data.result ?? '')
        else if (data.type === 'error') callbacks.onError(data.message ?? '未知错误')
        else if (data.delta) callbacks.onDelta(data.delta)
      } catch {
        /* 忽略不完整帧 */
      }
    }
  }
}
