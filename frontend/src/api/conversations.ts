import { apiFetch } from './request'
import type { ChatMessage } from './chat'

export interface Conversation {
  id: number
  title: string
  updated_at?: string
}

export function listConversations() {
  return apiFetch<{ conversations: Conversation[] }>('/api/conversations')
}

export function createConversation() {
  return apiFetch<Conversation>('/api/conversations', { method: 'POST' })
}

export function getMessages(convId: number) {
  return apiFetch<{ messages: ChatMessage[] }>(`/api/conversations/${convId}/messages`)
}

export function deleteConversation(convId: number) {
  return apiFetch<{ ok: boolean }>(`/api/conversations/${convId}`, { method: 'DELETE' })
}
