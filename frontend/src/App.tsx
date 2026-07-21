import { useEffect } from 'react'
import { Button, Layout, Menu, Popconfirm, message } from 'antd'
import {
  CommentOutlined,
  VideoCameraOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  LogoutOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import ChatPage from './pages/ChatPage'
import VideoPage from './pages/VideoPage'
import KnowledgePage from './pages/KnowledgePage'
import LoginPage from './pages/LoginPage'
import { ChatProvider, useChat } from './hooks/chatContext'
import { clearAuth, getToken, getUsername } from './auth'

const { Sider, Content } = Layout

const MENU_ITEMS = [
  { key: '/chat', icon: <CommentOutlined />, label: '智能对话' },
  { key: '/video', icon: <VideoCameraOutlined />, label: 'AI 视频' },
  { key: '/kb', icon: <DatabaseOutlined />, label: '知识库管理' },
]

function MainLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const username = getUsername()
  const {
    conversations,
    activeId,
    selectConversation,
    newConversation,
    removeConversation,
  } = useChat()

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider
        width={216}
        style={{
          borderRight: '1px solid var(--hairline)',
          padding: '20px 12px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 10px 20px',
              borderBottom: '1px solid var(--hairline)',
              marginBottom: 14,
            }}
          >
            <img src="/cat.png" alt="千秋Agent" className="seal" style={{ objectFit: 'cover' }} />
            <div>
              <div className="brand-title" style={{ fontSize: 17, lineHeight: 1.3 }}>
                千秋Agent
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', letterSpacing: '0.1em' }}>
                个人 AI 助手
              </div>
            </div>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[pathname]}
            items={MENU_ITEMS}
            onClick={({ key }) => navigate(key)}
            style={{ border: 'none', background: 'transparent' }}
          />

          {/* 历史对话 */}
          <div className="history-divider">
            <span>历史对话</span>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              title="新对话"
              onClick={() => {
                newConversation()
                navigate('/chat')
              }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`conv-item${
                  pathname === '/chat' && c.id === activeId ? ' active' : ''
                }`}
                onClick={() => {
                  selectConversation(c.id)
                  navigate('/chat')
                }}
              >
                <span className="conv-title">{c.title}</span>
                <Popconfirm
                  title="删除此对话？"
                  onConfirm={(e) => {
                    e?.stopPropagation()
                    removeConversation(c.id)
                  }}
                  onCancel={(e) => e?.stopPropagation()}
                >
                  <Button
                    className="conv-delete"
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              </div>
            ))}
          </div>

          <div
            style={{
              borderTop: '1px solid var(--hairline)',
              paddingTop: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 10px 0',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              <UserOutlined /> {username}
            </span>
            <Button
              type="text"
              size="small"
              icon={<LogoutOutlined />}
              onClick={() => {
                clearAuth()
                navigate('/login', { replace: true })
              }}
              title="退出登录"
            />
          </div>
        </div>
      </Sider>
      <Content style={{ overflow: 'hidden' }}>{children}</Content>
    </Layout>
  )
}

function RequireAuth() {
  if (!getToken()) {
    return <Navigate to="/login" replace />
  }
  return (
    <ChatProvider>
      <MainLayout>
        <Outlet />
      </MainLayout>
    </ChatProvider>
  )
}

export default function App() {
  const navigate = useNavigate()

  useEffect(() => {
    const handler = () => {
      message.warning('请先登录')
      navigate('/login', { replace: true })
    }
    window.addEventListener('auth:required', handler)
    return () => window.removeEventListener('auth:required', handler)
  }, [navigate])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/video" element={<VideoPage />} />
        <Route path="/kb" element={<KnowledgePage />} />
      </Route>
    </Routes>
  )
}
