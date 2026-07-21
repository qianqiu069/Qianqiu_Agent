import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Image, Tag } from 'antd'
import {
  CaretDownOutlined,
  CaretRightOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  LoadingOutlined,
  BulbOutlined,
} from '@ant-design/icons'
import type { ChatMessage } from '../api/chat'
import { toolLabel } from '../hooks/useChatStream'

function ThinkingPanel({ reasoning, thinking }: { reasoning: string; thinking: boolean }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(thinking)
  }, [thinking])

  return (
    <div className="thinking-panel">
      <button className="thinking-header" onClick={() => setOpen((o) => !o)}>
        {open ? <CaretDownOutlined /> : <CaretRightOutlined />}
        <BulbOutlined style={{ marginLeft: 4 }} />
        <span style={{ marginLeft: 6 }}>
          {thinking ? '正在思考…' : `思考过程（${reasoning.length} 字）`}
        </span>
      </button>
      {open && <div className="thinking-body">{reasoning}</div>}
    </div>
  )
}

interface Props {
  message: ChatMessage
  streaming?: boolean
}

export default function MessageBubble({ message, streaming }: Props) {
  if (message.role === 'user') {
    return (
      <div className="rise-in" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div className="bubble-user">{message.content}</div>
      </div>
    )
  }

  const thinking = Boolean(streaming && message.reasoning && !message.content)
  const extraImages = (message.images ?? []).filter((u) => !message.content.includes(u))

  return (
    <div className="rise-in" style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
      <img src="/chat.png" alt="AI" className="seal" style={{ width: 40, height: 40, objectFit: 'cover' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {message.reasoning && <ThinkingPanel reasoning={message.reasoning} thinking={thinking} />}

        {(message.toolCalls ?? []).map((tc, i) => (
          <div key={i} className="tool-chip">
            {tc.status === 'running' ? (
              <LoadingOutlined style={{ color: 'var(--cinnabar)' }} />
            ) : (
              <CheckCircleOutlined style={{ color: '#52a355' }} />
            )}
            <span style={{ marginLeft: 6 }}>
              {tc.status === 'running' ? `正在调用 ${toolLabel(tc.name)}…` : `${toolLabel(tc.name)} 完成`}
            </span>
          </div>
        ))}

        <div className={`assistant-content${streaming && !thinking ? ' cursor-blink' : ''}`}>
          {message.content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                img: ({ src, alt }) =>
                  src ? (
                    <Image src={src} alt={alt ?? ''} style={{ maxWidth: 360, borderRadius: 10, marginTop: 4 }} />
                  ) : null,
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : streaming ? null : message.reasoning || (message.images?.length ?? 0) > 0 ? null : (
            '（无回复）'
          )}
        </div>

        {extraImages.length > 0 && (
          <Image.PreviewGroup>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              {extraImages.map((u) => (
                <Image key={u} src={u} style={{ maxWidth: 300, borderRadius: 10 }} />
              ))}
            </div>
          </Image.PreviewGroup>
        )}

        {message.sources && message.sources.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {message.sources.map((s) => (
              <Tag key={s} icon={<FileTextOutlined />} color="orange" style={{ fontSize: 11 }}>
                {s}
              </Tag>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
