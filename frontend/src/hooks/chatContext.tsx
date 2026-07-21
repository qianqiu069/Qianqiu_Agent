import { createContext, useContext } from 'react'
import { useChatStream } from './useChatStream'

type ChatContextValue = ReturnType<typeof useChatStream>

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const value = useChatStream()
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat 必须在 ChatProvider 内使用')
  return ctx
}
