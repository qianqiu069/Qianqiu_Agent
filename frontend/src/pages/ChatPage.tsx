import { useEffect, useRef, useState } from 'react'
import { Button, Input, Switch, Tooltip } from 'antd'
import {
  ArrowUpOutlined,
  BookOutlined,
  StopOutlined,
} from '@ant-design/icons'
import MessageBubble from '../components/MessageBubble'
import { useChat } from '../hooks/chatContext'

export default function ChatPage() {
  const { messages, streaming, send, stop } = useChat()
  const [input, setInput] = useState('')
  const [useRag, setUseRag] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    send(text, useRag)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '28px 24px 8px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '18vh' }}>
              <img
                src="/cat.png"
                alt="千秋Agent"
                className="seal"
                style={{ width: 56, height: 56, objectFit: 'cover' }}
              />
              <h2 className="brand-title" style={{ marginTop: 18, fontSize: 24 }}>
                今天想聊点什么？
              </h2>
              <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 2 }}>
                我可以回答问题、根据描述<b>画图</b>、检索你的<b>知识库</b>。
                <br />
                试试：「帮我画一幅水墨风格的江南小镇」
              </p>
            </div>
          ) : (
            messages.map((m, i) => (
              <MessageBubble
                key={i}
                message={m}
                streaming={streaming && i === messages.length - 1 && m.role === 'assistant'}
              />
            ))
          )}
        </div>
      </div>

      {/* ChatGPT 式输入框 */}
      <div style={{ padding: '8px 24px 20px' }}>
        <div className="chat-input-shell" style={{ maxWidth: 780, margin: '0 auto' }}>
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="给千秋Agent发送消息…"
            autoSize={{ minRows: 1, maxRows: 7 }}
            variant="borderless"
            style={{ fontSize: 15, padding: '4px 6px' }}
          />
          <div className="chat-input-toolbar">
            <Tooltip title="开启后回答会强制检索你的知识库；关闭时 Agent 也会按需自主检索">
              <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', cursor: 'default' }}>
                <BookOutlined /> 知识库增强{' '}
                <Switch size="small" checked={useRag} onChange={setUseRag} />
              </span>
            </Tooltip>
            {streaming ? (
              <Button danger shape="circle" icon={<StopOutlined />} onClick={stop} />
            ) : (
              <Button
                type="primary"
                shape="circle"
                icon={<ArrowUpOutlined />}
                onClick={handleSend}
                disabled={!input.trim()}
              />
            )}
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 8 }}>
          千秋Agent 可以画图和检索知识库，内容由 AI 生成，请注意甄别
        </div>
      </div>
    </div>
  )
}
