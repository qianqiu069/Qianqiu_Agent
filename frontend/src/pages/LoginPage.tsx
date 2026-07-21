import { useState } from 'react'
import { Button, Form, Input, Tabs, message } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/request'
import { saveAuth } from '../auth'

interface AuthForm {
  username: string
  password: string
}

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async (values: AuthForm) => {
    setLoading(true)
    try {
      const { token, username } = await apiFetch<{ token: string; username: string }>(
        `/api/auth/${mode}`,
        { method: 'POST', body: JSON.stringify(values) },
      )
      saveAuth(token, username)
      message.success(mode === 'login' ? `欢迎回来，${username}` : '注册成功，欢迎使用千秋Agent')
      navigate('/chat', { replace: true })
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }} className="rise-in">
        <img
          src="/cat.png"
          alt="千秋Agent"
          className="seal"
          style={{ width: 52, height: 52, objectFit: 'cover' }}
        />
        <div>
          <div className="brand-title" style={{ fontSize: 28 }}>
            千秋Agent
          </div>
          <div style={{ color: 'var(--ink-soft)', fontSize: 13, letterSpacing: '0.15em' }}>
            对话 · 绘画 · 视频 · 知识库
          </div>
        </div>
      </div>

      <div
        className="rise-in"
        style={{
          width: 380,
          background: 'var(--card)',
          border: '1px solid var(--hairline)',
          borderRadius: 14,
          padding: '12px 32px 28px',
          boxShadow: '0 12px 40px rgba(43, 41, 38, 0.08)',
        }}
      >
        <Tabs
          activeKey={mode}
          onChange={(k) => setMode(k as 'login' | 'register')}
          centered
          items={[
            { key: 'login', label: '登录' },
            { key: 'register', label: '注册' },
          ]}
        />
        <Form<AuthForm> onFinish={submit} size="large" style={{ marginTop: 8 }}>
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, max: 32, message: '用户名 2-32 个字符' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, max: 64, message: '密码至少 6 位' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            {mode === 'login' ? '登 录' : '注 册'}
          </Button>
        </Form>
      </div>
    </div>
  )
}
